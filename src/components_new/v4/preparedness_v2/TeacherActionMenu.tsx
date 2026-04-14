import React from "react";

export type TeacherAction =
  | "keep"
  | "add_review"
  | "rewrite"
  | "rewrite_to_prep"
  | "rewrite_easier"
  | "rewrite_harder"
  | "practice";

interface TeacherActionMenuProps {
  questionNumber: number;
  isLoading: boolean;
  onAction: (action: TeacherAction) => void;
}

export default function TeacherActionMenu({ questionNumber, isLoading, onAction }: TeacherActionMenuProps) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
      <button type="button" className="v4-button v4-button-secondary v4-button-sm" onClick={() => onAction("keep")} disabled={isLoading}>
        Keep
      </button>
      <button type="button" className="v4-button v4-button-secondary v4-button-sm" onClick={() => onAction("add_review")} disabled={isLoading}>
        Add to Review
      </button>
      <button type="button" className="v4-button v4-button-secondary v4-button-sm" onClick={() => onAction("rewrite")} disabled={isLoading}>
        Rewrite Question
      </button>
      <button type="button" className="v4-button v4-button-secondary v4-button-sm" onClick={() => onAction("rewrite_to_prep")} disabled={isLoading}>
        Rewrite to Prep Difficulty
      </button>
      <button type="button" className="v4-button v4-button-secondary v4-button-sm" onClick={() => onAction("rewrite_easier")} disabled={isLoading}>
        Rewrite Easier
      </button>
      <button type="button" className="v4-button v4-button-secondary v4-button-sm" onClick={() => onAction("rewrite_harder")} disabled={isLoading}>
        Rewrite Harder
      </button>
      <button type="button" className="v4-button v4-button-secondary v4-button-sm" onClick={() => onAction("practice")} disabled={isLoading}>
        Generate Practice
      </button>
      {isLoading ? <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Working on Q{questionNumber}…</span> : null}
    </div>
  );
}
