/**
 * api/v4/rewrite/suggestionEngine.ts — Suggestion validation and filtering
 *
 * Core pipeline for processing suggestions:
 * 1. Parse and validate incoming suggestion structure
 * 2. Classify actionability server-side
 * 3. Separate selected from unselected
 * 4. Check for actionable selections before proceeding
 * 5. Return detailed filter result for prompt construction and logging
 */

import type {
	RewriteSuggestion,
	SuggestionFilterResult,
} from "../../../src/types/v4/suggestions";
import {
	classifyActionable,
	generateSuggestionId,
	getActionableSelectedSuggestions,
	getSelectedSuggestions,
	getNonActionableSelectedSuggestions,
	separateBySuggestionSource,
	normalizeSuggestion,
} from "../../../src/types/v4/suggestions";

/**
 * Validate and classify an incoming suggestion from the client.
 * 
 * - Ensures text is non-empty
 * - Generates stable ID if missing
 * - Re-classifies actionability server-side (never trust client value)
 * - Preserves source and selected flags
 */
export function validateAndClassifySuggestion(input: RewriteSuggestion): RewriteSuggestion {
	const trimmed = normalizeSuggestion(input.text);
	if (!trimmed) {
		throw new Error(`Invalid suggestion: empty text`);
	}

	return {
		id: input.id || generateSuggestionId(input.scope, input.text, input.itemId),
		scope: input.scope,
		itemId: input.itemId,
		text: input.text.trim(),
		source: input.source,
		// Server-side classification: critical security/correctness boundary
		actionable: classifyActionable(input.text),
		selected: Boolean(input.selected),
	};
}

/**
 * Process incoming list of suggestions:
 * - Validate each one
 * - Classify actionability
 * - Filter and separate by selection and source
 * 
 * Returns detailed filter result for all downstream use.
 */
export function filterAndClassifySuggestions(
	input: RewriteSuggestion[]
): SuggestionFilterResult {
	// Validate and classify all
	const allSuggestions = input.map((s) => validateAndClassifySuggestion(s));

	// Filter by selection
	const selectedSuggestions = getSelectedSuggestions(allSuggestions);
	const actionableSelected = getActionableSelectedSuggestions(allSuggestions);
	const nonActionableSelected = getNonActionableSelectedSuggestions(allSuggestions);

	// Separate by source
	const { system: systemSuggestions, teacher: teacherSuggestions } = separateBySuggestionSource(
		allSuggestions
	);

	return {
		allSuggestions,
		selectedSuggestions,
		actionableSelected,
		nonActionableSelected,
		systemSuggestions,
		teacherSuggestions,
	};
}

/**
 * Validate that the rewrite request has at least one actionable suggestion.
 * 
 * Returns structured error if invalid, null if valid.
 * This is a blocking gate before API proceeds to Gemini.
 */
export function validateSuggestionSelection(
	filter: SuggestionFilterResult
): { valid: boolean; errors?: string[] } {
	const errors: string[] = [];

	if (filter.selectedSuggestions.length === 0) {
		errors.push("No suggestions selected");
	}

	if (filter.actionableSelected.length === 0) {
		const nonActionableSummary = filter.nonActionableSelected
			.map((s) => `"${s.text}"`)
			.join(" | ");

		if (filter.selectedSuggestions.length > 0) {
			errors.push(
				`No actionable suggestions selected. ` +
				`All selected suggestions were non-actionable: ${nonActionableSummary}`
			);
		} else {
			errors.push("No actionable suggestions selected");
		}
	}

	return {
		valid: errors.length === 0,
		errors: errors.length > 0 ? errors : undefined,
	};
}

/**
 * Extract the text of actionable selected suggestions.
 * These are what goes into the prompt.
 */
export function getActionableSelectedTexts(filter: SuggestionFilterResult): string[] {
	return filter.actionableSelected.map((s) => s.text);
}
