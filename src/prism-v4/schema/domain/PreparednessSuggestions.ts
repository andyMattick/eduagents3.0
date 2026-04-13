/**
 * Preparedness Suggestions — Domain model for actionable alignment fixes.
 *
 * Option B: short labels only, no sentences, no rationale.
 */

export type SuggestionType =
  | "remove_question"
  | "add_prep_support";

export type IssueType = "slightly_above" | "misaligned_above" | "missing_in_prep";

/**
 * A single suggestion produced by the alignment engine.
 */
export interface Suggestion {
  assessmentItemNumber: number;
  issue: IssueType;
  suggestionType: SuggestionType;
}

/**
 * Complete suggestions result.
 */
export type SuggestionsResult = Suggestion[];
