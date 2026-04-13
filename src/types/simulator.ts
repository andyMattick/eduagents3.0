/**
 * src/types/simulator.ts — Student simulation types
 *
 * These types power the simulator panel on the document ingestion page.
 * All simulator API routes accept a StudentProfile to tailor the LLM narrative.
 */

// ---------------------------------------------------------------------------
// Student Profile
// ---------------------------------------------------------------------------

export type StudentProfile = {
	confidence: "low" | "medium" | "high";
	anxietyLevel: "low" | "medium" | "high";
	pacingStyle: "slow" | "steady" | "fast";
	readingProfile: "average" | "ELL" | "dyslexia";
	attentionProfile: "average" | "ADHD";
	mathBackground: "weak" | "average" | "strong";
};

export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
	confidence: "medium",
	anxietyLevel: "medium",
	pacingStyle: "steady",
	readingProfile: "average",
	attentionProfile: "average",
	mathBackground: "average",
};

/** Named presets shown in the dropdown. */
export const STUDENT_PROFILE_PRESETS: Array<{ label: string; profile: StudentProfile }> = [
	{ label: "Average Student", profile: DEFAULT_STUDENT_PROFILE },
	{
		label: "Low Confidence",
		profile: { ...DEFAULT_STUDENT_PROFILE, confidence: "low", anxietyLevel: "high" },
	},
	{
		label: "High Anxiety",
		profile: { ...DEFAULT_STUDENT_PROFILE, anxietyLevel: "high", pacingStyle: "slow" },
	},
	{
		label: "ADHD",
		profile: { ...DEFAULT_STUDENT_PROFILE, attentionProfile: "ADHD", pacingStyle: "fast" },
	},
	{
		label: "Dyslexia",
		profile: { ...DEFAULT_STUDENT_PROFILE, readingProfile: "dyslexia", pacingStyle: "slow" },
	},
	{
		label: "ELL",
		profile: { ...DEFAULT_STUDENT_PROFILE, readingProfile: "ELL", confidence: "low" },
	},
	{
		label: "Gifted / Fast Processor",
		profile: {
			...DEFAULT_STUDENT_PROFILE,
			confidence: "high",
			anxietyLevel: "low",
			pacingStyle: "fast",
			mathBackground: "strong",
		},
	},
	{
		label: "Perfectionist",
		profile: { ...DEFAULT_STUDENT_PROFILE, anxietyLevel: "high", confidence: "high", pacingStyle: "slow" },
	},
	{
		label: "Easily Frustrated",
		profile: { ...DEFAULT_STUDENT_PROFILE, confidence: "low", anxietyLevel: "high", pacingStyle: "fast" },
	},
	{
		label: "Slow Reader",
		profile: { ...DEFAULT_STUDENT_PROFILE, pacingStyle: "slow", readingProfile: "average" },
	},
	{
		label: "Strong Reader",
		profile: { ...DEFAULT_STUDENT_PROFILE, confidence: "high", pacingStyle: "fast", readingProfile: "average" },
	},
	{
		label: "Slow Processor",
		profile: { ...DEFAULT_STUDENT_PROFILE, pacingStyle: "slow", mathBackground: "weak" },
	},
	{
		label: "Weak Math Background",
		profile: { ...DEFAULT_STUDENT_PROFILE, mathBackground: "weak", confidence: "low" },
	},
	{
		label: "Strong Math Background",
		profile: { ...DEFAULT_STUDENT_PROFILE, mathBackground: "strong", confidence: "high" },
	},
];

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------

export interface SimulatorItemData {
	itemNumber: number;
	readingLoad: number;           // 0–1
	wordCount: number;
	sentenceCount: number;
	vocabularyDifficulty: number;  // 0–1
	cognitiveLoad: number;         // 0–1
	confusionRisk: number;         // 0–1
	timeToProcessSeconds: number;
	misconceptionRisk: number;     // 0–1
	alignmentScore?: never;       // removed — preparedness moved to new pipeline
	redFlags: string[];
}

export interface SimulatorSectionData {
	sectionId: string;
	readingLoad: number;
	vocabularyDifficulty: number;
	cognitiveLoad: number;
	confusionRisk: number;
	fatigueRisk: number;
	redFlags: string[];
}

export interface SimulatorOverallData {
	totalItems: number;
	estimatedCompletionTimeSeconds: number;
	fatigueRisk: number;           // 0–1
	pacingRisk: number;            // 0–1
	majorRedFlags: string[];
}

export interface RewriteSuggestions {
	testLevel: string[];
	itemLevel: Record<string, string[]>;
}

export interface SimulatorData {
	items: SimulatorItemData[];
	sections?: SimulatorSectionData[];
	overall: SimulatorOverallData;
	rewriteSuggestions?: RewriteSuggestions;
}

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------

export interface SingleSimulatorRequest {
	sessionId: string;
	studentProfile?: StudentProfile;
}

export interface SingleSimulatorResponse {
	narrative: string;
	data: SimulatorData | null;
}

// ---------------------------------------------------------------------------
// Assessment generation
// ---------------------------------------------------------------------------

export interface SimulatorTestPreferences {
	mcCount?: number;
	saCount?: number;
	frqCount?: number;
}

export interface GeneratedTestItem {
	type: "MC" | "SA" | "FRQ";
	stem: string;
	options: string[] | null;
	answer: string | null;
}

export interface GeneratedTestData {
	test: GeneratedTestItem[];
}

export interface GenerateTestRequest {
	sessionId: string;
	supplementText?: string;
	testPreferences?: SimulatorTestPreferences;
}

export interface GenerateTestResponse {
	narrative: string;
	data: GeneratedTestData | null;
	documentId?: string;
}

// ---------------------------------------------------------------------------
// Multi-profile parallel simulation
// ---------------------------------------------------------------------------

export interface ParallelSimulatorData {
	students: Record<string, SimulatorData>;
	comparison: {
		universallyDifficultItems: number[];
		profileSpecificRisks: Record<string, number[]>;
		itemDifficultySpread: Record<number, { min: number; max: number; variance: number }>;
	};
	rewriteSuggestions?: RewriteSuggestions;
}

export interface MultiProfileSimulatorRequest {
	documentText: string;
	studentProfiles: StudentProfile[];
}

export interface MultiProfileSimulatorResponse {
	narrative: string;
	data: ParallelSimulatorData | null;
}

// ---------------------------------------------------------------------------
// Rewrite engine
// ---------------------------------------------------------------------------

export interface RewrittenItem {
	originalItemNumber: number;
	rewrittenStem: string;
	original?: string;
	rewrittenParts?: string[];
	notes: string;
}

export interface RewrittenSection {
	sectionId: string;
	rewrittenText: string;
	original?: string;
}

export interface RewriteResponse {
	rewrittenItems: RewrittenItem[];
	docType?: "problem" | "notes" | "mixed";
	sections?: RewrittenSection[];
	items?: Array<{ itemNumber: number; rewrittenStem: string; original?: string }>;
	testLevel?: string[];
	appliedSuggestions?: string[];
	profileApplied?: string | null;
	metadata?: Record<string, unknown>;
	original?: string;
	rewritten?: string;
	type?: "item" | "section";
	id?: string;
	message?: string;
}
