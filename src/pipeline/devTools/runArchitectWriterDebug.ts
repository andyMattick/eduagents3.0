import { UnifiedAssessmentRequest } from "pipeline/contracts/UnifiedAssessmentRequest";
import { runArchitect } from "pipeline/agents/architect";
import { writerCall } from "pipeline/agents/writer/writerCall";

import { WriterSlot } from "pipeline/agents/writer/types";

export async function runArchitectWriterDebug(uar: UnifiedAssessmentRequest) {
  const blueprint = await runArchitect({ uar, agentId: "debug", compensation: null });

  const firstSlot = blueprint.problemSlots?.[0] as unknown as WriterSlot | undefined;
  const writerOutput = firstSlot
    ? await writerCall(firstSlot, null)
    : null;

  return {
    uar,
    architectPlan: blueprint.plan,
    architectPrompt: blueprint.writerPrompt,
    writerPrompt: blueprint.writerPrompt,
    writerOutput
  };
}
