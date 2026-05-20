import express from 'express';
import { GoogleGenAI } from "@google/genai";
import { authenticateToken } from '../auth.js';

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error('Tutor Error:', error);
    res.status(500).json({ error: 'AI Tutor is temporarily offline.' });
  }
});

export default router;
