import { useState } from "react";
import type {
  TestEvidenceResponse,
  TeacherAction,
} from "../../../prism-v4/schema/domain/ConceptMatch";

interface Props {
  evidence: TestEvidenceResponse;
  onClose: () => void;
  onAddAction: (action: TeacherAction) => void;
}

export function TestEvidenceModal({ evidence, onClose, onAddAction }: Props) {
  const [comment, setComment] = useState("");

  const handleQuickAction = (
    action: TeacherAction["action"],
    itemNumber?: number
  ) => {
    onAddAction({
      concept: evidence.concept,
      target: "test",
      action,
      questionNumbers: itemNumber ? [itemNumber] : undefined,
      comment: comment.trim() || undefined,
    });
    setComment("");
  };

  return (
    <div className="cm-modal-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cm-modal-close" onClick={onClose}>
          ×
        </button>
        <p className="cm-kicker">Test Evidence</p>
        <h2>
          {evidence.concept}{" "}
          <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "#433228" }}>
            ({evidence.items.length} item{evidence.items.length !== 1 ? "s" : ""})
          </span>
        </h2>

        {evidence.items.map((item) => (
          <div key={item.itemNumber} className="cm-evidence-item">
            <div className="cm-evidence-item-header">
              <span>Q{item.itemNumber}</span>
              <span>Difficulty: {item.difficulty}/5</span>
            </div>
            <p>{item.rawText}</p>
            <div className="cm-evidence-tags">
              {item.concepts.map((c) => (
                <span key={c} className="cm-evidence-tag">
                  {c}
                </span>
              ))}
            </div>
            <div className="cm-quick-actions">
              <button
                className="cm-btn cm-btn--sm"
                onClick={() => handleQuickAction("removeQuestions", item.itemNumber)}
              >
                Remove
              </button>
              <button
                className="cm-btn cm-btn--sm"
                onClick={() => handleQuickAction("flagDifficultyIncorrect", item.itemNumber)}
              >
                Difficulty Incorrect
              </button>
            </div>
          </div>
        ))}

        <div className="cm-comment-box">
          <textarea
            placeholder="Add a comment (e.g. AI missed a concept, this covers ___, etc.)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="cm-quick-actions">
            <button
              className="cm-btn cm-btn--sm"
              onClick={() => handleQuickAction("flagAiMissedConcept")}
            >
              AI Missed This Concept
            </button>
            <button
              className="cm-btn cm-btn--sm"
              onClick={() => handleQuickAction("flagDifficultyIncorrect")}
            >
              This Question is Easier Than Marked
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
