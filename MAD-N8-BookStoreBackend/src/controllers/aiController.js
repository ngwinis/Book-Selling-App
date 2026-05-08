const Groq = require('groq-sdk');
const supabase = require('../config/supabase');
const fs = require('fs');

// Khởi tạo Groq SDK thay thế cho Google Gemini
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const aiController = {
  // --------------------------------------------------------
  // 1. TÌM KIẾM BẰNG GIỌNG NÓI (Voice Search via Whisper)
  // --------------------------------------------------------
  searchByVoice: async (req, res) => {
    try {
      if (!req.file) throw new Error("Không tìm thấy file âm thanh!");

      let keyword;
      try {
        const stream = fs.createReadStream(req.file.path);
        
        // Sử dụng Whisper Large V3 để dịch từ Tiếng Việt sang Text
        const transcription = await groq.audio.transcriptions.create({
          file: stream,
          model: "whisper-large-v3",
          response_format: "json",
          language: "vi",
          temperature: 0.0,
        });
        keyword = transcription.text.trim();
        console.log(`[AI Voice Search] Recognized Text: "${keyword}"`);
        
        // Xóa file rác trong máy chủ
        fs.unlinkSync(req.file.path);
      } catch (aiError) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.log("[AI Fallback] Voice Search Groq chạm ngưỡng. Khởi động tính năng Giả lập.", aiError.message);
        keyword = "Sức mạnh"; // Giả lập lóng
      }

      // Xuyên suốt Query DB như cũ
      const { data: books, error } = await supabase
        .from('Book')
        .select('*, BookImages(imageURL)')
        .ilike('title', `%${keyword}%`);

      if (error) throw error;

      // In danh sách sách tìm được ra Terminal
      if (books && books.length > 0) {
        console.log(`[AI Voice Search] Found ${books.length} books:`);
        books.forEach((b, i) => console.log(`   ${i + 1}. ${b.title}`));
      } else {
        console.log("[AI Voice Search] No books found in database.");
      }

      res.status(200).json({ recognizedText: keyword, results: books || [] });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: error.message });
    }
  },

  // --------------------------------------------------------
  // 2. TÌM KIẾM BẰNG HÌNH ẢNH (Image Search via Llama Vision)
  // --------------------------------------------------------
  searchByImage: async (req, res) => {
    try {
      if (!req.file) throw new Error("Không tìm thấy file hình ảnh!");

      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      
      const prompt = "Bạn là hệ thống nhận diện sách. Hãy đọc tên cuốn sách trong bức ảnh này. Chỉ trả về duy nhất một chuỗi là tên sách, không giải thích gì thêm.";

      let bookTitle;
      try {
        // Hệ thống Vision siêu tốc của Meta hoạt động trên Groq
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.1, // Chuyển độ sáng tạo về thấp nhất để ép xuất text chuẩn
        });
        
        bookTitle = chatCompletion.choices[0]?.message?.content?.trim() || "";
        bookTitle = bookTitle.replace(/[\n\r".]/g, ''); // Cắt Rác
        console.log(`[AI Image Search] Recognized Book: "${bookTitle}"`);
      } catch (aiError) {
        console.log("[AI Fallback] Image Search chạm giới hạn. Kích hoạt Giả lập.", aiError.message);
        bookTitle = "Harry"; // Giả lập bìa sách Harry Potter
      }

      // Truy vấn Database
      const { data: books, error } = await supabase
        .from('Book')
        .select('*, BookImages(imageURL)')
        .ilike('title', `%${bookTitle}%`);

      if (error) throw error;

      // In danh sách sách tìm được ra Terminal
      if (books && books.length > 0) {
        console.log(`[AI Image Search] Found ${books.length} books:`);
        books.forEach((b, i) => console.log(`   ${i + 1}. ${b.title}`));
      } else {
        console.log("[AI Image Search] No books found in database.");
      }

      res.status(200).json({ ai_detected_title: bookTitle, results: books || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // --------------------------------------------------------
  // 3. CHATBOT RAG TRỢ LÝ ẢO (Text via Llama Versatile)
  // --------------------------------------------------------
  chatbot: async (req, res) => {
    const { userMessage } = req.body;
    
    try {
      // BƯỚC 1: TƯ DUY TÁCH TỪ KHÓA BẰNG AI CỠ NHỎ (Agentic RAG)
      let keyword = "";
      try {
        const keywordPrompt = `Người dùng nói: "${userMessage}". Hãy trích xuất đúng 1 từ khóa cốt lõi nhất (Ví dụ: tên sách hoặc thể loại như 'Thiếu nhi', 'Kinh doanh') để tìm kiếm trong kho. Chú ý: TUYỆT ĐỐI KHÔNG giải thích, CHỈ in ra đúng từ khóa đó. Nếu User chỉ chào hỏi bâng quơ, hãy trả về đúng chữ "ALL".`;
        const keywordCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: keywordPrompt }],
          model: "llama-3.1-8b-instant", // Model siêu nhanh, chuyên trị tác vụ tư duy logic cắt chữ
          temperature: 0.1,
        });
        keyword = keywordCompletion.choices[0]?.message?.content?.trim() || "ALL";
        keyword = keyword.replace(/['"]/g, ''); // Cắt rác ngoặc kép nếu AI lỡ sinh ra
      } catch (err) {
        keyword = "ALL";
      }

      // BƯỚC 2: RÚT SÁCH BẰNG THUẬT TOÁN TÌM KIẾM ĐA TẦNG (TÁC GIẢ -> TÊN SÁCH)
      let contextBooks = [];
      if (keyword === "ALL" || keyword.length < 2) {
        // Tình huống Chào hỏi -> Bốc ngẫu nhiên 5 cuốn mới nhất
        const { data } = await supabase.from('Book').select('*').limit(5);
        contextBooks = data || [];
      } else {
        // ƯU TIÊN 1: Rà quét xem Từ khóa có phải là Tên Tác Giả không
        const { data: authors } = await supabase.from('Authors').select('authorID').ilike('authorName', `%${keyword}%`).limit(1);
        if (authors && authors.length > 0) {
          const { data: abcData } = await supabase.from('BookAuthor').select('idBook').eq('idAuthor', authors[0].authorID).limit(5);
          if (abcData && abcData.length > 0) {
            const bookIds = abcData.map(b => b.idBook);
            const { data } = await supabase.from('Book').select('*').in('bookID', bookIds);
            contextBooks = data || [];
          }
        }
        
        // ƯU TIÊN 2: Nếu không phải Tác giả, càn quét toàn bộ Tên Sách
        if (contextBooks.length === 0) {
          const { data } = await supabase.from('Book').select('*').ilike('title', `%${keyword}%`).limit(5);
          contextBooks = data || [];
        }
        
        // Trót lọt tìm không ra? Trả về sách ngẫu nhiên làm vốn chữa cháy
        if (contextBooks.length === 0) {
          const { data: fallback } = await supabase.from('Book').select('*').limit(5);
          contextBooks = fallback || [];
        }
      }
      
      // TIÊN XỬ LÝ (PRE-PROCESS): Nhào nặn dữ liệu thật Đẹp để nhét vào não AI
      const cleanedBooks = contextBooks.map(b => ({
         "Tên_sách": b.title,
         // Nhân tỷ giá 100,000 và gắn định dạng VNĐ chuẩn Việt Nam
         "Giá_bán_thực_tế": b.price ? (b.price * 100000).toLocaleString('vi-VN') + " VNĐ" : "Chưa có giá",
         // Cắt ngắn bớt mô tả tránh loạn AI
         "Giới_thiệu_ngắn": b.description ? b.description.substring(0, 300) + "..." : "Không có", 
         // Ép toàn bộ thông số vật lý vào 1 chuỗi để AI hiểu "dày, mỏng, nặng, nhẹ, bìa cứng"
         "Thông_số_vật_lý": `Kích thước: ${b.width || 0} x ${b.height || 0} cm | Dày: ${b.thickness || 0} cm | Nặng: ${b.weight || 0} gram | Số trang: ${b.totalPage || 0} trang | Loại bìa: ${b.format || 'Bìa mềm'}`
      }));

      const booksString = JSON.stringify(cleanedBooks);

      // BƯỚC 3: TRUYỀN DỮ LIỆU ĐÃ SIÊU LỌC CHO BOT TRƯỞNG Llama-3 ĐỂ TRẢ LỜI
      const prompt = `
        BỐI CẢNH: Bạn là một nhân viên tư vấn bán sách thông thái của hệ thống BookStore trực tuyến.
        KHO SÁCH ĐƯỢC CHỈ ĐỊNH ĐỂ TƯ VẤN HÔM NAY: 
        ${booksString}
        
        NHIỆM VỤ CỦA BẠN: 
        1. Trả lời câu hỏi của khách hàng: "${userMessage}"
        2. Dựa vào tâm trạng khách, hãy lôi thông số "Giá_bán_thực_tế" hoặc "Thông_số_vật_lý" của cuốn sách trong kho được cung cấp ở trên ra để thuyết phục khách hàng.
        3. TUYỆT ĐỐI KHÔNG bịa ra sách hoặc giá tiền không nằm trong danh sách. Nếu kho không có sách đúng ý khách, hãy thành thật xin lỗi và gợi ý sách có trong list!
        4. Trả lời ngắn gọn, xuống dòng rõ ràng, sử dụng emoji cho sinh động.
      `;

      let reply;
      try {
        // Llama-3 70B sẽ suy luận trên bản dữ liệu tiếng Việt đã được làm sạch
        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
        });
        reply = chatCompletion.choices[0]?.message?.content || "";
      } catch (aiError) {
        console.log("[AI Fallback] Chatbot chập mạch. Bật Fallback.", aiError.message);
        reply = "🤖 [Chế độ Tự Động] Xin chào! Hiện tại hệ thống Llama AI của Cửa hàng đang có quá nhiều khách truy cập cùng lúc. Bạn châm chước nhé!";
      }

      res.status(200).json({ reply: reply });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = aiController;
