import { MinimalTeacherIntent, UnifiedAssessmentRequest } from "@/pipeline/contracts";

/** Sentinel values a user might type to mean "nothing" */
const EMPTY_SENTINELS = new Set([
  "none", "n/a", "na", "no", "nothing", "null", "nil", "n.a.", "no topic",
  "no specific topic", "not applicable", "doesn't matter", "any", "-", "--",
]);

/**
 * Converts a free-text optional field to null if the user typed nothing
 * meaningful (empty, whitespace, or a sentinel like "none" / "n/a").
 */
function sanitizeOptional(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (EMPTY_SENTINELS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

export function convertMinimalToUAR(
  intent: MinimalTeacherIntent
): UnifiedAssessmentRequest {
  return {
    gradeLevels: intent.gradeLevels,
    course: intent.course,
    unitName: intent.unitName,
    lessonName: sanitizeOptional(intent.lessonName),
    topic: sanitizeOptional(intent.topic),
    assessmentType: intent.assessmentType,
    studentLevel: intent.studentLevel,
    time: intent.time,
    additionalDetails: sanitizeOptional(intent.additionalDetails),
    sourceDocuments: intent.sourceDocuments ?? [],
    exampleAssessment: intent.exampleAssessment,
  };
}
