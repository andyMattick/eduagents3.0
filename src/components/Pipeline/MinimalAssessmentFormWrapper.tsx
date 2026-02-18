import Reacexportsummarizerassessmentintentt from "react";
import { summarizeAssessmentIntent } from "../../services/assessmentSummarizerService";
import { MinimalTeacherIntent } from "./contracts/assessmentContracts";
import MinimalAssessmentForm from "./MinimalAssessmentForm";


interface MinimalAssessmentFormWrapperProps {
  onResult: (result: any) => void;
}

export function MinimalAssessmentFormWrapper({ onResult }: MinimalAssessmentFormWrapperProps) {

  const handleFormSubmit = async (req: MinimalTeacherIntent) => {
    console.log("%c[Wrapper] Received intent from form:", "color:#4F46E5;font-weight:bold;", req);

    try {
      console.log("%c[Wrapper] Calling summarizeAssessmentIntent...", "color:#2563EB;font-weight:bold;");
      const result = await summarizeAssessmentIntent(req);

      console.log("%c[Wrapper] summarizeAssessmentIntent returned:", "color:#059669;font-weight:bold;", result);

      onResult(result);
      console.log("%c[Wrapper] onResult() called — pipeline result passed to router", "color:#10B981;font-weight:bold;");
    } 
    catch (err) {
      console.error("[Wrapper] ERROR during summarizeAssessmentIntent:", err);
    }
  };

  console.log("%c[Wrapper] MinimalAssessmentFormWrapper mounted", "color:#6B7280;");

  return <MinimalAssessmentForm onSubmit={handleFormSubmit} />;
}

