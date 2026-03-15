/**
 * conflictResolution.ts
 *
 * Pre-generation conflict detection between teacher's runtime request and their
 * stored profile defaults.
 *
 * This module is PURELY deterministic — no LLM calls.  Returns structured
 * conflict objects that the UI can surface as dialogs.  The pipeline either
 * waits for teacher resolution or falls back to a safe default automatically.
 */

import type { TeacherProfile, PacingConflict } from "@/types/teacherProfile";
import type { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { getProblemTypesForSubjectAndGrade } from "@/pipeline/problemTypes/getProblemTypesForSubjectAndGrade";
import { inferGradeBand } from "@/pipeline/problemTypes/inferGradeBand";

// ─────────────────────────────────────────────────────────────────────────────
// Pacing conflict
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether the runtime (questionCount × avg seconds-per-type) exceeds the
 * teacher's expected assessment duration.
 *
 * Returns null when no conflict exists.
 */
export function detectPacingConflict(
  uar: UnifiedAssessmentRequest,
  profile: TeacherProfile
): PacingConflict | null {
  const { questionCount, questionTypes, assessmentType, time: runtimeMinutes } = uar;

  if (!questionCount || !assessmentType) return null;

  const defaultMinutes =
    profile.pacingDefaults.assessmentDurationMinutes[assessmentType] ?? null;

  if (!defaultMinutes) return null;

  // Use the runtime time if the teacher explicitly overrode it
  const targetMinutes = runtimeMinutes ?? defaultMinutes;

  const types: string[] =
    (questionTypes?.length ? questionTypes : profile.questionDefaults.questionTypes) as string[];

  const avgSeconds =
    types.reduce(
      (sum, t) =>
        sum + (profile.pacingDefaults.questionTypeSeconds[t] ?? 60),
      0
    ) / Math.max(types.length, 1);

  const requiredSeconds = questionCount * avgSeconds;
  const requiredMinutes = Math.ceil(requiredSeconds / 60);

  // Only flag when required time meaningfully exceeds the target (>20% over)
  if (requiredMinutes <= targetMinutes * 1.2) return null;

  return {
    type: "pacingConflict",
    requiredMinutes,
    defaultMinutes: targetMinutes,
    message:
      `${questionCount} questions at your usual pacing (~${Math.round(avgSeconds)}s each) ` +
      `would take ~${requiredMinutes} min, but you set ${targetMinutes} min for this ` +
      `${assessmentType}. Choose how to proceed.`,
    options: ["updateDefault", "useOnce", "cancel"],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve
// ─────────────────────────────────────────────────────────────────────────────

export type ConflictResolution =
  | { action: "useOnce" }
  | { action: "updateDefault"; updatedProfile: TeacherProfile }
  | { action: "cancel" };

/**
 * Apply the teacher's chosen resolution to a pacing conflict.
 *
 * "updateDefault" — clones the profile with updated pacing defaults persisted.
 * "useOnce"       — returns as-is; the pipeline should continue with runtime values.
 * "cancel"        — signals that the pipeline should abort.
 */
export function resolvePacingConflict(
  conflict: PacingConflict,
  choice: "updateDefault" | "useOnce" | "cancel",
  profile: TeacherProfile,
  assessmentType: string
): ConflictResolution {
  if (choice === "cancel") return { action: "cancel" };
  if (choice === "useOnce") return { action: "useOnce" };

  // updateDefault — persist the new duration expectation
  const updatedProfile: TeacherProfile = {
    ...profile,
    pacingDefaults: {
      ...profile.pacingDefaults,
      assessmentDurationMinutes: {
        ...profile.pacingDefaults.assessmentDurationMinutes,
        [assessmentType]: conflict.requiredMinutes,
      },
    },
    updatedAt: new Date().toISOString(),
  };

  return { action: "updateDefault", updatedProfile };
}

// ─────────────────────────────────────────────────────────────────────────────
// UAR injection helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeCourseToGovernedSubject(course: string): string | null {
  const normalized = String(course ?? "").trim().toLowerCase();
  if (!normalized) return null;

  if (["biology"].includes(normalized)) return "biology";
  if (["science", "chemistry", "physics", "envscience", "earthscience"].includes(normalized)) return "science";
  if (["math", "arithmetic", "algebra1", "algebra2", "geometry", "precalculus", "calculus", "statistics"].includes(normalized)) return "math";
  if (["english", "readingwriting", "literature", "composition", "grammar", "esl"].includes(normalized)) return "english";
  if (["history", "socialstudies", "ushistory", "worldhistory", "civics", "government", "economics"].includes(normalized)) return "history";

  return normalized;
}

function normalizeQuestionTypeToUIId(questionType: string): string {
  switch (questionType) {
    case "fillInTheBlank":
      return "fillBlank";
    case "constructedResponse":
    case "freeResponse":
      return "extendedResponse";
    case "passageBased":
      return "passageExtendedResponse";
    case "ordering":
      return "sequencing";
    default:
      return questionType;
  }
}

function sanitizeQuestionTypesForContext(
  uar: UnifiedAssessmentRequest,
  questionTypes: string[]
): string[] {
  const governedSubject = normalizeCourseToGovernedSubject(uar.course);
  if (!governedSubject) return questionTypes;

  const gradeBand = inferGradeBand(governedSubject, uar.gradeLevels ?? []);
  if (!gradeBand) return questionTypes;

  const allowedUiIds = new Set(
    getProblemTypesForSubjectAndGrade(governedSubject, gradeBand).map((pt) => pt.id)
  );
  if (allowedUiIds.size === 0) return questionTypes;

  return questionTypes.filter((questionType) =>
    allowedUiIds.has(normalizeQuestionTypeToUIId(questionType))
  );
}

/**
 * Merge teacher profile defaults INTO the UAR for any field the teacher left
 * unspecified.  Returns a new UAR; never mutates the original.
 *
 * Rules (from spec Part 4):
 *   - assessmentType missing → use profile defaults[0]
 *   - questionTypes missing  → use profile.questionDefaults.questionTypes
 *   - questionCount missing + duration exists → derive from pacing
 */
export function injectProfileIntoUAR(
  uar: UnifiedAssessmentRequest,
  profile: TeacherProfile
): UnifiedAssessmentRequest {
  let patched = { ...uar };
  const safeProfileQuestionTypes = sanitizeQuestionTypesForContext(
    patched,
    profile.questionDefaults.questionTypes as string[]
  );

  // 1. Assessment type default
  if (!patched.assessmentType && profile.assessmentDefaults.assessmentTypes.length > 0) {
    patched = {
      ...patched,
      assessmentType: profile.assessmentDefaults.assessmentTypes[0] as any,
    };
  }

  // 2. Question type defaults
  if (!patched.questionTypes?.length && safeProfileQuestionTypes.length > 0) {
    patched = {
      ...patched,
      questionTypes: safeProfileQuestionTypes,
    };
  }

  // 3. Question count from duration (never ask teacher if duration is known)
  if (!patched.questionCount && patched.time && patched.assessmentType) {
    const types = patched.questionTypes?.length
      ? patched.questionTypes
      : safeProfileQuestionTypes;

    const avgSeconds =
      (types.length
        ? types.reduce(
            (sum, t) => sum + (profile.pacingDefaults.questionTypeSeconds[t] ?? 60),
            0
          ) / types.length
        : 60);

    const derived = Math.max(1, Math.floor((patched.time * 60) / avgSeconds));
    patched = { ...patched, questionCount: derived };
  }

  return patched;
}
