// Gemini wrapper — supports both blocking and streaming modes.
//
// ⚠️  SECURITY: All LLM calls are proxied through /api/llm (Vercel serverless).
//     The Gemini API key NEVER reaches the browser.
//     The proxy validates the Supabase JWT and enforces daily usage limits.

import { END_SENTINEL } from "@/pipeline/agents/writer/chunk/parseChunk";
import { supabase } from "@/supabase/client";

/**
 * Resolve the LLM proxy URL.
 * - Production / Vercel: same-origin "/api/llm"
 * - Local dev with `vercel dev`: same thing (Vercel emulates /api routes)
 * - Fallback: "/api/llm"
 */
function llmProxyUrl(): string {
  return "/api/llm";
}

/** Get the current Supabase session token for the Authorization header. */
async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) {
    throw new Error(
      "You must be signed in to generate assessments. Please log in and try again."
    );
  }
  return `Bearer ${token}`;
}

/**
 * Shared helper — POST to /api/llm and return the generated text.
 * Throws a user-friendly error on failure.
 */
async function proxyLLMCall(body: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  isGateCall?: boolean;
}): Promise<string> {
  const authorization = await getAuthHeader();

  const res = await fetch(llmProxyUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: "Unknown error" }));
    const msg = payload?.error ?? `LLM proxy returned ${res.status}`;

    if (res.status === 401) throw new Error("Session expired. Please sign in again.");
    if (res.status === 429) throw new Error(msg); // daily limit
    throw new Error(`AI generation failed: ${msg}`);
  }

  const data = await res.json();
  return data.text ?? "";
}

// ── Pipeline "gate call" flag ─────────────────────────────────────────────
// The first LLM call in a pipeline run should set isGateCall = true so the
// server checks the daily limit once. Subsequent calls in the same run skip it.
let _gateConsumed = false;

/** Call this at the start of each pipeline run to re-arm the gate. */
export function resetLLMGate(): void {
  _gateConsumed = false;
}

// ── Blocking call (used everywhere except the chunked writer) ─────────────

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
  const isGateCall = !_gateConsumed;
  if (isGateCall) _gateConsumed = true;

  return proxyLLMCall({ model, prompt, temperature, maxOutputTokens, isGateCall });
}

// ── Pseudo-streaming call ─────────────────────────────────────────────────
//
// Calls the same /api/llm proxy (blocking). After the full response arrives
// we split on END_SENTINEL and replay callbacks synchronously, preserving
// the same onItem / onTruncation contract that writerAdaptive.ts expects.

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
  const isGateCall = !_gateConsumed;
  if (isGateCall) _gateConsumed = true;

  const raw = await proxyLLMCall({ model, prompt, temperature, maxOutputTokens, isGateCall });

  // Replay sentinel-split blocks via the same callbacks
  const segments = raw.split(END_SENTINEL);
  const remainder = segments[segments.length - 1].trim();

  const blocks = segments.slice(0, segments.length - 1);
  for (const block of blocks) {
    onItem(block);
  }

  if (remainder.length > 0 || blocks.length === 0) {
    onTruncation?.(remainder || raw.trim());
  }

  return raw;
}
