/**
 * writerChunkPrompt.ts
 *
 * Builds the multi-slot Writer prompt. The LLM is instructed to emit one
 * standalone JSON object per slot, terminated by <END_OF_PROBLEM>.
 *
 * No arrays, no wrappers, no commentary — just sequential delimited objects.
 */

import type { BlueprintPlanV3_2 } from "pipeline/contracts/BlueprintPlanV3_2";
import type { WriterContext, ScribePrescriptions } from "../writerPrompt.ts";
import { END_SENTINEL } from "./parseChunk";
import { buildBloomHintDirectives, type HintMode } from "../bloomHints";
import { loadTemplate } from "../templates/registry";

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

  const mathFmt = context.mathFormat ?? "unicode";
  const topicBase = context.topic ?? "the topic";

  // Writer Contract guidelines from the active run
  const contractSection = context.contractGuidelines && context.contractGuidelines.length > 0
    ? `\nWRITER CONTRACT (mandatory — overrides all other defaults)\n${context.contractGuidelines.map(g => `- ${g}`).join("\n")}\n`
    : "";

  // Build the MATH FORMATTING CONTRACT based on the requested format
  const mathContract = mathFmt === "unicode"
    ? `MATH FORMATTING CONTRACT — UNICODE MODE (mandatory for every question prompt and answer)
- Fractions: write as (numerator)/(denominator)              e.g. "(4x − 5)/(x + 2)"
- Radicals:  write as √(expression) with parentheses         e.g. "√(x + 7)", "√(2x − 1)"
- Logarithms: write as log(expression)                       e.g. "log(x + 3)"
- Exponents: use Unicode superscripts: x², x³, (x+3)²       do NOT write x^2
- Multiplication: use dot notation: 4·3                      do NOT write 4*3 or 4x separately
- Unicode fractions: use ½, ⅓, ⅔ where appropriate
- Negatives: attach minus directly to its value              write "−5x" not "− 5x"
- Always use parentheses for grouping compound expressions`
    : mathFmt === "latex"
    ? `MATH FORMATTING CONTRACT — LATEX MODE (mandatory for every question prompt and answer)
- Fractions: \\frac{numerator}{denominator}
- Radicals:  \\sqrt{expression}
- Exponents: x^{2}, (x+3)^{2}
- Negatives: -5x (no space after minus)
- Always wrap LaTeX in \\( ... \\) for inline, \\[ ... \\] for display`
    : `MATH FORMATTING CONTRACT — PLAIN MODE (mandatory for every question prompt and answer)
- Fractions: write as (numerator)/(denominator)              e.g. "(4x - 5)/(x + 2)"
- Radicals:  write as sqrt(expression)                       e.g. "sqrt(x + 7)"
- Exponents: write as x^2, x^(-1), (x+3)^2
- Negatives: attach minus directly to its value              write "-5x" not "- 5x"
- Coefficients: write as 3x, not "3*x" or "3 x"`;

  const slotDescriptions = slots
    .map(
      (slot, i) => {
        const hint = hintMap.get(slot.id) ?? "";
        const slotOp    = (slot as any).operation;
        const slotRange = (slot as any).range;
        const templatePrompt = buildTemplatePromptForSlot(slot, context);

        let extra = "";
        if (templatePrompt) {
          extra += `\n  TEMPLATE CONTRACT (mandatory): Generate the item using this template instruction as the primary stem specification: ${JSON.stringify(templatePrompt)}`;
        }
        if (slot.questionType === "arithmeticFluency" && slotOp && slotRange) {
          extra += `\n  ARITHMETIC CONSTRAINT: Operation MUST be "${slotOp}". Both operands MUST be between ${slotRange.min} and ${slotRange.max}. Write as a bare expression only (e.g. "7 × 4").`;
        }
        if (slot.questionType === "passageBased") {
          // Prefer structured constraints.passageBased; fall back to flat constraints.passageLength (legacy)
          const pbCfg = (slot.constraints as any)?.passageBased as { passageLength?: string; questionCount?: number } | undefined;
          const passageLength = pbCfg?.passageLength ?? (slot.constraints as any)?.passageLength ?? "medium";
          const questionCount = pbCfg?.questionCount ?? 3;
          const wordRange =
            passageLength === "short"  ? "100–150"  :
            passageLength === "long"   ? "250–350"  : "150–250";
          extra += `\n  PASSAGE-BASED CONTRACT (hard — zero exceptions):
  - Output MUST use the passage-based JSON shape (see OUTPUT FORMAT below).
  - "passage": a self-contained reading passage of ${wordRange} words relevant to the topic.
  - "questions": an array of exactly ${questionCount} objects, each with "prompt" and "answer".
  - Every question MUST reference the passage directly — no fact outside the passage.
  - "prompt" field on the item: set to "" (empty string) — the passage replaces it.
  - Do NOT embed the passage inside "prompt". Use the top-level "passage" key.`;
        }
        if (slot.questionType === "graphInterpretation") {
          extra += `\n  GRAPH REQUIREMENT: No actual image can be shown. Embed a concrete data set or table directly in the prompt text (e.g. a small x/y value table, a described trend, or a specific set of plotted points). Write the question so it is fully self-contained and answerable from the embedded data — do NOT write placeholder text like "[See graph]" or "Refer to the graph below"`;
        }

        return `
SLOT ${i + 1}
  slotId: ${slot.id}
  questionType: ${slot.questionType}
  cognitiveDemand: ${slot.cognitiveDemand}
  difficulty: ${slot.difficulty}
  topicAngle: ${(slot as any).topicAngle ?? topicBase}
  bloomIntent: ${hint}${extra}`;
      }
    )
    .join("\n");

  const outputExamples = slots
    .map((slot) => {
      const isMC = slot.questionType === "multipleChoice";
      const isPassage = slot.questionType === "passageBased";
      if (isMC) {
        return `{ "slotId": "${slot.id}", "questionType": "multipleChoice", "prompt": "<stem>", "options": ["A. <option A>", "B. <option B>", "C. <option C>", "D. <option D>"], "answer": "B. <option B>" }\n${END_SENTINEL}`;
      }
      if (isPassage) {
        const pbCfg = (slot.constraints as any)?.passageBased as { questionCount?: number } | undefined;
        const qCount = pbCfg?.questionCount ?? 3;
        const qArray = Array.from({ length: qCount }, (_, i) =>
          `{ "prompt": "<question ${i + 1}>", "answer": "<model answer ${i + 1}>" }`
        ).join(", ");
        return `{ "slotId": "${slot.id}", "questionType": "passageBased", "prompt": "", "passage": "<reading passage text>", "questions": [${qArray}] }\n${END_SENTINEL}`;
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
${contractSection}
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

DIAGRAM / IMAGE RULE (hard rule — zero exceptions)
- NEVER include placeholder text such as "[Graph here]", "[See diagram]", "[Image]", "[Refer to figure]", "Use the graph below", or any similar text that implies a visual the student cannot see.
- If a question conceptually involves a graph or diagram and no actual image is present, embed the necessary data directly in the question text (e.g. a small table of values, a described function, or explicit coordinate pairs).
- graphInterpretation slots must be fully self-contained using embedded data only.

SINGLE-TYPE CONTRACT (hard rule — zero exceptions)
- Each slot has ONE questionType. Produce EXACTLY that type — nothing else.
- NEVER merge two question formats into a single prompt stem. Forbidden hybrid patterns:
    ✗ Analytical/short-answer preamble followed by "True or False: ..."
    ✗ "Answer the following, then choose: ..."
    ✗ Any stem requiring BOTH a written response AND a T/F, MCQ, or fill-in answer
- A trueFalse slot = ONE declarative T/F statement only. No multi-sentence preamble that itself asks for analysis.
- A shortAnswer slot = ONE open-ended question only. No appended T/F or MCQ at the end.
- If a topic demands multiple question types, the blueprint already has separate slots for each. Your job is to honour each slot in isolation.

${mathContract}

SCRIBE BEHAVIORAL GUIDANCE
Required Behaviors: ${scribe.requiredBehaviors?.join("; ") || "none"}
Forbidden Behaviors: ${scribe.forbiddenBehaviors?.join("; ") || "none"}
Compensate For: ${scribe.weaknesses?.join("; ") || "none"}

SLOTS TO GENERATE
Each slot includes a "bloomIntent" line — this is MANDATORY guidance. Use the listed verbs and
follow the stated structure note. The exampleStarter shows a template you can adapt to the topic.
Each slot also includes a "topicAngle" — a UNIQUE scenario lens for that slot. Write the question
around that specific angle so no two questions in the full assessment cover the same scenario.
${slotDescriptions}

OUTPUT FORMAT (STRICT)
- Output ONE JSON object per slot, in slot order.
- Each object must be terminated immediately by: ${END_SENTINEL}
- No arrays. No outer wrappers. No commentary. No markdown fences.
- For multipleChoice: include "options" array with exactly 4 strings.
- For passageBased: include "passage" (string) and "questions" (array of {prompt, answer}). Set "prompt" to "".
- For other types: omit "options".

${mcqRule}EXAMPLE OUTPUT SHAPE
${outputExamples}
`;
}

function buildTemplatePromptForSlot(
  slot: BlueprintPlanV3_2["slots"][number],
  context: WriterContext
): string | null {
  if (!(slot as any).templateId) return null;

  const template = loadTemplate({
    slotId: slot.id,
    questionType: slot.questionType,
    difficulty: (slot.difficulty ?? "medium") as "easy" | "medium" | "hard",
    cognitiveDemand: slot.cognitiveDemand ?? null,
    pacingSeconds: slot.pacingSeconds ?? null,
    topicAngle: (slot as any).topicAngle ?? context.topic,
    generationMethod: "template",
    templateId: (slot as any).templateId ?? null,
    diagramType: null,
    imageReferenceId: null,
    teacherProfile: {
      gradeLevel: context.grade,
    } as any,
    courseProfile: {
      subject: context.domain,
      taskType: (slot.constraints as any)?.taskType ?? null,
    } as any,
  });

  return template.prompt;
}
