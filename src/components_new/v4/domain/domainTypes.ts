export type CanonicalConcept = {
	id: string;                 // e.g. "stats.null_hypothesis"
	label: string;
	description?: string;
	subject: string;
	prerequisites: string[];
	misconceptions?: string[];
	/** Inclusive [min, max] step count for answer-key generation. Defaults to [2, 4]. */
	typicalStepRange?: [number, number];
};

export type CanonicalMap = {
	concepts: CanonicalConcept[];
	edges: {
		from: string;
		to: string;
		type: "prereq" | "related";
	}[];
};

export type ConceptMapping = {
	conceptId: string;          // from Layer 2
	canonicalId: string;        // from ontology
	confidence: number;         // 0–1
};
