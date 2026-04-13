/**
 * Preparedness Client-Side Service
 * 
 * Handles calls to the /api/v4/preparedness endpoint with proper error handling
 * and type safety.
 */

import type {
  AssessmentDocument,
  PrepDocument,
  AlignmentResult,
  SuggestionsResult,
  RewriteResult,
  ReverseAlignmentResult,
  PreparednessReportResult,
  Suggestion,
} from "../prism-v4/schema/domain/Preparedness";

export interface PreparedenessServiceError {
  message: string;
  phase: string;
  raw?: unknown;
}

/**
 * Call Phase 1: Get alignment analysis.
 */
export async function getAlignment(
  prep: PrepDocument,
  assessment: AssessmentDocument
): Promise<AlignmentResult> {
  const response = await fetch("/api/v4/preparedness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phase: "alignment",
      prep,
      assessment,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw {
      message: error.error || "Failed to get alignment",
      phase: "alignment",
      raw: error,
    } as PreparedenessServiceError;
  }

  return response.json();
}

/**
 * Call Phase 2: Get suggestions based on alignment.
 */
export async function getSuggestions(
  alignment: AlignmentResult
): Promise<SuggestionsResult> {
  const response = await fetch("/api/v4/preparedness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phase: "suggestions",
      prep: null, // Not needed for phase 2
      assessment: null, // Not needed for phase 2
      alignment,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw {
      message: error.error || "Failed to get suggestions",
      phase: "suggestions",
      raw: error,
    } as PreparedenessServiceError;
  }

  return response.json();
}

/**
 * Call Phase 3: Apply suggestions and get rewritten assessment.
 */
export async function applyRewrite(
  assessment: AssessmentDocument,
  selectedSuggestions: Suggestion[]
): Promise<RewriteResult> {
  const response = await fetch("/api/v4/preparedness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phase: "rewrite",
      prep: null, // Not needed for phase 3
      assessment,
      alignment: null, // Not needed for phase 3
      selectedSuggestions,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw {
      message: error.error || "Failed to rewrite assessment",
      phase: "rewrite",
      raw: error,
    } as PreparedenessServiceError;
  }

  return response.json();
}

/**
 * Call reverse alignment phase: prep item -> test coverage map.
 */
export async function getReverseAlignment(
  prep: PrepDocument,
  assessment: AssessmentDocument
): Promise<ReverseAlignmentResult> {
  const response = await fetch("/api/v4/preparedness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phase: "reverse_alignment",
      prep,
      assessment,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw {
      message: error.error || "Failed to get reverse alignment",
      phase: "reverse_alignment",
      raw: error,
    } as PreparedenessServiceError;
  }

  return response.json();
}

/**
 * Call final report generation phase.
 */
export async function generatePreparednessReport(
  alignment: AlignmentResult,
  reverseAlignment: ReverseAlignmentResult,
  suggestions: SuggestionsResult,
  rewrite: RewriteResult
): Promise<PreparednessReportResult> {
  const response = await fetch("/api/v4/preparedness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phase: "report",
      alignment,
      reverseAlignment,
      suggestions,
      rewrite,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw {
      message: error.error || "Failed to generate preparedness report",
      phase: "report",
      raw: error,
    } as PreparedenessServiceError;
  }

  return response.json();
}

export const getPreparednessReport = generatePreparednessReport;

export async function runPreparednessPipeline(params: {
  prep: PrepDocument;
  assessment: AssessmentDocument;
  finalSuggestions: Suggestion[];
}) {
  const { prep, assessment, finalSuggestions } = params;

  // 1. alignment
  const alignment = await getAlignment(prep, assessment);
  // 2. suggestions
  await getSuggestions(alignment);
  // 3. rewrite (using finalSuggestions from UI)
  const rewriteResult = await applyRewrite(assessment, finalSuggestions);
  // 4. reverse alignment
  const reverseAlignment = await getReverseAlignment(prep, assessment);
  // 5. report
  const report = await getPreparednessReport(
    alignment,
    reverseAlignment,
    finalSuggestions as SuggestionsResult,
    rewriteResult
  );

  return {
    alignment,
    suggestions: finalSuggestions as SuggestionsResult,
    rewriteResult,
    reverseAlignment,
    report,
  };
}

/**
 * Get Bloom's level label for display.
 */
export function getBloomLabel(level: number): string {
  const labels: Record<number, string> = {
    1: "Remember",
    2: "Understand",
    3: "Apply",
    4: "Analyze",
    5: "Evaluate",
    6: "Create",
  };
  return labels[level] || `Level ${level}`;
}

/**
 * Get alignment status label and CSS class.
 */
export function getAlignmentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    aligned: "Aligned",
    slightly_above: "Slightly Above",
    misaligned_above: "Misaligned Above",
    missing_in_prep: "Missing in Prep",
  };
  return labels[status] || status;
}

/**
 * Get suggestion type label.
 */
export function getSuggestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    remove_question: "Remove Question",
    lower_bloom_level: "Lower Bloom Level",
    add_prep_support: "Add Prep Support",
    raise_prep_level: "Raise Prep Level",
  };
  return labels[type] || type;
}
