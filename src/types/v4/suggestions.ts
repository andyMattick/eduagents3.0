/**
 * src/types/v4/suggestions.ts — Suggestion engine types
 *
 * Core data model for suggestion handling in the rewrite system.
 * Supports system-generated and teacher-added suggestions with
 * actionability classification and tracking.
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type SuggestionScope = "testLevel" | "itemLevel";
export type SuggestionSource = "system" | "teacher";

/**
 * Represents a single suggestion (system or teacher-added).
 * 
 * Invariants:
 * - `id` is stable across the suggestion lifecycle
 * - `actionable` is computed server-side; never trust client value
 * - `selected` indicates teacher intent (only sent by UI)
 * - `source` indicates origin (used for audit/attribution)
 */
export interface RewriteSuggestion {
	id: string;                 // stable ID (uuid or hash of text + scope)
	scope: SuggestionScope;     // testLevel | itemLevel
	itemId?: string;            // e.g., "1", "3" for item-level (undefined for testLevel)
	text: string;               // human-readable suggestion text
	source: SuggestionSource;   // system | teacher
	actionable: boolean;        // server-computed; whether LLM can apply this
	selected: boolean;          // teacher toggle; only relevant if sent from UI
}

/**
 * Flattened payload from UI → API.
 * 
 * This is what the frontend sends when requesting a rewrite.
 */
export interface RewriteRequestPayload {
	original: string;
	profileApplied?: string;
	suggestions: RewriteSuggestion[];     // flattened, not nested
	sectionId?: string;
}

/**
 * Validation and filtering results computed server-side.
 * 
 * These are computed *after* parsing the client request,
 * and represent the authoritative state for the rewrite handler.
 */
export interface SuggestionFilterResult {
	allSuggestions: RewriteSuggestion[];               // input: all sent by client
	selectedSuggestions: RewriteSuggestion[];          // filtered by selected flag
	actionableSelected: RewriteSuggestion[];           // selected AND actionable
	nonActionableSelected: RewriteSuggestion[];        // selected BUT non-actionable
	systemSuggestions: RewriteSuggestion[];            // all with source="system"
	teacherSuggestions: RewriteSuggestion[];           // all with source="teacher"
}

// ============================================================================
// PROMPT CONTRACTS
// ============================================================================

/**
 * Input to the prompt-building phase.
 * 
 * Only actionable suggestions are included in the prompt.
 * All suggestions are logged for audit.
 */
export interface RewritePromptInput {
	original: string;
	profileApplied?: string;
	actionableSuggestions: string[];                  // texts only
	allSelectedSuggestions: RewriteSuggestion[];      // full objects for logging
	metadata?: Record<string, unknown>;
}

/**
 * Represents what was actually applied by the LLM.
 * Populated after Gemini response is parsed.
 */
export interface RewriteResult {
	rewritten: string;
	explanation?: string;
	appliedSuggestions: string[];         // suggestions that Gemini applied
	noOpDetected: boolean;                // true if rewritten === original
}

// ============================================================================
// DB / AUDIT TYPES
// ============================================================================

/**
 * Full audit record for a rewrite event.
 * Stored in rewrite_events table.
 */
export interface RewriteEventLog {
	suggestionsAll: RewriteSuggestion[];
	suggestionsSelected: RewriteSuggestion[];
	suggestionsActionableSelected: RewriteSuggestion[];
	suggestionsNonActionableSelected: RewriteSuggestion[];
	original: string;
	rewritten: string;
	appliedSuggestions: string[];
	noOpDetected: boolean;
	prompt: string;
	validatorReport: Record<string, unknown>;
	model: string;
}

// ============================================================================
// RESPONSE TYPES (API → Client)
// ============================================================================

/**
 * Response from rewrite API to client.
 * 
 * Includes exactly what was applied, what couldn't be,
 * and what was non-actionable (for transparency).
 */
export interface RewriteResponse {
	success: boolean;
	rewritten?: string;
	explanation?: string;
	appliedSuggestions?: string[];
	nonAppliedSuggestions?: RewriteSuggestion[];     // selected but not applied (with reason)
	nonActionableSelected?: RewriteSuggestion[];     // selected but non-actionable
	error?: string;
	details?: Record<string, unknown>;
}

// ============================================================================
// VALIDATION/FILTERING CONSTANTS AND HELPERS
// ============================================================================

