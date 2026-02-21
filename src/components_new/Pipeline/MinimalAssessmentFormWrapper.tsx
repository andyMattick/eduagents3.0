import { useState } from "react";
import MinimalAssessmentForm from "./MinimalAssessmentForm";

// NEW pipeline imports
import { MinimalTeacherIntent } from "@/pipeline/contracts";
import { convertMinimalToUAR } from "@/pipeline/orchestrator/convertMinimalToUAR";
import { generateAssessment } from "@/config/aiConfig";

interface MinimalAssessmentFormWrapperProps {
  onResult: (result: any) => void;
}

export function MinimalAssessmentFormWrapper({ onResult }: MinimalAssessmentFormWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (intent: MinimalTeacherIntent) => {
    try {
      setIsLoading(true);

      console.log("[Wrapper] Received intent:", intent);

      const uar = convertMinimalToUAR(intent);
      console.log("[Wrapper] Converted to UAR:", uar);

      const result = await generateAssessment(uar);
      console.log("[Wrapper] Pipeline result:", result);

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
