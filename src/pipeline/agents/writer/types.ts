// agents/writer/types.ts
import { ArchitectV3Slot } from "../../architectV3/types";
import {
  UnifiedTeacherStyleProfile,
  UnifiedTemplateProfile
} from "../../schema/unifiedSchema";

/**
 * WriterItemMetadata — The governed contract for Writer → Gatekeeper → Builder → Scribe.
 * All downstream agents read THIS shape from GeneratedItem.metadata.
 */
export interface WriterItemMetadata {
  // === ROUTING + PROVENANCE ===
  generationMethod: "template" | "diagram" | "image" | "llm";
  templateId: string | null;
  diagramType: string | null;
  imageReferenceId: string | null;

  // === COGNITIVE + DIFFICULTY ===
  difficulty: "easy" | "medium" | "hard";
  cognitiveDemand: string | null;

  // === STYLE + STRUCTURE ===
  topicAngle: string | null;
  pacingSeconds: number | null;

  // === BLUEPRINT ALIGNMENT ===
  slotId: string;
  questionType: string;

  // === OPTIONAL STRUCTURE ===
  sectionId?: string | null;
  passageId?: string | null;
}

export interface GeneratedSubQuestion {
  prompt: string;
  answer: string;
}

export interface GeneratedItem {
  slotId: string;
  questionType: string;
  prompt: string;
  answer: string;
  options?: string[] | null;
  rationale?: string;
  explanation?: string;
  cognitiveTrace?: string;
  passage?: string;
  questions?: GeneratedSubQuestion[];
  metadata: WriterItemMetadata;
  [key: string]: any;
}

/**
 * Helper: ensure an item has complete metadata with safe defaults.
 */
export function ensureMetadata(item: any, slot?: any): WriterItemMetadata {
  return {
    generationMethod: item.metadata?.generationMethod ?? slot?.generationMethod ?? "llm",
    templateId: item.metadata?.templateId ?? slot?.templateId ?? null,
    diagramType: item.metadata?.diagramType ?? slot?.diagramType ?? null,
    imageReferenceId: item.metadata?.imageReferenceId ?? slot?.imageReferenceId ?? null,
    difficulty: item.metadata?.difficulty ?? slot?.difficulty ?? "medium",
    cognitiveDemand: item.metadata?.cognitiveDemand ?? slot?.cognitiveDemand ?? null,
    topicAngle: item.metadata?.topicAngle ?? slot?.topicAngle ?? null,
    pacingSeconds: item.metadata?.pacingSeconds ?? slot?.pacingSeconds ?? null,
    slotId: item.metadata?.slotId ?? item.slotId ?? slot?.slotId ?? "",
    questionType: item.metadata?.questionType ?? item.questionType ?? slot?.questionType ?? "",
    sectionId: item.metadata?.sectionId ?? slot?.sectionId ?? null,
    passageId: item.metadata?.passageId ?? slot?.passageId ?? null,
  };
}

export interface WriterSlot {
  slotId: string;
  questionType: string;
  difficulty: "easy" | "medium" | "hard";
  cognitiveDemand: string | null;
  pacingSeconds: number | null;
  topicAngle: string | null;

  generationMethod: "template" | "diagram" | "image" | "llm";
  templateId?: string | null;
  diagramType?: string | null;
  imageReferenceId?: string | null;

  teacherProfile: UnifiedTeacherStyleProfile;
  courseProfile: UnifiedTemplateProfile;
}

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