const ACTIONABLE_KEYWORDS = [
	"clarify",
	"definition",
	"define",
	"glossary",
	"flow",
	"readability",
	"simplify",
	"reword",
	"rephrase",
	"add example",
	"add examples",
	"add context",
	"add explanation",
	"add definitions",
	"add formula",
	"formula sheet",
	"add transition",
	"add transitions",
	"improve structure",
	"improve clarity",
	"improve flow",
	"accessibility",
	"scaffolding",
	"sentence starters",
	"vocabulary support",
	"add summary",
	"add heading",
	"add label",
	"fix formatting",
	"break into steps",
	"step-by-step",
	"scaffold",
	"add reminder",
	"add label",
];

const NON_ACTIONABLE_KEYWORDS = [
	"review with students",
	"review in class",
	"review together",
	"review as a class",
	"reteach",
	"reteaching",
	"have students",
	"ask students",
	"students should",
	"let students",
	"encourage students",
	"encourage the class",
	"monitor students",
	"monitor progress",
	"monitor student",
	"assess students",
	"student progress",
	"class discussion",
	"group discussion",
	"lesson plan",
	"during lesson",
	"formative assessment",
	"use manipulatives",
	"add more whitespace",
	"add whitespace",
	"ensure the ogive",
	"classroom behavior",
	"give students",
	"assign to students",
	"whole class",
	"in-class activity",
];

/**
 * Normalize a suggestion for comparison and filtering.
 */
export function normalizeSuggestion(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Determine if a suggestion is actionable by the LLM.
 * 
 * Server-side classification rules:
 * - Actionable: can be performed within the text (add/clarify/rephrase/etc.)
 * - Non-actionable: requires classroom behavior, layout, or external artifacts
 * 
 * Default: teacher-added suggestions are actionable unless explicitly non-actionable.
 */
export function classifyActionable(suggestion: string): boolean {
	const lower = normalizeSuggestion(suggestion);
	if (!lower) return false;

	// Explicit non-actionable wins over ambiguity.
	if (NON_ACTIONABLE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
		return false;
	}

	// If explicitly actionable, accept it.
	if (ACTIONABLE_KEYWORDS.some((keyword) => lower.includes(keyword))) {
		return true;
	}

	// Default: teacher-added suggestions are actionable.
	// System suggestions default to true but typically come pre-filtered.
	return true;
}

/**
 * Filter a flat array of RewriteSuggestion objects.
 * Returns only those that:
 * - Are selected (selected=true)
 * - Are actionable (after server-side classification)
 */
export function getActionableSelectedSuggestions(
	suggestions: RewriteSuggestion[]
): RewriteSuggestion[] {
	return suggestions.filter((s) => s.selected && s.actionable);
}

/**
 * Get all selected suggestions (regardless of actionability).
 */
export function getSelectedSuggestions(suggestions: RewriteSuggestion[]): RewriteSuggestion[] {
	return suggestions.filter((s) => s.selected);
}

/**
 * Get selected suggestions that are non-actionable.
 */
export function getNonActionableSelectedSuggestions(
	suggestions: RewriteSuggestion[]
): RewriteSuggestion[] {
	return suggestions.filter((s) => s.selected && !s.actionable);
}

/**
 * Separate suggestions by source.
 */
export function separateBySuggestionSource(
	suggestions: RewriteSuggestion[]
): { system: RewriteSuggestion[]; teacher: RewriteSuggestion[] } {
	return {
		system: suggestions.filter((s) => s.source === "system"),
		teacher: suggestions.filter((s) => s.source === "teacher"),
	};
}

/**
 * Generate a stable ID for a suggestion (useful for UI diffing).
 * 
 * Combines scope, itemId, and normalized text hash.
 * Not cryptographically secure, but deterministic.
 */
export function generateSuggestionId(scope: SuggestionScope, text: string, itemId?: string): string {
	const key = `${scope}:${itemId ?? ""}:${normalizeSuggestion(text)}`;
	// Simple hash: sum of character codes (not secure, but deterministic)
	let hash = 0;
	for (let i = 0; i < key.length; i++) {
		hash = ((hash << 5) - hash) + key.charCodeAt(i);
		hash = hash & hash; // Convert to 32-bit integer
	}
	return `sugg_${Math.abs(hash).toString(36)}`;
}
