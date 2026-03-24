import { useEffect, useState } from "react";

import { runSemanticPipeline } from "../../prism-v4/semantic/pipeline/runSemanticPipeline";
import type { TaggingPipelineInput, TaggingPipelineOutput } from "../../prism-v4/schema/semantic";

import { ConceptGraph } from "./ConceptGraph";
import { DebugPanel } from "./DebugPanel";
import { DocumentOverview } from "./DocumentOverview";
import { ProblemList } from "./ProblemList";

export function SemanticViewer(props: { input: TaggingPipelineInput }) {
  const { input } = props;
  const [output, setOutput] = useState<TaggingPipelineOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="v4-viewer-grid">
      <DocumentOverview input={input} output={output} />
      <ProblemList problems={output.problems} problemVectors={output.problemVectors} onRerun={loadPipelineOutput} />
      <ConceptGraph graph={output.documentInsights.conceptGraph} />
      <DebugPanel input={input} output={output} />
    </div>
  );
}