import { buildDefaultCollectionAnalysis, getAnalyzedDocumentsForSession, getDocumentSession, saveCollectionAnalysis } from "../registry";
import type { DocumentCollectionAnalysis } from "../../schema/semantic";

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
	const difficultyProgression: DocumentCollectionAnalysis["difficultyProgression"] = {};
	const representationProgression: DocumentCollectionAnalysis["representationProgression"] = {};
	const redundancy: DocumentCollectionAnalysis["redundancy"] = Object.fromEntries(session.documentIds.map((documentId) => [documentId, []]));
	const pairSimilarity = new Map<string, DocumentCollectionAnalysis["documentSimilarity"][number]>();
	const perDocument = Object.fromEntries(analyzedDocuments.map((analyzed) => [analyzed.document.id, {
		documentId: analyzed.document.id,
		conceptCount: analyzed.insights.concepts.length,
		problemCount: analyzed.problems.length,
		instructionalDensity: analyzed.insights.instructionalDensity,
		representations: analyzed.insights.representations,
		dominantDifficulty: dominantDifficulty(analyzed.insights.difficultyDistribution),
	}]));

	for (const analyzed of analyzedDocuments) {
		for (const concept of analyzed.insights.concepts) {
			const conceptProblems = analyzed.problems.filter((problem) => problem.concepts.includes(concept));
			const representations = unique(conceptProblems.flatMap((problem) => problem.representations));
			conceptToDocumentMap[concept] = unique([...(conceptToDocumentMap[concept] ?? []), analyzed.document.id]);
			difficultyProgression[concept] = [
				...(difficultyProgression[concept] ?? []),
				{
					documentId: analyzed.document.id,
					difficulty: conceptProblems.sort((left, right) => DIFFICULTY_SCORE[right.difficulty] - DIFFICULTY_SCORE[left.difficulty])[0]?.difficulty ?? "low",
					problemCount: conceptProblems.length,
					averageDifficultyScore: average(conceptProblems.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
				},
			];
			representationProgression[concept] = [
				...(representationProgression[concept] ?? []),
				{
					documentId: analyzed.document.id,
					representations,
					fragmentCount: analyzed.fragments.filter((fragment) => fragment.isInstructional).length,
					representationCount: representations.length,
				},
			];
		}
	}

	for (const concept of Object.keys(difficultyProgression)) {
		difficultyProgression[concept] = difficultyProgression[concept]!.sort((left, right) => left.averageDifficultyScore - right.averageDifficultyScore || left.documentId.localeCompare(right.documentId));
		representationProgression[concept] = representationProgression[concept]!.sort((left, right) => left.representationCount - right.representationCount || left.documentId.localeCompare(right.documentId));
	}

	const conceptOverlap = Object.fromEntries(Object.entries(conceptToDocumentMap).filter(([, documentIds]) => documentIds.length >= 2));
	const conceptGaps = Object.entries(conceptToDocumentMap)
		.filter(([, documentIds]) => documentIds.length < session.documentIds.length)
		.map(([concept]) => concept)
		.sort();

	for (const left of analyzedDocuments) {
		for (const right of analyzedDocuments) {
			if (left.document.id === right.document.id) {
				continue;
			}

			const sharedConcepts = unique(left.insights.concepts.filter((concept) => right.insights.concepts.includes(concept))).sort();
			const conceptUnion = unique([...left.insights.concepts, ...right.insights.concepts]);
			const similarityScore = conceptUnion.length === 0 ? 0 : Number((sharedConcepts.length / conceptUnion.length).toFixed(2));
			const sharedProblemCount = left.problems.filter((problem) => problem.concepts.some((concept) => sharedConcepts.includes(concept))).length;

			if (sharedConcepts.length > 0) {
				redundancy[left.document.id] = [
					...(redundancy[left.document.id] ?? []),
					{
						otherDocumentId: right.document.id,
						sharedConcepts,
						similarityScore,
						sharedProblemCount,
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
		},
		documentSimilarity: [...pairSimilarity.values()].sort((left, right) => right.score - left.score || left.leftDocumentId.localeCompare(right.leftDocumentId) || left.rightDocumentId.localeCompare(right.rightDocumentId)),
		conceptToDocumentMap,
		updatedAt: new Date().toISOString(),
	});
}