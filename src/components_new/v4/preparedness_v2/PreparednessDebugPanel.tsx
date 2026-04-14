import React from "react";
import type { AlignmentDebugInfo } from "../../../services_new/preparednessService";

interface PreparednessDebugPanelProps {
  debug: AlignmentDebugInfo | null;
}

export default function PreparednessDebugPanel({ debug }: PreparednessDebugPanelProps) {
  if (!import.meta.env.DEV || !debug) {
    return null;
  }

  return (
    <details className="prep-detail-box" style={{ marginTop: "1rem" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>Preparedness Debug Panel</summary>
      <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.75rem" }}>
        <pre className="prep-code-block" style={{ margin: 0 }}>{JSON.stringify({ prep_concepts: debug.prepConcepts }, null, 2)}</pre>
        <pre className="prep-code-block" style={{ margin: 0 }}>{JSON.stringify({ test_items: debug.testItems }, null, 2)}</pre>
        <pre className="prep-code-block" style={{ margin: 0 }}>{JSON.stringify({ coverage_summary: debug.coverageSummary }, null, 2)}</pre>
        <pre className="prep-code-block" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{debug.teacherSummary}</pre>
      </div>
    </details>
  );
}
