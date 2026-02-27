import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy init — avoids baking `undefined` into the client at build time.
let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    const key = (import.meta as any).env.VITE_GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        "VITE_GEMINI_API_KEY is not set. Add it to Vercel Environment Variables and redeploy."
      );
    }
    _genAI = new GoogleGenerativeAI(key);
  }
  return _genAI;
}

export async function callAI(prompt: string): Promise<string> {
  if (!prompt.trim()) {
    throw new Error("Prompt cannot be empty");
  }

  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent(prompt);

  return result.response.text();
}
