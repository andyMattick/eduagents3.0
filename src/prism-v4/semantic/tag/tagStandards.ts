import { ProblemWithMetadata } from "../extract/extractProblemMetadata";

export function tagStandards(
  problems: ProblemWithMetadata[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  for (const p of problems) {
    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    const standards: Record<string, number> = {};

    if (/\bfraction\b|\bfractions\b/.test(text)) {
      standards["CCSS.MATH.CONTENT.4.NF.B.3"] = 0.8;
    }

    if (/\binference\b|\binfer\b/.test(text)) {
      standards["CCSS.ELA-LITERACY.RL.4.1"] = 0.7;
    }

    if (/\bexperiment\b|\bhypothesis\b/.test(text)) {
      standards["NGSS.3-5-ETS1-3"] = 0.7;
    }

    result[p.problemId] = standards;
  }

  return result;
}
