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

  const renderRows = (rows: AlignmentResult["coveredItems"] | AlignmentResult["uncoveredItems"]) => {
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={5} style={{ padding: "12px", color: "#999" }}>No items in this section.</td>
        </tr>
      );
    }

    return rows.map((record) => (
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
    ));
  };

  const renderSection = (title: string, rows: AlignmentResult["coveredItems"] | AlignmentResult["uncoveredItems"]) => (
    <div className="prep-section-block">
      <div className="prep-section-heading">
        <h3 className="prep-section-title">{title}</h3>
      </div>
      <div className="prep-surface prep-table-wrap">
        <table className="prep-table">
          <thead>
            <tr>
              <th>Q</th>
              <th>Concepts</th>
              <th style={{ textAlign: "center" }}>Prep Diff.</th>
              <th style={{ textAlign: "center" }}>Test Diff.</th>
              <th style={{ textAlign: "center" }}>Alignment</th>
            </tr>
          </thead>
          <tbody>{renderRows(rows)}</tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="prep-section-block">
      {renderSection("Covered Items", alignment.coveredItems)}
      {renderSection("Uncovered Items", alignment.uncoveredItems)}

      <div className="prep-summary-row">
        <span className="prep-stat-pill">Covered {alignment.coveredItems.length}</span>
        <span className="prep-stat-pill prep-chip-neutral">Uncovered {alignment.uncoveredItems.length}</span>
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
