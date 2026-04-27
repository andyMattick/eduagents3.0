/**
 * PromptEngineerPanel.tsx
 *
 * Renders the Prompt Engineer's validation results inline in the
 * conversational flow — contradictions, missing info, time estimate,
 * and suggestions.  Shown after the teacher finishes the form but
 * before the pipeline fires.
 */

import { useState } from "react";
import type { PromptEngineerResult } from "../../pipeline/agents/promptEngineer";
import type { FeasibilityReport } from "../../pipeline/agents/architect/feasibility";
import type { TopicRefinementResult } from "../../pipeline/agents/architect/topicRefiner";

function getEstimateMessage(seconds: number): string {
  if (seconds < 90) return "Estimated time: ~1 minute";
  if (seconds <= 150) return "This run may take longer than usual.";
  if (seconds <= 240) return "This run may take 2-4 minutes.";
  return "Consider narrowing the topic or reducing question count.";
}

interface PromptEngineerPanelProps {
  result: PromptEngineerResult;
  /** Pre-generation feasibility report — shown as contextual warning before pipeline fires. */
  feasibility?: FeasibilityReport;
  topicRefinement?: TopicRefinementResult;
  onProceed: () => void;
  onEdit: () => void;
  /** Allow teacher to override a blocked result and generate anyway */
  onOverride?: () => void;
}

