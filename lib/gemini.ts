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

export type GeminiCallMetadata = {
  route?: string;
  phase?: string;
  source?: string;
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

function buildStubGeminiText(prompt: string): string {
  if (/return\s+json/i.test(prompt) || /json\s+only/i.test(prompt)) {
    return '{"status":"stub","message":"LLM is stubbed"}';
  }
  return "Stub response: LLM integration is currently disabled.";
}

async function callGeminiOnce({
  model,
  prompt,
  temperature,
  maxOutputTokens,
}: {
  model: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
}): Promise<GeminiCallResult> {
  const text = buildStubGeminiText(prompt);
  return {
    text,
    usageMetadata: {
      promptTokenCount: Math.ceil(prompt.length / 4),
      candidatesTokenCount: Math.ceil(text.length / 4),
      totalTokenCount: Math.ceil((prompt.length + text.length) / 4),
    },
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
  metadata,
}: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Max retry attempts on retryable errors (default 2). */
  maxRetries?: number;
  metadata?: GeminiCallMetadata;
}): Promise<GeminiCallResult> {
  const context = [
    metadata?.route ? `route=${metadata.route}` : "",
    metadata?.phase ? `phase=${metadata.phase}` : "",
    metadata?.source ? `source=${metadata.source}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const requestStart = Date.now();
  console.info(
    `[gemini] request_start model=${model} promptChars=${prompt.length} maxOutputTokens=${maxOutputTokens}${context ? ` ${context}` : ""}`
  );

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await geminiLimit(() => callGeminiOnce({ model, prompt, temperature, maxOutputTokens }));
      const elapsedMs = Date.now() - requestStart;
      console.info(
        `[gemini] request_success model=${model} attempts=${attempt + 1}/${maxRetries + 1} elapsedMs=${elapsedMs}${context ? ` ${context}` : ""}`
      );
      return result;
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { httpStatus?: number }).httpStatus ?? null;
      const isRetryable = status !== null && isRetryableHttpStatus(status);

      if (!isRetryable || attempt >= maxRetries) {
        const elapsedMs = Date.now() - requestStart;
        console.error(
          `[gemini] request_fail model=${model} attempts=${attempt + 1}/${maxRetries + 1} status=${status ?? "unknown"} elapsedMs=${elapsedMs}${context ? ` ${context}` : ""}`
        );
        throw err;
      }

      const wait = geminiBackoffMs(attempt, status ?? undefined);
      console.warn(
        `[gemini] ${status} on attempt ${attempt + 1}/${maxRetries + 1} — retrying in ${wait}ms${context ? ` ${context}` : ""}`
      );
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
  metadata?: GeminiCallMetadata;
}): Promise<string> {
  const result = await callGeminiDetailed(args);
  return result.text;
}
