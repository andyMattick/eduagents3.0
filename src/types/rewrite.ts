export type DocType = "assignment" | "assessment" | "mixed" | "notes";

export interface RewriteSuggestion {
	id: string;
	label: string;
	rationale?: string;
	instruction: string;
	severity?: "low" | "medium" | "high";
	actionable?: boolean;
}

export interface RewriteRequest {
	original: string;
	suggestions: RewriteSuggestion[];
	selectedSuggestionIds: string[];
	docType?: DocType;
	profileApplied?: string;
}

export interface RewriteResponse {
	rewritten: string;
	appliedSuggestionIds: string[];
	nonAppliedSuggestionIds: string[];
}
