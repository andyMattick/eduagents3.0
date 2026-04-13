/**
 * usePreparedness Hook
 * 
 * Manages the complete Preparedness workflow state and operations.
 * Simplifies integration of the three-phase analysis into components.
 */

import { useState, useCallback } from "react";
import type {
  AssessmentDocument,
  PrepDocument,
  AlignmentResult,
  ReverseAlignmentResult,
  SuggestionsResult,
  RewriteResult,
  PreparednessReportResult,
  Suggestion,
} from "../prism-v4/schema/domain/Preparedness";
import {
  getAlignment,
  getSuggestions,
  applyRewrite,
  getReverseAlignment,
  getPreparednessReport,
} from "../services_new/preparednessService";

export interface UsePreparednessOptions {
  onAlignmentComplete?: (alignment: AlignmentResult) => void;
  onSuggestionsComplete?: (suggestions: SuggestionsResult) => void;
  onRewriteComplete?: (rewrite: RewriteResult) => void;
  onReportComplete?: (report: PreparednessReportResult) => void;
}

export interface UsePreparednessState {
  alignment: AlignmentResult | null;
  suggestions: SuggestionsResult | null;
  rewrite: RewriteResult | null;
  reverseAlignment: ReverseAlignmentResult | null;
  report: PreparednessReportResult | null;
  finalSuggestions: SuggestionsResult;
  loading: {
    alignment: boolean;
    suggestions: boolean;
    rewrite: boolean;
    reverseAlignment: boolean;
    report: boolean;
  };
  errors: {
    alignment: string | null;
    suggestions: string | null;
    rewrite: string | null;
    reverseAlignment: string | null;
    report: string | null;
  };
  selectedSuggestions: Set<number>;
}

export function usePreparedness(options?: UsePreparednessOptions) {
  const [state, setState] = useState<UsePreparednessState>({
    alignment: null,
    suggestions: null,
    rewrite: null,
    reverseAlignment: null,
    report: null,
    finalSuggestions: [],
    loading: {
      alignment: false,
      suggestions: false,
      rewrite: false,
      reverseAlignment: false,
      report: false,
    },
    errors: {
      alignment: null,
      suggestions: null,
      rewrite: null,
      reverseAlignment: null,
      report: null,
    },
    selectedSuggestions: new Set(),
  });

  /**
   * Start alignment analysis
   */
  const startAlignment = useCallback(
    async (prep: PrepDocument, assessment: AssessmentDocument) => {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, alignment: true },
        errors: { ...prev.errors, alignment: null },
      }));

      try {
        const alignment = await getAlignment(prep, assessment);
        setState((prev) => ({
          ...prev,
          alignment,
        }));
        options?.onAlignmentComplete?.(alignment);
        return alignment;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, alignment: message },
        }));
        throw err;
      } finally {
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, alignment: false },
        }));
      }
    },
    [options]
  );

  /**
   * Get suggestions from alignment
   */
  const fetchSuggestions = useCallback(
    async (alignment: AlignmentResult) => {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, suggestions: true },
        errors: { ...prev.errors, suggestions: null },
      }));

      try {
        const suggestions = await getSuggestions(alignment);
        setState((prev) => ({
          ...prev,
          suggestions,
          finalSuggestions: suggestions,
          selectedSuggestions: new Set(),
        }));
        options?.onSuggestionsComplete?.(suggestions);
        return suggestions;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, suggestions: message },
        }));
        throw err;
      } finally {
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, suggestions: false },
        }));
      }
    },
    [options]
  );

  /**
   * Apply selected suggestions and get rewrite
   */
  const applyRewritePhase = useCallback(
    async (
      assessment: AssessmentDocument,
      selectedSuggestions: Suggestion[],
      prep?: PrepDocument
    ) => {
      if (selectedSuggestions.length === 0) {
        throw new Error("No suggestions selected");
      }

      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, rewrite: true },
        errors: { ...prev.errors, rewrite: null },
      }));

      try {
        const rewrite = await applyRewrite(assessment, selectedSuggestions);
        let reverseAlignment: ReverseAlignmentResult | null = null;
        if (prep) {
          setState((prev) => ({
            ...prev,
            loading: { ...prev.loading, reverseAlignment: true },
            errors: { ...prev.errors, reverseAlignment: null },
          }));
          reverseAlignment = await getReverseAlignment(prep, assessment);
        }

        setState((prev) => ({
          ...prev,
          rewrite,
          reverseAlignment,
          finalSuggestions: selectedSuggestions,
          loading: { ...prev.loading, reverseAlignment: false },
        }));
        options?.onRewriteComplete?.(rewrite);
        return rewrite;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, rewrite: message },
          loading: { ...prev.loading, reverseAlignment: false },
        }));
        throw err;
      } finally {
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, rewrite: false },
        }));
      }
    },
    [options]
  );

  const generateReport = useCallback(async () => {
    if (!state.alignment || !state.reverseAlignment || !state.rewrite) {
      throw new Error("Alignment, reverse alignment, and rewrite are required");
    }

    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, report: true },
      errors: { ...prev.errors, report: null },
    }));

    try {
      const suggestionsForReport = state.finalSuggestions.length > 0
        ? state.finalSuggestions
        : (state.suggestions ?? []);
      const report = await getPreparednessReport(
        state.alignment,
        state.reverseAlignment,
        suggestionsForReport,
        state.rewrite
      );
      setState((prev) => ({ ...prev, report }));
      options?.onReportComplete?.(report);
      return report;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, report: message },
      }));
      throw err;
    } finally {
      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, report: false },
      }));
    }
  }, [
    options,
    state.alignment,
    state.finalSuggestions,
    state.reverseAlignment,
    state.rewrite,
    state.suggestions,
  ]);

  const setFinalSuggestions = useCallback((finalSuggestions: SuggestionsResult) => {
    setState((prev) => ({ ...prev, finalSuggestions }));
  }, []);

  /**
   * Toggle suggestion selection
   */
  const toggleSuggestion = useCallback((index: number) => {
    setState((prev) => {
      const next = new Set(prev.selectedSuggestions);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return {
        ...prev,
        selectedSuggestions: next,
      };
    });
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setState({
      alignment: null,
      suggestions: null,
      rewrite: null,
      reverseAlignment: null,
      report: null,
      finalSuggestions: [],
      loading: {
        alignment: false,
        suggestions: false,
        rewrite: false,
        reverseAlignment: false,
        report: false,
      },
      errors: {
        alignment: null,
        suggestions: null,
        rewrite: null,
        reverseAlignment: null,
        report: null,
      },
      selectedSuggestions: new Set(),
    });
  }, []);

  return {
    ...state,
    startAlignment,
    fetchSuggestions,
    applyRewritePhase,
    generateReport,
    setFinalSuggestions,
    toggleSuggestion,
    reset,
  };
}
