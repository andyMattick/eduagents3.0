import React from "react";

interface PracticeSetGeneratorProps {
  itemCount: number;
  difficulty: number;
  onItemCountChange: (value: number) => void;
  onDifficultyChange: (value: number) => void;
  onGenerate: () => void;
}

export function PracticeSetGenerator({
  itemCount,
  difficulty,
  onItemCountChange,
  onDifficultyChange,
  onGenerate,
}: PracticeSetGeneratorProps) {
  return (
    <div style={{ marginTop: "1rem", border: "1px solid rgba(86,57,32,0.16)", borderRadius: "12px", padding: "0.9rem" }}>
      <p className="v4-kicker" style={{ marginBottom: "0.5rem" }}>Generate a Practice Set</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.6rem" }}>
        <label style={{ fontSize: "0.78rem", color: "#6b5040" }}>
          Number of items (5-20)
          <input
            type="number"
            min={5}
            max={20}
            value={itemCount}
            onChange={(e) => onItemCountChange(Math.max(5, Math.min(20, Number(e.target.value))))}
            style={{ width: "100%", marginTop: "0.2rem" }}
          />
        </label>
        <label style={{ fontSize: "0.78rem", color: "#6b5040" }}>
          Difficulty
          <input
            type="range"
            min={1}
            max={5}
            value={difficulty}
            onChange={(e) => onDifficultyChange(Number(e.target.value))}
            style={{ width: "100%", marginTop: "0.45rem" }}
          />
        </label>
      </div>
      <button type="button" className="v4-button" style={{ marginTop: "0.75rem" }} onClick={onGenerate}>
        Generate Practice Set
      </button>
    </div>
  );
}
