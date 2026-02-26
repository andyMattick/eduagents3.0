import { useState } from "react";
import { MinimalAssessmentFormWrapper } from "./MinimalAssessmentFormWrapper";
import { UnifiedAssessmentResponse } from "@/pipeline/contracts";
import { TraceViewer } from "@/components_new/TraceViewer";
import { AssessmentViewer } from "./AssessmentViewer";

import { AssignmentContext } from "../../App"; // this path IS correct

interface PipelineRouterProps {
  assignmentContext: AssignmentContext | null;
  onAssignmentSaved: () => void;
  userId: string | null;
}

export function PipelineRouter({
  assignmentContext: _assignmentContext,
  userId,
  onAssignmentSaved: _onAssignmentSaved,
}: PipelineRouterProps) {

  const [assessment, setAssessment] = useState<UnifiedAssessmentResponse | null>(null);
  const [showForm, setShowForm] = useState(true);

  const handlePipelineResult = (result: UnifiedAssessmentResponse) => {
    console.log("Pipeline result:", result);
    setAssessment(result);
    setShowForm(false); // hide form so the viewer is front-and-centre
  };

  /** Derive a human-readable title from the blueprint UAR */
  function getTitle(result: any): string {
    const uar = result?.blueprint?.uar ?? result?.uar;
    return uar?.lessonName || uar?.unitName || uar?.topic || "Assessment";
  }

  /** Derive subtitle: Course · Grade X */
  function getSubtitle(result: any): string | undefined {
    const uar = result?.blueprint?.uar ?? result?.uar;
    if (!uar) return undefined;
    const parts: string[] = [];
    if (uar.course) parts.push(uar.course);
    if (uar.gradeLevels?.length) {
      const grades = (uar.gradeLevels as string[]).join(", ");
      parts.push(`Grade ${grades}`);
    }
    return parts.length ? parts.join(" · ") : undefined;
  }

  return (
    <div style={{ padding: "1rem" }}>
      {showForm ? (
        <MinimalAssessmentFormWrapper
          userId={userId}
          onResult={handlePipelineResult}
        />
      ) : (
        <button
          onClick={() => { setShowForm(true); setAssessment(null); }}
          style={{ marginBottom: "1rem", cursor: "pointer" }}
        >
          ← New Assessment
        </button>
      )}

      {assessment && (
        <div style={{ marginTop: "1rem" }}>
          {(assessment as any).finalAssessment ? (
            <AssessmentViewer
              assessment={(assessment as any).finalAssessment}
              title={getTitle(assessment)}
              subtitle={getSubtitle(assessment)}
              uar={(assessment as any).blueprint?.uar ?? (assessment as any).uar}
            />
          ) : (
            <pre className="json-preview" style={{ padding: "1rem" }}>
              {JSON.stringify(assessment, null, 2)}
            </pre>
          )}
          <TraceViewer trace={assessment.trace} />
        </div>
      )}
    </div>
  );
}