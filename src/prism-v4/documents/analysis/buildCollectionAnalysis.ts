import { buildDefaultCollectionAnalysis, getAnalyzedDocument, getDocumentSession, saveCollectionAnalysis } from "../registry";
import type { DocumentCollectionAnalysis } from "../../schema/semantic";

export function buildDocumentCollectionAnalysis(sessionId: string): DocumentCollectionAnalysis | null {
	const session = getDocumentSession(sessionId);
	if (!session) {
		return null;
	}

	const analyzedDocuments = session.documentIds
		.map((documentId) => getAnalyzedDocument(documentId))
		.filter((document): document is NonNullable<ReturnType<typeof getAnalyzedDocument>> => Boolean(document));

	if (analyzedDocuments.length === 0) {
		return buildDefaultCollectionAnalysis(sessionId);
	}

	const conceptOverlap: Record<string, string[]> = {};
	const difficultyProgression: Record<string, Array<{ documentId: string; difficulty: "low" | "medium" | "high"; problemCount: number }>> = {};
	const representationProgression: Record<string, Array<{ documentId: string; representations: string[]; fragmentCount: number }>> = {};
	const redundancy: Record<string, string[]> = Object.fromEntries(session.documentIds.map((documentId) => [documentId, []]));

	for (const analyzed of analyzedDocuments) {
		for (const concept of analyzed.insights.concepts) {
			conceptOverlap[concept] = [...new Set([...(conceptOverlap[concept] ?? []), analyzed.document.id])];
			difficultyProgression[concept] = [
				...(difficultyProgression[concept] ?? []),
				{
					documentId: analyzed.document.id,
					difficulty: analyzed.problems[0]?.difficulty ?? "low",
					problemCount: analyzed.problems.filter((problem) => problem.concepts.includes(concept)).length,
				},
			];
			representationProgression[concept] = [
				...(representationProgression[concept] ?? []),
				{
					documentId: analyzed.document.id,
					representations: [...new Set(analyzed.problems.filter((problem) => problem.concepts.includes(concept)).flatMap((problem) => problem.representations))],
					fragmentCount: analyzed.fragments.filter((fragment) => fragment.isInstructional).length,
				},
			];
		}
	}

	const conceptGaps = Object.entries(conceptOverlap)
		.filter(([, documentIds]) => documentIds.length < session.documentIds.length)
		.map(([concept]) => concept);

	for (const left of analyzedDocuments) {
		for (const right of analyzedDocuments) {
			if (left.document.id === right.document.id) {
				continue;
			}
			const overlapCount = left.insights.concepts.filter((concept) => right.insights.concepts.includes(concept)).length;
			if (overlapCount > 0) {
				redundancy[left.document.id] = [...new Set([...(redundancy[left.document.id] ?? []), right.document.id])];
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
			totalConcepts: Object.keys(conceptOverlap).length,
			docsPerConcept: Object.fromEntries(Object.entries(conceptOverlap).map(([concept, documentIds]) => [concept, documentIds.length])),
		},
		updatedAt: new Date().toISOString(),
	});
}