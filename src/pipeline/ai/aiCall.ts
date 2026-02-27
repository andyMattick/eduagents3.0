// aiCall.ts — Thin wrapper around the secure /api/llm proxy.
// No API keys in client code.

import { callGemini } from "@/pipeline/llm/gemini";

export async function callAI(prompt: string): Promise<string> {
  if (!prompt.trim()) {
    throw new Error("Prompt cannot be empty");
  }

  return callGemini({
    model: "gemini-2.5-flash",
    prompt,
    temperature: 0.2,
    maxOutputTokens: 4096,
  });
}
