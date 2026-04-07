export type ItemType = "mc" | "short_answer" | "frq";

export type DifficultyLevel = "easy" | "medium" | "hard";

export type AssessmentRequest = {
	count: number;
	types: ItemType[];
	difficulty: DifficultyLevel | "mixed";
	timeMinutes?: number;
	focusConceptIds?: string[];
};

export type AssessmentItem = {
	id: string;
	stem: string;
	type: ItemType;
	options?: string[];
	correctAnswer: string | string[];
	rationale?: string;
	concepts: string[];
	difficulty: DifficultyLevel;
	estimatedTimeSeconds: number;
	/** Computed step count from the step engine (post-generation enrichment). */
	stepCount?: number;
};

export type Assessment = {
	id: string;
	items: AssessmentItem[];
	totalTimeSeconds: number;
	/** Maps conceptId → number of items covering that concept */
	conceptCoverage: Record<string, number>;
};
