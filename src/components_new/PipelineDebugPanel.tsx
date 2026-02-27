import React from "react";

type PipelineDebugProps = {
  debug: {
    uar: any;
    architectPlan: any;
    architectPrompt: string;
    writerPrompt: string;
    writerOutput: any;
  };
};

export function PipelineDebugPanel({ debug }: PipelineDebugProps) {
  return (
    <div
      style={{
        marginTop: "2rem",
        padding: "1rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
        background: "#fafafa",
      }}
    >
      <h2 style={{ marginBottom: "1rem" }}>Pipeline Debug Output</h2>

      <section style={{ marginBottom: "1rem" }}>
        <h3>Unified Assessment Request (UAR)</h3>
        <pre>{JSON.stringify(debug.uar, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: "1rem" }}>
        <h3>Architect Plan</h3>
        <pre>{JSON.stringify(debug.architectPlan, null, 2)}</pre>
      </section>

      <section style={{ marginBottom: "1rem" }}>
        <h3>Architect → Writer Prompt</h3>
        <pre>{debug.architectPrompt}</pre>
      </section>

      <section style={{ marginBottom: "1rem" }}>
        <h3>Writer Prompt</h3>
        <pre>{debug.writerPrompt}</pre>
      </section>

      <section>
        <h3>Writer Output</h3>
        <pre>{JSON.stringify(debug.writerOutput, null, 2)}</pre>
      </section>
    </div>
  );
}
