import type { BlueprintSlot } from "@/types/Blueprint";

export type ComplexitySlot = Pick<BlueprintSlot, "questionType" | "cognitiveDemand"> & {
  passage?: string | null;
  excerpt?: string | null;
};

export function computeSlotComplexity(rawSlot: ComplexitySlot): number {
  let cost = 0;

  switch (rawSlot.questionType) {
    case "passageBased":
    case "frq":
    case "dbq":
    case "essay":
      cost += 3;
      break;
    case "multiPart":
      cost += 2;
      break;
    case "constructedResponse":
      cost += 1.5;
      break;
    case "shortAnswer":
      cost += 1;
      break;
    case "multipleChoice":
      cost += 0.5;
      break;
    case "fluency":
      cost += 0.25;
      break;
  }

  if (rawSlot.passage) cost += 1;
  if (rawSlot.excerpt) cost += 0.5;

  if (rawSlot.cognitiveDemand === "analyze") cost += 0.5;
  const cognitiveDemand = rawSlot.cognitiveDemand;
  if (cognitiveDemand === "evaluate" || cognitiveDemand === "create") cost += 1;

  return cost;
}
