/**
 * writerChunkPrompt.ts
 *
 * Builds the multi-slot Writer prompt. The LLM is instructed to emit one
 * standalone JSON object per slot, terminated by <END_OF_PROBLEM>.
 *
 * No arrays, no wrappers, no commentary — just sequential delimited objects.
 */

import type { BlueprintPlanV3_2 } from "@/pipeline/contracts/BlueprintPlanV3_2";
import type { WriterContext, ScribePrescriptions } from "../writerPrompt";
import { END_SENTINEL } from "./parseChunk";

export function buildChunkPrompt(
  slots: BlueprintPlanV3_2["slots"],
  context: WriterContext,
  scribe: ScribePrescriptions
): string {
  const slotDescriptions = slots
    .map(
      (slot, i) => `
SLOT ${i + 1}
  slotId: ${slot.id}
  questionType: ${slot.questionType}
  cognitiveDemand: ${slot.cognitiveDemand}
  difficulty: ${slot.difficulty}`
    )
    .join("\n");

  const outputExamples = slots
    .map((slot) => {
      const isMC = slot.questionType === "multipleChoice";
      if (isMC) {
        return `{ "slotId": "${slot.id}", "questionType": "${slot.questionType}", "prompt": "<stem>", "options": ["A","B","C","D"], "answer": "<answer>" }\n${END_SENTINEL}`;
      }
      // Non-MC: omit "options" entirely — do NOT output undefined
      return `{ "slotId": "${slot.id}", "questionType": "${slot.questionType}", "prompt": "<stem>", "answer": "<answer>" }\n${END_SENTINEL}`;
    })
    .join("\n");

  return `
You are WRITER v4.0. Generate exactly ${slots.length} question(s), one per slot below.

GROUNDING (MANDATORY FOR ALL SLOTS)
- Domain: ${context.domain}
- Topic: ${context.topic}
- Grade: ${context.grade}
- Unit: ${context.unitName}
- Lesson: ${context.lessonName ?? "N/A"}
- Additional Notes: ${context.additionalDetails ?? "none"}
- Focus Areas: ${JSON.stringify(context.focusAreas)}
- Misconceptions: ${JSON.stringify(context.misconceptions)}
- Avoid: ${JSON.stringify(context.avoidList)}
- Scope Width: ${context.scopeWidth}

COGNITIVE DEMAND DEFINITIONS
- remember → recall only
- understand → explanation or meaning
- apply → use a procedure
- analyze → compare, categorize, or decompose
- evaluate → judge or justify with reasons
- create → design, generate, or construct something new

SCRIBE BEHAVIORAL GUIDANCE
Required Behaviors: ${scribe.requiredBehaviors?.join("; ") || "none"}
Forbidden Behaviors: ${scribe.forbiddenBehaviors?.join("; ") || "none"}
Compensate For: ${scribe.weaknesses?.join("; ") || "none"}

SLOTS TO GENERATE
${slotDescriptions}

OUTPUT FORMAT (STRICT)
- Output ONE JSON object per slot, in slot order.
- Each object must be terminated immediately by: ${END_SENTINEL}
- No arrays. No outer wrappers. No commentary. No markdown fences.
- For multipleChoice: include "options" array with exactly 4 strings.
- For other types: omit "options".

EXAMPLE OUTPUT SHAPE
${outputExamples}
`;
}
