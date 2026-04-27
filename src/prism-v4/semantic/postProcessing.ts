import type { Problem } from "../schema/domain";
import { analyzeCheatingVulnerabilities } from "./generators/antiCheating";
import { generateEnrichments } from "./generators/enrichments";
import { generateNarrativeBundle } from "./generators/narrative";
import { generateScaffolds } from "./generators/scaffolds";

export function applyPostSemanticProcessing(problem: Problem): Problem {
  if (!problem.tags) {
    return problem;
  }

  return {
    ...problem,
    narrative: generateNarrativeBundle(problem.tags),
    scaffolds: generateScaffolds(problem.tags),
    enrichments: generateEnrichments(problem.tags),
    antiCheating: analyzeCheatingVulnerabilities(problem.tags),
  };
}