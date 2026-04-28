import type { DocumentInsights, ExtractedProblem, FragmentSemanticRecord, ScoredDocumentConcept } from "../../schema/semantic";
import {
	chooseCanonicalConceptLabel,
	isLikelyNoiseConcept,
	normalizeConceptLabel,
	scoreConceptMetadata,
	shouldMergeConceptLabels,
} from "../../semantic/utils/conceptUtils";

interface MutableConceptStats {
	concept: string;
	aliases: Set<string>;
	occurrences: number;
	problemIds: Set<string>;
	pageNumbers: Set<number>;
	documentIds: Set<string>;
	multipartProblemIds: Set<string>;
}

export function buildAnalyzedDocumentInsights(args: {
	fragments: FragmentSemanticRecord[];
	problems: ExtractedProblem[];
}): DocumentInsights {
	const conceptFrequencies: Record<string, number> = {};
	const conceptStats = new Map<string, MutableConceptStats>();
	const representations = new Set<string>();
	const misconceptionThemes = new Set<string>();
	const complexityDistribution: DocumentInsights["complexityDistribution"] = {
		low: 0,
		medium: 0,
		high: 0,
	};
	const problemGroupSizes = new Map<string, number>();
	let totalConceptEvidence = 0;

	for (const problem of args.problems) {
		if (problem.problemGroupId) {
			problemGroupSizes.set(problem.problemGroupId, (problemGroupSizes.get(problem.problemGroupId) ?? 0) + 1);
		}
	}

	function mergeStats(target: MutableConceptStats, source: MutableConceptStats) {
		target.occurrences += source.occurrences;
		for (const alias of source.aliases) {
			target.aliases.add(alias);
		}
		for (const problemId of source.problemIds) {
			target.problemIds.add(problemId);
		}
		for (const pageNumber of source.pageNumbers) {
			target.pageNumbers.add(pageNumber);
		}
		for (const documentId of source.documentIds) {
			target.documentIds.add(documentId);
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

		const created: MutableConceptStats = {
			concept,
			aliases: new Set<string>(),
			occurrences: 0,
			problemIds: new Set<string>(),
			pageNumbers: new Set<number>(),
			documentIds: new Set<string>(),
			multipartProblemIds: new Set<string>(),
		};
		conceptStats.set(concept, created);
		return created;
	}

	function resolveConceptKey(rawConcept: string) {
		const normalized = rawConcept.includes(".") ? rawConcept.toLowerCase() : normalizeConceptLabel(rawConcept);
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
		problemId?: string;
		pageNumbers?: number[];
		documentId: string;
		isMultipart?: boolean;
	}) {
		const concept = resolveConceptKey(rawConcept);
		if (!concept) {
			return;
		}

		const stats = getOrCreateConceptStats(concept);
		stats.aliases.add(rawConcept.trim());
		stats.occurrences += 1;
		stats.documentIds.add(options.documentId);
		if (options.problemId) {
			stats.problemIds.add(options.problemId);
		}
		if (options.isMultipart && options.problemId) {
			stats.multipartProblemIds.add(options.problemId);
		}
		for (const pageNumber of options.pageNumbers ?? []) {
			stats.pageNumbers.add(pageNumber);
		}
		totalConceptEvidence += 1;
	}

	for (const problem of args.problems) {
		const pageNumbers = problem.sourceSpan
			? Array.from(
				{ length: Math.max(1, problem.sourceSpan.lastPage - problem.sourceSpan.firstPage + 1) },
				(_, index) => problem.sourceSpan!.firstPage + index,
			)
			: [];
		const isMultipart = Boolean(problem.problemGroupId && (problemGroupSizes.get(problem.problemGroupId) ?? 0) > 1);
		for (const concept of problem.concepts) {
			recordConcept(concept, {
				problemId: problem.id,
				pageNumbers,
				documentId: problem.documentId,
				isMultipart,
			});
		}
		for (const representation of problem.representations) {
			representations.add(representation);
		}
		for (const misconception of problem.misconceptions) {
			misconceptionThemes.add(misconception);
		}
		complexityDistribution[problem.complexityBand] += 1;
	}

	for (const fragment of args.fragments) {
		representations.add(fragment.contentType);
		for (const concept of fragment.prerequisiteConcepts ?? []) {
			recordConcept(concept, { documentId: fragment.documentId });
		}
		for (const misconception of fragment.misconceptionTriggers ?? []) {
			misconceptionThemes.add(misconception);
		}
	}

	const instructionalCount = args.fragments.filter((fragment) => fragment.isInstructional).length;
	const scoredConcepts: ScoredDocumentConcept[] = [...conceptStats.values()]
		.map((stats) => {
			const freqProblems = stats.problemIds.size;
			const freqPages = stats.pageNumbers.size;
			const freqDocuments = stats.documentIds.size;
			const semanticDensity = totalConceptEvidence === 0 ? 0 : Number((stats.occurrences / totalConceptEvidence).toFixed(4));
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

			conceptFrequencies[stats.concept] = stats.occurrences;

			return {
				concept: stats.concept,
				aliases: [...stats.aliases].map((alias) => alias.trim()).filter(Boolean).filter((alias) => alias !== stats.concept),
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
	const sortedConcepts = scoredConcepts.filter((concept) => !concept.isNoise).map((concept) => concept.concept);
	return {
		concepts: sortedConcepts,
		scoredConcepts,
		conceptFrequencies,
		representations: [...representations],
		complexityDistribution,
		misconceptionThemes: [...misconceptionThemes],
		instructionalDensity: args.fragments.length === 0 ? 0 : Number((instructionalCount / args.fragments.length).toFixed(2)),
		problemCount: args.problems.length,
		exampleCount: args.fragments.filter((fragment) => fragment.instructionalRole === "example").length,
		explanationCount: args.fragments.filter((fragment) => fragment.instructionalRole === "explanation").length,
	};
}
