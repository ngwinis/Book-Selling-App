require('dotenv').config();

async function checkKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Đang kiểm tra API Key: " + apiKey.substring(0, 8) + "...");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.error) {
      console.log("\nLỗi từ Google Server:", data.error.message);
      console.log("Status:", data.error.status);
    } else if (data.models) {
      console.log("\nDanh sách Model ĐƯỢC PHÉP CHẠY cho API Key của bạn:");
      data.models.forEach(m => console.log("- " + m.name));
    }
  } catch (error) {
    console.log("Lỗi mạng:", error);
  }
}

checkKey();
