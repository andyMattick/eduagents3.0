import { Problem } from "../../schema/domain";
import { AzureExtractResult } from "../../schema/semantic/AzureExtractResult";
import { DocumentSemanticInsights } from "../../schema/semantic/DocumentSemanticInsights";
import { ProblemTagVector } from "../../schema/semantic/ProblemTagVector";
import { classifyParagraphBlocks } from "../extract/classifyParagraphBlocks";
import { average, pickDominantKey } from "../utils/heuristics";
import { chooseCanonicalConceptLabel, isLikelyNoiseConcept, scoreConceptMetadata, shouldMergeConceptLabels } from "../utils/conceptUtils";
import { estimateReadingLevel, normalizeWhitespace, truncateText } from "../utils/textUtils";
import type { ConceptGraph } from "./buildConceptGraph";

interface SemanticConceptStats {
  concept: string;
  aliases: Set<string>;
  weightedTotal: number;
  problemIds: Set<string>;
  pageNumbers: Set<number>;
  documentIds: Set<string>;
  multipartProblemIds: Set<string>;
}

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
  const conceptStats = new Map<string, SemanticConceptStats>();
  const standardTotals: Record<string, number> = {};
  const misconceptionTotals: Record<string, number> = {};
  const problemGroupSizes = new Map<string, number>();
  let totalConceptWeight = 0;

  for (const problem of problems) {
    if (problem.problemGroupId) {
      problemGroupSizes.set(problem.problemGroupId, (problemGroupSizes.get(problem.problemGroupId) ?? 0) + 1);
    }
  }

  function mergeStats(target: SemanticConceptStats, source: SemanticConceptStats) {
    target.weightedTotal += source.weightedTotal;
    for (const alias of source.aliases) {
      target.aliases.add(alias);
    }
    for (const problemId of source.problemIds) {
      target.problemIds.add(problemId);
    }
    for (const pageNumber of source.pageNumbers) {
      target.pageNumbers.add(pageNumber);
    }
    for (const docId of source.documentIds) {
      target.documentIds.add(docId);
    }
    for (const multipartProblemId of source.multipartProblemIds) {
      target.multipartProblemIds.add(multipartProblemId);
    }
  }

  function getOrCreateConceptStats(concept: string) {
    const existing = conceptStats.get(concept);
    if (existing) {
      return existing;
    }

    const created: SemanticConceptStats = {
      concept,
      aliases: new Set<string>(),
      weightedTotal: 0,
      problemIds: new Set<string>(),
      pageNumbers: new Set<number>(),
      documentIds: new Set<string>(),
      multipartProblemIds: new Set<string>(),
    };
    conceptStats.set(concept, created);
    return created;
  }

  function resolveConceptKey(rawConcept: string) {
    const normalized = rawConcept.toLowerCase();
    if (!normalized) {
      return null;
    }

    for (const existingKey of conceptStats.keys()) {
      if (!shouldMergeConceptLabels(existingKey, normalized)) {
        continue;
      }

      const canonical = chooseCanonicalConceptLabel(existingKey, normalized);
      if (canonical === existingKey) {
        return existingKey;
      }

      const existingStats = conceptStats.get(existingKey);
      const canonicalStats = getOrCreateConceptStats(canonical);
      if (existingStats && existingStats !== canonicalStats) {
        mergeStats(canonicalStats, existingStats);
        conceptStats.delete(existingKey);
      }
      return canonical;
    }

    return normalized;
  }

  function recordConcept(rawConcept: string, options: {
    weight: number;
    problemId: string;
    pageNumbers: number[];
    isMultipart: boolean;
  }) {
    const concept = resolveConceptKey(rawConcept);
    if (!concept) {
      return;
    }

    const stats = getOrCreateConceptStats(concept);
    stats.aliases.add(rawConcept);
    stats.weightedTotal += options.weight;
    stats.problemIds.add(options.problemId);
    stats.documentIds.add(documentId);
    if (options.isMultipart) {
      stats.multipartProblemIds.add(options.problemId);
    }
    for (const pageNumber of options.pageNumbers) {
      stats.pageNumbers.add(pageNumber);
    }
    totalConceptWeight += options.weight;
  }

  for (const [index, vector] of problemVectors.entries()) {
    const problem = problems[index];
    const pageNumbers = problem?.sourceSpan
      ? Array.from({ length: Math.max(1, problem.sourceSpan.lastPage - problem.sourceSpan.firstPage + 1) }, (_, offset) => problem.sourceSpan!.firstPage + offset)
      : problem?.sourcePageNumber
        ? [problem.sourcePageNumber]
        : [];
    const isMultipart = Boolean(problem?.problemGroupId && (problemGroupSizes.get(problem.problemGroupId) ?? 0) > 1);
    for (const [concept, score] of Object.entries(vector.concepts)) {
      const key = resolveConceptKey(concept);
      if (!key) {
        continue;
      }
      conceptTotals[key] = (conceptTotals[key] ?? 0) + score;
      if (problem) {
        recordConcept(concept, {
          weight: score,
          problemId: problem.problemId,
          pageNumbers,
          isMultipart,
        });
      }
    }
    for (const [standard, score] of Object.entries(vector.standards ?? {})) {
      standardTotals[standard] = (standardTotals[standard] ?? 0) + score;
    }
    for (const [trigger, score] of Object.entries(vector.misconceptionTriggers)) {
      misconceptionTotals[trigger] = (misconceptionTotals[trigger] ?? 0) + score;
    }
  }

  const sortedConcepts = [...Object.entries(conceptTotals)].sort((left, right) => right[1] - left[1]);
  const conceptDetails = [...conceptStats.values()]
    .map((stats) => {
      const freqProblems = stats.problemIds.size;
      const freqPages = stats.pageNumbers.size;
      const freqDocuments = stats.documentIds.size;
      const semanticDensity = totalConceptWeight === 0 ? 0 : Number((stats.weightedTotal / totalConceptWeight).toFixed(4));
      const multipartPresence = freqProblems === 0 ? 0 : Number((stats.multipartProblemIds.size / freqProblems).toFixed(4));
      const scored = scoreConceptMetadata({
        freqProblems,
        freqPages,
        freqDocuments,
        semanticDensity,
        multipartPresence,
        crossDocumentRecurrence: freqDocuments,
        label: stats.concept,
      });

      return {
        concept: stats.concept,
        aliases: [...stats.aliases].filter((alias) => alias !== stats.concept),
        freqProblems,
        freqPages,
        freqDocuments: scored.freqDocuments,
        semanticDensity,
        multipartPresence,
        crossDocumentRecurrence: scored.crossDocumentRecurrence,
        score: scored.score,
        isNoise: scored.isNoise || isLikelyNoiseConcept(stats.concept),
      };
    })
    .sort((left, right) => right.score - left.score || right.freqProblems - left.freqProblems || left.concept.localeCompare(right.concept));
  const dominantConcept = pickDominantKey(conceptTotals, "general.comprehension");
  const subject = dominantConcept.includes(".") ? dominantConcept.split(".")[0] : dominantConcept;
  const difficultyScore = average(problemVectors.map((vector) => vector.difficulty));
  const linguisticLoad = average(problemVectors.map((vector) => vector.linguisticLoad));
  const contentBlocks = classifyParagraphBlocks(azureExtract).filter((block) => !block.isSuppressed);
  const contentText = contentBlocks.map((block) => block.text).join("\n");
  const readingLevel = estimateReadingLevel(contentText || azureExtract.content);
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
    rawText: normalizeWhitespace(contentText || azureExtract.content),
    sections,
    problems,
    documentConceptDetails: conceptDetails.length > 0 ? conceptDetails : undefined,
    documentConcepts: Object.keys(conceptTotals).length > 0 ? conceptTotals : undefined,
    documentStandards: Object.keys(standardTotals).length > 0 ? standardTotals : undefined,
    overallDifficulty: Number(difficultyScore.toFixed(2)),
    overallLinguisticLoad: Number(linguisticLoad.toFixed(2)),
    conceptGraph,
    semantics: {
      topic: subject,
      concepts: conceptDetails.filter((concept) => !concept.isNoise).slice(0, 8).map((concept) => concept.concept),
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
  const firstParagraph = classifyParagraphBlocks(azureExtract).find((block) => !block.isSuppressed)?.text;
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