export function PromptEngineerPanel({
  result,
  feasibility,
  topicRefinement,
  onProceed,
  onEdit,
  onOverride,
}: PromptEngineerPanelProps) {
  const hasIssues = result.contradictions.length > 0 || result.missingInfo.length > 0;
  const hasSuggestions = result.suggestions.length > 0;
  // Tracks whether the teacher has explicitly acknowledged the grade-text warning.
  const [gradeTextConfirmed, setGradeTextConfirmed] = useState(false);
  const gradeTextWarning = feasibility?.gradeTextWarning ?? null;
  // Generation is blocked until the teacher confirms the grade-text mismatch
  // (or until there is no such warning).
  const isGradeTextBlocked = !!gradeTextWarning && !gradeTextConfirmed;
  // Hard block only when the topic is definitely broad by latency signal.
  const isRefinementBlocked =
    !!topicRefinement?.needsRefinement && topicRefinement.reason === "high_estimated_time";

  return (
    <div className="pe-panel" style={{
      background: hasIssues ? "#fef2f2" : "#f0fdf4",
      border: `1px solid ${hasIssues ? "#fca5a5" : "#86efac"}`,
      borderRadius: "10px",
      padding: "1.25rem",
      marginTop: "1rem",
      marginBottom: "1rem",
      fontSize: "0.9rem",
      lineHeight: 1.55,
      color: "#111827",
    }}>
      {/* Header */}
      <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.95rem", lineHeight: 1 }}>{hasIssues ? "⚠️" : "✅"}</span>
        <span>{hasIssues ? "Input Review" : "Looks Good!"}</span>
        {result.estimatedTimeMinutes !== null && (
          <span style={{
            marginLeft: "auto",
            fontSize: "0.78rem",
            fontWeight: 600,
            background: hasIssues ? "rgba(185, 28, 28, 0.12)" : "rgba(22, 163, 74, 0.15)",
            color: hasIssues ? "#b91c1c" : "#15803d",
            border: `1px solid ${hasIssues ? "rgba(185,28,28,0.2)" : "rgba(22,163,74,0.25)"}`,
            borderRadius: "20px",
            padding: "3px 10px",
          }}>
            ~{result.estimatedTimeMinutes} min student time
          </span>
        )}
      </div>

      {/* Creation time estimate */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "1rem",
        padding: "0.6rem 0.85rem",
        background: "rgba(255,255,255,0.65)",
        border: "1px solid rgba(79, 70, 229, 0.15)",
        borderRadius: "8px",
        fontSize: "0.85rem",
        color: "#374151",
      }}>
        <span style={{ fontSize: "1rem", flexShrink: 0 }}>⏱</span>
        <span>
          <strong style={{ color: "#1f2937" }}>{getEstimateMessage(result.estimatedCreationSeconds)}</strong>
        </span>
        <span style={{
          marginLeft: "auto",
          fontSize: "0.75rem",
          fontWeight: 500,
          color: "#6366f1",
          background: "rgba(99, 102, 241, 0.08)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          borderRadius: "12px",
          padding: "2px 8px",
          whiteSpace: "nowrap",
        }}>
          {result.estimatedCreationSeconds <= 20
            ? "Quick"
            : result.estimatedCreationSeconds <= 45
            ? "Standard"
            : "May take a moment"}
        </span>
      </div>

      {/* Contradictions */}
      {result.contradictions.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontWeight: 600, color: "#b91c1c", marginBottom: "0.3rem" }}>
            Contradictions
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {result.contradictions.map((c, i) => (
              <li key={i} style={{ color: "#991b1b", marginBottom: "0.25rem" }}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Topic refinement guardrail */}
      {topicRefinement?.needsRefinement && (
        <div style={{
          marginTop: "0.75rem",
          marginBottom: "0.25rem",
          padding: "0.75rem 1rem",
          background: "var(--adp-warn-bg, rgba(255, 251, 235, 0.92))",
          border: "1px solid var(--adp-warn-border, #f59e0b)",
          borderRadius: "8px",
          fontSize: "0.85rem",
          lineHeight: 1.5,
          color: "var(--adp-warn-fg, #78350f)",
        }}>
          <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "var(--adp-warn-heading, #92400e)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>🎯</span>
            <span>Topic Refinement Recommended</span>
          </div>
          <p style={{ margin: "0 0 0.4rem" }}>{topicRefinement.prompt}</p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {topicRefinement.suggestions.map((suggestion, index) => (
              <li key={index} style={{ marginBottom: "0.2rem" }}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Feasibility pre-check warning ─────────────────────────────── */}
      {feasibility && feasibility.riskLevel !== "safe" && (() => {
        const isOverload  = feasibility.riskLevel === "overload";
        const isHigh      = feasibility.riskLevel === "high";
        const [bgColor, borderColor, textColor, headingColor] = isOverload
          ? ["rgba(255,237,213,0.85)", "#f97316", "#7c2d12", "#c2410c"]
          : isHigh
          ? ["rgba(255,251,235,0.9)",  "#fbbf24", "#78350f", "#92400e"]
          : ["rgba(240,253,244,0.9)",  "#86efac", "#14532d", "#166534"];

        return (
          <div style={{
            marginTop: "0.75rem",
            marginBottom: "0.25rem",
            padding: "0.75rem 1rem",
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: "8px",
            fontSize: "0.85rem",
            lineHeight: 1.5,
            color: textColor,
          }}>
            <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: headingColor, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>{isOverload ? "⚠️" : isHigh ? "🔶" : "💡"}</span>
              <span>
                {isOverload
                  ? "Topic length may limit question variety"
                  : isHigh
                  ? "Topic coverage is moderate"
                  : "A little light on detail"}
              </span>
            </div>

            {isOverload && feasibility.adjustedQuestionCount != null ? (
              <p style={{ margin: "0 0 0.4rem" }}>
                This topic comfortably supports about{" "}
                <strong>{feasibility.recommendedSlotRange.min}–{feasibility.recommendedSlotRange.max}</strong>{" "}
                questions. I'll automatically reduce from{" "}
                <strong>{Math.ceil(feasibility.recommendedSlotRange.max * 1.3)}</strong>{" "}
                to <strong>{feasibility.adjustedQuestionCount}</strong> to keep things coherent.{" "}
                To enable a longer assessment, add more detail or expand the scope of your topic.
              </p>
            ) : isOverload ? (
              <p style={{ margin: "0 0 0.4rem" }}>
                This topic may support fewer questions than requested. The Architect will adjust the count automatically before writing.
              </p>
            ) : isHigh ? (
              <p style={{ margin: "0 0 0.4rem" }}>
                This topic may not fully support the requested number of questions — some variation may be limited.
                Adding more detail in <em>Additional Details</em> can help.
              </p>
            ) : (
              <p style={{ margin: "0 0 0.4rem" }}>
                Topic detail is moderate. Adding specifics can improve question variety.
              </p>
            )}

            {feasibility.warnings
              .filter(w => !w.includes("[Feasibility detail]"))
              .filter(w => w.includes("Bloom"))
              .map((w, i) => (
                <p key={i} style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", opacity: 0.85 }}>{w}</p>
              ))}
          </div>
        );
      })()}

      {/* Action buttons — hidden while grade-text confirmation is pending */}
      {!isGradeTextBlocked && (
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          <button
            onClick={onEdit}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            ← Edit Inputs
          </button>

          {!result.shouldBlock && !isRefinementBlocked && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                onClick={onProceed}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "6px",
                  border: "none",
                  background: "#4f46e5",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {feasibility?.adjustedQuestionCount != null
                  ? `Generate Assessment (adjusted to ${feasibility.adjustedQuestionCount} questions) →`
                  : "Generate Assessment →"}
              </button>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #4b5563)" }}>
                {getEstimateMessage(result.estimatedCreationSeconds)}
              </span>
              {topicRefinement?.needsRefinement && (
                <span style={{ fontSize: "0.8rem", color: "var(--adp-warn-heading, #92400e)", fontWeight: 600 }}>
                  Narrowing this topic first will improve quality and speed.
                </span>
              )}
            </div>
          )}

          {!result.shouldBlock && isRefinementBlocked && (
            <>
              <span style={{ fontSize: "0.82rem", color: "var(--adp-warn-heading, #92400e)", alignSelf: "center" }}>
                Topic is too broad for the current run size. Edit topic, or generate anyway.
              </span>
              {onOverride && (
                <button
                  onClick={onOverride}
                  style={{
                    padding: "0.5rem 1.1rem",
                    borderRadius: "6px",
                    border: "1.5px solid var(--adp-warn-border, #d97706)",
                    background: "var(--adp-warn-bg-soft, rgba(217,119,6,0.08))",
                    color: "var(--adp-warn-heading, #92400e)",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                  title="Generate anyway — quality and latency may degrade for broad topics"
                >
                  ⚠️ Generate Anyway
                </button>
              )}
            </>
          )}

          {result.shouldBlock && (
            <>
              <span style={{ fontSize: "0.82rem", color: "#b91c1c", alignSelf: "center" }}>
                Fix the issues above, or override to generate anyway.
              </span>
              {onOverride && (
                <button
                  onClick={onOverride}
                  style={{
                    padding: "0.5rem 1.1rem",
                    borderRadius: "6px",
                    border: "1.5px solid #d97706",
                    background: "rgba(217,119,6,0.08)",
                    color: "#92400e",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                  title="Generate anyway — the Philosopher will flag any issues in its report"
                >
                  ⚠️ Override &amp; Generate Anyway
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
