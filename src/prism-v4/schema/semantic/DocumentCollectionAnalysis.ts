export interface ConceptDifficultyStep {
	documentId: string;
	difficulty: "low" | "medium" | "high";
	problemCount: number;
}

export interface ConceptRepresentationStep {
	documentId: string;
	representations: string[];
	fragmentCount: number;
}

export interface DocumentCollectionAnalysis {
	sessionId: string;
	documentIds: string[];
	conceptOverlap: Record<string, string[]>;
	conceptGaps: string[];
	difficultyProgression: Record<string, ConceptDifficultyStep[]>;
	representationProgression: Record<string, ConceptRepresentationStep[]>;
	redundancy: Record<string, string[]>;
	coverageSummary: {
		totalConcepts: number;
		docsPerConcept: Record<string, number>;
	};
	updatedAt: string;
}
