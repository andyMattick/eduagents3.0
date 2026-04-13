/**
 * Preparedness — Aggregated types for the alignment, suggestions, and rewrite workflow.
 * 
 * This module re-exports the three core domain models and provides convenience types
 * for the orchestration layer.
 */

export type {
  AlignmentStatus,
  ConceptItem,
  AlignmentRecord,
  AlignmentResult,
  AssessmentItem,
  AssessmentDocument,
  PrepDocument,
} from "./PreparednessAlignment";

export type {
  SuggestionType,
  IssueType,
  Suggestion,
  SuggestionsResult,
} from "./PreparednessSuggestions";

export type {
  RewriteResult,
} from "./PreparednessRewrite";

export type {
  ReverseAlignmentStatus,
  ReverseAlignmentEvidence,
  ReverseAlignmentRecord,
  ReverseAlignmentResult,
  PreparednessReportResult,
} from "./PreparednessReport";
