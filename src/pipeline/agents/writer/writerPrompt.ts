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
  /** Display format for math notation — controls MATH FORMATTING CONTRACT in chunk prompt. */
  mathFormat?: "unicode" | "plain" | "latex";
  /** Arithmetic fluency: required operation (add|subtract|multiply|divide). */
  operation?: "add" | "subtract" | "multiply" | "divide";
  /** Arithmetic fluency: operand range for arithmetic slots. */
  range?: { min: number; max: number };
  /**
   * Active Writer Contract guidelines (accumulated across runs).
   * Injected verbatim at the top of every chunk prompt.
   */
  contractGuidelines?: string[];
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
  const isArithmetic = slot.questionType === "arithmeticFluency";
  const isAlgebraic = slot.questionType === "algebraicFluency";
  const isFractions = slot.questionType === "fractions";
  const isLinear = slot.questionType === "linearEquation";
  const isPassage = slot.questionType === "passageBased";

  return `
You are WRITER v5.0. Generate ONE question that satisfies the slot exactly.

GROUNDING
- Domain: ${context.domain}
- Topic: ${context.topic}
- Grade: ${context.grade}
- Unit: ${context.unitName}
- Lesson: ${context.lessonName}
- Additional Notes: ${context.additionalDetails ?? "none"}
- Focus Areas: ${JSON.stringify(context.focusAreas)}
- Misconceptions: ${JSON.stringify(context.misconceptions)}
- Avoid: ${JSON.stringify(context.avoidList)}

SLOT REQUIREMENTS
- slotId: ${slot.id}
- questionType: ${slot.questionType}
- cognitiveDemand: ${slot.cognitiveDemand}
- difficulty: ${slot.difficulty}

TEMPLATE RULES (MANDATORY)

${isArithmetic ? `
ARITHMETIC FLUENCY TEMPLATE
- Produce ONLY a bare arithmetic expression (e.g., "7 + 4")
- NO words, NO stories, NO context
- Operands range: ${context.range?.min ?? 1} to ${context.range?.max ?? 10}
- Operation: ${context.operation}
- Answer must be a single number
` : ""}

${isAlgebraic ? `
ALGEBRAIC FLUENCY TEMPLATE
- Produce ONLY symbolic algebra (no stories, no real-world context)
- Allowed tasks: simplify, combine like terms, evaluate, expand
- Use variables x or y only
- Keep expressions short (≤ 2 operations)
- Answer must be a symbolic expression or number
- NO words in the prompt except the instruction itself
` : ""}

${isFractions ? `
FRACTIONS TEMPLATE
- Use fraction notation (a)/(b)
- Tasks: add, subtract, multiply, divide, simplify
- Keep numbers small (1–12)
- Answer must be a simplified fraction
- NO stories or real-world context
` : ""}

${isLinear ? `
LINEAR EQUATION TEMPLATE
- Produce a one-step or two-step linear equation in x
- Student must solve for x
- Keep coefficients small (1–12)
- Answer must be a single number
- NO stories or real-world context
` : ""}

${isPassage ? `
PASSAGE-BASED TEMPLATE
- Include a short passage (60–90 words)
- Follow with a question stem (≤ 30 words)
- Maintain student-friendly, formal tone
` : ""}

${isMC ? `
MULTIPLE CHOICE TEMPLATE
- Provide a short stem (≤ 30 words)
- Provide exactly 4 options
- One option must match the answer exactly
` : ""}

STYLE & PACING RULES
- Keep stems short (≤ 30 words)
- Avoid multi-strand integration when scopeWidth = ${context.scopeWidth}
- Maintain student-friendly, formal tone

SCRIBE GUIDANCE
- Required Behaviors: ${scribe.requiredBehaviors?.join("; ") || "none"}
- Forbidden Behaviors: ${scribe.forbiddenBehaviors?.join("; ") || "none"}
- Compensate For: ${scribe.weaknesses?.join("; ") || "none"}

OUTPUT FORMAT (MANDATORY — RAW FIELDS ONLY)
Return ONLY the following fields, with NO code fences, NO JSON object wrapper, and NO extra text:

slotId: "${slot.id}"
questionType: "${slot.questionType}"
prompt: <the question stem the student sees>
${isMC ? `options: ["A", "B", "C", "D"]` : `options: null`}
answer: <the correct answer>
`;
}
