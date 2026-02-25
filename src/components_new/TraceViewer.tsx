"use client";

import { useState } from "react";

export function TraceViewer({ trace }: { trace: any }) {
  if (!trace) return null;

  const steps = trace.steps ?? [];

  return (
    <div
      style={{
        marginTop: "2rem",
        border: "1px solid #ddd",
        padding: "1rem",
        borderRadius: 8,
        background: "#fafafa"
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: "0.5rem" }}>
        Pipeline Trace
      </h2>

      <div style={{ fontSize: 12, color: "#666", marginBottom: "1rem" }}>
        {trace.runId && <div>Run ID: {trace.runId}</div>}
        {trace.startedAt && (
          <div>Started: {new Date(trace.startedAt).toLocaleString()}</div>
        )}
        {trace.finishedAt && (
          <div>Finished: {new Date(trace.finishedAt).toLocaleString()}</div>
        )}
      </div>

      {steps.map((step: any, i: number) => (
        <TraceStep key={i} step={step} index={i} />
      ))}
    </div>
  );
}

function TraceStep({ step, index }: { step: any; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        marginBottom: "1rem",
        border: "1px solid #eee",
        padding: "1rem",
        borderRadius: 6,
        background: "white"
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: 0,
          display: "flex",
          justifyContent: "space-between",
          width: "100%"
        }}
      >
        <span>
          {index + 1}. {step.agent}
        </span>
        {step.durationMs && (
          <span style={{ fontSize: 12, color: "#888" }}>
            {step.durationMs} ms
          </span>
        )}
      </button>

      {open && (
        <div style={{ marginTop: "0.75rem" }}>
          {step.input && (
            <JsonBlock label="Input" value={step.input} />
          )}

          {step.output && (
            <JsonBlock label="Output" value={step.output} />
          )}

          {step.errors?.length > 0 && (
            <JsonBlock
              label="Errors"
              value={step.errors}
              color="#ffecec"
              borderColor="#ffb3b3"
            />
          )}
        </div>
      )}
    </div>
  );
}

function JsonBlock({
  label,
  value,
  color = "#f7f7f7",
  borderColor = "#e5e5e5"
}: {
  label: string;
  value: any;
  color?: string;
  borderColor?: string;
}) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: "0.25rem" }}>
        {label}
      </div>
      <pre
        style={{
          background: color,
          border: `1px solid ${borderColor}`,
          padding: "0.5rem",
          borderRadius: 4,
          overflowX: "auto",
          fontSize: 12,
          maxHeight: 300
        }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
