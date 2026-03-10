// planner/difficultySmoother.ts
import { ArchitectV3Slot } from "../types";

export function applyDifficultySmoother(
  slots: ArchitectV3Slot[]
): ArchitectV3Slot[] {
  const out = [...slots];

  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    const curr = out[i];

    if (prev.difficulty === "hard" && curr.difficulty === "hard") {
      out[i] = { ...curr, difficulty: "medium" };
    }
  }

  return out;
}
