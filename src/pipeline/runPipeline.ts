import { UnifiedAssessmentRequest } from "pipeline/contracts";
import { runOrchestrator } from "./orchestrator";

export async function runPipeline(
  uar: UnifiedAssessmentRequest,
  depth: number = 0,
  onItemsProgress?: (items: any[]) => void
) {
  return runOrchestrator({
    intent: "create",
    input: uar,
    depth,
    onItemsProgress
  });
}
