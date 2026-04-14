import React from "react";
import type { GenerationMode } from "./BlueprintActions";

interface ModeSelectModalProps {
  open: boolean;
  selectedMode: GenerationMode;
  onSelectMode: (mode: GenerationMode) => void;
  onGenerate: () => void;
  onClose: () => void;
}

const MODE_CARDS: Array<{ mode: GenerationMode; title: string; description: string }> = [
  {
    mode: "aligned_test",
    title: "Aligned Test",
    description: "A new test aligned to what you taught.",
  },
  {
    mode: "aligned_review",
    title: "Aligned Review",
    description: "A review aligned to the test you uploaded.",
  },
  {
    mode: "alternate_test",
    title: "Alternate Test Version",
    description: "A rewritten or differentiated version of your test.",
  },
];

export function ModeSelectModal({ open, selectedMode, onSelectMode, onGenerate, onClose }: ModeSelectModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div style={{ background: "#fff", borderRadius: "16px", padding: "1rem", width: "min(780px, 100%)" }}>
        <p className="v4-kicker" style={{ marginBottom: "0.35rem" }}>What would you like to build?</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.7rem" }}>
          {MODE_CARDS.map((card) => (
            <button
              key={card.mode}
              type="button"
              onClick={() => onSelectMode(card.mode)}
              style={{
                all: "unset",
                cursor: "pointer",
                border: selectedMode === card.mode ? "2px solid #bb5b35" : "1px solid rgba(86,57,32,0.2)",
                borderRadius: "12px",
                padding: "0.75rem",
                background: "rgba(255, 251, 245, 0.9)",
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, color: "#1f1a17" }}>{card.title}</p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.84rem", color: "#6b5040" }}>{card.description}</p>
            </button>
          ))}
        </div>
        <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button type="button" className="v4-button v4-button-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="v4-button" onClick={onGenerate}>Generate</button>
        </div>
      </div>
    </div>
  );
}
