/**
 * WriterChunkDebugPanel.tsx
 *
 * Dev-only UI panel for testing the adaptive chunked writer.
 *
 * Drop this into any dev page:
 *
 *   import { WriterChunkDebugPanel } from "@/components_new/WriterChunkDebugPanel";
 *   <WriterChunkDebugPanel uar={myUAR} />
 *
 * It exposes three independent test actions:
 *   1. Run parseChunk smoke tests (no LLM)
 *   2. Run the full adaptive writer against the provided UAR
 */

import { useState } from "react";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import {
  runWriterChunkDebug,
  runParseChunkSmoke,
} from "@/pipeline/devTools/runWriterChunkDebug";

interface Props {
  uar: UnifiedAssessmentRequest;
}

export function WriterChunkDebugPanel({ uar }: Props) {
  const [smokeResults, setSmokeResults] = useState<any[] | null>(null);
  const [chunkResult, setChunkResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSmoke() {
    const results = runParseChunkSmoke();
    setSmokeResults(results);
  }

  async function handleWriterRun() {
    setLoading(true);
    setError(null);
    setChunkResult(null);
    try {
      const result = await runWriterChunkDebug(uar);
      setChunkResult(result);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  const panelStyle: React.CSSProperties = {
    marginTop: "2rem",
    padding: "1rem",
    border: "2px dashed #7c3aed",
    borderRadius: "8px",
    background: "#faf5ff",
    fontFamily: "monospace",
    fontSize: "13px",
  };

  const btnStyle: React.CSSProperties = {
    marginRight: "0.75rem",
    padding: "0.4rem 0.9rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  };

  return (
    <div style={panelStyle}>
      <h2 style={{ marginBottom: "0.5rem", color: "#5b21b6" }}>
        🧪 Writer Chunk Debug Panel
      </h2>
      <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
        Dev-only. Never visible to teachers.
      </p>

      {/* Actions */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          style={{ ...btnStyle, background: "#ddd6fe", color: "#3730a3" }}
          onClick={handleSmoke}
        >
          Run parseChunk Smoke Tests
        </button>

        <button
          style={{ ...btnStyle, background: "#7c3aed", color: "#fff" }}
          onClick={handleWriterRun}
          disabled={loading}
        >
          {loading ? "Running…" : "Run Full Adaptive Writer"}
        </button>
      </div>

      {/* Smoke test results */}
      {smokeResults && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h3>parseChunk Smoke Tests</h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#ede9fe" }}>
                {["Label", "Truncated", "Items", "FailedBlocks", "Pass"].map((h) => (
                  <th key={h} style={{ padding: "4px 8px", border: "1px solid #c4b5fd", textAlign: "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {smokeResults.map((r, i) => (
                <tr key={i} style={{ background: r.pass ? "#f0fdf4" : "#fef2f2" }}>
                  <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb" }}>{r.label}</td>
                  <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb" }}>{String(r.truncated)}</td>
                  <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb" }}>{r.itemCount}</td>
                  <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb" }}>{r.failedBlocks}</td>
                  <td style={{ padding: "4px 8px", border: "1px solid #e5e7eb" }}>{r.pass ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Error */}
      {error && (
        <section style={{ marginBottom: "1.5rem", color: "#b91c1c" }}>
          <h3>Error</h3>
          <pre>{error}</pre>
        </section>
      )}

      {/* Full writer result */}
      {chunkResult && (
        <>
          {/* Invariant */}
          <section style={{ marginBottom: "1rem" }}>
            <h3>Count Invariant</h3>
            <pre
              style={{
                background: chunkResult.invariant.ok ? "#f0fdf4" : "#fef2f2",
                padding: "0.5rem",
                borderRadius: "4px",
              }}
            >
              {JSON.stringify(chunkResult.invariant, null, 2)}
            </pre>
          </section>

          {/* Telemetry */}
          <section style={{ marginBottom: "1rem" }}>
            <h3>Telemetry</h3>
            <pre style={{ background: "#f3f4f6", padding: "0.5rem", borderRadius: "4px" }}>
              {JSON.stringify(chunkResult.summary, null, 2)}
            </pre>
          </section>

          {/* Gatekeeper */}
          <section style={{ marginBottom: "1rem" }}>
            <h3>
              Gatekeeper (post-batch){" "}
              {chunkResult.gatekeeperResult.ok ? "✅ Clean" : "⚠️ Violations"}
            </h3>
            <pre style={{ background: "#f3f4f6", padding: "0.5rem", borderRadius: "4px" }}>
              {JSON.stringify(chunkResult.gatekeeperResult.violations, null, 2)}
            </pre>
          </section>

          {/* Generated items (FinalAssessment) */}
          <section style={{ marginBottom: "1rem" }}>
            <h3>
              Final Assessment — {chunkResult.finalAssessment?.totalItems ?? 0} items
              {" "}
              <span style={{ fontWeight: 400, color: "#6b7280" }}>
                ({chunkResult.finalAssessment?.id})
              </span>
            </h3>
            <details style={{ marginBottom: "0.5rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Answer Key</summary>
              <pre style={{ background: "#f3f4f6", padding: "0.5rem", borderRadius: "4px" }}>
                {JSON.stringify(chunkResult.finalAssessment?.answerKey, null, 2)}
              </pre>
            </details>
            <details style={{ marginBottom: "0.5rem" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Cognitive Distribution</summary>
              <pre style={{ background: "#f3f4f6", padding: "0.5rem", borderRadius: "4px" }}>
                {JSON.stringify(chunkResult.finalAssessment?.cognitiveDistribution, null, 2)}
              </pre>
            </details>
            {(chunkResult.finalAssessment?.items ?? []).map((item: any, i: number) => (
              <details key={i} style={{ marginBottom: "0.5rem" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  Q{item.questionNumber} [{item.questionType}] {item.cognitiveDemand} / {item.difficulty} — {item.prompt?.slice(0, 60)}…
                </summary>
                <pre style={{ background: "#f3f4f6", padding: "0.5rem", borderRadius: "4px" }}>
                  {JSON.stringify(item, null, 2)}
                </pre>
              </details>
            ))}
          </section>

          {/* Blueprint */}
          <section>
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Blueprint</summary>
              <pre style={{ background: "#f3f4f6", padding: "0.5rem", borderRadius: "4px" }}>
                {JSON.stringify(chunkResult.blueprint, null, 2)}
              </pre>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
