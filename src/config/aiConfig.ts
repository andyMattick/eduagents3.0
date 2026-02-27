console.log("[AIConfig] Loaded — Pipeline Version 2.0.0");

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "@/env";
import { runPipeline } from "@/pipeline/orchestrator/runPipeline";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";

export async function generateAssessment(uar: UnifiedAssessmentRequest) {
  return await runPipeline(uar);
}

// Lazy initialisation — don't throw at module load time (would crash the
// entire app on Vercel if the env var is missing from the deployment config).
// The error surfaces only when callAI() is actually invoked.
function getGenAI(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "VITE_GEMINI_API_KEY is not set. Add it to your Vercel project environment variables " +
      "(Settings → Environment Variables) and redeploy."
    );
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY);
}

export async function callAI(prompt: string): Promise<string> {
  if (!prompt.trim()) {
    throw new Error("Prompt cannot be empty");
  }

  const model = getGenAI().getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
