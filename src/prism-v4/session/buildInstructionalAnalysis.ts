import type { PrismSessionContext } from "../documents/registryStore";
import { inferDomainMerged } from "../documents/intents/utils/inferDomain";
import type { InstructionalAnalysis, BloomSummary, ConceptSummary, DifficultySummary, MisconceptionSummary, ModeSummary, ProblemSummary, ScenarioSummary } from "./InstructionalIntelligenceSession";
import { classifyBloomLevel, classifyItemModes, classifyScenarioTypes, type BloomLevel, type ItemMode, type ScenarioType } from "../teacherFeedback";

const BLOOM_LEVELS: BloomLevel[] = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

function createEmptyBloomSummary(): BloomSummary {
	return {
		remember: 0,
		understand: 0,
		apply: 0,
		analyze: 0,
		evaluate: 0,
		create: 0,
	};
}

function sortByCountDescending<T extends { count: number }>(values: T[]) {
	return [...values].sort((left, right) => right.count - left.count);
}

function dominantDemandLabel(counts: Record<string, number>): ProblemSummary["dominantDemand"] {
	const entries = Object.entries(counts).filter(([, count]) => count > 0);
	if (entries.length === 0) {
		return "mixed";
	}
	entries.sort((left, right) => right[1] - left[1]);
	if (entries.length > 1 && entries[0]?.[1] === entries[1]?.[1]) {
		return "mixed";
	}
	return (entries[0]?.[0] as ProblemSummary["dominantDemand"]) ?? "mixed";
}

function average(values: number[]) {
	if (values.length === 0) {
		return 0;
	}
	return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function buildInstructionalAnalysis(context: PrismSessionContext): InstructionalAnalysis {
	const conceptCounts = new Map<string, { documentIds: Set<string>; problemCount: number }>();
	const misconceptionCounts = new Map<string, { occurrences: number; concepts: Set<string> }>();
	const problemSummaries: ProblemSummary[] = [];
	const bloomSummary = createEmptyBloomSummary();
	const modeSummary: Record<string, number> = {};
	const scenarioSummary: Record<string, number> = {};
	const difficultySummary: DifficultySummary = {
		low: 0,
		medium: 0,
		high: 0,
		averageInstructionalDensity: average(context.analyzedDocuments.map((document) => document.insights.instructionalDensity)),
	};

	for (const analyzed of context.analyzedDocuments) {
		const demandCounts: Record<string, number> = {};
		const documentDifficultyDistribution = { low: 0, medium: 0, high: 0 };

		for (const concept of analyzed.insights.concepts) {
			const current = conceptCounts.get(concept) ?? { documentIds: new Set<string>(), problemCount: 0 };
			current.documentIds.add(analyzed.document.id);
			conceptCounts.set(concept, current);
		}

		for (const problem of analyzed.problems) {
			documentDifficultyDistribution[problem.difficulty] += 1;
			difficultySummary[problem.difficulty] += 1;
			demandCounts[problem.cognitiveDemand] = (demandCounts[problem.cognitiveDemand] ?? 0) + 1;

			const bloom = classifyBloomLevel(problem.text);
			bloomSummary[bloom] += 1;

			for (const mode of classifyItemModes(problem.text)) {
				modeSummary[mode] = (modeSummary[mode] ?? 0) + 1;
			}

			for (const scenario of classifyScenarioTypes(problem.text)) {
				scenarioSummary[scenario] = (scenarioSummary[scenario] ?? 0) + 1;
			}

			for (const concept of problem.concepts) {
				const current = conceptCounts.get(concept) ?? { documentIds: new Set<string>(), problemCount: 0 };
				current.documentIds.add(analyzed.document.id);
				current.problemCount += 1;
				conceptCounts.set(concept, current);
			}

			for (const misconception of problem.misconceptions) {
				const current = misconceptionCounts.get(misconception) ?? { occurrences: 0, concepts: new Set<string>() };
				current.occurrences += 1;
				for (const concept of problem.concepts) {
					current.concepts.add(concept);
				}
				misconceptionCounts.set(misconception, current);
			}
		}

		for (const misconception of analyzed.insights.misconceptionThemes) {
			const current = misconceptionCounts.get(misconception) ?? { occurrences: 0, concepts: new Set<string>() };
			current.occurrences += 1;
			for (const concept of analyzed.insights.concepts) {
				current.concepts.add(concept);
			}
			misconceptionCounts.set(misconception, current);
		}

		problemSummaries.push({
			documentId: analyzed.document.id,
			sourceFileName: analyzed.document.sourceFileName,
			problemCount: analyzed.problems.length,
			dominantDemand: dominantDemandLabel(demandCounts),
			difficultyDistribution: documentDifficultyDistribution,
		});
	}

	const totalDocuments = Math.max(context.analyzedDocuments.length, 1);
	const concepts: ConceptSummary[] = [...conceptCounts.entries()]
		.map(([concept, summary]) => ({
			concept,
			documentCount: summary.documentIds.size,
			problemCount: summary.problemCount,
			coverage: Number((summary.documentIds.size / totalDocuments).toFixed(2)),
		}))
		.sort((left, right) => right.problemCount - left.problemCount || right.documentCount - left.documentCount || left.concept.localeCompare(right.concept));

	const misconceptions: MisconceptionSummary[] = [...misconceptionCounts.entries()]
		.map(([misconception, summary]) => ({
			misconception,
			occurrences: summary.occurrences,
			concepts: [...summary.concepts].sort(),
		}))
		.sort((left, right) => right.occurrences - left.occurrences || left.misconception.localeCompare(right.misconception));

	const domain = inferDomainMerged(
		context.collectionAnalysis.conceptToDocumentMap,
		context.analyzedDocuments,
		context.groupedUnits,
	) ?? "General Instruction";

	return {
		concepts,
		problems: problemSummaries,
		misconceptions,
		bloomSummary: BLOOM_LEVELS.reduce<BloomSummary>((summary, level) => {
			summary[level] = bloomSummary[level] ?? 0;
			return summary;
		}, createEmptyBloomSummary()),
		modeSummary: Object.fromEntries(sortByCountDescending(Object.entries(modeSummary).map(([mode, count]) => ({ mode, count }))).map(({ mode, count }) => [mode as ItemMode, count])) as ModeSummary,
		scenarioSummary: Object.fromEntries(sortByCountDescending(Object.entries(scenarioSummary).map(([scenario, count]) => ({ scenario, count }))).map(({ scenario, count }) => [scenario as ScenarioType, count])) as ScenarioSummary,
		difficultySummary,
		domain,
	};
}