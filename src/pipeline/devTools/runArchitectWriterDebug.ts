import { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { runArchitect } from "@/pipeline/agents/architect";
import { writerCall } from "@/pipeline/agents/writer/writerCall";

export async function runArchitectWriterDebug(uar: UnifiedAssessmentRequest) {
  const blueprint = await runArchitect({ uar, agentId: "debug", compensation: null });

  const writerOutput = await writerCall(
    blueprint.uar,
    blueprint.plan,
    blueprint.constraints
  );

  return {
    uar,
    architectPlan: blueprint.plan,
    architectPrompt: blueprint.writerPrompt,
    writerPrompt: blueprint.writerPrompt,
    writerOutput
  };
}
