require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listDocs() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Wait, SDK doesn't have listModels natively exported in early versions?
  // Let's use fetch directly.
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await response.json();
  console.log("Allowed Models:");
  console.log(data);
}
listDocs();
