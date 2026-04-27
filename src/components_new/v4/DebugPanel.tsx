import { useState } from "react";

import type { TaggingPipelineInput, TaggingPipelineOutput } from "../../prism-v4/schema/semantic";

export function DebugPanel(props: { input: TaggingPipelineInput; output: TaggingPipelineOutput }) {
  const { input, output } = props;
  const [showPhase2, setShowPhase2] = useState(false);
  const [showPhase3, setShowPhase3] = useState(false);

  return (
    <section className="v4-panel">
      <div className="v4-section-heading">
        <div>
          <p className="v4-kicker">Debug</p>
          <h2>Raw canonical JSON</h2>
        </div>
      </div>

      <div className="v4-debug-actions">
        <button className="v4-button v4-button-secondary" type="button" onClick={() => setShowPhase2((value) => !value)}>
          {showPhase2 ? "Hide" : "Show"} raw Phase 2 JSON
        </button>
        <button className="v4-button v4-button-secondary" type="button" onClick={() => setShowPhase3((value) => !value)}>
          {showPhase3 ? "Hide" : "Show"} raw Phase 3 JSON
        </button>
      </div>

      {showPhase2 && <pre className="v4-debug-block">{JSON.stringify(input, null, 2)}</pre>}
      {showPhase3 && <pre className="v4-debug-block">{JSON.stringify(output, null, 2)}</pre>}
    </section>
  );
}