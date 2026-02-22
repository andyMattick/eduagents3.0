// Minimal Gemini wrapper for WriterCall
import { GoogleGenerativeAI } from "@google/generative-ai";

const client = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);


export async function callGemini({
  model,
  prompt,
  temperature = 0.2,
  maxOutputTokens = 4096
}: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const gen = client.getGenerativeModel({ model });
  const result = await gen.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens }
  });

  return result.response.text();
}
