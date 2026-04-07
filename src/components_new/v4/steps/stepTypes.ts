export type LearnerProfile = "core" | "support" | "challenge" | "accessible" | "iep504";

export type ScenarioComplexity = "low" | "medium" | "high";

export type StepContext = {
	conceptId: string;
	difficulty: "easy" | "medium" | "hard";
	scenarioComplexity: ScenarioComplexity;
	learnerProfile: LearnerProfile;
	problemText: string;
	/** Optional teacher override — bypasses all computation when present. */
	teacherStepOverride?: number;
};

export type StructureAnalysis = {
	/** Number of detected math/stats/ELA operations. */
	operations: number;
	/** Number of detected value/unit transformations. */
	transformations: number;
	/** True when the problem text contains a distributable parenthetical expression. */
	hasParentheses: boolean;
	/** True when a variable appears on both sides of an equation. */
	variableBothSides: boolean;
	/** Detected representation types present in the text. */
	representations: string[];
	/** Computed scenario complexity from text length + clause count. */
	scenarioComplexity: ScenarioComplexity;
};
