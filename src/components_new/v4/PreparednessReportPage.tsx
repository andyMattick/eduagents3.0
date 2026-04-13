import React from "react";
import type { PreparednessReportResult } from "../../prism-v4/schema/domain/Preparedness";

interface PreparednessReportPageProps {
  report: PreparednessReportResult;
  onBack?: () => void;
}

function renderSection(items: unknown[]): React.ReactNode {
  if (!items || items.length === 0) {
    return <p style={{ color: "#999", margin: 0 }}>No data generated.</p>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 1.8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: "6px" }}>
          {typeof item === "string" ? item : <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>{JSON.stringify(item, null, 2)}</pre>}
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
          1. Assessment Summary
        </h2>
        {renderSection(report.section1)}
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.9rem" }}>
          2. Review Summary
        </h2>
        {renderSection(report.section2)}
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.9rem" }}>
          3. Missing-in-Prep Decisions
        </h2>
        {renderSection(report.section3)}
      </section>

      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.9rem" }}>
          4. Prep Addendum
        </h2>
        {report.section4.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: 1.8 }}>
            {report.section4.map((label, i) => (
              <li key={i}>{label}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#999", margin: 0 }}>No addendum items.</p>
        )}
      </section>
    </div>
  );
}
