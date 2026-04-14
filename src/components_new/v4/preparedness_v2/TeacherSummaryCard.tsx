import React from "react";

interface TeacherSummaryCardProps {
  summary: string;
  prepDifficulty?: number;
}

export default function TeacherSummaryCard({ summary, prepDifficulty }: TeacherSummaryCardProps) {
  return (
    <section className="prep-detail-box" style={{ marginBottom: "1rem" }}>
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>Teacher Summary</h3>
      <p style={{ margin: "0 0 0.5rem 0", color: "#0f172a", fontWeight: 600 }}>
        Prep Difficulty {Math.min(5, Math.max(1, Math.round(prepDifficulty ?? 1)))}/5
      </p>
      <p style={{ margin: 0, lineHeight: 1.5, color: "#334155" }}>
        {summary || "No summary available."}
      </p>
    </section>
  );
}
