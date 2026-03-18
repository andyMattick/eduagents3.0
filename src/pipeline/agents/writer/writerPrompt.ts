import type { BlueprintPlanV3_2 } from "pipeline/contracts/BlueprintPlanV3_2";
import type { WriterSlot } from "./types";

export interface WriterContext {
  domain: string;
  topic: string;
  grade: string;
  unitName: string;
  lessonName: string | null;
  additionalDetails: string | null;
  focusAreas: string[] | null;
  misconceptions: string[] | null;
  avoidList: string[] | null;
  scopeWidth: BlueprintPlanV3_2["scopeWidth"];
  previousSlotsSummary: {
    id: string;
    questionType: string;
    cognitiveDemand: string;
    difficulty: string;
    topicAngle?: string;
  }[];
  mathFormat?: "unicode" | "plain" | "latex";
  operation?: "add" | "subtract" | "multiply" | "divide";
  range?: { min: number; max: number };
  contractGuidelines?: string[];
}

export interface ScribePrescriptions {
  weaknesses: string[];
  requiredBehaviors: string[];
  forbiddenBehaviors: string[];
}

/**
 * Fallback-only writer prompt for the active writer path.
 */
export function buildWriterPrompt(slot: WriterSlot): string {
  const topic = slot.topicAngle ?? "the topic";
  const difficulty = slot.difficulty;
  const cognitiveDemand = slot.cognitiveDemand ?? "understand";

  return [
    "You are WRITER. Generate one assessment item.",
    `slotId: ${slot.slotId}`,
    `questionType: ${slot.questionType}`,
    `topic: ${topic}`,
    `difficulty: ${difficulty}`,
    `cognitiveDemand: ${cognitiveDemand}`,
    "Return JSON with: prompt, answer, optional options (for multiple choice).",
  ].join("\n");
}
