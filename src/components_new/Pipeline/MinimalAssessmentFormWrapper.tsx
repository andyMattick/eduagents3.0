import React, { useState, useCallback, useEffect } from "react";

import MinimalAssessmentForm from "./MinimalAssessmentForm";
import { MinimalTeacherIntent } from "@/pipeline/contracts";
import { convertMinimalToUAR } from "@/pipeline/orchestrator/convertMinimalToUAR";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts";
import { generateAssessment } from "@/config/aiConfig";



interface MinimalAssessmentFormWrapperProps {
  userId: string | null;                     // ⭐ REQUIRED
  onResult: (result: any) => void;
  /** Called as each parallel Writer group completes — enables live preview. */
  onItemsProgress?: (partialItems: any[]) => void;
}

export const MinimalAssessmentFormWrapper = React.memo(function MinimalAssessmentFormWrapper({
  userId,
  onResult,
  onItemsProgress,
}: MinimalAssessmentFormWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("[MinimalAssessmentFormWrapper] Mounted");
  }, []);

  const handleFormSubmit = useCallback(async (intent: MinimalTeacherIntent) => {
    try {
      setIsLoading(true);

      const safeUserId = userId ?? "00000000-0000-0000-0000-000000000000";

      const uar: UnifiedAssessmentRequest = {
        ...convertMinimalToUAR(intent),
        userId: safeUserId,
      };

      const data = await generateAssessment(uar, onItemsProgress);
      onResult(data);
    } finally {
      setIsLoading(false);
    }
  }, [userId, onResult, onItemsProgress]);

  return (
    <MinimalAssessmentForm onSubmit={handleFormSubmit} isLoading={isLoading} />
  );
});

