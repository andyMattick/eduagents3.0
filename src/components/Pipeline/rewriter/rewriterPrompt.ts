// src/components/Pipeline/rewriter/rewriterPrompt.ts

import { UnifiedAssessmentResponse, PhilosopherReport } from "../contracts/assessmentContracts";

export function buildRewriterPrompt(
  writerDraft: UnifiedAssessmentResponse,
  philosopher: PhilosopherReport
): string {

  // Derive rewrite instructions from Philosopher v2 structure
  const culpritIds = philosopher.decision.culpritProblems;

  const rewriteInstructions = philosopher.issues
    .filter(issue => issue.problemId && culpritIds.includes(issue.problemId))
    .map(issue => ({
      problemId: issue.problemId!,
      issues: [issue.summary],
      instructions: issue.suggestedFix ?? "Rewrite to address the identified issue."
    }));

  return `
You are the REWRITER module in an adaptive assessment pipeline.

Your job is to rewrite ONLY the problems identified by the Philosopher as "culprit problems".

Rules:
- Preserve all problemIds exactly.
- Preserve the number of problems.
- Do NOT rewrite any problem not listed in culpritProblems.
- Improve clarity, alignment, cognitive load, and misconception prevention.
- Follow the rewriteInstructions exactly.
- Maintain the Writer's style and formatting.
- Return ONLY the rewritten problems, not the entire document.

Writer Draft:
${JSON.stringify(writerDraft.problemPayload, null, 2)}

Culprit Problems:
${JSON.stringify(culpritIds, null, 2)}

Rewrite Instructions (derived from Philosopher issues):
${JSON.stringify(rewriteInstructions, null, 2)}

Return JSON ONLY in this exact shape:

{
  "rewrittenProblems": [
    {
      "problemId": "p2",
      "question": "new text",
      "options": ["A", "B", "C"],
      "answer": "B",
      "explanation": "string",
      "bloomLevel": "apply",
      "complexity": 0.52
    }
  ]
}
`;
}
