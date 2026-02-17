import { UnifiedAssessmentRequest } from "../contracts/assessmentContracts";


export function buildWriterPrompt(
  req: UnifiedAssessmentRequest,
  previousDraft?: any
): string {

  return `
You are the Writer module in an adaptive assessment system.

Teacher Inputs:
{
  "title": "${req.title}",
  "subject": "${req.subject}",
  "gradeLevel": "${req.gradeLevel}",
  "numProblems": ${req.numProblems},
  "focusAreas": ${JSON.stringify(req.focusAreas ?? [])},
  "emphasis": ${JSON.stringify(req.emphasis ?? [])},
  "rubricGoals": ${JSON.stringify(req.rubricGoals ?? [])},
  "classroomContext": ${JSON.stringify(req.classroomContext ?? "")},
  "notesForWriter": ${JSON.stringify(req.notesForWriter ?? "")}
}

Source Documents:
${JSON.stringify(req.sourceDocuments ?? [], null, 2)}

Example Assessment:
${JSON.stringify(req.exampleAssessment ?? null, null, 2)}

Student Profiles:
${JSON.stringify(req.studentProfiles ?? [], null, 2)}

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
