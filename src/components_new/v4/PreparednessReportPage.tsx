import React from "react";
import type {
  PreparednessReportResult,
  CoveredReportItem,
  UncoveredReportItem,
  ReverseAlignmentRecord,
} from "../../prism-v4/schema/domain/Preparedness";

interface PreparednessReportPageProps {
  report: PreparednessReportResult;
  onBack?: () => void;
}

function renderCovered(items: CoveredReportItem[]): React.ReactNode {
  if (items.length === 0) {
    return <p style={{ color: "#999", margin: 0 }}>No data generated.</p>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 1.8 }}>
      {items.map((item) => (
        <li key={item.assessmentItemNumber} style={{ marginBottom: "8px" }}>
          Q{item.assessmentItemNumber} | diff {item.difficulty} | prep {item.prepDifficulty} | {item.alignment} | {item.teacherAction}
        </li>
      ))}
    </ul>
  );
}

function renderUncovered(items: UncoveredReportItem[]): React.ReactNode {
  if (items.length === 0) {
    return <p style={{ color: "#999", margin: 0 }}>No data generated.</p>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 1.8 }}>
      {items.map((item) => (
        <li key={item.assessmentItemNumber} style={{ marginBottom: "6px" }}>
          Q{item.assessmentItemNumber} | diff {item.difficulty} | {item.alignment}
        </li>
      ))}
    </ul>
  );
}

function renderReverseCoverage(items: ReverseAlignmentRecord[]): React.ReactNode {
  if (items.length === 0) {
    return <p style={{ color: "#999", margin: 0 }}>No data generated.</p>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 1.8 }}>
      {items.map((item) => (
        <li key={item.prepItemNumber} style={{ marginBottom: "6px" }}>
          Prep {item.prepItemNumber} | diff {item.prepDifficulty} | matches {item.testEvidence.length}
        </li>
      ))}
    </ul>
  );
}

export default function PreparednessReportPage({ report, onBack }: PreparednessReportPageProps) {
  return (
    <div
      style={{
        maxWidth: "760px",
        margin: "0 auto",
        padding: "32px",
        fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
        lineHeight: 1.75,
        backgroundColor: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
      }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            color: "#2563eb",
            textDecoration: "underline",
            marginBottom: "1.5rem",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          ← Back to Preparedness
        </button>
      )}

      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem", textAlign: "center" }}>
        Preparedness Report
      </h1>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.9rem" }}>
          1. Covered Assessment Items
        </h2>
        {renderCovered(report.covered)}
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.9rem" }}>
          2. Uncovered Assessment Items
        </h2>
        {renderUncovered(report.uncovered)}
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.9rem" }}>
          3. Prep Addendum
        </h2>
        {report.prepAddendum.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 1.8 }}>
            {report.prepAddendum.map((label, i) => (
              <li key={i}>{label}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#999", margin: 0 }}>No addendum items.</p>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.9rem" }}>
          4. Reverse Coverage
        </h2>
        {renderReverseCoverage(report.reverseCoverage)}
      </section>
    </div>
  );
}
