import React from "react";
import type { ReverseAlignmentResult } from "../../prism-v4/schema/domain/Preparedness";
import { DifficultyLegend } from "./DifficultyLegend";

interface ReverseAlignmentPanelProps {
  reverseAlignment: ReverseAlignmentResult;
}

function getReverseStatusLabel(status: string): string {
  switch (status) {
    case "aligned":
      return "Aligned";
    case "review_above_test":
      return "Prep Above Test";
    case "review_below_test":
      return "Prep Below Test";
    case "not_used_in_test":
      return "Not Used In Test";
    default:
      return status;
  }
}

function getReverseStatusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case "aligned":
      return { backgroundColor: "#e8f5e9", color: "#2e7d32" };
    case "review_above_test":
      return { backgroundColor: "#fff8e1", color: "#ad6800" };
    case "review_below_test":
      return { backgroundColor: "#ffebee", color: "#c62828" };
    case "not_used_in_test":
      return { backgroundColor: "#eceff1", color: "#455a64" };
    default:
      return { backgroundColor: "#f3f4f6", color: "#374151" };
  }
}

export const ReverseAlignmentPanel: React.FC<ReverseAlignmentPanelProps> = ({ reverseAlignment }) => {
  const usedItems = reverseAlignment.reverseCoverage.filter((item) => item.testEvidence.length > 0);
  const unusedItems = reverseAlignment.reverseCoverage.filter((item) => item.testEvidence.length === 0);

  const renderConcepts = (concepts: ReverseAlignmentResult["reverseCoverage"][number]["concepts"]) => {
    if (concepts.length === 0) {
      return <span style={{ color: "#999" }}>No concepts detected</span>;
    }

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {concepts.map((concept, index) => (
          <span
            key={`${concept.label}-${index}`}
            title={`count: ${concept.count}, difficulties: [${concept.difficulties.join(", ")}]`}
            style={{
              backgroundColor: "#eef2ff",
              color: "#3730a3",
              padding: "2px 7px",
              borderRadius: "10px",
              fontSize: "0.8rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {concept.label} ×{concept.count}
          </span>
        ))}
      </div>
    );
  };

  const renderEvidence = (evidence: ReverseAlignmentResult["reverseCoverage"][number]["testEvidence"]) => {
    if (evidence.length === 0) {
      return <span style={{ color: "#666" }}>No assessment items use this prep content.</span>;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {evidence.map((entry) => (
          <div
            key={`${entry.assessmentItemNumber}-${entry.alignment}`}
            style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}
          >
            <span style={{ fontWeight: 600 }}>Q{entry.assessmentItemNumber}</span>
            <span style={{ color: "#555" }}>Test diff. {entry.difficulty}</span>
            <span
              style={{
                ...getReverseStatusBadgeStyle(entry.alignment),
                borderRadius: "999px",
                padding: "2px 10px",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {getReverseStatusLabel(entry.alignment)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderSection = (
    title: string,
    items: ReverseAlignmentResult["reverseCoverage"],
    emptyLabel: string
  ) => (
    <div className="prep-section-block">
      <div className="prep-section-heading">
        <h3 className="prep-section-title">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="prep-empty-state">
          {emptyLabel}
        </div>
      ) : (
        <div className="prep-card-grid">
          {items.map((item) => (
            <div key={item.prepItemNumber} className="prep-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "10px",
                }}
              >
                <div style={{ fontWeight: 700 }}>Prep Item {item.prepItemNumber}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      backgroundColor: "#eff6ff",
                      color: "#1d4ed8",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                    }}
                  >
                    Prep diff. {item.prepDifficulty}
                  </span>
                  <span
                    style={{
                      backgroundColor: item.testEvidence.length > 0 ? "#ecfdf5" : "#f3f4f6",
                      color: item.testEvidence.length > 0 ? "#047857" : "#4b5563",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                    }}
                  >
                    Matches {item.testEvidence.length}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: "10px" }}>{renderConcepts(item.concepts)}</div>
              {renderEvidence(item.testEvidence)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="prep-summary-row">
        <span className="prep-stat-pill">Used in test {usedItems.length}</span>
        <span className="prep-stat-pill prep-chip-neutral">Not used in test {unusedItems.length}</span>
      </div>
      {renderSection("Prep Items Used in Test", usedItems, "All detected prep items are currently unused.")}
      {renderSection("Prep Items Not Used in Test", unusedItems, "Every detected prep item is represented in the assessment.")}
      <div style={{ marginTop: "1rem" }}>
        <DifficultyLegend />
      </div>
    </div>
  );
};