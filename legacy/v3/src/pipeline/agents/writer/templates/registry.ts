import type { WriterSlot } from "../types";
import type { TemplateOutput, WriterTemplateSlot } from "./types";

import { generateMCQ } from "./generalProblems/mcq";
import { generateShortAnswer } from "./generalProblems/shortAnswer";
import { generateMultiSelect } from "./generalProblems/multiSelect";
import { generateEssay } from "./generalProblems/essay";
import { generateContent } from "./generalProblems/content";

export function loadTemplate(slot: WriterSlot): TemplateOutput {
  const templateSlot = toTemplateSlot(slot);

  switch (normalizeQuestionType(slot.questionType)) {
    case "mcq":
      return generateMCQ(templateSlot);
    case "short_answer":
      return generateShortAnswer(templateSlot);
    case "multi_select":
      return generateMultiSelect(templateSlot);
    case "essay":
      return generateEssay(templateSlot);
    case "content":
      return generateContent(templateSlot);
    default:
      throw new Error(`No template found for questionType: ${slot.questionType}`);
  }
}

function normalizeQuestionType(questionType: string): string {
  const qt = String(questionType ?? "").trim();
  if (qt === "multipleChoice") return "mcq";
  if (qt === "shortAnswer") return "short_answer";
  if (qt === "multiSelect") return "multi_select";
  return qt;
}

function toTemplateSlot(slot: WriterSlot): WriterTemplateSlot {
  const domain =
    (slot.courseProfile as { subject?: string } | undefined)?.subject ??
    (slot.courseProfile as { domain?: string } | undefined)?.domain ??
    "general";

  const topic = slot.topicAngle ?? "the topic";
  const taskType =
    (slot.courseProfile as { taskType?: string } | undefined)?.taskType ??
    (slot.courseProfile as { reasoningMove?: string } | undefined)?.reasoningMove ??
    null;
  const grade =
    (slot.courseProfile as { gradeBand?: string } | undefined)?.gradeBand ??
    (slot.teacherProfile as { gradeLevel?: string } | undefined)?.gradeLevel ??
    "current grade band";

  return {
    domain,
    topic,
    sharedContext: slot.topicAngle,
    grade,
    metadata: {
      taskType,
    },
  };
}
