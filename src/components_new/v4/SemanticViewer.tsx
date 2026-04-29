import { useEffect, useState } from "react";

import { NARRATOR_LENS_OPTIONS, type NarratorLens } from "../../prism-v4/narrator/types";
import { runSemanticPipeline } from "../../prism-v4/semantic/pipeline/runSemanticPipeline";
import type { TaggingPipelineInput, TaggingPipelineOutput } from "../../prism-v4/schema/semantic";

import { DebugPanel } from "./DebugPanel";
import { DocumentOverview } from "./DocumentOverview";
import { ProblemList } from "./ProblemList";

const EXPERT_MODE_STORAGE_KEY = "v4-semantic-expert-mode";

export function SemanticViewer(props: { input: TaggingPipelineInput }) {
  const { input } = props;
  const [output, setOutput] = useState<TaggingPipelineOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [lens, setLens] = useState<NarratorLens>("what-is-this-asking");

  async function loadPipelineOutput() {
	setIsLoading(true);
	setError(null);
	try {
		const result = await runSemanticPipeline(input);
		setOutput(result);
	} catch (pipelineError) {
		setOutput(null);
		setError(pipelineError instanceof Error ? pipelineError.message : "Semantic pipeline failed.");
	} finally {
		setIsLoading(false);
	}
	}

  useEffect(() => {
  if (typeof window === "undefined") {
    return;
  }

  const stored = window.sessionStorage.getItem(EXPERT_MODE_STORAGE_KEY);
  setIsExpertMode(stored === "true");
  }, []);

  useEffect(() => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(EXPERT_MODE_STORAGE_KEY, isExpertMode ? "true" : "false");
  }, [isExpertMode]);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError(null);

    runSemanticPipeline(input)
      .then((result) => {
        if (active) {
          setOutput(result);
        }
      })
      .catch((pipelineError) => {
        if (active) {
          setOutput(null);
          setError(pipelineError instanceof Error ? pipelineError.message : "Semantic pipeline failed.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [input]);

  if (isLoading) {
    return (
      <section className="v4-panel">
        <p className="v4-kicker">Phase 3</p>
        <h2>Running semantic pipeline...</h2>
      </section>
    );
  }

  if (error || !output) {
    return (
      <section className="v4-panel">
        <p className="v4-kicker">Phase 3</p>
        <h2>Semantic pipeline failed</h2>
        <p className="v4-error">{error ?? "No semantic output was produced."}</p>
      </section>
    );
  }

  return (
    <>
      <section className="v4-panel v4-block-light">
      <div className="v4-expert-toggle">
        <label htmlFor="v4-expert-mode-toggle" className="v4-section-title">Expert Mode</label>
        <input
        id="v4-expert-mode-toggle"
        type="checkbox"
        checked={isExpertMode}
        onChange={(event) => setIsExpertMode(event.target.checked)}
        />
      </div>
      {!isExpertMode && (
        <div>
        <label className="v4-section-title" htmlFor="v4-theme-dropdown">What would you like to explore?</label>
        <select
          id="v4-theme-dropdown"
          className="v4-theme-dropdown"
          value={lens}
          onChange={(event) => setLens(event.target.value as NarratorLens)}
        >
          {NARRATOR_LENS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        </div>
      )}
      </section>

      <div className="v4-viewer-grid">
      {isExpertMode ? <DocumentOverview input={input} output={output} /> : null}
      <ProblemList
        problems={output.problems}
        problemVectors={output.problemVectors}
        documentSummary={output.documentInsights}
        onRerun={loadPipelineOutput}
        expertMode={isExpertMode}
        lens={lens}
      />
      {isExpertMode ? <DebugPanel input={input} output={output} /> : null}
      </div>
    </>
  );
}