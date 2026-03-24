import { Problem } from "../../schema/domain";
import { AzureExtractResult } from "../../schema/semantic/AzureExtractResult";
import { DocumentSemanticInsights } from "../../schema/semantic/DocumentSemanticInsights";
import { ProblemTagVector } from "../../schema/semantic/ProblemTagVector";
import { average, pickDominantKey } from "../utils/heuristics";
import { estimateReadingLevel, normalizeWhitespace, truncateText } from "../utils/textUtils";
import type { ConceptGraph } from "./buildConceptGraph";

interface BuildDocumentInsightsArgs {
  documentId: string;
  azureExtract: AzureExtractResult;
  problems: Problem[];
  problemVectors: ProblemTagVector[];
  conceptGraph: ConceptGraph;
}

export function buildDocumentInsights(
  args: BuildDocumentInsightsArgs
): DocumentSemanticInsights {
  const { documentId, azureExtract, problems, problemVectors, conceptGraph } = args;
  const conceptTotals: Record<string, number> = {};
  const standardTotals: Record<string, number> = {};
  const misconceptionTotals: Record<string, number> = {};

  for (const vector of problemVectors) {
    for (const [concept, score] of Object.entries(vector.concepts)) {
      conceptTotals[concept] = (conceptTotals[concept] ?? 0) + score;
    }
    for (const [standard, score] of Object.entries(vector.standards ?? {})) {
      standardTotals[standard] = (standardTotals[standard] ?? 0) + score;
    }
    for (const [trigger, score] of Object.entries(vector.misconceptionTriggers)) {
      misconceptionTotals[trigger] = (misconceptionTotals[trigger] ?? 0) + score;
    }
  }

  const sortedConcepts = [...Object.entries(conceptTotals)].sort((left, right) => right[1] - left[1]);
  const sortedStandards = [...Object.entries(standardTotals)].sort((left, right) => right[1] - left[1]);
  const dominantConcept = pickDominantKey(conceptTotals, "general.comprehension");
  const subject = dominantConcept.includes(".") ? dominantConcept.split(".")[0] : dominantConcept;
  const difficultyScore = average(problemVectors.map((vector) => vector.difficulty));
  const linguisticLoad = average(problemVectors.map((vector) => vector.linguisticLoad));
  const readingLevel = estimateReadingLevel(azureExtract.content);
  const sections = problems.map((problem, index) => {
    const vector = problemVectors[index];
    return {
      sectionId: problem.problemId,
      title: getProblemTitle(problem),
      text: problem.cleanedText ?? problem.rawText,
      concepts: Object.keys(vector.concepts).length > 0 ? vector.concepts : undefined,
      standards: Object.keys(vector.standards ?? {}).length > 0 ? vector.standards : undefined,
      difficulty: vector.difficulty,
      linguisticLoad: vector.linguisticLoad,
    };
  });

  return {
    documentId,
    title: getDocumentTitle(azureExtract),
    subject,
    rawText: normalizeWhitespace(azureExtract.content),
    sections,
    problems,
    documentConcepts: Object.keys(conceptTotals).length > 0 ? conceptTotals : undefined,
    documentStandards: Object.keys(standardTotals).length > 0 ? standardTotals : undefined,
    overallDifficulty: Number(difficultyScore.toFixed(2)),
    overallLinguisticLoad: Number(linguisticLoad.toFixed(2)),
    conceptGraph,
    semantics: {
      topic: subject,
      concepts: sortedConcepts.slice(0, 8).map(([concept]) => concept),
      relationships: conceptGraph.edges.slice(0, 8).map((edge) => `${edge.from}->${edge.to}`),
      misconceptions: Object.keys(misconceptionTotals),
    },
    confidence: {
      extractionQuality: Number(clampConfidence(problems.length, azureExtract.content.length > 0).toFixed(2)),
      taggingQuality: Number(clampConfidence(problemVectors.length, sortedConcepts.length > 0).toFixed(2)),
    },
    flags: {
      unreadable: azureExtract.content.trim().length === 0,
      lowQualityScan: readingLevel !== null ? readingLevel > 12 : false,
      missingPages: azureExtract.pages.length === 0,
    },
  };
}

function clampConfidence(count: number, signalPresent: boolean) {
  const base = signalPresent ? 0.72 : 0.5;
  return Math.max(0, Math.min(1, base + Math.min(count, 5) * 0.05));
}

function getDocumentTitle(azureExtract: AzureExtractResult) {
  const firstParagraph = azureExtract.paragraphs?.[0]?.text;
  const firstLine = firstParagraph ?? azureExtract.content.split(/\n+/)[0] ?? azureExtract.fileName;
  const title = normalizeWhitespace(firstLine);
  return title.length > 0 ? truncateText(title, 80) : azureExtract.fileName;
}

function getProblemTitle(problem: Problem) {
  const sourceText = problem.partText ?? problem.cleanedText ?? problem.rawText;
  const firstLine = sourceText.split(/\n+/)[0] ?? sourceText;
  const prefix = problem.partLabel
    ? `Problem ${problem.problemNumber ?? "?"} ${problem.teacherLabel ?? ""}`.trim()
    : problem.teacherLabel
      ? `Problem ${problem.problemNumber ?? "?"}`
      : undefined;
  const summary = truncateText(normalizeWhitespace(firstLine), 80);
  return prefix ? `${prefix}: ${summary}` : summary;
}
