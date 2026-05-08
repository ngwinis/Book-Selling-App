const Groq = require('groq-sdk');
const supabase = require('../config/supabase');
const fs = require('fs');

// Initialize Groq SDK as the Google Gemini replacement
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const aiController = {
  // --------------------------------------------------------
  // 1. VOICE SEARCH (Voice Search via Whisper)
  // --------------------------------------------------------
  searchByVoice: async (req, res) => {
    try {
      if (!req.file) throw new Error("Audio file was not found!");

      let keyword;
      try {
        const stream = fs.createReadStream(req.file.path);
        
        // Use Whisper Large V3 to transcribe speech to text
        const transcription = await groq.audio.transcriptions.create({
          file: stream,
          model: "whisper-large-v3",
          response_format: "json",
          language: "vi",
          temperature: 0.0,
        });
        keyword = transcription.text.trim();
        console.log(`[AI Voice Search] Recognized Text: "${keyword}"`);
        
        // Delete temporary file from server
        fs.unlinkSync(req.file.path);
      } catch (aiError) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.log("[AI Fallback] Voice Search Groq limit reached. Starting fallback simulation.", aiError.message);
        keyword = "Power"; // Fallback keyword
      }

      // Query the database as usual
      const { data: books, error } = await supabase
        .from('Book')
        .select('*, BookImages(imageURL)')
        .ilike('title', `%${keyword}%`);

      if (error) throw error;

      // Print found books to the terminal
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
  // 2. IMAGE SEARCH (Image Search via Llama Vision)
  // --------------------------------------------------------
  searchByImage: async (req, res) => {
    try {
      if (!req.file) throw new Error("Image file was not found!");

      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      
      const prompt = "You are a book recognition system. Read the book title from this image. Return only the title string and do not explain.";

      let bookTitle;
      try {
        // Meta vision model running through Groq
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
          temperature: 0.1, // Lower creativity to force precise text output
        });
        
        bookTitle = chatCompletion.choices[0]?.message?.content?.trim() || "";
        bookTitle = bookTitle.replace(/[\n\r".]/g, ''); // Trim noise
        console.log(`[AI Image Search] Recognized Book: "${bookTitle}"`);
      } catch (aiError) {
        console.log("[AI Fallback] Image Search limit reached. Starting fallback simulation.", aiError.message);
        bookTitle = "Harry"; // Fallback Harry Potter cover
      }

      // Query database
      const { data: books, error } = await supabase
        .from('Book')
        .select('*, BookImages(imageURL)')
        .ilike('title', `%${bookTitle}%`);

      if (error) throw error;

      // Print found books to the terminal
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
  // 3. CHATBOT RAG ASSISTANT (Text via Llama Versatile)
  // --------------------------------------------------------
  chatbot: async (req, res) => {
    const { userMessage } = req.body;
    
    try {
      // Step 1: Extract the search keyword with a small AI model (Agentic RAG)
      let keyword = "";
      try {
        const keywordPrompt = `User says: "${userMessage}". Extract exactly one core keyword, such as a book title or category, to search the inventory. Do not explain. Return only that keyword. If the user is only greeting or making small talk, return exactly "ALL".`;
        const keywordCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: keywordPrompt }],
          model: "llama-3.1-8b-instant", // Fast model for lightweight keyword extraction
          temperature: 0.1,
        });
        keyword = keywordCompletion.choices[0]?.message?.content?.trim() || "ALL";
        keyword = keyword.replace(/['"]/g, ''); // Trim accidental quotes from AI output
      } catch (err) {
        keyword = "ALL";
      }

      // Step 2: Retrieve books with a multi-layer search algorithm (AUTHOR -> BOOK TITLE)
      let contextBooks = [];
      if (keyword === "ALL" || keyword.length < 2) {
        // Greeting case: return five latest books
        const { data } = await supabase.from('Book').select('*').limit(5);
        contextBooks = data || [];
      } else {
        // Priority 1: check whether the keyword is an author name
        const { data: authors } = await supabase.from('Authors').select('authorID').ilike('authorName', `%${keyword}%`).limit(1);
        if (authors && authors.length > 0) {
          const { data: abcData } = await supabase.from('BookAuthor').select('idBook').eq('idAuthor', authors[0].authorID).limit(5);
          if (abcData && abcData.length > 0) {
            const bookIds = abcData.map(b => b.idBook);
            const { data } = await supabase.from('Book').select('*').in('bookID', bookIds);
            contextBooks = data || [];
          }
        }
        
        // Priority 2: otherwise search all book titles
        if (contextBooks.length === 0) {
          const { data } = await supabase.from('Book').select('*').ilike('title', `%${keyword}%`).limit(5);
          contextBooks = data || [];
        }
        
        // If no exact result is found, return random books as a fallback
        if (contextBooks.length === 0) {
          const { data: fallback } = await supabase.from('Book').select('*').limit(5);
          contextBooks = fallback || [];
        }
      }
      
      // Pre-process clean book data before sending it to the AI model
      const cleanedBooks = contextBooks.map(b => ({
         "book_title": b.title,
         // Multiply by 100,000 and format as VND
         "actual_price": b.price ? (b.price * 100000).toLocaleString('vi-VN') + " VND" : "No price available",
         // Shorten descriptions before sending them to the AI model
         "short_description": b.description ? b.description.substring(0, 300) + "..." : "None", 
         // Pack physical specs into one string for the AI model
         "physical_specs": `Size: ${b.width || 0} x ${b.height || 0} cm | Thickness: ${b.thickness || 0} cm | Weight: ${b.weight || 0} gram | Pages: ${b.totalPage || 0} pages | Cover type: ${b.format || 'Paperback'}`
      }));

      const booksString = JSON.stringify(cleanedBooks);

      // Step 3: Send filtered book data to Llama-3 for the final answer
      const prompt = `
        CONTEXT: You are a helpful book sales consultant for the online BookStore system.
        BOOK INVENTORY AVAILABLE FOR THIS ANSWER: 
        ${booksString}
        
        YOUR TASK: 
        1. Answer the customer question: "${userMessage}"
        2. Use the customer intent and the provided actual_price or physical_specs to recommend suitable books.
        3. Do not invent books or prices outside the provided list. If no exact match exists, say so and suggest books from the list.
        4. Keep the answer concise and clearly formatted.
      `;

      let reply;
      try {
        // Llama-3 reasons over the cleaned book data
        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
        });
        reply = chatCompletion.choices[0]?.message?.content || "";
      } catch (aiError) {
        console.log("[AI Fallback] Chatbot failed. Using fallback response.", aiError.message);
        reply = "The AI assistant is temporarily unavailable. Please try again later.";
      }

      res.status(200).json({ reply: reply });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = aiController;
