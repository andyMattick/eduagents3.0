import { buildDefaultCollectionAnalysis, getAnalyzedDocumentsForSession, getDocumentSession, saveCollectionAnalysis } from "../registry";
import type { DocumentCollectionAnalysis } from "../../schema/semantic";
import { normalizeConceptLabel } from "../../semantic/utils/conceptUtils";

const DIFFICULTY_SCORE: Record<"low" | "medium" | "high", number> = {
	low: 1,
	medium: 2,
	high: 3,
};

function unique<T>(values: T[]) {
	return [...new Set(values)];
}

function average(values: number[]) {
	if (values.length === 0) {
		return 0;
	}

	return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function dominantDifficulty(distribution: Record<"low" | "medium" | "high", number>) {
	return (["high", "medium", "low"] as const).reduce((winner, candidate) => {
		if (distribution[candidate] > distribution[winner]) {
			return candidate;
		}
		return winner;
	}, "low");
}

function buildPairKey(leftDocumentId: string, rightDocumentId: string) {
	return [leftDocumentId, rightDocumentId].sort().join("::");
}

function round(value: number, digits = 4) {
	return Number(value.toFixed(digits));
}

function canonicalDocumentConcepts(analyzed: ReturnType<typeof getAnalyzedDocumentsForSession>[number]) {
	const scoredConcepts = (analyzed.insights.scoredConcepts ?? []).filter((concept) => !concept.isNoise);
	if (scoredConcepts.length > 0) {
		return scoredConcepts;
	}

	return analyzed.insights.concepts.map((concept) => ({
		concept,
		freqProblems: analyzed.problems.filter((problem) => problem.concepts.includes(concept)).length,
		freqPages: 0,
		freqDocuments: 1,
		semanticDensity: 0,
		multipartPresence: 0,
		crossDocumentRecurrence: 1,
		score: analyzed.insights.conceptFrequencies[concept] ?? 0,
		isNoise: false,
	}));
}

function weightedJaccard(left: Map<string, number>, right: Map<string, number>) {
	const keys = new Set([...left.keys(), ...right.keys()]);
	let numerator = 0;
	let denominator = 0;
	for (const key of keys) {
		const leftValue = left.get(key) ?? 0;
		const rightValue = right.get(key) ?? 0;
		numerator += Math.min(leftValue, rightValue);
		denominator += Math.max(leftValue, rightValue);
	}
	return denominator === 0 ? 0 : round(numerator / denominator, 2);
}

export function buildDocumentCollectionAnalysis(sessionId: string): DocumentCollectionAnalysis | null {
	const session = getDocumentSession(sessionId);
	if (!session) {
		return null;
	}

	const analyzedDocuments = getAnalyzedDocumentsForSession(sessionId);

	if (analyzedDocuments.length === 0) {
		return buildDefaultCollectionAnalysis(sessionId);
	}

	const conceptToDocumentMap: Record<string, string[]> = {};
	const conceptCoverage: NonNullable<DocumentCollectionAnalysis["coverageSummary"]["conceptCoverage"]> = {};
	const difficultyProgression: DocumentCollectionAnalysis["difficultyProgression"] = {};
	const representationProgression: DocumentCollectionAnalysis["representationProgression"] = {};
	const redundancy: DocumentCollectionAnalysis["redundancy"] = Object.fromEntries(session.documentIds.map((documentId) => [documentId, []]));
	const pairSimilarity = new Map<string, DocumentCollectionAnalysis["documentSimilarity"][number]>();
	const perDocument = Object.fromEntries(analyzedDocuments.map((analyzed) => {
		const documentConcepts = canonicalDocumentConcepts(analyzed);
		return [analyzed.document.id, {
			documentId: analyzed.document.id,
			conceptCount: documentConcepts.length,
			problemCount: analyzed.problems.length,
			instructionalDensity: analyzed.insights.instructionalDensity,
			representations: analyzed.insights.representations,
			dominantDifficulty: dominantDifficulty(analyzed.insights.difficultyDistribution),
			averageConceptScore: documentConcepts.length === 0 ? 0 : round(average(documentConcepts.map((concept) => concept.score))),
		} satisfies DocumentCollectionAnalysis["coverageSummary"]["perDocument"][string]];
	}));

	for (const analyzed of analyzedDocuments) {
		const documentConcepts = canonicalDocumentConcepts(analyzed);
		const conceptAliases = new Map<string, string>();
		const conceptGroupIds = new Map<string, Set<string>>();

		for (const concept of documentConcepts) {
			conceptAliases.set(concept.concept, concept.concept);
			for (const alias of concept.aliases ?? []) {
				const normalizedAlias = alias.includes(".") ? alias.toLowerCase() : normalizeConceptLabel(alias);
				if (normalizedAlias) {
					conceptAliases.set(normalizedAlias, concept.concept);
				}
			}
		}

		for (const problem of analyzed.problems) {
			const groupId = problem.problemGroupId ?? problem.id;
			for (const rawConcept of problem.concepts) {
				const normalizedConcept = rawConcept.includes(".") ? rawConcept.toLowerCase() : normalizeConceptLabel(rawConcept);
				const canonicalConcept = conceptAliases.get(normalizedConcept) ?? normalizedConcept;
				if (!canonicalConcept) {
					continue;
				}
				const groups = conceptGroupIds.get(canonicalConcept) ?? new Set<string>();
				groups.add(groupId);
				conceptGroupIds.set(canonicalConcept, groups);
			}
		}

		for (const concept of documentConcepts) {
			const conceptProblems = analyzed.problems.filter((problem) => problem.concepts.includes(concept));
			const conceptName = concept.concept;
			const conceptProblemsCanonical = analyzed.problems.filter((problem) => problem.concepts.some((rawConcept) => {
				const normalizedConcept = rawConcept.includes(".") ? rawConcept.toLowerCase() : normalizeConceptLabel(rawConcept);
				return (conceptAliases.get(normalizedConcept) ?? normalizedConcept) === conceptName;
			}));
			const representations = unique(conceptProblems.flatMap((problem) => problem.representations));
			conceptToDocumentMap[conceptName] = unique([...(conceptToDocumentMap[conceptName] ?? []), analyzed.document.id]);
			difficultyProgression[conceptName] = [
				...(difficultyProgression[conceptName] ?? []),
				{
					documentId: analyzed.document.id,
					difficulty: conceptProblemsCanonical.sort((left, right) => DIFFICULTY_SCORE[right.difficulty] - DIFFICULTY_SCORE[left.difficulty])[0]?.difficulty ?? "low",
					problemCount: conceptProblemsCanonical.length,
					averageDifficultyScore: average(conceptProblemsCanonical.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
				},
			];
			representationProgression[conceptName] = [
				...(representationProgression[conceptName] ?? []),
				{
					documentId: analyzed.document.id,
					representations,
					fragmentCount: analyzed.fragments.filter((fragment) => fragment.isInstructional).length,
					representationCount: representations.length,
				},
			];

			const existingCoverage = conceptCoverage[conceptName];
			const totalDocuments = session.documentIds.length || 1;
			const nextDocumentIds = unique([...(existingCoverage?.documentIds ?? []), analyzed.document.id]);
			const groupCount = conceptGroupIds.get(conceptName)?.size ?? concept.freqProblems;
			const totalScore = (existingCoverage?.totalScore ?? 0) + concept.score;
			const totalProblems = (existingCoverage?.freqProblems ?? 0) + concept.freqProblems;
			const totalPages = (existingCoverage?.freqPages ?? 0) + concept.freqPages;
			const totalGroups = (existingCoverage?.groupCount ?? 0) + groupCount;
			const averageScore = totalScore / nextDocumentIds.length;
			const averageMultipartPresence = ((existingCoverage?.multipartPresence ?? 0) * ((existingCoverage?.freqDocuments ?? 0) || 0) + concept.multipartPresence) / nextDocumentIds.length;
			const coverageScore = round((nextDocumentIds.length / totalDocuments) * averageScore);
			const gapScore = round(Math.max(0, averageScore - Math.min(totalProblems, Math.max(1, nextDocumentIds.length)) * 0.35));
			const overlapStrength = round(coverageScore + Math.max(0, nextDocumentIds.length - 1) * 0.2);
			const redundancyScore = round((nextDocumentIds.length / totalDocuments) * Math.max(0.25, averageScore / Math.max(totalProblems, 1)));
			const gap = gapScore >= 0.75 || (averageScore >= 1.45 && totalProblems <= Math.max(2, nextDocumentIds.length));
			const noiseCandidate = averageScore < 1.1 && totalProblems >= Math.max(3, nextDocumentIds.length + 1);
			const crossDocumentAnchor = nextDocumentIds.length > 1;
			const stability = round(Math.max(0, coverageScore * 0.7 + overlapStrength * 0.2 + averageMultipartPresence * 0.2 - (gap ? 0.2 : 0)));

			conceptCoverage[conceptName] = {
				concept: conceptName,
				documentIds: nextDocumentIds,
				averageScore: round(averageScore),
				totalScore: round(totalScore),
				coverageScore,
				gapScore,
				freqProblems: totalProblems,
				freqPages: totalPages,
				freqDocuments: nextDocumentIds.length,
				groupCount: totalGroups,
				multipartPresence: round(averageMultipartPresence),
				crossDocumentAnchor,
				gap,
				noiseCandidate,
				stability,
				overlapStrength,
				redundancy: redundancyScore,
			};
		}
	}

	for (const concept of Object.keys(difficultyProgression)) {
		difficultyProgression[concept] = difficultyProgression[concept]!.sort((left, right) => left.averageDifficultyScore - right.averageDifficultyScore || left.documentId.localeCompare(right.documentId));
		representationProgression[concept] = representationProgression[concept]!.sort((left, right) => left.representationCount - right.representationCount || left.documentId.localeCompare(right.documentId));
	}

	for (const [documentId, snapshot] of Object.entries(perDocument)) {
		snapshot.uniqueConcepts = Object.values(conceptCoverage)
			.filter((coverage) => coverage.documentIds.length === 1 && coverage.documentIds[0] === documentId)
			.map((coverage) => coverage.concept)
			.sort();
		snapshot.anchorConcepts = Object.values(conceptCoverage)
			.filter((coverage) => coverage.crossDocumentAnchor && coverage.documentIds.includes(documentId))
			.sort((left, right) => right.stability - left.stability || left.concept.localeCompare(right.concept))
			.map((coverage) => coverage.concept);
	}

	const conceptOverlap = Object.fromEntries(Object.entries(conceptToDocumentMap).filter(([, documentIds]) => documentIds.length >= 2));
	const conceptGaps = Object.values(conceptCoverage)
		.filter((coverage) => coverage.gap || coverage.documentIds.length < session.documentIds.length)
		.sort((left, right) => Number(right.gap) - Number(left.gap) || right.averageScore - left.averageScore || left.concept.localeCompare(right.concept))
		.map((coverage) => coverage.concept);

	for (const left of analyzedDocuments) {
		for (const right of analyzedDocuments) {
			if (left.document.id === right.document.id) {
				continue;
			}

			const leftConceptMap = new Map(canonicalDocumentConcepts(left).map((concept) => [concept.concept, concept.score] as const));
			const rightConceptMap = new Map(canonicalDocumentConcepts(right).map((concept) => [concept.concept, concept.score] as const));
			const sharedConcepts = unique([...leftConceptMap.keys()].filter((concept) => rightConceptMap.has(concept))).sort();
			const similarityScore = weightedJaccard(leftConceptMap, rightConceptMap);
			const sharedProblemCount = left.problems.filter((problem) => problem.concepts.some((concept) => sharedConcepts.includes(concept) || sharedConcepts.includes(normalizeConceptLabel(concept)))).length;
			const redundancyScore = sharedConcepts.length === 0
				? 0
				: round(sharedConcepts.reduce((sum, concept) => sum + Math.min(leftConceptMap.get(concept) ?? 0, rightConceptMap.get(concept) ?? 0), 0) / Math.max(1, sharedConcepts.reduce((sum, concept) => sum + Math.max(leftConceptMap.get(concept) ?? 0, rightConceptMap.get(concept) ?? 0), 0)), 2);

			if (sharedConcepts.length > 0) {
				redundancy[left.document.id] = [
					...(redundancy[left.document.id] ?? []),
					{
						otherDocumentId: right.document.id,
						sharedConcepts,
						similarityScore,
						sharedProblemCount,
						overlapStrength: similarityScore,
						redundancyScore,
					},
				];
			}

			const pairKey = buildPairKey(left.document.id, right.document.id);
			if (!pairSimilarity.has(pairKey)) {
				pairSimilarity.set(pairKey, {
					leftDocumentId: left.document.id < right.document.id ? left.document.id : right.document.id,
					rightDocumentId: left.document.id < right.document.id ? right.document.id : left.document.id,
					score: similarityScore,
					sharedConcepts,
					overlapStrength: similarityScore,
					redundancyScore,
				});
			}
		}
	}

	return saveCollectionAnalysis({
		sessionId,
		documentIds: session.documentIds,
		conceptOverlap,
		conceptGaps,
		difficultyProgression,
		representationProgression,
		redundancy,
		coverageSummary: {
			totalConcepts: Object.keys(conceptToDocumentMap).length,
			docsPerConcept: Object.fromEntries(Object.entries(conceptToDocumentMap).map(([concept, documentIds]) => [concept, documentIds.length])),
			perDocument,
			conceptCoverage,
		},
		documentSimilarity: [...pairSimilarity.values()].sort((left, right) => right.score - left.score || left.leftDocumentId.localeCompare(right.leftDocumentId) || left.rightDocumentId.localeCompare(right.rightDocumentId)),
		conceptToDocumentMap,
		updatedAt: new Date().toISOString(),
	});
}