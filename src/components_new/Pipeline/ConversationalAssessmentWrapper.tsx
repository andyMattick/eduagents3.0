// src/components_new/Pipeline/ConversationalAssessmentWrapper.tsx
import { useState, useCallback } from "react";
import { ConversationalAssessment, ConversationalIntent } from "./ConversationalAssessment";
import { TraceViewer } from "./TraceViewer";
import { AssessmentViewer } from "./AssessmentViewer";
import { convertMinimalToUAR } from "@/pipeline/orchestrator/convertMinimalToUAR";
import { generateAssessment } from "@/config/aiConfig";
import type { MinimalTeacherIntent } from "@/pipeline/contracts";

interface ConversationalAssessmentWrapperProps {
  userId: string | null;
  onResult: (result: unknown) => void;
}

function getTitle(result: any): string {
  const uar = result?.blueprint?.uar ?? result?.uar;
  return uar?.lessonName || uar?.unitName || uar?.topic || "Assessment";
}

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

export function ConversationalAssessmentWrapper({
  userId,
  onResult,
}: ConversationalAssessmentWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleComplete = useCallback(
    async (intent: ConversationalIntent) => {
      try {
        setIsLoading(true);
        setResult(null);

        const safeUserId = userId ?? "00000000-0000-0000-0000-000000000000";

        const minimalIntent: MinimalTeacherIntent = {
          ...intent,
          assessmentType: intent.assessmentType as MinimalTeacherIntent["assessmentType"],
          time: intent.time ?? 10,
        };

        const uar = {
          ...convertMinimalToUAR(minimalIntent),
          userId: safeUserId,
        };

        const data = await generateAssessment(uar);
        setResult(data);
        onResult(data);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, onResult]
  );

  return (
    <div className="pipeline-surface">
      {/* Always show the conversational form unless a result is ready */}
      {!result ? (
        <ConversationalAssessment onComplete={handleComplete} isLoading={isLoading} />
      ) : (
        <button
          onClick={() => setResult(null)}
          style={{ marginBottom: "1rem", cursor: "pointer" }}
        >
          ← New Assessment
        </button>
      )}

      {result && (
        <div style={{ marginTop: "1rem" }}>
          {result.finalAssessment ? (
            <AssessmentViewer
              assessment={result.finalAssessment}
              title={getTitle(result)}
              subtitle={getSubtitle(result)}
              uar={result.blueprint?.uar ?? result.uar}
            />
          ) : (
            <pre className="json-preview" style={{ padding: "1rem" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
          {result.trace && (
            <div style={{ marginTop: "2rem" }}>
              <TraceViewer trace={result.trace} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
