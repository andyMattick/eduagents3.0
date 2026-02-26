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
        return `{ "slotId": "${slot.id}", "questionType": "multipleChoice", "prompt": "<stem>", "options": ["A. <option A>", "B. <option B>", "C. <option C>", "D. <option D>"], "answer": "B. <option B>" }\n${END_SENTINEL}`;
      }
      // Non-MC: omit "options" entirely — do NOT output undefined
      return `{ "slotId": "${slot.id}", "questionType": "${slot.questionType}", "prompt": "<stem>", "answer": "<answer text>" }\n${END_SENTINEL}`;
    })
    .join("\n");

  // MCQ answer rule injected once, applies to all MC slots in the batch
  const hasMC = slots.some((s) => s.questionType === "multipleChoice");
  const mcqRule = hasMC
    ? `MCQ CONTRACT (mandatory for all multipleChoice slots):
- "options": exactly 4 strings, each prefixed with its letter: "A. ...", "B. ...", "C. ...", "D. ..."
- "answer": the FULL text of the correct option (e.g. "B. Find a common denominator") — NOT just the letter.
- The "answer" value MUST be an exact copy of one of the "options" strings.

`
    : "";

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
- remember   → recall only
- understand → explanation or meaning
- apply      → use a procedure
- analyze    → compare, categorize, or decompose
- evaluate   → judge or justify with reasons
- create     → design, generate, or construct something new

BLOOM ACTION VERBS (every question prompt MUST use at least one verb from its level)
  remember   → name, list, recall, identify, define, state
  understand → explain, describe, summarize, classify, paraphrase, interpret
  apply      → calculate, solve, use, demonstrate, show how, compute
  analyze    → compare, contrast, distinguish, categorize, examine, trace, identify differences
  evaluate   → judge, justify, assess, defend, critique, evaluate, argue
  create     → design, construct, develop, compose, generate, formulate

ANALYZE CONTRACT (mandatory for all analyze slots)
- The prompt MUST require comparison, error-detection, or multi-step reasoning.
- The prompt must NOT be answerable by simple recall.
- Include at least one of: "compare", "contrast", "identify the error", "explain why", "trace the steps".

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

${mcqRule}EXAMPLE OUTPUT SHAPE
${outputExamples}
`;
}
