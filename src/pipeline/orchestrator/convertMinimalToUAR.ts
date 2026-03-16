import { MinimalTeacherIntent, UnifiedAssessmentRequest } from "pipeline/contracts";

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
 * Maps a single questionFormat token to its pipeline questionTypes[] entries.
 */
function mapSingleFormat(
  format: string,
  assessmentType: string
): string[] | undefined {
  switch (format) {
    // ── Legacy chip IDs (backward compat) ────────────────────────────────
    case "mcqOnly":           return ["multipleChoice"];
    case "saOnly":            return ["shortAnswer"];
    case "essayOnly":         return ["essay"];
    case "frqOnly":           return ["freeResponse"];
    case "fitbOnly":          return ["fillInTheBlank"];
    case "trueFalseOnly":     return ["trueFalse"];

    // ── Canonical UI_PROBLEM_TYPES IDs (Select) ──────────────────────────
    case "multipleChoice":    return ["multipleChoice"];
    case "trueFalse":         return ["trueFalse"];
    case "multiSelect":       return ["multiSelect"];
    case "hotspot":           return ["hotspot"];
    case "dragDrop":          return ["dragDrop"];

    // ── Canonical UI_PROBLEM_TYPES IDs (Produce) ─────────────────────────
    case "shortAnswer":       return ["shortAnswer"];
    case "fillBlank":         return ["fillInTheBlank"];
    case "numericEntry":      return ["numericEntry"];
    case "tableCompletion":   return ["tableCompletion"];
    case "equationConstruction": return ["equationConstruction"];

    // ── Canonical UI_PROBLEM_TYPES IDs (Analyze) ─────────────────────────
    case "errorAnalysis":     return ["errorAnalysis"];
    case "dataInterpretation": return ["dataInterpretation"];
    case "graphInterpretation": return ["graphInterpretation"];
    case "sequencing":        return ["sequencing"];
    case "classification":    return ["classification"];
    case "causeEffect":       return ["causeEffect"];
    case "sourceComparison":  return ["sourceComparison"];

    // ── Canonical UI_PROBLEM_TYPES IDs (Create) ──────────────────────────
    case "extendedResponse":  return ["constructedResponse"];
    case "essay":             return ["essay"];
    case "passageExtendedResponse": return ["passageBased"];
    case "cer":               return ["cer"];
    case "experimentalDesign": return ["experimentalDesign"];
    case "roleWriting":       return ["roleWriting"];
    case "designTask":        return ["designTask"];

    // ── Canonical UI_PROBLEM_TYPES IDs (Perform) ─────────────────────────
    case "performanceTask":   return ["performanceTask"];
    case "scenarioDecision":  return ["scenarioDecision"];
    case "simulation":        return ["simulation"];

    // ── Special shared IDs ────────────────────────────────────────────────
    case "arithmeticFluency": return ["arithmeticFluency"];
    case "passageBased":      return ["passageBased"];

    case "mixed":
      // freeResponse is AP-exam special — never included in generic "mixed".
      // Teachers who want FRQ must explicitly select "Free Response" (frqOnly).
      if (assessmentType === "test")
        return ["multipleChoice", "shortAnswer", "constructedResponse"];
      if (assessmentType === "quiz")
        return ["multipleChoice", "shortAnswer"];
      return ["multipleChoice", "shortAnswer"];
    default:
      return undefined;
  }
}

/**
 * Maps the teacher's questionFormat chip answer to the pipeline's
 * questionTypes[] array.  Handles comma-separated multi-select values.
 * Falls back to undefined to let the Architect infer from assessment type.
 */
function mapQuestionFormat(
  format: string | null | undefined,
  assessmentType: string
): string[] | undefined {
  if (!format) return undefined;

  const parts = format.split(",").map(f => f.trim()).filter(Boolean);

  // Single value — fast path
  if (parts.length === 1) return mapSingleFormat(parts[0], assessmentType);

  // Multi-select — flatten and deduplicate
  const types = new Set<string>();
  for (const part of parts) {
    const mapped = mapSingleFormat(part, assessmentType);
    if (mapped) mapped.forEach(t => types.add(t));
  }
  return types.size > 0 ? [...types] : undefined;
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
    stateCode: intent.stateCode ?? null,
    multiPartQuestions: intent.multiPartQuestions ?? null,
    mathFormat: (intent.mathFormat ?? "unicode") as "unicode" | "plain" | "latex",

    // ── Question types mapped from questionFormat ─────────────────────
    questionTypes: (() => {
      let types = mapQuestionFormat(intent.questionFormat, intent.assessmentType);
      // When teacher requests multi-part questions but picked a single-format
      // that maps to only ["multipleChoice"], upgrade to include shortAnswer
      // so the writer can actually build the progressive A→B→C structure.
      if (
        intent.multiPartQuestions === "yes" &&
        types?.length === 1 &&
        types[0] === "multipleChoice"
      ) {
        types = ["multipleChoice", "shortAnswer"];
      }
      return types;
    })(),

    // ── Arithmetic fluency teacher-specified fields ───────────────────
    ...(intent.arithmeticOperation ? { operation: intent.arithmeticOperation } : {}),
    ...(intent.arithmeticRange    ? { range:     intent.arithmeticRange     } : {}),

    // If teacher provided a passage text, inject it as a source document
    sourceDocuments: [
      ...(intent.sourceDocuments ?? []),
      ...((intent as any).passageText
        ? [{ id: "teacher-passage", name: "Teacher-provided passage", content: (intent as any).passageText as string }]
        : []),
    ],
    exampleAssessment: intent.exampleAssessment,
  };
}
