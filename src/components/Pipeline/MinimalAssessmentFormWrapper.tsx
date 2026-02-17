import React from "react";
import { summarizeAssessmentIntent } from "../../services/assessmentSummarizerService";
import { MinimalTeacherIntent } from "./contracts/assessmentContracts";
import MinimalAssessmentForm from "./MinimalAssessmentForm";


interface MinimalAssessmentFormWrapperProps {
  onResult: (result: any) => void;
}

export function MinimalAssessmentFormWrapper({ onResult }: MinimalAssessmentFormWrapperProps) {
  const handleFormSubmit = async (req: MinimalTeacherIntent) => {
    const result = await summarizeAssessmentIntent(req);
    onResult(result);
  };

  return <MinimalAssessmentForm onSubmit={handleFormSubmit} />;
}
