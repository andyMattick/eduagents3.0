// src/components/Pipeline/philosopher/philosopherPrompt.ts

import { AstronomerResult } from "../contracts/assessmentContracts";

import { UnifiedAssessmentResponse } from "../contracts/assessmentContracts";

export function buildPhilosopherPrompt(
  draft: UnifiedAssessmentResponse,
  astro: AstronomerResult
): string {
  return `
You are the PHILOSOPHER module in an adaptive assessment system.

Your job:
- Interpret the Astronomer's student-simulation analytics
- Compare the assessment to the Writer's blueprint
- Evaluate alignment with teacher goals and rubric
- Identify root causes of issues
- Determine if a rewrite is required
- Identify specific culprit problems
- Provide rewrite instructions for each culprit problem
- Produce a teacher-facing explanation

============================================================
1. WRITER BLUEPRINT
============================================================
${JSON.stringify(draft.writerBlueprint ?? null, null, 2)}

============================================================
2. PROBLEM METADATA ONLY (NO FULL TEXT)
============================================================
${JSON.stringify(
  draft.problemPayload.map((p) => ({
    problemId: p.problemId,
    questionType: p.questionType,
    bloomLevel: p.bloomLevel ?? null,
    complexity: p.complexity ?? null
  })),
  null,
  2
)}
`;
}
