import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY is not set in process.env.");
    return;
  }
  
  console.log("Checking API Key format:", apiKey.substring(0, 10) + "...");
  try {
    const aiClient = new GoogleGenAI({ apiKey });
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Say hello!",
    });
    console.log("✅ Success! Gemini response:", response.text);
  } catch (error: any) {
    console.error("❌ Failed to call Gemini API:", error);
  }
}

testGemini();
