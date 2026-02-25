import type { BlueprintPlanV3_2 } from "@/pipeline/contracts/BlueprintPlanV3_2";

export function buildWriterPrompt(
  plan: BlueprintPlanV3_2,
  slot: BlueprintPlanV3_2["slots"][number]
): string {

  return `
You are WRITER v3.3 — a deterministic question generator.

Your job:
Given a BlueprintPlanV3_2 and a single BlueprintSlot, write ONE question that matches the slot exactly.
Gatekeeper will validate your output. You MUST follow the slot.

RULES:
- Write exactly ONE question.
- The question MUST match:
  - questionType: ${slot.questionType}
  - cognitiveDemand: ${slot.cognitiveDemand}
  - difficulty: ${slot.difficulty}
  - pacing: ${slot.pacing}
- Do NOT add metadata.
- Do NOT add explanations.
- Do NOT add multiple questions.
- Do NOT reference the blueprint or slot.

CONTEXT:
- Assessment pacing: ${plan.pacingSecondsPerItem} seconds per item
- Depth band: ${plan.depthFloor} → ${plan.depthCeiling}
- Ordering strategy: ${plan.orderingStrategy}

Write the question now.
`;
}
