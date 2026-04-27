import { ProblemWithMetadata } from "../extract/extractProblemMetadata";

export function tagMisconceptionTriggers(
  problems: ProblemWithMetadata[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  for (const p of problems) {
    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    const triggers: Record<string, number> = {};

    if (/\bfraction\b|\bfractions\b/.test(text) && /\bgreater\b|\bless\b/.test(text)) {
      triggers["fractionMagnitude"] = 0.8;
    }

    if (/\barea\b/.test(text) && /\bperimeter\b/.test(text)) {
      triggers["areaVsPerimeter"] = 0.9;
    }

    if (/\bnegative\b|\bminus\b/.test(text) && /\bsubtract\b/.test(text)) {
      triggers["integerSubtraction"] = 0.7;
    }

    if (/\binfer\b|\binference\b/.test(text) && /\bevidence\b/.test(text)) {
      triggers["evidenceVsOpinion"] = 0.65;
    }

    result[p.problemId] = triggers;
  }

  return result;
}
