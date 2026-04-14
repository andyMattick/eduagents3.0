import React from "react";
import TeacherActionMenu, { type TeacherAction } from "./TeacherActionMenu";

export interface AlignmentItemV2 {
  questionNumber: number;
  questionText: string;
  concepts: string[];
  alignment: "covered" | "uncovered" | "misaligned";
  difficulty: number;
  explanation: string;
}

interface AlignmentTableV2Props {
  items: AlignmentItemV2[];
  loadingByQuestion: Record<number, boolean>;
  onAction: (item: AlignmentItemV2, action: TeacherAction) => void;
}

export default function AlignmentTableV2({ items, loadingByQuestion, onAction }: AlignmentTableV2Props) {
  const alignmentBadge = (alignment: AlignmentItemV2["alignment"]) => {
    if (alignment === "covered") {
      return { label: "Covered", backgroundColor: "#dcfce7", color: "#166534" };
    }
    if (alignment === "misaligned") {
      return { label: "Misaligned", backgroundColor: "#fef3c7", color: "#92400e" };
    }
    return { label: "Uncovered", backgroundColor: "#fee2e2", color: "#991b1b" };
  };

  return (
    <section className="prep-detail-box" style={{ margin: 0 }}>
      <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem" }}>Alignment Table</h3>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {items.map((item) => (
          <article key={item.questionNumber} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem" }}>
            {(() => {
              const badge = alignmentBadge(item.alignment);
              return (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
              <strong>Q{item.questionNumber}</strong>
              <span className="prep-chip" style={{ backgroundColor: badge.backgroundColor, color: badge.color }}>
                {badge.label}
              </span>
            </div>
              );
            })()}
            <p style={{ margin: "0.5rem 0", color: "#334155" }}>{item.questionText}</p>
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              {item.concepts.map((concept) => (
                <span key={concept} className="prep-chip">{concept}</span>
              ))}
              {item.concepts.length === 0 ? <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No concepts detected</span> : null}
            </div>
            <details>
              <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "#475569" }}>
                Difficulty {item.difficulty} - explanation
              </summary>
              <p style={{ margin: "0.5rem 0 0 0", color: "#475569" }}>{item.explanation || "No explanation provided."}</p>
            </details>
            <div style={{ marginTop: "0.65rem" }}>
              <TeacherActionMenu
                questionNumber={item.questionNumber}
                isLoading={Boolean(loadingByQuestion[item.questionNumber])}
                onAction={(action) => onAction(item, action)}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
