import { useState } from "react";
import MinimalAssessmentForm from "./MinimalAssessmentForm";
import { MinimalTeacherIntent } from "@/pipeline/contracts";
import { convertMinimalToUAR } from "@/pipeline/orchestrator/convertMinimalToUAR";
import { generateAssessment } from "@/config/aiConfig";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";


interface MinimalAssessmentFormWrapperProps {
  userId: string | null;                     // ⭐ REQUIRED
  onResult: (result: any) => void;
}

export function MinimalAssessmentFormWrapper({
  userId,
  onResult
}: MinimalAssessmentFormWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (intent: MinimalTeacherIntent) => {
    try {
      setIsLoading(true);

      const safeUserId =
  userId ?? "00000000-0000-0000-0000-000000000000"; // fallback UUID

      const uar: UnifiedAssessmentRequest = {
        ...convertMinimalToUAR(intent),
        userId: safeUserId, // now ALWAYS a string
      };


      const result = await generateAssessment(uar);
      onResult(result);
    } catch (err) {
      console.error("[Wrapper] Pipeline error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MinimalAssessmentForm onSubmit={handleFormSubmit} isLoading={isLoading} />
  );
}
