// @ts-nocheck
// planner/conceptSequencer.ts
import { ArchitectV3Input, ArchitectV3Slot } from "../types";

export function applyConceptSequencing(
  input: ArchitectV3Input,
  slots: ArchitectV3Slot[]
): ArchitectV3Slot[] {
  const concepts = Array.isArray(input.schema?.concepts)
    ? input.schema.concepts
    : [];

  if (!concepts.length) return slots;

  const sortedConcepts = [...concepts].sort((a, b) => {
    const da = a.difficulty ?? 0;
    const db = b.difficulty ?? 0;
    return da - db;
  });

  return slots.map((slot, index) => {
    const concept = sortedConcepts[index % sortedConcepts.length];
    return {
      ...slot,
      topicAngle: concept?.label ?? slot.topicAngle,
    };
  });
}
