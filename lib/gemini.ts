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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000); // 50s safety net

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens },
        }),
        signal: controller.signal,
      }
    );
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Gemini request timed out (50s)");
    }
    throw err;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    let providerMessage = text;

    try {
      const parsed = JSON.parse(text) as {
        error?: { message?: string; status?: string; details?: Array<{ reason?: string }> };
      };
      const reason = parsed.error?.details?.find((detail) => typeof detail.reason === "string")?.reason;
      providerMessage = [
        parsed.error?.status,
        reason,
        parsed.error?.message,
      ].filter(Boolean).join(" | ") || text;
    } catch {
      // Keep raw text if provider body is not JSON.
    }

    console.error("Gemini error:", res.status, providerMessage);
    throw new Error(`Gemini failed (${res.status}): ${providerMessage}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Empty Gemini response");

  return text;
}
