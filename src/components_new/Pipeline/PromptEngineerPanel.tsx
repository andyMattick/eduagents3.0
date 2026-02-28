/**
 * PromptEngineerPanel.tsx
 *
 * Renders the Prompt Engineer's validation results inline in the
 * conversational flow — contradictions, missing info, time estimate,
 * and suggestions.  Shown after the teacher finishes the form but
 * before the pipeline fires.
 */

import type { PromptEngineerResult } from "@/pipeline/agents/promptEngineer";

interface PromptEngineerPanelProps {
  result: PromptEngineerResult;
  onProceed: () => void;
  onEdit: () => void;
  /** Allow teacher to override a blocked result and generate anyway */
  onOverride?: () => void;
}

export function PromptEngineerPanel({
  result,
  onProceed,
  onEdit,
  onOverride,
}: PromptEngineerPanelProps) {
  const hasIssues = result.contradictions.length > 0 || result.missingInfo.length > 0;
  const hasSuggestions = result.suggestions.length > 0;

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
          <strong style={{ color: "#1f2937" }}>Estimated creation time:</strong>{" "}
          {result.estimatedCreationSeconds < 60
            ? `~${result.estimatedCreationSeconds} seconds`
            : `~${Math.round(result.estimatedCreationSeconds / 60 * 10) / 10} minutes`
          }
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

      {/* Missing info */}
      {result.missingInfo.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontWeight: 600, color: "#92400e", marginBottom: "0.3rem" }}>
            Missing Information
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {result.missingInfo.map((m, i) => (
              <li key={i} style={{ color: "#78350f", marginBottom: "0.25rem" }}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {hasSuggestions && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontWeight: 600, color: "#1e40af", marginBottom: "0.3rem" }}>
            Suggestions
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {result.suggestions.map((s, i) => (
              <li key={i} style={{ color: "#1e3a5f", marginBottom: "0.25rem" }}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
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

        {!result.shouldBlock && (
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
            Generate Assessment →
          </button>
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
    </div>
  );
}
