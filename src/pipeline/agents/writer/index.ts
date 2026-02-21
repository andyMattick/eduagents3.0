import { Blueprint } from "@/pipeline/contracts";
import { callAI } from "@/pipeline/ai/aiCall";

export interface WriterResult {
  writerPrompt: string;
  rawModelResponse?: string;
  // parsedAssessment?: any; // coming soon
}

export async function runWriter(blueprint: Blueprint): Promise<WriterResult> {
  const { writerPrompt } = blueprint;

  console.log("=== WRITER: Prompt Received ==="); 
  console.log(writerPrompt);

  // --- REAL LLM CALL GOES HERE ---
  const rawModelResponse = await callAI(writerPrompt);

  console.log("=== WRITER: Raw Model Response ==="); 
  console.log(rawModelResponse);

  return {
    writerPrompt,
    rawModelResponse
    // rawModelResponse,
  };
}
