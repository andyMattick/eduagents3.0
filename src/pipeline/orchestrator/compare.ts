// src/pipeline/orchestrator/compare.ts

import { mapToComparisonProfile } from "../mapper/mapToComparisonProfile";
import { runPhilosopher } from "@/pipeline/agents/philosopher";

export async function runComparePipeline(internal: any) {
  const comparison = mapToComparisonProfile(internal);

  const philosopher = await runPhilosopher({
    mode: "compare",
    payload: comparison
  });

  return {
    type: "compare",
    comparison,
    philosopher
  };
}
