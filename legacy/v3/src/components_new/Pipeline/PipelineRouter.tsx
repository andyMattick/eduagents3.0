import { useState, useCallback } from "react";
import { ConversationalAssessmentWrapper } from "./ConversationalAssessmentWrapper";
import { UnifiedAssessmentResponse } from "../../pipeline/contracts";
import { TraceViewer } from "@/components_new/TraceViewer";
import { AssessmentViewer } from "./AssessmentViewer";
import { GenerationPreview } from "./GenerationPreview";
import { getLastPipelineBlueprint } from "@/config/aiConfig";

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
  const [partialItems, setPartialItems] = useState<any[]>([]);
  const [previewBlueprint, setPreviewBlueprint] = useState<any>(null);

  const handlePipelineResult = useCallback((result: unknown) => {
    console.log("Pipeline result:", result);
    setAssessment(result as UnifiedAssessmentResponse);
    setShowForm(false);
  }, []);

  const handleItemsProgress = useCallback((items: any[]) => {
    setPartialItems(items);
    // Grab the blueprint once it becomes available (set by Architect before Writer fires)
    setPreviewBlueprint((prev: any) => prev ?? getLastPipelineBlueprint());
  }, []);

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

  const previewTitle =
    previewBlueprint?.uar?.lessonName ||
    previewBlueprint?.uar?.topic ||
    previewBlueprint?.uar?.unitName ||
    "Assessment";

  // Is the Writer actively running?
  const isGenerating = partialItems.length > 0 && !assessment;

  return (
    <div style={{ padding: "1rem" }}>
      {/* ── Form panel ───────────────────────────────────────────────────── */}
      {showForm && (
        <ConversationalAssessmentWrapper
          userId={userId}
          onResult={handlePipelineResult}
        />
      )}

      {/* ── "← New Assessment" button ──────────────────────────────────── */}
      {!showForm && (
        <button
          onClick={() => {
            setShowForm(true);
            setAssessment(null);
            setPartialItems([]);
            setPreviewBlueprint(null);
          }}
          style={{ marginBottom: "1rem", cursor: "pointer" }}
        >
          ← New Assessment
        </button>
      )}

      {/* ── Live generation preview ────────────────────────────────────── */}
      {isGenerating && (
        <div style={{ marginTop: "1.5rem" }}>
          <GenerationPreview
            items={partialItems}
            blueprint={previewBlueprint}
            isComplete={false}
            title={previewTitle}
          />
        </div>
      )}

      {/* ── Final assessment result ───────────────────────────────────── */}
      {assessment && (
        <div style={{ marginTop: "1rem" }}>
          {(assessment as any).finalAssessment ? (
          <AssessmentViewer
              assessment={(assessment as any).finalAssessment}
              title={getTitle(assessment)}
              subtitle={getSubtitle(assessment)}
              uar={(assessment as any).blueprint?.uar ?? (assessment as any).uar}
              philosopherNotes={(assessment as any).notes}
              writerContract={(assessment as any).writerContract ?? undefined}
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