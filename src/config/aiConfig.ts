console.log("[AIConfig] Loaded — Pipeline Version 2.0.0");

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "@/env";
import { runPipeline } from "@/pipeline/orchestrator/runPipeline";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";

export async function generateAssessment(uar: UnifiedAssessmentRequest) {
  return await runPipeline(uar);
}


const apiKey = GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("VITE_GEMINI_API_KEY is required.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function callAI(prompt: string): Promise<string> {
  if (!prompt.trim()) {
    throw new Error("Prompt cannot be empty");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
