import React, { useState } from "react";

export type GenerationMode = "aligned_test" | "aligned_review" | "alternate_test";
export type AlternateVariant = "different" | "difficulty" | "profile";

interface BlueprintActionsProps {
  onGenerate: (mode: GenerationMode, variant?: AlternateVariant) => void;
}

export function BlueprintActions({ onGenerate }: BlueprintActionsProps) {
  const [showAlternateModal, setShowAlternateModal] = useState(false);

  function handleAlternateVariant(variant: AlternateVariant) {
    setShowAlternateModal(false);
    onGenerate("alternate_test", variant);
  }

  return (
    <>
      <div className="alignment-generation-cards">
        <div
          className="alignment-gen-card"
          role="button"
          tabIndex={0}
          onClick={() => onGenerate("aligned_test")}
          onKeyDown={(e) => e.key === "Enter" && onGenerate("aligned_test")}
        >
          <h2 className="alignment-gen-card-title">Build Aligned Test</h2>
          <p className="alignment-gen-card-desc">A new test aligned to what you taught.</p>
        </div>

        <div
          className="alignment-gen-card"
          role="button"
          tabIndex={0}
          onClick={() => onGenerate("aligned_review")}
          onKeyDown={(e) => e.key === "Enter" && onGenerate("aligned_review")}
        >
          <h2 className="alignment-gen-card-title">Build Aligned Review</h2>
          <p className="alignment-gen-card-desc">A review aligned to the test you uploaded.</p>
        </div>

        <div
          className="alignment-gen-card"
          role="button"
          tabIndex={0}
          onClick={() => setShowAlternateModal(true)}
          onKeyDown={(e) => e.key === "Enter" && setShowAlternateModal(true)}
        >
          <h2 className="alignment-gen-card-title">Build Alternate Test Version</h2>
          <p className="alignment-gen-card-desc">A rewritten or differentiated version of the test.</p>
        </div>
      </div>

      {showAlternateModal && (
        <div
          className="alignment-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAlternateModal(false)}
        >
          <div
            className="alignment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="v4-kicker" style={{ marginBottom: "1rem" }}>What kind of alternate version?</p>

            <button
              type="button"
              className="alignment-modal-option"
              onClick={() => handleAlternateVariant("different")}
            >
              <strong>Different Version</strong>
              <span>Rewrite the test with new wording and contexts.</span>
            </button>

            <button
              type="button"
              className="alignment-modal-option"
              onClick={() => handleAlternateVariant("difficulty")}
            >
              <strong>Easier / Harder Version</strong>
              <span>Adjust difficulty while keeping the same blueprint.</span>
            </button>

            <button
              type="button"
              className="alignment-modal-option"
              onClick={() => handleAlternateVariant("profile")}
            >
              <strong>Profile-Specific Version</strong>
              <span>Generate a version tailored to ELL, Low Reading, Gifted, etc.</span>
            </button>

            <button
              type="button"
              className="alignment-modal-cancel"
              onClick={() => setShowAlternateModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
