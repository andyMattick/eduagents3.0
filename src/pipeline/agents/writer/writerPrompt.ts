import type { BlueprintPlanV3_2 } from "@/pipeline/contracts/BlueprintPlanV3_2";

export interface WriterContext {
  domain: string;
  topic: string;
  grade: string;
  unitName: string;
  lessonName: string | null;
  additionalDetails: string | null;
  focusAreas: string[] | null;
  misconceptions: string[] | null;
  avoidList: string[] | null;
  scopeWidth: BlueprintPlanV3_2["scopeWidth"];
  previousSlotsSummary: {
    id: string;
    questionType: string;
    cognitiveDemand: string;
    difficulty: string;
    topicAngle?: string;
  }[];
}

export interface ScribePrescriptions {
  weaknesses: string[];
  requiredBehaviors: string[];
  forbiddenBehaviors: string[];
}

export function buildWriterPrompt(
  slot: BlueprintPlanV3_2["slots"][number],
  context: WriterContext,
  scribe: ScribePrescriptions
): string {
  const isMC = slot.questionType === "multipleChoice";

  return `
You are WRITER v4.0. Generate ONE question that satisfies the slot exactly.

GROUNDING (MANDATORY)
- Domain: ${context.domain}
- Topic: ${context.topic}
- Grade: ${context.grade}
- Unit: ${context.unitName}
- Lesson: ${context.lessonName}
- Additional Notes: ${context.additionalDetails ?? "none"}
- Focus Areas: ${JSON.stringify(context.focusAreas)}
- Misconceptions: ${JSON.stringify(context.misconceptions)}
- Avoid: ${JSON.stringify(context.avoidList)}

SLOT REQUIREMENTS (MANDATORY)
- slotId: ${slot.id}
- questionType: ${slot.questionType}
- cognitiveDemand: ${slot.cognitiveDemand}
- difficulty: ${slot.difficulty}

SCRIBE BEHAVIORAL GUIDANCE
Required Behaviors: ${scribe.requiredBehaviors?.join("; ") || "none"}
Forbidden Behaviors: ${scribe.forbiddenBehaviors?.join("; ") || "none"}
Compensate For: ${scribe.weaknesses?.join("; ") || "none"}

OUTPUT FORMAT (STRICT JSON ONLY)
{
  "slotId": "${slot.id}",
  "questionType": "${slot.questionType}",
  "prompt": "<question stem>",
  ${isMC ? `"options": ["...", "...", "...", "..."],` : ""}
  "answer": "<correct answer>"
}
`;
}

