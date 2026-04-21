/**
 * lib/gemini.ts — Server-side Gemini API caller
 *
 * Extracted from /api/llm.ts so it can be reused by job processors
 * and other API routes without duplicating the Gemini integration.
 */

export type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export type GeminiCallResult = {
  text: string;
  usageMetadata?: GeminiUsageMetadata;
};

// ---------------------------------------------------------------------------
// Global concurrency limiter — max 1 in-flight Gemini call at a time
//
// Gemini free-tier rate limits are per-project per-minute.  Firing multiple
// calls in parallel (ingestion + simulation + rewrite + narrative) quickly
// exhausts the quota, causing cascading 429s that defeat even correct retry
// logic.  Serialising all calls through this queue ensures Gemini never sees
// more than one request at once from this process.
// ---------------------------------------------------------------------------

type Task<T> = () => Promise<T>;

function createConcurrencyLimit(concurrency: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  function run<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const attempt = () => {
        running++;
        task().then(
          (value) => { running--; resolve(value); next(); },
          (err)   => { running--; reject(err);    next(); },
        );
      };

      if (running < concurrency) {
        attempt();
      } else {
        queue.push(attempt);
      }
    });
  }

  function next() {
    if (queue.length > 0 && running < concurrency) {
      const task = queue.shift()!;
      task();
    }
  }

  return run;
}

/** Serialise every Gemini HTTP request through a single slot. */
const geminiLimit = createConcurrencyLimit(1);

// ---------------------------------------------------------------------------
// Internal retry helpers
// ---------------------------------------------------------------------------

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function geminiBackoffMs(attempt: number, status?: number): number {
  if (status === 429) {
    // Rate-limit window is 60 s.  Use a floor that gives the quota time to reset.
    // attempt 0 → 15–17 s, attempt 1 → 30–32 s, attempt 2 → 60–62 s
    const base = Math.min(15_000 * Math.pow(2, attempt), 60_000);
    const jitter = Math.floor(Math.random() * 2_000);
    return base + jitter;
  }
  // Server errors — fast retry: 1s → 2s → 4s, capped at 10s
  const base = Math.min(1000 * Math.pow(2, attempt), 10_000);
  const jitter = Math.floor(Math.random() * 500);
  return base + jitter;
}

// ---------------------------------------------------------------------------
// Raw single-attempt fetch (no retry)
// ---------------------------------------------------------------------------

async function callGeminiOnce({
  model,
  prompt,
  temperature,
  maxOutputTokens,
  apiKey,
}: {
  model: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  apiKey: string;
}): Promise<GeminiCallResult> {
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
    const err = new Error(`Gemini failed (${res.status}): ${providerMessage}`);
    (err as Error & { httpStatus: number }).httpStatus = res.status;
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Empty Gemini response");

  return {
    text,
    usageMetadata: data?.usageMetadata,
  };
}

// ---------------------------------------------------------------------------
// Public API — retries on 429 / 5xx with exponential backoff + jitter
// ---------------------------------------------------------------------------

export async function callGeminiDetailed({
  model,
  prompt,
  temperature = 0.2,
  maxOutputTokens = 4096,
  maxRetries = 2,
}: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Max retry attempts on retryable errors (default 2). */
  maxRetries?: number;
}): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY missing");
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await geminiLimit(() => callGeminiOnce({ model, prompt, temperature, maxOutputTokens, apiKey }));
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { httpStatus?: number }).httpStatus ?? null;
      const isRetryable = status !== null && isRetryableHttpStatus(status);

      if (!isRetryable || attempt >= maxRetries) {
        throw err;
      }

      const wait = geminiBackoffMs(attempt, status ?? undefined);
      console.warn(`[gemini] ${status} on attempt ${attempt + 1}/${maxRetries + 1} — retrying in ${wait}ms`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }

  throw lastErr;
}

export async function callGemini(args: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const result = await callGeminiDetailed(args);
  return result.text;
}
