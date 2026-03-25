// src/components_new/Pipeline/TraceViewer.tsx
interface TraceStep {
  agent: string;
  label?: string;
  startedAt?: string;
  finishedAt?: string;
  input?: any;
  output?: any;
  error?: any;
}

interface Trace {
  runId?: string;
  startedAt?: string;
  finishedAt?: string;
  steps: TraceStep[];
}

interface TraceViewerProps {
  trace: Trace;
}

export function TraceViewer({ trace }: TraceViewerProps) {
  if (!trace) return null;

  return (
    <div className="trace-panel">
      <div className="trace-header">
        <h3>Pipeline Trace</h3>
        {trace.runId && <span className="trace-runid">Run: {trace.runId}</span>}
      </div>

      <div className="trace-meta">
        {trace.startedAt && <div>Started: {trace.startedAt}</div>}
        {trace.finishedAt && <div>Finished: {trace.finishedAt}</div>}
      </div>

      <div className="trace-steps">
        {trace.steps.map((step, i) => (
          <details key={`${step.agent}-${i}`} className="trace-step" open>
            <summary>
              <strong>{step.agent}</strong>
              {step.label && <> — {step.label}</>}
            </summary>
            <div className="trace-step-body">
              {step.startedAt && <div>Started: {step.startedAt}</div>}
              {step.finishedAt && <div>Finished: {step.finishedAt}</div>}
              {step.input && (
                <pre className="trace-json">
                  {JSON.stringify(step.input, null, 2)}
                </pre>
              )}
              {step.output && (
                <pre className="trace-json">
                  {JSON.stringify(step.output, null, 2)}
                </pre>
              )}
              {step.error && (
                <pre className="trace-error">
                  {JSON.stringify(step.error, null, 2)}
                </pre>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
