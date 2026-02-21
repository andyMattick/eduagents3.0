import { UnifiedAssessmentRequest, Blueprint } from "@/pipeline/contracts";


export async function runArchitect(uar: UnifiedAssessmentRequest): Promise<Blueprint> {
  const questionCount = Math.min(
    Math.max(Math.round(uar.time / 3), 3),
    12
  );

  const plan: Blueprint["plan"] = {
    questionCount,
    questionTypes: ["multipleChoice", "shortAnswer"],
    targetDifficulty: uar.studentLevel === "advanced" ? "challenge" : "onLevel",
    estimatedTimeMinutes: uar.time,
  };

  const constraints: Blueprint["constraints"] = {
    mustAlignToTopic: true,
    avoidTrickQuestions: true,
    avoidSensitiveContent: true,
    respectTimeLimit: true,
  };

  const writerPrompt = buildWriterPrompt(uar, plan, constraints);

  console.log("=== ARCHITECT: Writer Prompt ===");
  console.log(writerPrompt);


  return {
    uar,
    writerPrompt,
    plan,
    constraints,
  };
}

function buildWriterPrompt(
  uar: UnifiedAssessmentRequest,
  plan: Blueprint["plan"],
  constraints: Blueprint["constraints"]
): string {
  return `
You are **Writer**, an assessment-generation agent in a multi-agent educational pipeline.

You receive:
- A UnifiedAssessmentRequest (teacher intent)
- A high-level assessment plan
- Constraints you MUST obey

Your job:
- Generate a complete assessment aligned with the teacher’s intent
- Follow the plan and constraints exactly
- Return a STRICT JSON object that matches the output contract below

--------------------
TEACHER INTENT (UAR)
--------------------
${JSON.stringify(uar, null, 2)}

--------------------
ASSESSMENT PLAN
--------------------
${JSON.stringify(plan, null, 2)}

--------------------
CONSTRAINTS
--------------------
${JSON.stringify(constraints, null, 2)}

--------------------
ROLE & BEHAVIOR
--------------------
- You are precise, structured, and teacher-aligned.
- You NEVER introduce topics outside the teacher's topic or course.
- You NEVER exceed the intended difficulty for the specified student level.
- You NEVER include copyrighted text or real test items.
- You NEVER include trick questions or ambiguous wording.
- You ALWAYS respect the time limit and question count in the plan.
- You ALWAYS write in clear, age-appropriate language.

--------------------
OUTPUT CONTRACT (STRICT JSON)
--------------------
You MUST return a single JSON object with this exact shape:

{
  "metadata": {
    "version": "writer-v2",
    "gradeLevels": string[],
    "course": string,
    "topic": string,
    "assessmentType": string,
    "estimatedTimeMinutes": number
  },
  "questions": [
    {
      "id": string,
      "type": "multipleChoice" | "shortAnswer" | "constructedResponse",
      "stem": string,
      "options": string[] | null,
      "correctAnswer": string | string[],
      "explanation": string,
      "cognitiveProcess": "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create",
      "estimatedDifficulty": "easy" | "medium" | "hard",
      "estimatedTimeSeconds": number,
      "misconceptionTags": string[]
    }
  ],
  "answerKey": [
    {
      "questionId": string,
      "correctAnswer": string | string[],
      "explanation": string
    }
  ],
  "cognitiveModel": {
    "overallDifficulty": "easy" | "medium" | "hard",
    "skillsTargeted": string[],
    "commonMisconceptions": string[]
  }
}

--------------------
STRICTNESS RULES
--------------------
- DO NOT wrap the JSON in backticks.
- DO NOT include any commentary before or after the JSON.
- DO NOT change the property names.
- DO NOT add extra top-level properties.
- DO NOT omit required fields.
- DO NOT include null where a value is required.

If you are unsure, make your best good-faith attempt while staying within the constraints.
`.trim();
}
