import React from "react";
import type {
  PreparednessReportResult,
  CoveredReportItem,
  UncoveredReportItem,
} from "../../prism-v4/schema/domain/Preparedness";
import "./v4.css";

interface PreparednessReportPageProps {
  report: PreparednessReportResult;
  onBack?: () => void;
}

function renderCovered(items: CoveredReportItem[]): React.ReactNode {
  if (items.length === 0) {
    return <div className="prep-empty-state">No data generated.</div>;
  }
  return (
    <div className="prep-report-list">
      {items.map((item) => (
        <div key={item.assessmentItemNumber} className="prep-report-item">
          <div className="prep-section-heading">
            <h3 className="prep-card-title">Question {item.assessmentItemNumber}</h3>
            <span className="prep-chip">{item.alignment}</span>
          </div>
          <div className="prep-summary-row" style={{ marginTop: 0 }}>
            <span className="prep-chip">Test diff. {item.difficulty}</span>
            <span className="prep-chip prep-chip-neutral">Prep diff. {item.prepDifficulty}</span>
            <span className="prep-chip prep-chip-neutral">Teacher action {item.teacherAction}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderUncovered(items: UncoveredReportItem[]): React.ReactNode {
  if (items.length === 0) {
    return <div className="prep-empty-state">No data generated.</div>;
  }
  return (
    <div className="prep-report-list">
      {items.map((item) => (
        <div key={item.assessmentItemNumber} className="prep-report-item">
          <div className="prep-section-heading">
            <h3 className="prep-card-title">Question {item.assessmentItemNumber}</h3>
            <span className="prep-chip" style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}>{item.alignment}</span>
          </div>
          <div className="prep-summary-row" style={{ marginTop: 0 }}>
            <span className="prep-chip">Test diff. {item.difficulty}</span>
            <span className="prep-chip prep-chip-neutral">Prep diff. {item.prepDifficulty}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PreparednessReportPage({ report, onBack }: PreparednessReportPageProps) {
  return (
    <div className="prep-stage-card prep-report-shell" style={{ lineHeight: 1.75 }}>
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

      <section className="prep-report-section">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.9rem" }}>
          1. Covered Assessment Items
        </h2>
        {renderCovered(report.covered)}
      </section>

      <section className="prep-report-section">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.9rem" }}>
          2. Uncovered Assessment Items
        </h2>
        {renderUncovered(report.uncovered)}
      </section>

      <section className="prep-report-section">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.9rem" }}>
          3. Prep Addendum
        </h2>
        {report.prepAddendum.length > 0 ? (
          <div className="prep-report-list">
            {report.prepAddendum.map((label, i) => (
              <div key={i} className="prep-report-item">{label}</div>
            ))}
          </div>
        ) : (
          <div className="prep-empty-state">No addendum items.</div>
        )}
      </section>

    </div>
  );
}
