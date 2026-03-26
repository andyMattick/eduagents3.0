export interface ConceptDifficultyStep {
	documentId: string;
	difficulty: "low" | "medium" | "high";
	problemCount: number;
	averageDifficultyScore: number;
}

export interface ConceptRepresentationStep {
	documentId: string;
	representations: string[];
	fragmentCount: number;
	representationCount: number;
}

export interface RedundancyEntry {
	otherDocumentId: string;
	sharedConcepts: string[];
	similarityScore: number;
	sharedProblemCount: number;
}

export interface DocumentSimilarityScore {
	leftDocumentId: string;
	rightDocumentId: string;
	score: number;
	sharedConcepts: string[];
}

export interface DocumentCoverageSnapshot {
	documentId: string;
	conceptCount: number;
	problemCount: number;
	instructionalDensity: number;
	representations: string[];
	dominantDifficulty: "low" | "medium" | "high";
}

export interface DocumentCollectionAnalysis {
	sessionId: string;
	documentIds: string[];
	conceptOverlap: Record<string, string[]>;
	conceptGaps: string[];
	difficultyProgression: Record<string, ConceptDifficultyStep[]>;
	representationProgression: Record<string, ConceptRepresentationStep[]>;
	redundancy: Record<string, RedundancyEntry[]>;
	coverageSummary: {
		totalConcepts: number;
		docsPerConcept: Record<string, number>;
		perDocument: Record<string, DocumentCoverageSnapshot>;
	};
	documentSimilarity: DocumentSimilarityScore[];
	conceptToDocumentMap: Record<string, string[]>;
	updatedAt: string;
}
