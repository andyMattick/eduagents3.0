// @ts-nocheck
// planner/coveragePlanner.ts
import { ArchitectV3Input, ArchitectV3Slot } from "../types";

export function applyConceptCoverageBalancing(
  input: ArchitectV3Input,
  slots: ArchitectV3Slot[]
): ArchitectV3Slot[] {
  const concepts = Array.isArray(input.schema?.concepts)
    ? input.schema.concepts
    : [];

  if (!concepts.length) return slots;

  const counts: Record<string, number> = {};
  concepts.forEach(c => (counts[c.label] = 0));

  return slots.map((slot) => {
    const leastUsed = concepts.reduce((min, c) =>
      counts[c.label] < counts[min.label] ? c : min
    );

    counts[leastUsed.label]++;

    return {
      ...slot,
      topicAngle: leastUsed.label,
    };
  });
}
