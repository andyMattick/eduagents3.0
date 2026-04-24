/**
 * lib/gemini.ts — Server-side Gemini API caller
 *
 * Extracted from /api/llm.ts so it can be reused by job processors
 * and other API routes without duplicating the Gemini integration.
 */

export type LlmUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export type LlmCallResult = {
  text: string;
  usageMetadata?: LlmUsageMetadata;
};

export type LlmCallMetadata = {
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

function buildStubProviderText(prompt: string): string {
  if (/return\s+json/i.test(prompt) || /json\s+only/i.test(prompt)) {
    return '{"status":"stub","message":"LLM is stubbed"}';
  }
  return "Stub response: LLM integration is currently disabled.";
}

function buildLlmDisabledError(context?: string): Error {
  return new Error(`LLM provider is disabled${context ? ` (${context})` : ""}`);
}

async function callProviderOnce({
  model,
  prompt,
  temperature,
  maxOutputTokens,
}: {
  model: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
}): Promise<LlmCallResult> {
  void model;
  void prompt;
  void temperature;
  void maxOutputTokens;
  void buildStubProviderText;
  throw buildLlmDisabledError("callProviderOnce");
}

// ---------------------------------------------------------------------------
// Public API — retries on 429 / 5xx with exponential backoff + jitter
// ---------------------------------------------------------------------------

export async function callProviderDetailed({
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
  metadata?: LlmCallMetadata;
}): Promise<LlmCallResult> {
  const context = [
    metadata?.route ? `route=${metadata.route}` : "",
    metadata?.phase ? `phase=${metadata.phase}` : "",
    metadata?.source ? `source=${metadata.source}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  void model;
  void prompt;
  void temperature;
  void maxOutputTokens;
  void maxRetries;
  throw buildLlmDisabledError(context || "callProviderDetailed");
}

export async function callProvider(args: {
  model: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  metadata?: LlmCallMetadata;
}): Promise<string> {
  const result = await callProviderDetailed(args);
  return result.text;
}
