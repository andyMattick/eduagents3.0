/**
 * Preparedness Page Component
 * 
 * Main orchestration component for the Preparedness feature.
 * Manages the three-phase flow: alignment → suggestions → rewrite
 */

import React, { useState, useCallback, useEffect } from "react";
import type {
  AssessmentDocument,
  PrepDocument,
  AlignmentResult,
  ReverseAlignmentResult,
  SuggestionsResult,
  RewriteResult,
  PreparednessReportResult,
  Suggestion,
  SuggestionsResult as SuggestionsList,
} from "../../prism-v4/schema/domain/Preparedness";
import {
  getAlignment,
  getSuggestions,
  getReverseAlignment,
  applyRewrite,
  generatePreparednessReport,
} from "../../services_new/preparednessService";
import { AlignmentTable } from "./AlignmentTable";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { RewriteOutput } from "./RewriteOutput";
import PreparednessReportPage from "./PreparednessReportPage";
import "./v4.css";

interface PreparednessPageProps {
  prep?: PrepDocument;
  assessment?: AssessmentDocument;
}

type Phase = "upload" | "alignment" | "suggestions" | "rewrite" | "report";

interface PreparednessState {
  prep: PrepDocument | null;
  assessment: AssessmentDocument | null;
  alignment: AlignmentResult | null;
  reverseAlignment: ReverseAlignmentResult | null;
  suggestions: SuggestionsResult | null;
  finalSuggestions: SuggestionsResult | null;
  rewrite: RewriteResult | null;
  report: PreparednessReportResult | null;
  appliedSuggestions: SuggestionsResult | null;
}

interface LoadingState {
  alignment: boolean;
  reverseAlignment: boolean;
  suggestions: boolean;
  rewrite: boolean;
  report: boolean;
}

interface ErrorState {
  alignment: string | null;
  reverseAlignment: string | null;
  suggestions: string | null;
  rewrite: string | null;
  report: string | null;
}

