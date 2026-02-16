import { UnifiedAssessmentRequest } from "../contracts/assessmentContracts";

export function buildWriterPrompt(
  req: UnifiedAssessmentRequest,
  previousDraft?: any
): string {
  return `
You are the Writer module.

Teacher Intent:
${JSON.stringify(req.intent, null, 2)}

Student Sliders:
${JSON.stringify(req.studentSliders, null, 2)}

Previous Draft:
${previousDraft ? JSON.stringify(previousDraft, null, 2) : "None"}

Your tasks:
1. Summarize the uploaded documents.
2. Infer the problem payload.
3. Generate student profiles.
4. Generate student testers.
5. Produce the final written assessment.
6. Produce the answer key.
7. Produce cognitive traces.
8. Estimate difficulty and time.
9. Identify misconception clusters.

Return JSON ONLY.
  `;
}
