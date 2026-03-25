// src/pipeline/orchestrator/compare.ts

import { mapToComparisonProfile } from "../mapper/mapToComparisonProfile";
import { runPhilosopher } from "pipeline/agents/philosopher";
import { runComparator } from "pipeline/agents/document/comparator";
import { buildDocumentInsights } from "pipeline/agents/document/insights";

type CompareMode = "general" | "difficulty" | "coverage" | "preparation";

function computeRigorProgression(aDifficulty: string | null, bDifficulty: string | null): {
  progression: "aligned" | "increase" | "decrease" | "unknown";
  note: string;
} {
  const rank: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
  const aRank = aDifficulty ? rank[aDifficulty] : undefined;
  const bRank = bDifficulty ? rank[bDifficulty] : undefined;
  if (!aRank || !bRank) {
    return { progression: "unknown", note: "Insufficient difficulty signal to judge progression." };
  }
  if (aRank === bRank) return { progression: "aligned", note: "A and B have similar difficulty." };
  if (aRank < bRank) return { progression: "increase", note: "B increases rigor from A." };
  return { progression: "decrease", note: "B appears less rigorous than A." };
}

function buildPreparationReport(aInsights: ReturnType<typeof buildDocumentInsights>, bInsights: ReturnType<typeof buildDocumentInsights>) {
  const conceptComparison = runComparator({
    sourceConcepts: bInsights.concepts,
    assessmentConcepts: aInsights.concepts,
  });

  const vocabComparison = runComparator({
    sourceConcepts: bInsights.vocab,
    assessmentConcepts: aInsights.vocab,
  });

  const formulaComparison = runComparator({
    sourceConcepts: bInsights.formulas,
    assessmentConcepts: aInsights.formulas,
  });

  const rigor = computeRigorProgression(aInsights.metadata.difficulty, bInsights.metadata.difficulty);
  const structureOverlap = runComparator({
    sourceConcepts: bInsights.sections.map((section) => section.heading),
    assessmentConcepts: aInsights.sections.map((section) => section.heading),
  });

  const preparesScoreRaw =
    conceptComparison.coverage_score * 0.45 +
    vocabComparison.coverage_score * 0.2 +
    formulaComparison.coverage_score * 0.15 +
    structureOverlap.coverage_score * 0.1 +
    (rigor.progression === "increase" || rigor.progression === "aligned" ? 0.1 : 0.03);

  const preparesScore = Math.max(0, Math.min(1, Number(preparesScoreRaw.toFixed(2))));

  const missingConcepts = conceptComparison.missing_concepts;
  const missingVocabulary = vocabComparison.missing_concepts.slice(0, 20);
  const missingFormulas = formulaComparison.missing_concepts.slice(0, 20);

  const suggestedAdditions = [
    ...missingConcepts.slice(0, 8).map((concept) => `Add prerequisite practice for: ${concept}`),
    ...missingVocabulary.slice(0, 5).map((term) => `Pre-teach vocabulary: ${term}`),
    ...missingFormulas.slice(0, 4).map((formula) => `Include worked step for: ${formula}`),
  ];

  const suggestedScaffolds = [
    rigor.progression === "increase" ? "Add bridge items that gradually increase cognitive demand." : "Maintain current rigor bridge.",
    "Include one retrieval warm-up for each missing prerequisite cluster.",
    "Provide short glossary or sentence stems before high-density terms.",
  ];

  return {
    preparesScore,
    conceptCoverage: conceptComparison.coverage_score,
    vocabCoverage: vocabComparison.coverage_score,
    formulaCoverage: formulaComparison.coverage_score,
    structureCoverage: structureOverlap.coverage_score,
    rigorProgression: rigor,
    missingConcepts,
    missingVocabulary,
    missingFormulas,
    suggestedAdditions,
    suggestedScaffolds,
  };
}

export async function runComparePipeline(internal: any) {
  const mode: CompareMode = internal?.comparisonType === "preparation" ? "preparation" : internal?.comparisonType ?? "general";

  const textA = typeof internal?.a?.text === "string" ? internal.a.text : "";
  const textB = typeof internal?.b?.text === "string" ? internal.b.text : "";
  const insightsA = buildDocumentInsights(textA);
  const insightsB = buildDocumentInsights(textB);

  if (insightsA.flags.unreadable || insightsB.flags.unreadable) {
    return {
      type: "compare",
      mode,
      comparison: null,
      insightsA,
      insightsB,
      philosopher: {
        status: "skipped",
        notes: "One or both documents are unreadable. Comparison was skipped.",
      },
    };
  }

  const comparison = mapToComparisonProfile(internal);

  const directComparison = {
    conceptOverlap: runComparator({
      sourceConcepts: insightsA.concepts,
      assessmentConcepts: insightsB.concepts,
    }),
    vocabOverlap: runComparator({
      sourceConcepts: insightsA.vocab,
      assessmentConcepts: insightsB.vocab,
    }),
    formulaOverlap: runComparator({
      sourceConcepts: insightsA.formulas,
      assessmentConcepts: insightsB.formulas,
    }),
    difficultyA: insightsA.metadata.difficulty,
    difficultyB: insightsB.metadata.difficulty,
    readingLevelA: insightsA.metadata.readingLevel,
    readingLevelB: insightsB.metadata.readingLevel,
  };

  const preparation = mode === "preparation" ? buildPreparationReport(insightsA, insightsB) : null;

  const philosopher = await runPhilosopher({
    mode: "compare",
    payload: {
      ...comparison,
      mode,
      directComparison,
      preparation,
    }
  });

  return {
    type: "compare",
    mode,
    comparison: {
      ...comparison,
      directComparison,
      preparation,
    },
    insightsA,
    insightsB,
    philosopher
  };
}
