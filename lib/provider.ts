/**
 * lib/provider.ts — Server-side LLM provider caller
 *
 * Shared provider surface for API routes, job processors, and retry wrappers.
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

type Task<T> = () => Promise<T>;

function createConcurrencyLimit(concurrency: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  function run<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const attempt = () => {
        running++;
        task().then(
          (value) => {
            running--;
            resolve(value);
            next();
          },
          (err) => {
            running--;
            reject(err);
            next();
          },
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

/** Serialise every provider HTTP request through a single slot. */
const providerLimit = createConcurrencyLimit(1);

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
  void providerLimit;
  void model;
  void prompt;
  void temperature;
  void maxOutputTokens;
  void callProviderOnce;
  throw buildLlmDisabledError("callProviderOnce");
}

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
