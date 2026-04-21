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
	/** Linguistic load — replaces cognitiveLoad + readingLoad + vocabularyDifficulty. */
	linguisticLoad: number;        // 0–1
	wordCount: number;
	sentenceCount: number;
	distractorDensity?: number;    // 0–1
	confusionRisk: number;         // 0–1
	timeToProcessSeconds: number;
	misconceptionRisk: number;     // 0–1
	redFlags: string[];
}

export interface SimulatorSectionData {
	sectionId: string;
	/** Linguistic load — replaces readingLoad + vocabularyDifficulty + cognitiveLoad. */
	linguisticLoad: number;        // 0–1
	confusionRisk: number;
	fatigueRisk: number;
	redFlags: string[];
}

// ---------------------------------------------------------------------------
// Measurable and predicted-state value objects
// ---------------------------------------------------------------------------

/** Per-item measurable metrics used in multi-profile simulation. */
export interface SimulationMeasurables {
	itemId: string;
	index: number;
	wordCount: number;
	/** Combined vocabulary + word-length load (0–1). Replaces cognitiveLoad + readingLoad + vocabularyDifficulty. */
	linguisticLoad: number;
	difficulty: number;            // 1–5
	timeToProcessSeconds: number;
	steps: number;
	distractorDensity: number;     // 0–1
	misconceptionRisk: number;     // 0–1
	confusionScore: number;        // 0–1  composite confusion model
}

/** Predicted unobservable state vector for a profile across the full assessment. */
export interface SimulationPredictedStates {
	fatigue: number;              // 0–1
	confusion: number;            // 0–1
	guessing: number;             // 0–1
	overload: number;             // 0–1
	frustration: number;          // 0–1
	timePressureCollapse: number; // 0–1
	// Immeasurable states (Phase 1.4)
	emotionalFriction: number;    // 0–1
	confidenceImpact: number;     // 0–1  (higher = bigger confidence dip)
	pacingPressure: number;       // 0–1
	fatigueIncrease: number[];    // per-item fatigue increase series
	attentionDrop: number[];      // per-item attention drop series
}

/** Rich per-profile metrics block used in multi-profile (parallel) simulation. */
export interface SimulationProfileMetrics {
	profileId: string;           // e.g. "average" | "adhd" | "dyslexia"
	profileLabel: string;        // human label, e.g. "ADHD"
	color: string;               // base hex color for graph lines/bars
	measurables: SimulationMeasurables[];
	predictedStates: SimulationPredictedStates;
}

// ---------------------------------------------------------------------------
// Suggestion classification
// ---------------------------------------------------------------------------

/** Routing tag placed on each simulator suggestion. */
export type SimulationSuggestionType = "item_rewrite" | "instructional_support" | "student_behavior";

/**
 * A typed simulator suggestion.
 *   - item_rewrite          → rewrite engine (button enabled)
 *   - instructional_support → PREP addendum (display only)
 *   - student_behavior      → diagnostic only (display only)
 */
export interface SimulationSuggestion {
	/** Unique identifier — used as React key and for rewrite engine addressing. */
	id?: string;
	text: string;
	type: SimulationSuggestionType;
	/** Which profile this suggestion is most relevant to. */
	profileId?: string;
	/** Which item is targeted (may use itemNumber for legacy single-profile data). */
	itemId?: string;
	/** Present only for item-level suggestions (legacy single-profile path). */
	itemNumber?: number;
	/** Proprietary aggregate load score 0–1 — higher = more urgent. */
	loadScore?: number;
}

export interface SimulatorOverallData {
	totalItems: number;
	estimatedCompletionTimeSeconds: number;
	fatigueRisk: number;           // 0–1
	pacingRisk: number;            // 0–1
	majorRedFlags: string[];
	/**
	 * Predicted unobservable student states — generated by the simulator LLM.
	 * All values are probabilities in [0, 1].
	 */
	predictedStates?: {
		fatigue: number;
		confusion: number;
		guessing: number;
		overload: number;
		frustration: number;
		timePressureCollapse: number;
		emotionalFriction?: number;
		confidenceImpact?: number;
		pacingPressure?: number;
		fatigueIncrease?: number[];
		attentionDrop?: number[];
	};
}

export interface RewriteSuggestions {
	testLevel: string[];
	itemLevel: Record<string, string[]>;
}

export interface SimulatorData {
	items: SimulatorItemData[];
	sections?: SimulatorSectionData[];
	overall: SimulatorOverallData;
	/** Legacy flat suggestion lists produced by the LLM. */
	rewriteSuggestions?: RewriteSuggestions;
	/**
	 * Typed suggestion list (new format). When present, the UI uses this
	 * instead of rewriteSuggestions for routing and rendering.
	 */
	suggestions?: SimulationSuggestion[];
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
	/** Rich single-profile metrics in the unified format (new). */
	profiles?: SimulationProfileMetrics[];
	tokenUsage?: { used: number; remaining: number; limit: number };
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
	/**
	 * Rich multi-profile metrics (new format). When present the UI uses this
	 * for multi-series graphs, color-scaled tables, and load-scored suggestions.
	 */
	profiles?: SimulationProfileMetrics[];
}

export interface MultiProfileSimulatorRequest {
	documentText: string;
	studentProfiles: StudentProfile[];
}

export interface MultiProfileSimulatorResponse {
	narrative: string;
	data: ParallelSimulatorData | null;
	/** Rich per-profile metrics returned directly (new format). */
	profiles?: SimulationProfileMetrics[];
	/** Per-profile LLM-generated narrative paragraphs (Phase 3). */
	profileNarratives?: Record<string, string>;
	/** LLM-generated cross-profile comparison summary (Phase 3). */
	comparisonSummary?: string;
}

// ---------------------------------------------------------------------------
// Rewrite engine
// ---------------------------------------------------------------------------

/**
 * Records a single suggestion-driven change applied to one assessment item.
 * Carries enough context to render diffs in the UI and the PDF.
 */
export interface ItemChange {
	suggestionId: string;
	type: SimulationSuggestionType;
	itemId: string;
	original: string;
	rewritten: string;
	/** Precomputed HTML diff fragment — optional, computed in UI if absent. */
	diffHtml?: string;
	/** Proprietary aggregate load score 0–1 — from simulator measurables. */
	loadScore?: number;
	/** Human-readable reason for this rewrite. */
	reason?: string;
	/** Which student profile this rewrite is most intended to help. */
	profileHelped?: string;
	/** Which misconception this rewrite specifically targets. */
	misconceptionReduced?: string;
}

/**
 * A single item in an assessment document, with optional simulator-derived
 * changes attached.  This is the canonical model for the PDF renderer.
 */
export interface AssessmentItem {
	id: string;
	number: number;
	stem: string;
	/** Answer choices, if multiple-choice. */
	choices?: string[];
	metadata?: {
		standard?: string;
		difficulty?: string;
	};
	/** Suggestion-driven changes that were applied to this item. */
	changes?: ItemChange[];
}

/**
 * The root document model passed to `renderAssessmentToPdf()`.
 * Decouples PDF layout logic from data-source specifics.
 */
export interface AssessmentDocument {
	title: string;
	course?: string;
	date?: string;
	teacherName?: string;
	/** Optional directions rendered before item 1. */
	directions?: string;
	items: AssessmentItem[];
	/** Maps item number → correct answer letter (e.g. "A"). */
	answerKey?: Record<number, string>;
}

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
	items?: Array<{
		itemNumber: number;
		rewrittenStem: string;
		original?: string;
		reason?: string;
		profileHelped?: string;
		misconceptionReduced?: string;
	}>;
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
