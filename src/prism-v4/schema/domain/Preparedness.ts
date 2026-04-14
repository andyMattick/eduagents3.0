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
  AddendumMergeResult,
} from "./PreparednessRewrite";

export type {
  ReverseAlignmentStatus,
  ReverseAlignmentEvidence,
  ReverseAlignmentRecord,
  ReverseAlignmentResult,
  CoveredReportItem,
  UncoveredReportItem,
  TeacherCorrection,
  TeacherOverrideEvent,
  AdminIssue,
  LlmPhaseError,
  AdminReportPayload,
  AdminReportEnvelope,
  CorrectedPreparednessResult,
  PreparednessReportResult,
} from "./PreparednessReport";

export type {
  PreparednessAlignmentV2,
  PreparednessTestItemV2,
  PreparednessCoverageSummaryV2,
  PreparednessReviewSnippetV2,
  PreparednessRewriteQuestionV2,
  PreparednessRewriteToDifficultyV2,
  PreparednessPracticeItemV2,
  PreparednessGeneratedReviewV2,
  PreparednessReviewSectionV2,
  PreparednessGeneratedTestV2,
  PreparednessGeneratedTestItemV2,
} from "./PreparednessV2";
