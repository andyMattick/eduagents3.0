// @ts-nocheck
import { ArchitectV3Input, ArchitectV3Slot } from "../types";
import { DifficultyProfile, pickDifficultyForIndex } from "./difficultyPlanner";

export function planSlots(
  input: ArchitectV3Input,
  difficultyProfile: DifficultyProfile
): ArchitectV3Slot[] {
  // 1. Derive question count from schema.items
  const count =
    Array.isArray(input.schema?.items) && input.schema.items.length > 0
      ? input.schema.items.length
      : 10;

  // 2. Derive question types from teacher preferences
  const typePrefs = input.teacherProfile?.question_type_preferences ?? {
    multipleChoice: 1,
  };

  const types = Object.entries(typePrefs)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([type]) => type);

  const slots: ArchitectV3Slot[] = [];

  // 3. Build slots with difficulty arc + type rotation
  for (let i = 0; i < count; i++) {
    const questionType = types[i % types.length];
    const difficulty = pickDifficultyForIndex(difficultyProfile, i, count);

    slots.push({
      id: `slot-${i + 1}`,
      questionType,
      difficulty,
      cognitiveDemand: null,
      pacingSeconds: null,
      templateId: null,
      diagramType: null,
      imageReferenceId: null,
      topicAngle: null,
    });
  }

  return slots;
}
