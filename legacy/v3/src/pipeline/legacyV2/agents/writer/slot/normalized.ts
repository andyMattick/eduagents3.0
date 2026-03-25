// @ts-nocheck
import { ArchitectV3Slot } from "pipeline/architectV3/types";
import {
  UnifiedTeacherStyleProfile,
  UnifiedTemplateProfile
} from "pipeline/schema/unifiedSchema";
import { WriterSlot } from "../types";

export function normalizeSlot(
  slot: ArchitectV3Slot,
  teacherProfile: UnifiedTeacherStyleProfile,
  courseProfile: UnifiedTemplateProfile
): WriterSlot {
  let generationMethod: "template" | "diagram" | "image" | "llm" = "llm";

  if (slot.templateId) generationMethod = "template";
  else if (slot.diagramType) generationMethod = "diagram";
  else if (slot.imageReferenceId) generationMethod = "image";

  return {
    slotId: slot.id,
    questionType: slot.questionType,
    difficulty: slot.difficulty,
    cognitiveDemand: slot.cognitiveDemand ?? null,
    pacingSeconds: slot.pacingSeconds ?? null,
    topicAngle: slot.topicAngle ?? null,

    generationMethod,
    templateId: slot.templateId ?? null,
    diagramType: slot.diagramType ?? null,
    imageReferenceId: slot.imageReferenceId ?? null,

    teacherProfile,
    courseProfile
  };
}
