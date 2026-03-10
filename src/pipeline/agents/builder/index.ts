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

// --- TEMPLATE → WRITER FIELD NORMALIZATION -------------------------
// --- TEMPLATE → WRITER FIELD NORMALIZATION -------------------------
function normalizeTemplateFields(item: any) {
  if (item.problemText && !item.prompt) {
    item.prompt = item.problemText;
  }

  if (item.correctAnswer && !item.answer) {
    item.answer = item.correctAnswer;
  }

  if (!item.questionType && item.problemType) {
    item.questionType = item.problemType;
  }

  if (!Array.isArray(item.options)) {
    item.options = null;
  }

  if (!Array.isArray(item.questions)) {
    item.questions = undefined;
  }

  return item;
}


export async function runBuilder(input: BuilderInput): Promise<FinalAssessment> {
  const { items, blueprint } = normalise(input);
  const plan = blueprint?.plan ?? blueprint ?? null;

  const arithmeticCount = items.filter(i => i.questionType === "arithmeticFluency").length;
  const layout: "columns" | "singleColumn" =
    arithmeticCount > items.length / 2 ? "columns" : "singleColumn";

  const SECTION_INSTRUCTIONS: Record<string, string> = {
    multipleChoice:      "Choose the best answer.",
    shortAnswer:         "Show your work when appropriate.",
    constructedResponse: "Explain your reasoning clearly.",
    trueFalse:           "Circle True or False for each statement.",
    passageBased:        "Read the passage and answer the questions.",
    arithmeticFluency:   "Solve each problem. Show your work.",
    graphInterpretation: "Use the graph to answer each question.",
    fillInTheBlank:      "Fill in each blank with the correct answer.",
    matching:            "Match each item on the left to its correct answer on the right.",
  };

  const presentTypes = [...new Set(items.map(i => i.questionType))];
  const sectionInstructions: Record<string, string> = {};
  for (const qt of presentTypes) {
    if (SECTION_INSTRUCTIONS[qt]) sectionInstructions[qt] = SECTION_INSTRUCTIONS[qt];
  }

  function cleanText(s: string | undefined): string | undefined {
    if (!s) return s;
    return s
      .replace(/\\'/g, "'")
      .replace(/\\"/g, "'")
      .replace(/\\n/g, " ")
      .replace(/\\t/g, " ")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\u2014/g, "--")
      .replace(/\u2013/g, "-")
      .replace(/\u2026/g, "...")
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
    const formatted = applyMathFormat(normalized, mathFmt);
    return applyLexicalCalibration(formatted, grade);
  }

const finalItems: FinalAssessmentItem[] = items.map((item, i) => {
  const normalized = normalizeTemplateFields(item);
  const formattedItem = formatTrueFalseItem(normalized);

  const questionType =
    formattedItem.questionType && formattedItem.questionType !== "undefined"
      ? String(formattedItem.questionType)
      : "shortAnswer";

      function renderShortAnswer(item: any) {
        return {
          prompt: transformText(item.prompt) ?? "",
          answer: transformText(item.answer) ?? ""
        };
      }

            
      if (questionType === "shortAnswer") {
        const sa = renderShortAnswer(formattedItem);
        return {
          questionNumber: i + 1,
          slotId: formattedItem.slotId,
          questionType,
          prompt: sa.prompt,
          answer: sa.answer,
          metadata: formattedItem.metadata
        };
      }


  return {
    questionNumber: i + 1,
    slotId: formattedItem.slotId,
    questionType,

    prompt: transformText(formattedItem.prompt) ?? "",

options: Array.isArray(formattedItem.options)
  ? formattedItem.options.map((opt: string) => transformText(opt) ?? "")
  : undefined,

    answer: transformText(formattedItem.answer),

    passage:
      formattedItem.passage != null
        ? (transformText(formattedItem.passage) ?? "")
        : undefined,

questions: Array.isArray(formattedItem.questions)
  ? formattedItem.questions.map((q: { prompt: string; answer: string }) => ({
      prompt: transformText(q.prompt) ?? "",
      answer: transformText(q.answer) ?? "",
    }))
  : undefined,


    metadata: formattedItem.metadata,
  };
});


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