export const PreparednessPage: React.FC<PreparednessPageProps> = ({
  prep: initialPrep,
  assessment: initialAssessment,
}) => {
  const [phase, setPhase] = useState<Phase>(
    initialPrep && initialAssessment ? "alignment" : "upload"
  );

  const [state, setState] = useState<PreparednessState>({
    prep: initialPrep ?? null,
    assessment: initialAssessment ?? null,
    alignment: null,
    reverseAlignment: null,
    suggestions: null,
    finalSuggestions: null,
    rewrite: null,
    report: null,
    appliedSuggestions: null,
  });

  const [loading, setLoading] = useState<LoadingState>({
    alignment: false,
    reverseAlignment: false,
    suggestions: false,
    rewrite: false,
    report: false,
  });

  const [errors, setErrors] = useState<ErrorState>({
    alignment: null,
    reverseAlignment: null,
    suggestions: null,
    rewrite: null,
    report: null,
  });

  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [selectedFixes, setSelectedFixes] = useState<Record<number, "remove_question" | "add_prep_support" | undefined>>({});

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Phase 1: Call alignment analysis
   */
  const handleStartAlignment = useCallback(async () => {
    if (!state.prep || !state.assessment) {
      setErrors((prev) => ({
        ...prev,
        alignment: "Prep and assessment documents are required",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, alignment: true }));
    setErrors((prev) => ({ ...prev, alignment: null }));

    try {
      const alignment = await getAlignment(state.prep, state.assessment);
      setState((prev) => ({ ...prev, alignment, reverseAlignment: null, report: null }));
      setPhase("alignment");
      setSelectedSuggestions(new Set());
      setSelectedFixes({});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, alignment: message }));
    } finally {
      setLoading((prev) => ({ ...prev, alignment: false }));
    }
  }, [state.prep, state.assessment]);

  /**
   * Phase 2: Call suggestions
   */
  const handleGetSuggestions = useCallback(async () => {
    if (!state.alignment) {
      setErrors((prev) => ({
        ...prev,
        suggestions: "Alignment data is required",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, suggestions: true }));
    setErrors((prev) => ({ ...prev, suggestions: null }));

    try {
      const suggestions = await getSuggestions(state.alignment);
      setState((prev) => ({ ...prev, suggestions, finalSuggestions: suggestions }));
      setPhase("suggestions");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, suggestions: message }));
    } finally {
      setLoading((prev) => ({ ...prev, suggestions: false }));
    }
  }, [state.alignment]);

  /**
   * Phase 3: Apply selected suggestions
   */
  const handleApplyRewrite = useCallback(async () => {
    if (!state.assessment) {
      setErrors((prev) => ({
        ...prev,
        rewrite: "Assessment document is required",
      }));
      return;
    }

    if (!state.suggestions || selectedSuggestions.size === 0) {
      setErrors((prev) => ({
        ...prev,
        rewrite: "No suggestions selected",
      }));
      return;
    }

    const sourceSuggestions = state.finalSuggestions ?? state.suggestions;
    const finalSuggestions: SuggestionsList = Array.from(selectedSuggestions)
      .map((idx) => sourceSuggestions?.[idx])
      .filter((suggestion): suggestion is Suggestion => Boolean(suggestion));

    setLoading((prev) => ({ ...prev, rewrite: true }));
    setErrors((prev) => ({ ...prev, rewrite: null }));

    try {
      const rewrite = await applyRewrite(state.assessment, finalSuggestions);
      setState((prev) => ({ ...prev, rewrite, appliedSuggestions: finalSuggestions, report: null }));
      setPhase("rewrite");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, rewrite: message }));
    } finally {
      setLoading((prev) => ({ ...prev, rewrite: false }));
    }
  }, [state.assessment, state.suggestions, selectedFixes, selectedSuggestions]);

  const handleGenerateReport = useCallback(async () => {
    if (!state.alignment || !state.rewrite || !state.prep || !state.assessment) {
      setErrors((prev) => ({
        ...prev,
        report: "Alignment, rewrite, prep, and assessment data are required",
      }));
      return;
    }

    const suggestionsForReport = state.appliedSuggestions ?? state.finalSuggestions ?? state.suggestions;
    if (!suggestionsForReport) {
      setErrors((prev) => ({
        ...prev,
        report: "Suggestions are required to generate a report",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, report: true }));
    setErrors((prev) => ({ ...prev, report: null }));

    try {
      let reverseAlignment = state.reverseAlignment;
      if (!reverseAlignment) {
        setLoading((prev) => ({ ...prev, reverseAlignment: true }));
        reverseAlignment = await getReverseAlignment(state.prep, state.assessment);
        setState((prev) => ({ ...prev, reverseAlignment }));
        setLoading((prev) => ({ ...prev, reverseAlignment: false }));
      }

      const report = await generatePreparednessReport(
        state.alignment,
        reverseAlignment,
        suggestionsForReport,
        state.rewrite
      );
      setState((prev) => ({ ...prev, report }));
      setPhase("report");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrors((prev) => ({ ...prev, report: message }));
    } finally {
      setLoading((prev) => ({ ...prev, report: false }));
      setLoading((prev) => ({ ...prev, reverseAlignment: false }));
    }
  }, [
    state.alignment,
    state.appliedSuggestions,
    state.assessment,
    state.finalSuggestions,
    state.prep,
    state.reverseAlignment,
    state.rewrite,
    state.suggestions,
  ]);

  useEffect(() => {
    if (
      state.prep &&
      state.assessment &&
      !state.alignment &&
      !loading.alignment
    ) {
      void handleStartAlignment();
    }
  }, [state.prep, state.assessment, state.alignment, loading.alignment, handleStartAlignment]);

  useEffect(() => {
    if (state.alignment && !state.suggestions && !loading.suggestions) {
      void handleGetSuggestions();
    }
  }, [state.alignment, state.suggestions, loading.suggestions, handleGetSuggestions]);

  const handleFinalSuggestionsChange = (finalSuggestions: SuggestionsResult) => {
    setState((prev) => ({ ...prev, finalSuggestions }));
  };

  /**
   * Handle suggestion selection
   */
  const handleToggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectFix = (
    assessmentItemNumber: number,
    fixType: "remove_question" | "add_prep_support"
  ) => {
    setSelectedFixes((prev) => ({ ...prev, [assessmentItemNumber]: fixType }));
  };

  /**
   * Start over
   */
  const handleReset = () => {
    setState({
      prep: null,
      assessment: null,
      alignment: null,
      reverseAlignment: null,
      suggestions: null,
      rewrite: null,
      finalSuggestions: null,
      report: null,
      appliedSuggestions: null,
    });
    setPhase("upload");
    setSelectedSuggestions(new Set());
    setSelectedFixes({});
    setErrors({
      alignment: null,
      reverseAlignment: null,
      suggestions: null,
      rewrite: null,
      report: null,
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: "0 0 0.5rem 0", fontSize: "2rem", fontWeight: "700" }}>
          Preparedness Analysis
        </h1>
        <p style={{ margin: 0, color: "#666", fontSize: "1rem" }}>
          Ensure your assessment aligns with your preparation materials.
        </p>
      </div>

      {/* Phase Indicator */}
      {phase !== "upload" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1.5rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            flexWrap: "wrap",
          }}
        >
          <div style={{ color: phase === "alignment" ? "#2563eb" : "#9ca3af" }}>1. Alignment</div>
          <div style={{ color: "#9ca3af" }}>›</div>
          <div style={{ color: phase === "suggestions" ? "#2563eb" : "#9ca3af" }}>2. Suggestions</div>
          <div style={{ color: "#9ca3af" }}>›</div>
          <div style={{ color: phase === "rewrite" ? "#2563eb" : "#9ca3af" }}>3. Rewrite</div>
          <div style={{ color: "#9ca3af" }}>›</div>
          <div style={{ color: phase === "report" ? "#2563eb" : "#9ca3af" }}>4. Report</div>
        </div>
      )}

      {/* UPLOAD PHASE */}
      {phase === "upload" && (
        <div
          style={{
            border: "2px dashed #0066cc",
            borderRadius: "8px",
            padding: "3rem 2rem",
            textAlign: "center",
            backgroundColor: "#f0f6ff",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "1rem", color: "#0066cc" }}>
            Ready to analyze?
          </h2>
          <p style={{ margin: "0 0 2rem 0", color: "#666" }}>
            Upload or select your prep document and assessment to begin.
          </p>

          {/* Document Upload Form (simplified for now) */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                // Placeholder: in real app, open file picker or document selector
                // For now, we'll prompt for manual document entry
                const prepText = prompt("Enter prep document text:");
                const assessmentText = prompt("Enter assessment items (one per line, numbered):");
                
                if (prepText && assessmentText) {
                  const items = assessmentText
                    .split("\n")
                    .filter(line => line.trim())
                    .map((text, idx) => ({
                      itemNumber: idx + 1,
                      text: text.replace(/^\d+\.\s*/, "").trim(),
                    }));

                  setState({
                    prep: { rawText: prepText },
                    assessment: { items },
                    alignment: null,
                    reverseAlignment: null,
                    suggestions: null,
                    finalSuggestions: null,
                    rewrite: null,
                    report: null,
                    appliedSuggestions: null,
                  });

                  setPhase("alignment");
                }
              }}
              className="v4-button v4-button-primary"
            >
              Input Documents
            </button>
          </div>
        </div>
      )}

      {/* ALIGNMENT PHASE */}
      {phase === "alignment" && (
        <div>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600" }}>
            Assessment-Prep Alignment
          </h2>

          {errors.alignment && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#ffebee",
                borderRadius: "8px",
                marginBottom: "1.5rem",
                color: "#c62828",
              }}
            >
              ✗ {errors.alignment}
            </div>
          )}

          {loading.alignment ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#666",
              }}
            >
              <p style={{ marginTop: 0 }}>Analyzing alignment...</p>
              <div style={{ fontSize: "2rem" }}>⏳</div>
            </div>
          ) : state.alignment ? (
            <>
              <AlignmentTable alignment={state.alignment} />

              <div style={{ marginTop: "1.5rem" }}>
                <h3 style={{ marginBottom: "0.5rem", fontSize: "1.1rem" }}>
                  Reverse Alignment (Review -&gt; Test)
                </h3>
                {errors.reverseAlignment && (
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      backgroundColor: "#ffebee",
                      color: "#c62828",
                      borderRadius: "6px",
                      marginBottom: "0.75rem",
                    }}
                  >
                    ✗ {errors.reverseAlignment}
                  </div>
                )}
                {loading.reverseAlignment ? (
                  <p style={{ margin: 0, color: "#666" }}>Analyzing review-to-test alignment...</p>
                ) : state.reverseAlignment ? (
                  <pre
                    style={{
                      margin: 0,
                      padding: "1rem",
                      backgroundColor: "#f7f9fc",
                      border: "1px solid #dde5f0",
                      borderRadius: "8px",
                      maxHeight: "260px",
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      fontSize: "0.85rem",
                    }}
                  >
                    {JSON.stringify(state.reverseAlignment, null, 2)}
                  </pre>
                ) : (
                  <p style={{ margin: 0, color: "#999" }}>No reverse alignment data yet.</p>
                )}
              </div>

              <div
                style={{
                  marginTop: "2rem",
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={handleReset}
                  className="v4-button v4-button-secondary"
                >
                  Start Over
                </button>
                <button
                  type="button"
                  onClick={handleGetSuggestions}
                  disabled={loading.suggestions}
                  className="v4-button v4-button-primary"
                >
                  {loading.suggestions ? "Generating..." : "View Suggestions"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "#999" }}>
              <p>No alignment data available. Please start the analysis.</p>
            </div>
          )}
        </div>
      )}

      {/* SUGGESTIONS PHASE */}
      {phase === "suggestions" && (
        <div>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600" }}>
            Fix Suggestions
          </h2>

          {errors.suggestions && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#ffebee",
                borderRadius: "8px",
                marginBottom: "1.5rem",
                color: "#c62828",
              }}
            >
              ✗ {errors.suggestions}
            </div>
          )}

          {loading.suggestions ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#666",
              }}
            >
              <p style={{ marginTop: 0 }}>Generating suggestions...</p>
              <div style={{ fontSize: "2rem" }}>⏳</div>
            </div>
          ) : state.suggestions ? (
            <>
              <SuggestionsPanel
                suggestions={state.suggestions}
                selectedSuggestions={selectedSuggestions}
                selectedFixes={selectedFixes}
                onToggleSuggestion={handleToggleSuggestion}
                onSelectFix={handleSelectFix}
                onChangeFinalSuggestions={handleFinalSuggestionsChange}
                isLoading={loading.rewrite}
              />

              <div
                style={{
                  marginTop: "2rem",
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setPhase("alignment")}
                  className="v4-button v4-button-secondary"
                >
                  Back to Alignment
                </button>
                <button
                  type="button"
                  onClick={handleApplyRewrite}
                  disabled={loading.rewrite || selectedSuggestions.size === 0}
                  className="v4-button v4-button-primary"
                >
                  {loading.rewrite
                    ? "Rewriting..."
                    : `Apply ${selectedSuggestions.size} Suggestion${selectedSuggestions.size === 1 ? "" : "s"}`}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "#999" }}>
              <p>No suggestions available. Please generate them first.</p>
            </div>
          )}
        </div>
      )}

      {/* REWRITE PHASE */}
      {phase === "rewrite" && (
        <div>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600" }}>
            Rewritten Assessment
          </h2>

          {errors.rewrite && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#ffebee",
                borderRadius: "8px",
                marginBottom: "1.5rem",
                color: "#c62828",
              }}
            >
              ✗ {errors.rewrite}
            </div>
          )}

          {loading.rewrite ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#666",
              }}
            >
              <p style={{ marginTop: 0 }}>Rewriting assessment...</p>
              <div style={{ fontSize: "2rem" }}>⏳</div>
            </div>
          ) : state.rewrite && state.assessment ? (
            <>
              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                }}
              >
                <RewriteOutput
                  rewrite={state.rewrite}
                  originalAssessment={state.assessment}
                  originalPrepTitle={state.prep?.title}
                  onGenerateReport={handleGenerateReport}
                  isGeneratingReport={loading.report}
                />
              </div>

              {errors.report && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    backgroundColor: "#ffebee",
                    borderRadius: "8px",
                    color: "#c62828",
                  }}
                >
                  ✗ {errors.report}
                </div>
              )}

              <div
                style={{
                  marginTop: "2rem",
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={handleReset}
                  className="v4-button v4-button-secondary"
                >
                  Start Over
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "#999" }}>
              <p>No rewrite data available. Please generate it first.</p>
            </div>
          )}
        </div>
      )}

      {/* REPORT PHASE */}
      {phase === "report" && state.report && (
        <div>
          <PreparednessReportPage report={state.report} onBack={() => setPhase("rewrite")} />
          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              gap: "1rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              className="v4-button v4-button-secondary"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparednessPage;
