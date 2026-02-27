// Gemini wrapper — supports both blocking and streaming modes
import { GoogleGenerativeAI } from "@google/generative-ai";
import { END_SENTINEL } from "@/pipeline/agents/writer/chunk/parseChunk";

// Lazy init — avoids baking `undefined` into the client when the env var is
// missing at Vite build time (e.g. first Vercel deploy before secrets are set).
let _client: GoogleGenerativeAI | null = null;
function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        "VITE_GEMINI_API_KEY is not set. Add it to your Vercel project " +
        "environment variables (Settings → Environment Variables) and redeploy."
      );
    }
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

// ── Blocking call (used everywhere except the chunked writer) ─────────────

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
  try {
    const gen = getClient().getGenerativeModel({ model });

    const result = await gen.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens }
    });

    return result.response.text();
  } catch (err: any) {
    console.error("[Gemini] LLM request failed:", err);
    throw new Error(
      "The AI generation service is temporarily unavailable (Gemini 503). Please try again shortly."
    );
  }
}

// ── Pseudo-streaming call ─────────────────────────────────────────────────
//
// Uses blocking generateContent (avoids ERR_HTTP2_PROTOCOL_ERROR in browsers
// caused by generateContentStream's SSE framing over HTTP/2).
//
// The same onItem / onTruncation contract is preserved — writerAdaptive.ts
// is unchanged. After the full response arrives we split on END_SENTINEL and
// replay the callbacks synchronously, giving per-item Gatekeeper behaviour
// without a real stream.

export async function callGeminiStreaming({
  model,
  prompt,
  temperature = 0.2,
  maxOutputTokens = 4096,
  onItem,
  onTruncation,
}: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  onItem: (block: string) => void;
  onTruncation?: (leftover: string) => void;
}): Promise<string> {
  try {
    const gen = getClient().getGenerativeModel({ model });

    const result = await gen.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens },
    });

    const raw = result.response.text();

    // Replay sentinel-split blocks via the same callbacks
    const segments = raw.split(END_SENTINEL);
    const remainder = segments[segments.length - 1].trim();

    // All segments except the trailing remainder are complete blocks
    const blocks = segments.slice(0, segments.length - 1);
    for (const block of blocks) {
      onItem(block);
    }

    // Anything after the last sentinel (or the whole response if no sentinel)
    // is a truncation signal
    if (remainder.length > 0 || blocks.length === 0) {
      onTruncation?.(remainder || raw.trim());
    }

    return raw;
  } catch (err: any) {
    console.error("[Gemini] Request failed:", err);
    throw new Error(
      "The AI generation service is temporarily unavailable (Gemini 503). Please try again shortly."
    );
  }
}
