// planner/multipartPlanner.ts
import { ArchitectV3Input, ArchitectV3Slot } from "../types";

export interface MultiPartSubSlot {
  id: string;
  cognitiveDemand: string;
  promptType: string;
}

export function applyMultiPartCR(
  input: ArchitectV3Input,
  slots: ArchitectV3Slot[]
): ArchitectV3Slot[] {
  return slots.map((slot) => {
    if (slot.questionType !== "constructedResponse") return slot;

    const baseId = slot.id;

    const subSlots: MultiPartSubSlot[] = [
      {
        id: `${baseId}-a`,
        cognitiveDemand: "apply",
        promptType: "shortAnswer"
      },
      {
        id: `${baseId}-b`,
        cognitiveDemand: "analyze",
        promptType: "shortAnswer"
      },
      {
        id: `${baseId}-c`,
        cognitiveDemand: "evaluate",
        promptType: "shortAnswer"
      }
    ];

    // If this CR is inside a stimulus cluster, preserve the cluster context
    const stimulusContext =
      // @ts-ignore — allowed extension
      slot.stimulusText ??
      null;

    return {
      ...slot,
      templateId: "cr-multipart",
      // @ts-ignore — allowed extension
      subSlots,
      // @ts-ignore — allowed extension
      stimulusText: stimulusContext
    };
  });
}
