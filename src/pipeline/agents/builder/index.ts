import type { GeneratedItem } from "@/pipeline/agents/writer/types";
import type { FinalAssessment, FinalAssessmentItem } from "./FinalAssessment";
import { normalizeMath } from "../../../utils/normalizeMath";
import { applyMathFormat } from "../../../utils/mathFormatters";
import type { MathFormat } from "../../../utils/mathFormatters";
import { applyLexicalCalibration } from "@/utils/lexical/Calibration";
import { formatTrueFalseItem } from "./trueFalseFormatter";
type BuilderInput =
  | GeneratedItem[]
  | { items: GeneratedItem[]; blueprint?: any };

function normalise(input: BuilderInput): { items: GeneratedItem[]; blueprint?: any } {
  if (Array.isArray(input)) return { items: input };
  return input;
}

function generateId(): string {
  return `assessment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function runBuilder(input: BuilderInput): Promise<FinalAssessment> {
  
  const { items, blueprint } = normalise(input);
 
  const plan = blueprint?.plan ?? blueprint ?? null;

  // ── Column layout decision ───────────────────────────────────────────
  // If all (or majority) items are arithmeticFluency, use column layout.
  const arithmeticCount = items.filter(i => i.questionType === "arithmeticFluency").length;
  const layout: "columns" | "singleColumn" = arithmeticCount > items.length / 2 ? "columns" : "singleColumn";

  // ── Section instructions per question type ───────────────────────────
  const SECTION_INSTRUCTIONS: Record<string, string> = {
    multipleChoice:     "Choose the best answer.",
    shortAnswer:        "Show your work when appropriate.",
    constructedResponse: "Explain your reasoning clearly.",
    trueFalse:          "Circle True or False for each statement.",
    passageBased:       "Read the passage and answer the questions.",
    arithmeticFluency:  "Solve each problem. Show your work.",
    graphInterpretation: "Use the graph to answer each question.",
    fillInTheBlank:     "Fill in each blank with the correct answer.",
    matching:           "Match each item on the left to its correct answer on the right.",
  };

  // Collect the section instructions for types actually present in this assessment
  const presentTypes = [...new Set(items.map(i => i.questionType))];
  const sectionInstructions: Record<string, string> = {};
  for (const qt of presentTypes) {
    if (SECTION_INSTRUCTIONS[qt]) sectionInstructions[qt] = SECTION_INSTRUCTIONS[qt];
  }

  /** Strip residual JSON escape artifacts and normalise typography from user-facing text strings. */
  function cleanText(s: string | undefined): string | undefined {
    if (!s) return s;
    return s
      .replace(/\\'/g, "'")              // \' → '
      .replace(/\\"/g, "'")              // \" → ' (escaped double-quote → apostrophe)
      .replace(/\\n/g, " ")              // literal \n sequence → space
      .replace(/\\t/g, " ")              // literal \t → space
      // Smart quote / typography normalisation (LLM output)
      .replace(/[\u201C\u201D]/g, '"')   // \u201C \u201D (“”) → straight double quote
      .replace(/[\u2018\u2019]/g, "'")   // \u2018 \u2019 (‘’) → straight apostrophe
      .replace(/\u2014/g, "--")           // \u2014 (—) → double hyphen
      .replace(/\u2013/g, "-")            // \u2013 (–) → hyphen
      .replace(/\u2026/g, "...")          // \u2026 (…) → ellipsis
      .trim();
  }

  const grade = parseInt(
  blueprint?.uar?.grade ?? blueprint?.uar?.gradeLevels?.[0] ?? "9",
  10
);
  const mathFmt: MathFormat = (blueprint?.uar?.mathFormat ?? "unicode") as MathFormat;

function transformText(text?: string): string | undefined {
  if (typeof text !== "string") return undefined;

  const cleaned = cleanText(text) ?? "";
  const normalized = normalizeMath(cleaned) ?? cleaned;
  const formatted  = applyMathFormat(normalized, mathFmt);
  return applyLexicalCalibration(formatted, grade);
}
  const finalItems: FinalAssessmentItem[] = items.map((item, i) => {
  // Inject "Circle T or F." for trueFalse items that lack an instruction line.
  // Applied before transformText so the injected text passes through the
  // same typography / math normalisation pipeline as the rest of the prompt.
  const formattedItem = formatTrueFalseItem(item);

  // Safety check: ensure questionType is a valid string, never undefined or the string "undefined"
  const questionType = formattedItem.questionType && formattedItem.questionType !== 'undefined'
    ? String(formattedItem.questionType)
    : 'shortAnswer'; // fallback to shortAnswer if questionType is missing or invalid
  
  if (!formattedItem.questionType || formattedItem.questionType === 'undefined') {
    console.warn(`[Builder] Item ${i + 1} (slot ${formattedItem.slotId}) has missing/invalid questionType; defaulting to shortAnswer`);
  }

  return {
    questionNumber: i + 1,
    slotId: formattedItem.slotId,
    questionType,

    prompt: transformText(formattedItem.prompt) ?? "",

    options: formattedItem.options?.map(opt => transformText(opt) ?? ""),

    answer: transformText(formattedItem.answer),

    // Passage-based: carry passage text and sub-questions through the same
    // typography / math normalization pipeline as all other text fields.
    passage:
      formattedItem.passage != null
        ? (transformText(formattedItem.passage) ?? "")
        : undefined,

    questions:
      formattedItem.questions?.map(q => ({
        prompt: transformText(q.prompt) ?? "",
        answer: transformText(q.answer) ?? "",
      })),

    metadata: formattedItem.metadata,
  };
});// answerKey removed from pipeline payload — item.answer is already on each item.
  // Cognitive distribution tally
  
  return {
    id: generateId(),
    generatedAt: new Date().toISOString(),
    items: finalItems,
    totalItems: finalItems.length,
    metadata: {
      difficultyProfile: plan?.difficultyProfile,
      orderingStrategy: plan?.orderingStrategy,
      totalEstimatedTimeSeconds: plan?.totalEstimatedTimeSeconds,
      pacingSecondsPerItem: plan?.pacingSecondsPerItem,
      layout,
      sectionInstructions,
    },
  };
}
