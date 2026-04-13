import React from "react";

export function DifficultyLegend() {
  return (
    <div
      style={{
        padding: "12px 16px",
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fafafa",
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Difficulty Levels (1–5)</h3>
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.5 }}>
        <li>
          <strong>1 — Very Basic</strong> — single‑step recall or recognition.
        </li>
        <li>
          <strong>2 — Basic</strong> — simple computation or direct application.
        </li>
        <li>
          <strong>3 — Moderate</strong> — multi‑step reasoning or combining concepts.
        </li>
        <li>
          <strong>4 — Advanced</strong> — multi‑step reasoning with abstraction or transfer.
        </li>
        <li>
          <strong>5 — Very Advanced</strong> — complex reasoning, multi‑concept integration, scenario analysis.
        </li>
      </ul>
    </div>
  );
}
