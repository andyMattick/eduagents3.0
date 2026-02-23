import React, { useState } from "react";
import { MinimalAssessmentFormWrapper } from "./MinimalAssessmentFormWrapper";
import { UnifiedAssessmentRequest, UnifiedAssessmentResponse } from "@/pipeline/contracts";



import { AssignmentContext } from "../../App"; // this path IS correct

interface PipelineRouterProps {
  assignmentContext: AssignmentContext | null;
  onAssignmentSaved: () => void;
  userId: string | null; // NEW: pass userId for pipeline context
}

export function PipelineRouter({
  assignmentContext: _assignmentContext,
  userId,
  onAssignmentSaved: _onAssignmentSaved,
}: PipelineRouterProps) {

  const [assessment, setAssessment] = useState<UnifiedAssessmentResponse | null>(null);

  const handlePipelineResult = (result: UnifiedAssessmentResponse) => {
    console.log("Pipeline result:", result);
    setAssessment(result);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <MinimalAssessmentFormWrapper
        userId={userId}                     // ⭐ ADD THIS
        onResult={handlePipelineResult}
/>


      {assessment && (
        <pre className="json-preview" style={{ marginTop: "2rem", padding: "1rem" }}>

          {JSON.stringify(assessment, null, 2)}
        </pre>
      )}
    </div>
  );
}
