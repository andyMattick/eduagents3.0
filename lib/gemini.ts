/**
 * lib/gemini.ts — Server-side Gemini API caller
 *
 * Extracted from /api/llm.ts so it can be reused by job processors
 * and other API routes without duplicating the Gemini integration.
 */

export async function callGemini({
  model,
  prompt,
  temperature = 0.2,
  maxOutputTokens = 4096,
}: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Gemini error:", res.status, text);
    throw new Error(`Gemini failed (${res.status})`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Empty Gemini response");

  return text;
}
