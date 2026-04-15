import React, { useState } from "react";
import type { AssessmentDocument, PrepDocument } from "../../prism-v4/schema/domain/Preparedness";
import PreparednessPageV2 from "./preparedness_v2/PreparednessPageV2";

interface BlueprintMetricsProps {
  prep: PrepDocument;
  assessment: AssessmentDocument;
}

export function BlueprintMetrics({ prep, assessment }: BlueprintMetricsProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasExpanded, setHasExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded((current) => {
      const next = !current;
      if (next) {
        setHasExpanded(true);
      }
      return next;
    });
  };

  return (
    <div className="alignment-analysis-section">
      <button
        type="button"
        className="alignment-collapse-toggle"
        onClick={handleToggle}
        aria-expanded={expanded}
      >
        <span>Concept &amp; Difficulty Analysis</span>
        <span className="alignment-collapse-chevron">{expanded ? "▲" : "▼"}</span>
      </button>
      {hasExpanded ? (
        <div hidden={!expanded}>
          <PreparednessPageV2 prep={prep} assessment={assessment} />
        </div>
      ) : null}
    </div>
  );
}
