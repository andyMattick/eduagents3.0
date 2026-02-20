import React from "react";
import { MinimalTeacherIntent } from "./contracts/assessmentContracts";
import MinimalAssessmentForm from "./MinimalAssessmentForm";
import { translateMinimalToUnified } from "@/services/translateMinimalToUnified";
import { runWriterOrchestrator } from "@/components/Pipeline/writer/writerOrchestrator";

interface MinimalAssessmentFormWrapperProps {
  onResult: (result: any) => void;
}

export function MinimalAssessmentFormWrapper({ onResult }: MinimalAssessmentFormWrapperProps) {

  const handleFormSubmit = async (intent: MinimalTeacherIntent) => {
    console.log("%c[Wrapper] Received intent from form:", "color:#4F46E5;font-weight:bold;", intent);

    try {
      console.log("%c[Wrapper] Translating minimal → unified...", "color:#2563EB;font-weight:bold;");
      const unified = translateMinimalToUnified(intent);

      console.log("%c[Wrapper] Calling runWriterOrchestrator...", "color:#2563EB;font-weight:bold;");
      const result = await runWriterOrchestrator(unified);

      console.log("%c[Wrapper] Writer pipeline returned:", "color:#059669;font-weight:bold;", result);

      onResult(result);
      console.log("%c[Wrapper] onResult() called — pipeline result passed to router", "color:#10B981;font-weight:bold;");
    } catch (err) {
      console.error("%c[Wrapper] Error in pipeline:", "color:#DC2626;font-weight:bold;", err);
    }
  };

  return <MinimalAssessmentForm onSubmit={handleFormSubmit} />;
}
