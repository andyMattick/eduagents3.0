// planner/depthBounds.ts
import { ArchitectV3Slot } from "../types";

const bloomOrder = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

export function computeDepthBounds(slots: ArchitectV3Slot[]) {
  const levels = slots
    .map(s => s.cognitiveDemand)
    .filter(Boolean) as string[];

  if (!levels.length) return { depthFloor: null, depthCeiling: null };

  const sorted = levels.sort(
    (a, b) => bloomOrder.indexOf(a) - bloomOrder.indexOf(b)
  );

  return {
    depthFloor: sorted[0],
    depthCeiling: sorted[sorted.length - 1],
  };
}
