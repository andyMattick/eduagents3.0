import { MinimalTeacherIntent } from "../components/Pipeline/contracts/assessmentContracts";
import { translateMinimalToUnified } from "./translateMinimalToUnified";
import { runUnifiedAssessment } from "../components/Pipeline/orchestrator/assessmentOrchestratorService";

export async function summarizeAssessmentIntent(
  intent: MinimalTeacherIntent
) {
  const req = translateMinimalToUnified(intent);
  return await runUnifiedAssessment(req);
}

