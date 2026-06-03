import express from 'express';
import { GoogleGenAI } from "@google/genai";
import { authenticateToken } from '../auth.js';

const router = express.Router();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment settings. If you are deploying on Vercel, please define GEMINI_API_KEY in your Project Dashboard Environment Variables.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

router.post('/ask', authenticateToken, async (req: any, res) => {
  const { question, context } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required' });

  try {
    const prompt = `
      You are a VibeLab Technical Tutor. You are helping a student.
      Context: ${JSON.stringify(context)}
      Student Question: ${question}
      
      Provide a helpful, encouraging, and technically accurate answer. 
      Keep it concise and relevant to the current step.
      Use Markdown formatting.
    `;

    const response = await getGeminiClient().models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error('Tutor Error:', error);
    res.status(500).json({ error: error.message || 'AI Tutor is temporarily offline.' });
  }
});

export default router;
