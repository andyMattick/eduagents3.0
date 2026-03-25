/**
 * TeacherFeedbackPanel.tsx
 *
 * Shown below the generated assessment.  Lets teachers type targeted
 * comments (e.g. "make Q3 harder", "rewrite Q5 as multiple choice")
 * and trigger a focused rewrite via the Rewriter agent.
 */

import { useState } from "react";

interface TeacherFeedbackPanelProps {
  onSubmit: (comments: string) => void;
  isLoading: boolean;
  error: string | null;
  wasRewritten: boolean;
}

export function TeacherFeedbackPanel({
  onSubmit,
  isLoading,
  error,
  wasRewritten,
}: TeacherFeedbackPanelProps) {
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim() || isLoading) return;
    setSubmitted(true);
    onSubmit(comments.trim());
  };

  return (
    <div style={{
      marginTop: "1.5rem",
      background: "var(--surface-secondary, #f8fafc)",
      border: "1px solid var(--border-primary, #e2e8f0)",
      borderRadius: "10px",
      padding: "1.25rem",
    }}>
      {/* Header */}
      <div style={{
        fontWeight: 600,
        fontSize: "0.95rem",
        marginBottom: "0.75rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}>
        <span>💬</span>
        <span>Teacher Feedback</span>
        {wasRewritten && (
          <span style={{
            marginLeft: "auto",
            fontSize: "0.78rem",
            background: "#dcfce7",
            color: "#166534",
            borderRadius: "6px",
            padding: "2px 8px",
          }}>
            Rewrite applied
          </span>
        )}
      </div>

      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary, #64748b)", margin: "0 0 0.75rem" }}>
        Want changes? Describe what you'd like adjusted — reference specific questions by number.
      </p>

      {/* Error display */}
      {error && (
        <div style={{
          background: "#fff7ed",
          border: "1px solid #fdba74",
          color: "#7c2d12",
          borderRadius: "6px",
          padding: "0.5rem 0.75rem",
          marginBottom: "0.75rem",
          fontSize: "0.82rem",
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <textarea
          value={comments}
          onChange={e => { setComments(e.target.value); if (submitted) setSubmitted(false); }}
          placeholder='e.g., "Make Q3 harder", "Change Q5 to multiple choice", "Add a word problem about velocity"'
          disabled={isLoading}
          rows={2}
          style={{
            flex: 1,
            padding: "0.6rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "0.85rem",
            resize: "vertical",
            fontFamily: "inherit",
            background: "#ffffff",
            color: "#111827",
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !comments.trim()}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "6px",
            border: "none",
            background: isLoading ? "#94a3b8" : "#4f46e5",
            color: "#fff",
            cursor: isLoading ? "wait" : "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
            alignSelf: "flex-end",
            whiteSpace: "nowrap",
          }}
        >
          {isLoading ? "Rewriting…" : "Revise"}
        </button>
      </form>
    </div>
  );
}
