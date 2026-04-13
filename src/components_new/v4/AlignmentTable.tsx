/**
 * Alignment Table Component
 *
 * Displays alignment analysis results: concept frequency, difficulty distribution,
 * and alignment status. Option B: no Bloom labels, no prep evidence text.
 */

import React from "react";
import type { AlignmentResult, ConceptItem } from "../../prism-v4/schema/domain/Preparedness";
import { getAlignmentStatusLabel } from "../../services_new/preparednessService";
import { DifficultyLegend } from "./DifficultyLegend";
import "./v4.css";

interface AlignmentTableProps {
  alignment: AlignmentResult;
}

export const AlignmentTable: React.FC<AlignmentTableProps> = ({ alignment }) => {
  const rows = [...alignment.coveredItems, ...alignment.uncoveredItems];

  const getAlignmentIcon = (status: string): string => {
    switch (status) {
      case "aligned": return "✓";
      case "slightly_above": return "▲";
      case "misaligned_above": return "⛔";
      case "missing_in_prep": return "⚠️";
      default: return "•";
    }
  };

  const getAlignmentBadgeClass = (status: string): string => {
    switch (status) {
      case "aligned": return "badge-success";
      case "slightly_above": return "badge-warning";
      case "misaligned_above": return "badge-error";
      case "missing_in_prep": return "badge-error";
      default: return "badge-default";
    }
  };

  const renderConcepts = (concepts: ConceptItem[]) => {
    if (!concepts || concepts.length === 0) return <span style={{ color: "#999" }}>—</span>;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {concepts.map((c, i) => (
          <span
            key={i}
            title={`count: ${c.count}, difficulties: [${c.difficulties.join(", ")}]`}
            style={{
              backgroundColor: "#e8f0fe",
              color: "#1a3c8f",
              padding: "2px 7px",
              borderRadius: "10px",
              fontSize: "0.8rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {c.label} ×{c.count}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div style={{ overflowX: "auto", border: "1px solid #e0e0e0", borderRadius: "8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", borderRight: "1px solid #e0e0e0" }}>Q</th>
              <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", borderRight: "1px solid #e0e0e0" }}>Concepts</th>
              <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", borderRight: "1px solid #e0e0e0" }}>Prep Diff.</th>
              <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", borderRight: "1px solid #e0e0e0" }}>Test Diff.</th>
              <th style={{ padding: "12px", textAlign: "center", fontWeight: "600" }}>Alignment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr
                key={record.assessmentItemNumber}
                style={{
                  borderBottom: "1px solid #e0e0e0",
                  backgroundColor: record.alignment !== "aligned" ? "#fff5f5" : "white",
                }}
              >
                <td style={{ padding: "12px", fontWeight: "600", textAlign: "left", borderRight: "1px solid #e0e0e0" }}>
                  {record.assessmentItemNumber}
                </td>
                <td style={{ padding: "12px", borderRight: "1px solid #e0e0e0" }}>
                  {renderConcepts(record.concepts)}
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderRight: "1px solid #e0e0e0" }}>
                  <span style={{ backgroundColor: "#e6f0ff", padding: "4px 8px", borderRadius: "4px", fontSize: "0.9rem" }}>
                    {record.prepDifficulty}
                  </span>
                </td>
                <td style={{ padding: "12px", textAlign: "center", borderRight: "1px solid #e0e0e0" }}>
                  <span style={{ backgroundColor: "#fff0e6", padding: "4px 8px", borderRadius: "4px", fontSize: "0.9rem" }}>
                    {record.difficulty}
                  </span>
                </td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <span
                    className={`badge ${getAlignmentBadgeClass(record.alignment)}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "500" }}
                  >
                    <span aria-hidden="true">{getAlignmentIcon(record.alignment)}</span>
                    {getAlignmentStatusLabel(record.alignment)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#555" }}>
        Covered: <strong>{alignment.coveredItems.length}</strong> | Uncovered: <strong>{alignment.uncoveredItems.length}</strong>
      </div>

      <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#666", fontStyle: "italic" }}>
        <span className="badge badge-success" style={{ padding: "2px 8px", borderRadius: "4px", marginRight: "12px" }}>Aligned</span>
        Test difficulty ≤ prep difficulty
        <br />
        <span className="badge badge-warning" style={{ padding: "2px 8px", borderRadius: "4px", marginRight: "12px", marginTop: "6px", display: "inline-block" }}>Slightly Above</span>
        Test slightly harder than prep
        <br />
        <span className="badge badge-error" style={{ padding: "2px 8px", borderRadius: "4px", marginRight: "12px", marginTop: "6px", display: "inline-block" }}>Misaligned</span>
        Significant gap or concept missing from prep
      </p>
      <DifficultyLegend />
    </div>
  );
};
