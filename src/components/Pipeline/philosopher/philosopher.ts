// src/components/Pipeline/philosopher/philosopher.ts

import {
  UnifiedAssessmentResponse,
  AstronomerResult,
  PhilosopherReport
} from "../contracts/assessmentContracts";

import { buildPhilosopherPrompt } from "./philosopherPrompt";

export async function runPhilosopher(
  
  writerDraft: UnifiedAssessmentResponse,
  astro: AstronomerResult
): Promise<PhilosopherReport> {
  console.log(
  "%c[Philosopher] Starting evaluation...",
  "color:#7C3AED;font-weight:bold;",
  {
    writerDraft,
    astro
  }
);

  const prompt = buildPhilosopherPrompt(writerDraft, astro);

  const aiResponse = await callAI(prompt, {
    modelName: "gemini-2.5-flash",
    maxTokens: 4000,
  });

  const text = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || text.trim().length === 0) {
    throw new Error("Philosopher returned an empty response");
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Philosopher did not return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  console.log(
  "%c[Philosopher] Evaluation complete:",
  "color:#6D28D9;font-weight:bold;",
  parsed
);


  return {
    decision: parsed.decision ?? {
      status: "complete",
      culpritProblems: [],
      globalSeverity: "low"
    },
    issues: parsed.issues ?? [],
    teacherSummary: parsed.teacherSummary ?? "",
    blueprintNotes: parsed.blueprintNotes ?? []
  };
}
