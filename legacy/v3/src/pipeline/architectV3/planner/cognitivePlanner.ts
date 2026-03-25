import { ArchitectV3Slot, ArchitectV3Input } from "../types";

export function applyCognitiveDemand(
  input: ArchitectV3Input,
  slots: ArchitectV3Slot[]
): ArchitectV3Slot[] {
  const concepts = Array.isArray(input.schema?.concepts)
    ? input.schema.concepts
    : [];

  return slots.map((slot, index) => {
    const concept = concepts[index % concepts.length];
    const conceptType = concept?.type?.toLowerCase() ?? "";

    let demand: string = "understand";

    if (slot.difficulty === "easy") {
      demand = conceptType.includes("vocab") ? "remember" : "understand";
    }

    if (slot.difficulty === "medium") {
      if (conceptType.includes("process")) demand = "apply";
      else if (conceptType.includes("compare")) demand = "analyze";
      else demand = "apply";
    }

    if (slot.difficulty === "hard") {
      if (conceptType.includes("argument")) demand = "evaluate";
      else demand = "create";
    }

    if (slot.questionType === "constructedResponse") {
      demand = "evaluate";
    }

    return { ...slot, cognitiveDemand: demand };
  });
}
