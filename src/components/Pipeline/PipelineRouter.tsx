import React, { useState } from "react";
import { MinimalAssessmentFormWrapper } from "./MinimalAssessmentFormWrapper";
import { UnifiedAssessmentResponse } from "./contracts/assessmentContracts";
import { AssignmentContext } from "../../App"; // this path IS correct

interface PipelineRouterProps {
  assignmentContext: AssignmentContext | null;
  onAssignmentSaved: () => void;
}

export function PipelineRouter({
  assignmentContext: _assignmentContext,
  onAssignmentSaved: _onAssignmentSaved,
}: PipelineRouterProps) {

  const [assessment, setAssessment] = useState<UnifiedAssessmentResponse | null>(null);

  const handlePipelineResult = (result: UnifiedAssessmentResponse) => {
    console.log("Pipeline result:", result);
    setAssessment(result);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <MinimalAssessmentFormWrapper onResult={handlePipelineResult} />

      {assessment && (
        <pre className="json-preview" style={{ marginTop: "2rem", padding: "1rem" }}>

          {JSON.stringify(assessment, null, 2)}
        </pre>
      )}
    </div>
  );
}
