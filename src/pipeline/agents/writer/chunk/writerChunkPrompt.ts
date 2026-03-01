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
import { buildBloomHintDirectives, type HintMode } from "../bloomHints";

export function buildChunkPrompt(
  slots: BlueprintPlanV3_2["slots"],
  context: WriterContext,
  scribe: ScribePrescriptions,
  /** Bloom hint verbosity mode from the budget algorithm. Defaults to FULL. */
  hintMode: HintMode = "FULL"
): string {
  // Pre-compute per-slot Bloom intent directives (mode-aware)
  const bloomDirectives = buildBloomHintDirectives(slots, hintMode);
  const hintMap = new Map(bloomDirectives.map(d => [d.slotId, d.directive]));

  const slotDescriptions = slots
    .map(
      (slot, i) => {
        const hint = hintMap.get(slot.id) ?? "";
        return `
SLOT ${i + 1}
  slotId: ${slot.id}
  questionType: ${slot.questionType}
  cognitiveDemand: ${slot.cognitiveDemand}
  difficulty: ${slot.difficulty}
  bloomIntent: ${hint}`;
      }
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

STEM VARIETY (mandatory — applies to EVERY slot in this batch)
- No two question prompts may begin with the same word or phrase.
- Overused starters to actively AVOID (use each at most once across all slots): "What is", "Which of the following", "Which one", "What are".
- Draw from varied openers: "Explain...", "Calculate...", "Compare...", "A student notices...", "Given that...", "Identify...", "Describe...", "Why does...", "How would...", "Determine...", "In the context of...", "A researcher finds...".
- Each question must have a distinctly different opening phrase than every other question in this batch.

STEM NATURALISM (hard rule — zero exceptions unless teacher notes explicitly request otherwise)
- NEVER begin a prompt with: "In [Course]...", "In the study of...", "In this lesson...", "As part of...", "When learning about...", "In Algebra...", "In Biology...", or any course/unit name as a preamble.
- NEVER add meta-commentary explaining the academic context (e.g. "Demonstrate your understanding of... by...").
- Start as close to the cognitive task as possible. Prefer imperative form for procedural tasks.
- The course, unit, and topic are context FOR YOU — do not echo them into the student-facing stem.
- Bloom-keyed preferred opening patterns:
    remember   → "Define...", "State...", "Identify...", "List the steps..."
    understand → "Explain why...", "Describe how...", "What is the difference between..."
    apply      → Direct imperative: "Factor...", "Solve...", "Calculate...", "Simplify..."
    analyze    → "Compare...", "Identify the error in...", "Examine the relationship between..."
    evaluate   → "Which approach is more efficient and why?", "Justify...", "Critique..."
    create     → "Design...", "Construct...", "Develop a model that..."

MATH FORMATTING CONTRACT (mandatory for every question prompt and answer)
- Fractions: write as (numerator)/(denominator)        e.g. "(4x - 5)/(x + 2)"
- Radicals:  write as √(expression) with parentheses   e.g. "√(x + 7)", "√(2x - 1)"
- Exponents: write as x^2, x^(-1), (x+3)^2            do NOT use Unicode superscripts
- Negatives: attach minus directly to its value        write "-5x" not "- 5x"
- Coefficients: write as 3x, not "3·x", "3 x", or "3*x"

SCRIBE BEHAVIORAL GUIDANCE
Required Behaviors: ${scribe.requiredBehaviors?.join("; ") || "none"}
Forbidden Behaviors: ${scribe.forbiddenBehaviors?.join("; ") || "none"}
Compensate For: ${scribe.weaknesses?.join("; ") || "none"}

SLOTS TO GENERATE
Each slot includes a "bloomIntent" line — this is MANDATORY guidance. Use the listed verbs and
follow the stated structure note. The exampleStarter shows a template you can adapt to the topic.
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
