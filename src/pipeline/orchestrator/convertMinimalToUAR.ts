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

/**
 * Maps the teacher's questionFormat chip answer to the pipeline's
 * questionTypes[] array.  Falls back to undefined to let the Architect
 * infer from assessment type.
 */
function mapQuestionFormat(
  format: string | null | undefined,
  assessmentType: string
): string[] | undefined {
  switch (format) {
    case "mcqOnly":
      return ["multipleChoice"];
    case "saOnly":
      return ["shortAnswer"];
    case "essayOnly":
      return ["essay"];
    case "frqOnly":
      // AP-style free response — richer rubric-able prompts
      return ["freeResponse"];
    case "fitbOnly":
      return ["fillInTheBlank"];
    case "trueFalseOnly":
      return ["trueFalse"];
    case "mixed":
      // Vary the mix by assessment type
      if (assessmentType === "test")
        return ["multipleChoice", "shortAnswer", "freeResponse"];
      if (assessmentType === "quiz")
        return ["multipleChoice", "shortAnswer"];
      return ["multipleChoice", "shortAnswer"];
    default:
      return undefined; // let the Architect decide
  }
}

export function convertMinimalToUAR(
  intent: MinimalTeacherIntent
): UnifiedAssessmentRequest {
  return {
    // ── Required UAR fields with safe defaults ──────────────────────────
    // mode and subscriptionTier are overridden by callers that supply them;
    // these defaults prevent "undefined" from leaking into the pipeline.
    mode: "write" as const,
    subscriptionTier: "free" as const,
    userId: "",  // callers MUST override this with the authenticated user id

    // ── Intent fields ─────────────────────────────────────────────────
    gradeLevels: intent.gradeLevels,
    course: intent.course,
    unitName: intent.unitName,
    lessonName: sanitizeOptional(intent.lessonName),
    topic: sanitizeOptional(intent.topic),
    assessmentType: intent.assessmentType,
    studentLevel: intent.studentLevel,
    time: intent.time,
    additionalDetails: sanitizeOptional(intent.additionalDetails),

    // ── Adaptive fields ───────────────────────────────────────────────
    questionFormat: intent.questionFormat ?? null,
    bloomPreference: intent.bloomPreference ?? null,
    sectionStructure: intent.sectionStructure ?? null,
    standards: intent.standards ?? null,
    multiPartQuestions: intent.multiPartQuestions ?? null,

    // ── Question types mapped from questionFormat ─────────────────────
    questionTypes: mapQuestionFormat(intent.questionFormat, intent.assessmentType),

    sourceDocuments: intent.sourceDocuments ?? [],
    exampleAssessment: intent.exampleAssessment,
  };
}
