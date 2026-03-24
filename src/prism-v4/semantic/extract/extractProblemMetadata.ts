import { Problem } from "../../schema/domain/Problem";
import type { ProblemTagVector } from "../../schema/semantic";
import { clamp01, type ProblemTypeName, type RepresentationName } from "../utils/heuristics";
import { normalizeWhitespace } from "../utils/textUtils";

const DIRECTIVE_PATTERNS = [
  /\bsolve\b/gi,
  /\bexplain\b/gi,
  /\bjustify\b/gi,
  /\bcompare\b/gi,
  /\banalyze\b/gi,
  /\bshow\b/gi,
  /\bdescribe\b/gi,
  /\binterpret\b/gi,
  /\bevaluate\b/gi,
  /\bprove\b/gi,
  /\bcalculate\b/gi,
  /\bdetermine\b/gi,
];

function countDirectiveMatches(text: string) {
  return DIRECTIVE_PATTERNS.reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0);
}

function normalizeExtractedMultiStep(steps: number) {
  return clamp01(0.1 + Math.max(0, steps - 1) * 0.3);
}

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

    const directiveCount = countDirectiveMatches(text);
    const sequentialMarkers = text.match(/\b(?:then|next|after that|finally|using your work|show your work)\b/gi) ?? [];
    const partReferenceBoost = /\bpart\s+[a-z0-9]+\b/gi.test(lower) ? 1 : 0;
    const steps = Math.max(1, Math.min(4, directiveCount + (sequentialMarkers.length > 0 ? 1 : 0) + partReferenceBoost));
    const multiStep = normalizeExtractedMultiStep(steps);
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
