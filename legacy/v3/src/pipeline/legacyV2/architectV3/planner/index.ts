// @ts-nocheck
import { ArchitectV3Input, ArchitectV3Plan } from "../types";
import { planDifficultyProfile } from "./difficultyPlanner";
import { planSlots } from "./slotPlanner";

import { applyTypeMixSmoothing } from "./typeMixPlanner";
import { applyDifficultySmoother } from "./difficultySmoother";
import { applyTopicAngles } from "./topicPlanner";
import { applyConceptSequencing } from "./conceptSequencer";
import { applyConceptCoverageBalancing } from "./coveragePlanner";

import { applyStimulusClustering } from "./stimulusPlanner";
import { applyMultiPartCR } from "./multipartPlanner";

import { applyPluginHints } from "./pluginPlanner";
import { applyCognitiveDemand } from "./cognitivePlanner";
import { applySlotPacing } from "./pacingPlanner";
import { computeDepthBounds } from "./depthBound";

export function buildPlan(input: ArchitectV3Input): ArchitectV3Plan {
  const difficultyProfile = planDifficultyProfile(input);

  // 1. Generate initial slots
  let slots = planSlots(input, difficultyProfile);

  // 2. Smooth type mix (avoid MC-MC-MC)
  slots = applyTypeMixSmoothing(slots);

  // 3. Smooth difficulty spikes (avoid hard-hard-hard)
  slots = applyDifficultySmoother(slots);

  // 4. Assign topic angles (concept labels)
  slots = applyTopicAngles(input, slots);

  // 5. Sequence concepts (easy → hard progression)
  slots = applyConceptSequencing(input, slots);

  // 6. Balance concept coverage (even distribution)
  slots = applyConceptCoverageBalancing(input, slots);

  // 7. Stimulus clustering (group slots under passages)
  slots = applyStimulusClustering(input, slots);

  // 8. Multi-part CR (apply → analyze → evaluate)
  slots = applyMultiPartCR(input, slots);

  // 9. Plugin hints (templateId, diagramType, constraints)
  slots = applyPluginHints(input, slots);

  // 10. Cognitive demand (Bloom level)
  slots = applyCognitiveDemand(input, slots);

  // 11. Slot-level pacing (seconds per item)
  slots = applySlotPacing(slots);

  // 12. Depth floor/ceiling (Bloom min/max)
  const { depthFloor, depthCeiling } = computeDepthBounds(slots);

  // Cognitive distribution summary
  const cognitiveDistribution = slots.reduce((acc, s) => {
    const key = s.cognitiveDemand ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    slots,
    difficultyProfile,
    cognitiveDistribution,
    pacingSecondsPerItem: 0, // now unused because pacing is per-slot
    depthFloor,
    depthCeiling
  };
}
