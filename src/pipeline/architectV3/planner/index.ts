import { ArchitectV3Input, ArchitectV3Plan } from "../types";
import { planDifficultyProfile } from "./difficultyPlanner";
import { planSlots } from "./slotPlanner";
import { planPacing } from "./pacingPlanner";
import { applyTopicAngles } from "./topicPlanner";
import { applyPluginHints } from "./pluginPlanner";
import { applyCognitiveDemand } from "./cognitivePlanner";

export function buildPlan(input: ArchitectV3Input): ArchitectV3Plan {

  const difficultyProfile = planDifficultyProfile(input);

  let slots = planSlots(input, difficultyProfile);
  slots = applyTopicAngles(input, slots);
  slots = applyPluginHints(input, slots);
  slots = applyCognitiveDemand(input, slots);
  slots = applyPluginHints(input, slots);


  const pacingSecondsPerItem = planPacing(input);

  const cognitiveDistribution = slots.reduce((acc, s) => {
    const key = s.cognitiveDemand ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    slots,
    difficultyProfile,
    cognitiveDistribution,
    pacingSecondsPerItem,
    depthFloor: null,
    depthCeiling: null
  };
}
