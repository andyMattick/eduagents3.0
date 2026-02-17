import React from "react";
import { summarizeAssessmentIntent } from "../../services/assessmentSummarizerService";
import { MinimalAssessmentForm } from "./MinimalAssessmentForm";import { MinimalTeacherIntent } from "./contracts/assessmentContracts";


export function MinimalAssessmentFormWrapper() {
  const handleFormSubmit = async (req: MinimalTeacherIntent) => {

    const result = await summarizeAssessmentIntent(req);
    console.log("Pipeline result:", result);
  };

  return <MinimalAssessmentForm onSubmit={handleFormSubmit} />;
}
