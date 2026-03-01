import type { GeneratedItem } from "@/pipeline/agents/writer/types";
import type { FinalAssessment, FinalAssessmentItem } from "./FinalAssessment";
import { normalizeMath } from "../../../utils/normalizeMath";
import { applyMathFormat } from "../../../utils/mathFormatters";
import type { MathFormat } from "../../../utils/mathFormatters";
import { applyLexicalCalibration } from "@/utils/lexical/Calibration";
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
  const slot = plan?.slots?.find((s: any) => s.id === item.slotId);

  return {
    questionNumber: i + 1,
    slotId: item.slotId,
    questionType: item.questionType,

    prompt: transformText(item.prompt) ?? "",

    options: item.options?.map(opt => transformText(opt) ?? ""),

    answer: transformText(item.answer),

    
    metadata: item.metadata,
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
    },
  };
}
