import { z } from "zod";

export const docTypeSchema = z.enum([
	"assignment",
	"assessment",
	"mixed",
	"notes",
]);

export const rewriteSuggestionSchema = z.object({
	id: z.string(),
	label: z.string(),
	rationale: z.string().optional(),
	instruction: z.string(),
	severity: z.enum(["low", "medium", "high"]).optional(),
	actionable: z.boolean().optional(),
});

export const rewriteRequestSchema = z.object({
	original: z.string().min(1, "Original text is required."),
	suggestions: z.array(rewriteSuggestionSchema),
	selectedSuggestionIds: z.array(z.string()).min(1, "Select at least one suggestion."),
	docType: docTypeSchema.optional(),
	profileApplied: z.string().optional(),
});

export const rewriteResponseSchema = z.object({
	rewritten: z.string(),
	appliedSuggestionIds: z.array(z.string()),
	nonAppliedSuggestionIds: z.array(z.string()),
});
