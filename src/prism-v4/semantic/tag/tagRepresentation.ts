import { ProblemWithMetadata } from "../extract/extractProblemMetadata";
import type { RepresentationName } from "../utils/heuristics";

export function tagRepresentation(
  problems: ProblemWithMetadata[]
): Record<string, RepresentationName> {
  const result: Record<string, RepresentationName> = {};

  for (const p of problems) {
    if (p.representation) {
      result[p.problemId] = p.representation;
      continue;
    }

    const text = (p.cleanedText || p.rawText || "").toLowerCase();
    if (/\bgraph\b|\bchart\b|\bplot\b/.test(text)) {
      result[p.problemId] = "graph";
    } else if (/\btable\b|\brow\b|\bcolumn\b/.test(text)) {
      result[p.problemId] = "table";
    } else if (/\bdiagram\b|\billustration\b/.test(text)) {
      result[p.problemId] = "diagram";
    } else if (/\bmap\b/.test(text)) {
      result[p.problemId] = "map";
    } else if (/\btimeline\b/.test(text)) {
      result[p.problemId] = "timeline";
    } else if (/\bexperiment\b|\blab\b/.test(text)) {
      result[p.problemId] = "experiment";
    } else if (/\bprimary source\b|\bexcerpt\b/.test(text)) {
      result[p.problemId] = "primarySource";
    } else if (/\bequation\b|\bsolve for\b|\b=\b/.test(text)) {
      result[p.problemId] = "equation";
    } else {
      result[p.problemId] = "paragraph";
    }
  }

  return result;
}
