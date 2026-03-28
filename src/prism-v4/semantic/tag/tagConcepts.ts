import { ProblemWithMetadata } from "../extract/extractProblemMetadata";
import { extractKeywords } from "../utils/textUtils";

const CONCEPT_RULES: Array<{ terms: string[]; tag: string }> = [
  { terms: ["fraction", "fractions", "numerator", "denominator"], tag: "math.fractions" },
  { terms: ["equivalent", "equivalent fractions"], tag: "math.equivalent-fractions" },
  { terms: ["decimal", "decimals"], tag: "math.decimals" },
  { terms: ["ratio", "ratios", "proportional"], tag: "math.ratios" },
  { terms: ["equation", "equations", "algebra", "variable", "slope"], tag: "math.algebra" },
  { terms: ["infer", "inference", "evidence", "theme"], tag: "reading.inference" },
  { terms: ["area", "perimeter", "rectangle", "triangle"], tag: "math.geometry" },
  { terms: ["ecosystem", "ecosystems", "producer", "consumer", "decomposer"], tag: "science.ecosystems" },
  { terms: ["cell", "cells", "chloroplast", "photosynthesis"], tag: "science.cells" },
  { terms: ["force", "forces", "motion"], tag: "science.forces" },
  { terms: ["experiment", "hypothesis", "variable"], tag: "science.inquiry" },
  { terms: ["government", "culture", "timeline", "geography", "historical"], tag: "socialstudies.history" },
  { terms: ["source", "author", "document", "speech"], tag: "socialstudies.source-analysis" },
];

export function tagConcepts(
  problems: ProblemWithMetadata[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  for (const p of problems) {
    const text = p.cleanedText || p.rawText || "";
    const keywords = extractKeywords(text);
    const conceptScores: Record<string, number> = {};

    for (const kw of keywords) {
      for (const rule of CONCEPT_RULES) {
        if (rule.terms.includes(kw)) {
          conceptScores[rule.tag] = (conceptScores[rule.tag] ?? 0) + 1;
        }
      }
    }

    if (Object.keys(conceptScores).length === 0) {
      conceptScores["general.comprehension"] = 1;
    }

    result[p.problemId] = conceptScores;
  }

  return result;
}
