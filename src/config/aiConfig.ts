console.log("[AIConfig] Loaded — Pipeline Version 2.0.0");

import { runPipeline, getLastPipelineBlueprint } from "@/pipeline/orchestrator/runPipeline";
import { callGemini } from "@/pipeline/llm/gemini";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";

export { getLastPipelineBlueprint };

export async function generateAssessment(
  uar: UnifiedAssessmentRequest,
  onItemsProgress?: (partialItems: any[]) => void
) {
  return await runPipeline(uar, 0, onItemsProgress);
}

/**
 * Standalone LLM call — routes through the secure /api/llm proxy.
 * Used by Philosopher and Rewriter when they need a one-shot prompt.
 */
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
