"use client";

import { useState } from "react";

export function TraceViewer({ trace }: { trace: any }) {

  const [open, setOpen] = useState(false);

  if (!trace) return null;

  return (
    <div style={{ marginTop: "2rem", border: "1px solid #ddd", padding: "1rem", borderRadius: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "underline",
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: 0
        }}
      >
        {open ? "Hide Pipeline Trace" : "Show Pipeline Trace"}
      </button>

      {open && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: "1rem" }}>
            <div>Run ID: {trace.runId}</div>
            <div>Started: {new Date(trace.startedAt).toLocaleString()}</div>
            {trace.finishedAt && (
              <div>Finished: {new Date(trace.finishedAt).toLocaleString()}</div>
            )}
          </div>

          {trace.steps.map((step: any, i: number) => (

            <TraceStep key={i} step={step} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function TraceStep({ step, index }: { step: any; index: number }) {

  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: "1rem", border: "1px solid #eee", padding: "1rem", borderRadius: 6 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: 0
        }}
      >
        {index + 1}. {step.agent}
      </button>

      {open && (
        <div style={{ marginTop: "0.5rem" }}>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Input</strong>
            <pre style={{ background: "#f7f7f7", padding: "0.5rem", borderRadius: 4, overflowX: "auto" }}>
              {JSON.stringify(step.input, null, 2)}
            </pre>
          </div>

          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Output</strong>
            <pre style={{ background: "#f7f7f7", padding: "0.5rem", borderRadius: 4, overflowX: "auto" }}>
              {JSON.stringify(step.output, null, 2)}
            </pre>
          </div>

          {step.errors?.length > 0 && (
            <div>
              <strong style={{ color: "red" }}>Errors</strong>
              <pre style={{ background: "#ffecec", padding: "0.5rem", borderRadius: 4, overflowX: "auto" }}>
                {JSON.stringify(step.errors, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
