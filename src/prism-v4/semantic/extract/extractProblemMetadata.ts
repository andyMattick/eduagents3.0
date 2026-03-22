import { Problem } from "../../schema/domain/Problem";
import type { ProblemTagVector } from "../../schema/semantic";
import { clamp01, type ProblemTypeName, type RepresentationName } from "../utils/heuristics";
import { normalizeWhitespace } from "../utils/textUtils";

export interface ProblemWithMetadata extends Problem {
  problemType: ProblemTypeName;
  representation: RepresentationName;
  multiStep: number;
  steps: number;
  abstractionLevel: number;
  answerChoices: string[];
}

export function extractProblemMetadata(
  problems: Problem[],
  tablesByProblemId: Record<string, NonNullable<ProblemTagVector["azure"]>["tables"]>
): ProblemWithMetadata[] {
  return problems.map((p) => {
    const text = normalizeWhitespace(p.cleanedText || p.rawText || "");
    const lower = text.toLowerCase();
    const answerChoices = [...text.matchAll(/(?:^|\n)\s*(?:[A-D]|[1-4])[.)]\s+(.+)/gim)].map((match) => normalizeWhitespace(match[1]));

    let problemType: ProblemTypeName = "constructedResponse";
    if (/\btrue\s+or\s+false\b/i.test(text)) {
      problemType = "trueFalse";
    } else if (/\bselect all\b/i.test(text)) {
      problemType = "multipleSelect";
    } else if (answerChoices.length >= 2 || /multiple choice/i.test(text)) {
      problemType = "multipleChoice";
    } else if (/\bfill in the blank\b/i.test(text)) {
      problemType = "fillInBlank";
    } else if (/\bshort answer\b/i.test(text) || text.length < 120) {
      problemType = "shortAnswer";
    }

    let representation: RepresentationName = "paragraph";
    if ((tablesByProblemId[p.problemId] ?? []).length > 0) {
      representation = "table";
    } else if (/\bgraph\b|\bplot\b|\bchart\b/i.test(lower)) {
      representation = "graph";
    } else if (/\bmap\b/i.test(lower)) {
      representation = "map";
    } else if (/\btimeline\b/i.test(lower)) {
      representation = "timeline";
    } else if (/\bexperiment\b|\blab\b/i.test(lower)) {
      representation = "experiment";
    } else if (/\bprimary source\b|\bexcerpt\b/i.test(lower)) {
      representation = "primarySource";
    } else if (/\bdiagram\b|\billustration\b/i.test(lower)) {
      representation = "diagram";
    } else if (/\bequation\b|\bsolve for\b|\b=\b/.test(text)) {
      representation = "equation";
    }

    const stepMarkers = text.match(/\b(?:then|next|after that|finally|show|explain|justify|compare|analyze)\b/gi) ?? [];
    const steps = Math.max(1, /\bpart\s+[a-z0-9]+\b/gi.test(lower) ? stepMarkers.length + 1 : Math.max(1, Math.ceil(stepMarkers.length / 2) + 1));
    const multiStep = steps > 1 ? 1 : 0;
    const abstractionLevel = clamp01(
      (["justify", "analyze", "infer", "evaluate", "generalize"].filter((keyword) => lower.includes(keyword)).length +
        (representation === "equation" || representation === "graph" ? 1 : 0)) /
        6,
    );

    return {
      ...p,
      problemType,
      representation,
      multiStep,
      steps,
      abstractionLevel,
      answerChoices,
    };
  });
}
