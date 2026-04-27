/**
 * src/client/llmClient.ts — Client-side LLM wrapper
 *
 * Re-exports the Gemini proxy functions for convenience.
 * All callers that need LLM generation can import from here.
 */

export { callGemini, callGeminiStreaming, resetLLMGate } from "../pipeline/llm/gemini";
