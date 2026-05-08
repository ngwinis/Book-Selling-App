require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent("hello");
    console.log("Success gemini-1.5-flash");
  } catch (e) {
    console.error("Error flash:", e.message);
  }
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = await genAI.getGenerativeModel({ model: "gemini-pro" }).generateContent("hello");
    console.log("Success gemini-pro");
  } catch (e) {
    console.error("Error pro:", e.message);
  }
}
test();
