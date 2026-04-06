export type CanonicalConcept = {
	id: string;                 // e.g. "stats.null_hypothesis"
	label: string;
	description?: string;
	subject: string;
	prerequisites: string[];
	misconceptions?: string[];
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
