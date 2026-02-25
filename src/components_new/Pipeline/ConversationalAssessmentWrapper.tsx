// src/components_new/Pipeline/ConversationalAssessmentWrapper.tsx
import { useState, useCallback } from "react";
import { ConversationalAssessment, ConversationalIntent } from "./ConversationalAssessment";
import { TraceViewer } from "./TraceViewer";
import { convertMinimalToUAR } from "@/pipeline/orchestrator/convertMinimalToUAR";
import { generateAssessment } from "@/config/aiConfig";
import type { MinimalTeacherIntent } from "@/pipeline/contracts";

interface ConversationalAssessmentWrapperProps {
  userId: string | null;
  onResult: (result: unknown) => void;
}

export function ConversationalAssessmentWrapper({
  userId,
  onResult,
}: ConversationalAssessmentWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [trace, setTrace] = useState<any | null>(null);

  const handleComplete = useCallback(
    async (intent: ConversationalIntent) => {
      try {
        setIsLoading(true);

        const safeUserId = userId ?? "00000000-0000-0000-0000-000000000000";

        // Cast conversational intent to the pipeline's expected type
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
        setTrace(data?.trace ?? null);
        onResult(data);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, onResult]
  );

  return (
    <div className="pipeline-surface">
      <ConversationalAssessment onComplete={handleComplete} isLoading={isLoading} />

      {trace && (
        <div style={{ marginTop: "2rem" }}>
          <TraceViewer trace={trace} />
        </div>
      )}
    </div>
  );
}
