// @ts-nocheck
import { ArchitectV3Input, ArchitectV3Slot } from "../types";

export function applyTopicAngles(
  input: ArchitectV3Input,
  slots: ArchitectV3Slot[]
): ArchitectV3Slot[] {
  const concepts = Array.isArray(input.schema?.concepts)
    ? input.schema.concepts
    : [];

  if (!concepts.length) return slots;

  return slots.map((slot, index) => {
    const concept = concepts[index % concepts.length];
    return {
      ...slot,
      topicAngle: concept.label ?? concept.id ?? null,
    };
  });
}
