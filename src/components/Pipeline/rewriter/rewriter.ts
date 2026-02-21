// src/components/Pipeline/rewriter/rewriter.ts

import {
  UnifiedAssessmentResponse,
  PhilosopherReport
} from "../contracts/assessmentContracts";
import { WriterDraft } from "../writer/WriterDraft";

import { buildRewriterPrompt } from "./rewriterPrompt";

export interface RewriterResult {
  rewrittenProblems: Array<any>;
}

export async function runRewriter(
  writerDraft: WriterDraft,
  philosopher: PhilosopherReport
): Promise<RewriterResult> {

  console.log(
  "%c[Rewriter] Starting rewrite...",
  "color:#C026D3;font-weight:bold;",
  { writerDraft, philosopher }
);


  const prompt = buildRewriterPrompt(writerDraft, philosopher);

  const aiResponse = await callAI(prompt, {
    modelName: "gemini-2.5-flash",
    maxTokens: 4000,
  });

  const text = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || text.trim().length === 0) {
    throw new Error("Rewriter returned an empty response");
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Rewriter did not return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  console.log(
  "%c[Rewriter] Rewrite complete:",
  "color:#DB2777;font-weight:bold;",
  parsed
);


  return {
    rewrittenProblems: parsed.rewrittenProblems ?? []
  };
}
