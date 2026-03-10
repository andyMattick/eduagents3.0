import { ArchitectV3Input, ArchitectV3Slot } from "../types";

export function applyPluginHints(
  input: ArchitectV3Input,
  slots: ArchitectV3Slot[]
): ArchitectV3Slot[] {
  return slots.map((slot) => {
    let templateId: string | null = null;
    let diagramType: string | null = null;

    if (slot.questionType === "multipleChoice") {
      templateId = "mcq-basic";
    }

    if (slot.questionType === "shortAnswer") {
      templateId = "sa-basic";
    }

    if (slot.questionType === "constructedResponse") {
      templateId = "cr-structured";
    }

    if (slot.topicAngle?.toLowerCase().includes("graph")) {
      diagramType = "graph";
    }

    if (slot.topicAngle?.toLowerCase().includes("map")) {
      diagramType = "map";
    }

    return {
      ...slot,
      templateId,
      diagramType,
    };
  });
}
