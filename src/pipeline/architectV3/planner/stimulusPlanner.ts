// planner/stimulusPlanner.ts
import { ArchitectV3Input, ArchitectV3Slot } from "../types";

export function applyStimulusClustering(
  input: ArchitectV3Input,
  slots: ArchitectV3Slot[]
): ArchitectV3Slot[] {
  const items = Array.isArray(input.schema?.items)
    ? input.schema.items
    : [];

  if (!items.length) return slots;

  const clusters: Record<string, ArchitectV3Slot[]> = {};
  const noStimulus: ArchitectV3Slot[] = [];

  slots.forEach((slot, index) => {
    const item = items[index % items.length];

    // Correct unified schema field
    const stimulusKey = item?.source_text?.trim() || null;

    if (!stimulusKey) {
      noStimulus.push(slot);
      return;
    }

    if (!clusters[stimulusKey]) clusters[stimulusKey] = [];
    clusters[stimulusKey].push(slot);
  });

  const output: ArchitectV3Slot[] = [];

  Object.entries(clusters).forEach(([stimulusKey, clusterSlots], idx) => {
    // Insert a header slot
    output.push({
      id: `stimulus-${idx + 1}`,
      questionType: "stimulusHeader",
      difficulty: "easy",
      cognitiveDemand: "understand",
      templateId: "stimulus-header",
      topicAngle: null,
      diagramType: null,
      pacingSeconds: 0,
      // @ts-ignore
      stimulusText: stimulusKey
    });

    // Attach stimulus context to each slot in the cluster
    clusterSlots.forEach((slot) => {
      output.push({
        ...slot,
        // @ts-ignore
        stimulusText: stimulusKey
      });
    });
  });

  output.push(...noStimulus);

  return output;
}
