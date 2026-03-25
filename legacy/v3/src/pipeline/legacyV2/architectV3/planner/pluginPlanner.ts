// @ts-nocheck
// planner/pluginPlanner.ts
import { ArchitectV3Input, ArchitectV3Slot } from "../types";

export function applyPluginHints(
  input: ArchitectV3Input,
  slots: ArchitectV3Slot[]
): ArchitectV3Slot[] {
  return slots.map((slot) => {
    let templateId: string | null = null;
    let diagramType: string | null = null;

    switch (slot.questionType) {
      case "multipleChoice":
        templateId = "mcq-basic";
        break;
      case "shortAnswer":
        templateId = "sa-basic";
        break;
      case "constructedResponse":
        templateId = "cr-structured";
        break;
      case "graphing":
        templateId = "graphing-basic";
        diagramType = "graph";
        break;
      default:
        templateId = "generic-basic";
    }

    if (!diagramType && slot.topicAngle) {
      const angle = slot.topicAngle.toLowerCase();
      if (angle.includes("relationship")) diagramType = "multiGraph";
      if (angle.includes("process")) diagramType = "flowDiagram";
    }

    if (templateId === "graphing-basic" && !slot.topicAngle?.includes("numeric")) {
      templateId = "sa-basic";
      diagramType = null;
    }

    return { ...slot, templateId, diagramType };
  });
}
