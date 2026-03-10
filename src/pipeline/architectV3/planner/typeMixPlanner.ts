// planner/typeMixPlanner.ts
import { ArchitectV3Slot } from "../types";

export function applyTypeMixSmoothing(
  slots: ArchitectV3Slot[]
): ArchitectV3Slot[] {
  const out = [...slots];

  for (let i = 2; i < out.length; i++) {
    const a = out[i - 2].questionType;
    const b = out[i - 1].questionType;
    const c = out[i].questionType;

    if (a === b && b === c) {
      out[i] = {
        ...out[i],
        questionType: "shortAnswer",
      };
    }
  }

  return out;
}
