require('dotenv').config();

async function checkKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Checking API key: " + apiKey.substring(0, 8) + "...");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.error) {
      console.log("\nError from Google server:", data.error.message);
      console.log("Status:", data.error.status);
    } else if (data.models) {
      console.log("\nModels allowed for this API key:");
      data.models.forEach(m => console.log("- " + m.name));
    }
  } catch (error) {
    console.log("Network error:", error);
  }
}

checkKey();
