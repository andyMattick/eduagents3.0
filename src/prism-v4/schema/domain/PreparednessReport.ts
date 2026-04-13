/**
 * Preparedness report models for reverse alignment and final report synthesis.
 *
 * Option B: concept frequency + difficulty distribution, no Bloom, no long text.
 */

import type { ConceptItem } from "./PreparednessAlignment";

export type ReverseAlignmentStatus =
  | "aligned"
  | "review_above_test"
  | "review_below_test"
  | "not_used_in_test";

export interface ReverseAlignmentEvidence {
  assessmentItemNumber: number;
  difficulty: number;  // 1–5 test difficulty
  alignment: ReverseAlignmentStatus;
}

export interface ReverseAlignmentRecord {
  prepItemNumber: number;
  concepts: ConceptItem[];
  prepDifficulty: number; // 1–5
  testEvidence: ReverseAlignmentEvidence[];
}

export interface ReverseAlignmentResult {
  reverseCoverage: ReverseAlignmentRecord[];
}

export interface CoveredReportItem {
  assessmentItemNumber: number;
  concepts: ConceptItem[];
  difficulty: number;
  prepDifficulty: number;
  alignment: "aligned" | "slightly_above" | "misaligned_above";
  teacherAction: "add_prep_support" | "remove_question" | "no_action";
}

export interface UncoveredReportItem {
  assessmentItemNumber: number;
  concepts: [];
  difficulty: number;
  prepDifficulty: 0;
  alignment: "missing_in_prep";
}

export interface TeacherCorrection {
  assessmentItemNumber: number;
  overrideAlignment?: "aligned" | "slightly_above" | "misaligned_above" | "missing_in_prep";
  overrideConcepts?: string[];
  overrideDifficulty?: number;
  overrideSuggestionType?: "none" | "add_prep_support" | "remove_question";
}

export interface TeacherOverrideEvent {
  assessmentItemNumber: number;
  field: "alignment" | "concepts" | "difficulty" | "suggestionType";
  modelValue: string;
  teacherValue: string;
}

export interface AdminIssue {
  assessmentItemNumber?: number;
  issue: string;
  concept?: string;
}

export interface LlmPhaseError {
  phase: string;
  errorType: string;
}

export interface AdminReportPayload {
  llmErrors: LlmPhaseError[];
  teacherOverrides: TeacherOverrideEvent[];
  modelAnomalies: AdminIssue[];
  uncoveredItems: number[];
  rewriteIssues: AdminIssue[];
  reverseAlignmentIssues: AdminIssue[];
}

export interface CorrectedPreparednessResult {
  correctedAlignment: {
    coveredItems: CoveredReportItem[];
    uncoveredItems: UncoveredReportItem[];
  };
  correctedSuggestions: Array<{
    assessmentItemNumber: number;
    issue: "slightly_above" | "misaligned_above" | "missing_in_prep";
    suggestionType: "remove_question" | "add_prep_support";
  }>;
  correctedRewrite: {
    rewrittenAssessment: string;
    prepAddendum: string[];
  };
}

export interface PreparednessReportResult {
  covered: CoveredReportItem[];
  uncovered: UncoveredReportItem[];
  prepAddendum: string[];
  reverseCoverage: ReverseAlignmentRecord[];
  fullText: string;
  adminReport?: AdminReportPayload;
}
