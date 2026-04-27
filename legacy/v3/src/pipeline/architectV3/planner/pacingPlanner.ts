// planner/pacingPlanner.ts
import { ArchitectV3Slot } from "../types";

export function applySlotPacing(slots: ArchitectV3Slot[]): ArchitectV3Slot[] {
  return slots.map((slot) => {
    let seconds = 45;

    if (slot.questionType === "multipleChoice") seconds = 30;
    if (slot.questionType === "shortAnswer") seconds = 60;
    if (slot.questionType === "constructedResponse") seconds = 120;

    if (slot.difficulty === "hard") seconds += 20;
    if (slot.cognitiveDemand === "evaluate") seconds += 20;
    if (slot.cognitiveDemand === "create") seconds += 40;

    return { ...slot, pacingSeconds: seconds };
  });
}
