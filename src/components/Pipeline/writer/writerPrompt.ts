import { UnifiedAssessmentRequest } from "../contracts/assessmentContracts";

export function buildWriterPrompt(uar: UnifiedAssessmentRequest): string {
  return `
You are Writer v2, a problem-generation engine in a modular assessment pipeline.

Your ONLY job is to generate a JSON object with a "problemPayload" array.
Do NOT generate instructions, formatting, or document layout.

----------------------------------------
TEACHER INTENT
----------------------------------------
Subject: ${uar.subject}
Grade Levels: ${uar.gradeLevels?.join(", ") || "Not specified"}

Assessment Type: ${uar.assessmentType}
Time Available: ${uar.time} minutes
Number of Problems Requested: ${uar.numProblems}
Difficulty Target (0–1): ${uar.difficultyProfile?.target ?? 0.5}
Focus Areas: ${uar.focusAreas?.join(", ") || "none"}

----------------------------------------
SOURCE DOCUMENTS (summaries only)
----------------------------------------
${formatDocs(uar.sourceDocuments)}

----------------------------------------
ALLOWED QUESTION TYPES
----------------------------------------
Choose question types based on the assessmentType:

K–12 Types:
- multipleChoice
- trueFalse
- shortAnswer
- fillInTheBlank
- matching
- ordering
- labeling
- openResponse
- essay

AP Types:
- frq  (AP Free Response)
- dbq  (AP Document-Based Question)
- leq  (AP Long Essay Question)
- saq  (AP Short Answer Question)

Rules:
- Bell Ringer → shortAnswer, trueFalse, multipleChoice
- Exit Ticket → shortAnswer, multipleChoice
- Quiz → multipleChoice, shortAnswer, fillInTheBlank, trueFalse
- Test → all K–12 types allowed
- Worksheet → fillInTheBlank, matching, labeling, shortAnswer
- Test Review → multipleChoice, shortAnswer

AP-Specific:
- If assessmentType contains "DBQ", use dbq
- If assessmentType contains "LEQ", use leq
- If assessmentType contains "SAQ", use saq
- If assessmentType contains "FRQ", use frq
- AP questions should NOT appear in non-AP assessments

----------------------------------------
COGNITIVE LOAD & TIME ESTIMATES
----------------------------------------
Use these approximate times per question:

- trueFalse: 15–20 sec
- multipleChoice: 30–45 sec
- fillInTheBlank: 45–60 sec
- shortAnswer: 1–2 min
- matching: 2–3 min
- ordering: 2–3 min
- labeling: 2–4 min
- openResponse: 5–7 min
- essay: 10–15 min
- saq: 5–7 min
- frq: 10–15 min
- leq: 15–25 min
- dbq: 20–30 min

Ensure the total estimated time fits within the teacher's time budget.

----------------------------------------
DIFFICULTY RULES
----------------------------------------
Match bloomLevel & complexity to difficultyProfile.target:

Low difficulty (0.0–0.3):
- remember, understand
- trueFalse, multipleChoice, fillInTheBlank

Medium difficulty (0.3–0.6):
- apply, analyze
- shortAnswer, matching, ordering, labeling

High difficulty (0.6–1.0):
- evaluate, create
- openResponse, essay, frq, leq, dbq

----------------------------------------
OUTPUT FORMAT (STRICT)
----------------------------------------
Return ONLY valid JSON:

{
  "problemPayload": [
    {
      "problemId": "string",
      "question": "string",
      "answer": "string",
      "questionType": "${questionTypeList()}",
      "bloomLevel": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create",
      "complexity": number (0–1)
    }
  ]
}

Rules:
- problemId must be unique
- question must be original
- answer must be correct
- questionType must be allowed for the assessmentType
- complexity must reflect difficultyProfile.target
- Output must be valid JSON with no trailing text

Begin now.
`;
}

function formatDocs(docs?: any[]) {
  if (!docs || docs.length === 0) return "No source documents provided.";
  return docs
    .map(
      (d) =>
        `- ${d.name}: ${d.content
          .replace(/\s+/g, " ")
          .slice(0, 300)}...`
    )
    .join("\n");
}

function questionTypeList(): string {
  return [
    "multipleChoice",
    "trueFalse",
    "shortAnswer",
    "fillInTheBlank",
    "openResponse",
    "essay",
    "matching",
    "ordering",
    "labeling",
    "frq",
    "dbq",
    "leq",
    "saq",
  ].join(" | ");
}
