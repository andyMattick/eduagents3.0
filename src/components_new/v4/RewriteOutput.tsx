/**
 * Rewrite Output Component
 *
 * Displays the final rewritten assessment and optional prep addendum labels.
 * Option B: rewrittenAssessment is a full text string; prepAddendum is a string[].
 */

import React, { useState } from "react";
import type { RewriteResult, AssessmentDocument } from "../../prism-v4/schema/domain/Preparedness";
import "./v4.css";

interface RewriteOutputProps {
  rewrite: RewriteResult;
  originalAssessment: AssessmentDocument;
  originalPrepTitle?: string;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
}

export const RewriteOutput: React.FC<RewriteOutputProps> = ({
  rewrite,
  originalAssessment,
  originalPrepTitle,
  onGenerateReport,
  isGeneratingReport = false,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const downloadFile = (content: string, filename: string, mimeType = "text/plain") => {
    const element = document.createElement("a");
    element.setAttribute("href", `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const addendumText = rewrite.prepAddendum.join("\n");

  return (
    <div className="prep-stage-card" style={{ marginTop: 0 }}>
      <h3 style={{ marginBottom: "1.5rem", fontSize: "1.25rem", fontWeight: "600", color: "#2e7d32" }}>
        ✓ Rewrite Complete
      </h3>

      {/* Summary */}
      <div className="prep-empty-state prep-empty-state-success" style={{ padding: "1rem", marginBottom: "2rem" }}>
        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", fontWeight: "600" }}>Assessment Updated</p>
        <ul style={{ margin: "0.5rem 0 0 20px", padding: 0, fontSize: "0.9rem", color: "#555" }}>
          <li>Original questions: <strong>{originalAssessment.items.length}</strong></li>
          {rewrite.prepAddendum.length > 0 && (
            <li>Prep addendum labels: <strong>{rewrite.prepAddendum.length}</strong></li>
          )}
        </ul>
      </div>

      {/* Rewritten Assessment */}
      <div className="prep-surface" style={{ marginBottom: "2rem", overflow: "hidden" }}>
        <div
          style={{
            backgroundColor: "#f5f5f5",
            padding: "12px 16px",
            borderBottom: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>Rewritten Assessment</h4>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => copyToClipboard(rewrite.rewrittenAssessment, "assessment")}
              className="v4-button v4-button-secondary v4-button-sm"
              style={{ fontSize: "0.85rem" }}
            >
              {copiedSection === "assessment" ? "✓ Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => downloadFile(rewrite.rewrittenAssessment, `${originalAssessment.title || "assessment"}-rewritten.txt`)}
              className="v4-button v4-button-secondary v4-button-sm"
              style={{ fontSize: "0.85rem" }}
            >
              Download
            </button>
          </div>
        </div>
        <div
          style={{
            padding: "16px",
            backgroundColor: "white",
            fontFamily: "monospace",
            fontSize: "0.95rem",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          {rewrite.rewrittenAssessment || <span style={{ color: "#999" }}>No rewritten text generated.</span>}
        </div>
      </div>

      {/* Prep Addendum */}
      {rewrite.prepAddendum.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1.1rem", fontWeight: 700 }}>Review Addendum</h3>
          <div className="prep-surface" style={{ marginBottom: "1rem", padding: "12px 16px", backgroundColor: "#fff9db", borderColor: "#f0d86a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Concepts to Add to Review</h4>
              <button
                type="button"
                onClick={() => copyToClipboard(addendumText, "addendum")}
                className="v4-button v4-button-secondary v4-button-sm"
                style={{ fontSize: "0.85rem" }}
              >
                {copiedSection === "addendum" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9rem", color: "#444" }}>
              {rewrite.prepAddendum.map((label, i) => (
                <li key={i} style={{ marginBottom: "4px" }}>{label}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {onGenerateReport && (
        <button
          type="button"
          className="v4-button v4-button-primary"
          style={{ marginTop: "0.5rem", marginBottom: "2rem" }}
          onClick={onGenerateReport}
          disabled={isGeneratingReport}
        >
          {isGeneratingReport ? "Generating Report..." : "Continue to Preparedness Report \u2192"}
        </button>
      )}
    </div>
  );
};
