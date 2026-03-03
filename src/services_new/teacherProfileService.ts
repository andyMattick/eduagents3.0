/**
 * teacherProfile.ts  (api layer)
 *
 * Load and persist teacher profiles via Supabase.
 * Import this from either the browser bundle or server-side contexts.
 *
 * Uses the shared Supabase client — env vars must be set.
 */

import { supabase } from "@/supabase/client";
import type {
  TeacherProfile,
  ResolvedCourseDefaults,
} from "@/types/teacherProfile";
import { makeDefaultProfile } from "@/types/teacherProfile";

// ─────────────────────────────────────────────────────────────────────────────
// Load
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the teacher's stored profile from Supabase.
 * Returns null when no profile row exists yet.
 */
export async function loadTeacherProfile(
  userId: string
): Promise<TeacherProfile | null> {
  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("profile")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[TeacherProfile] load error:", error.message);
    return null;
  }

  if (!data?.profile) return null;

  // Merge with factory defaults so future schema additions are always safe
  const stored = data.profile as Partial<TeacherProfile>;
  const defaults = makeDefaultProfile(userId);

  return {
    ...defaults,
    ...stored,
    // Deep-merge nested objects so new keys in defaults survive
    pacingDefaults: {
      ...defaults.pacingDefaults,
      ...(stored.pacingDefaults ?? {}),
      questionTypeSeconds: {
        ...defaults.pacingDefaults.questionTypeSeconds,
        ...(stored.pacingDefaults?.questionTypeSeconds ?? {}),
      },
      assessmentDurationMinutes: {
        ...defaults.pacingDefaults.assessmentDurationMinutes,
        ...(stored.pacingDefaults?.assessmentDurationMinutes ?? {}),
      },
    },
    stylePreferences: {
      ...defaults.stylePreferences,
      ...(stored.stylePreferences ?? {}),
    },
    dilPreferences: {
      ...defaults.dilPreferences,
      ...(stored.dilPreferences ?? {}),
    },
    questionDefaults: {
      ...defaults.questionDefaults,
      ...(stored.questionDefaults ?? {}),
    },
    assessmentDefaults: {
      ...defaults.assessmentDefaults,
      ...(stored.assessmentDefaults ?? {}),
    },
    userId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Save
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert the teacher's profile.  Creates the row on first call.
 */
export async function saveTeacherProfile(
  profile: TeacherProfile
): Promise<void> {
  const now = new Date().toISOString();
  const payload = { ...profile, updatedAt: now };

  const { error } = await supabase.from("teacher_profiles").upsert(
    {
      user_id: profile.userId,
      profile: payload,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[TeacherProfile] save error:", error.message);
    throw new Error(`Failed to save teacher profile: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: load-or-create
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns stored profile or a freshly initialised default (not persisted).
 * Callers that need to guarantee a row exists should call saveTeacherProfile()
 * after calling this if the result was null.
 */
export async function loadOrDefaultTeacherProfile(
  userId: string
): Promise<TeacherProfile> {
  const existing = await loadTeacherProfile(userId);
  return existing ?? makeDefaultProfile(userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pacing feedback — adjusts stored duration defaults from post-assessment signal
// ─────────────────────────────────────────────────────────────────────────────

export type PacingFeedback = "too_long" | "about_right" | "too_short";

/**
 * Adjust the stored pacing default for an assessment type based on teacher
 * feedback.  If `actualMinutes` is supplied it is used as the new target
 * directly (most accurate).  Otherwise a ±20 % multiplier is applied.
 *
 * Returns the updated profile so callers can reflect the new value in UI.
 */
// ─────────────────────────────────────────────────────────────────────────────
// Course-default resolver  (course → global hierarchy)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the effective defaults for a given course name.
 * Looks up a matching CourseProfile first; falls back to global teacher defaults.
 *
 * Optionally pass the current assessmentType selection to derive more accurate
 * time/question-count estimates.
 */
export function resolveCourseDefaults(
  profile: TeacherProfile,
  courseName: string,
  assessmentType?: string,
): ResolvedCourseDefaults {
  const normalised = courseName.trim().toLowerCase();
  const course = profile.courseProfiles?.find(
    (c) => c.courseName.trim().toLowerCase() === normalised
  );

  if (course) {
    const aType = assessmentType ?? course.assessmentTypes[0] ?? "quiz";
    const mergedPacing = {
      assessmentDurationMinutes: {
        ...profile.pacingDefaults.assessmentDurationMinutes,
        ...course.pacingDefaults.assessmentDurationMinutes,
      },
      questionTypeSeconds: {
        ...profile.pacingDefaults.questionTypeSeconds,
        ...course.pacingDefaults.questionTypeSeconds,
      },
    };
    const mins = mergedPacing.assessmentDurationMinutes[aType] ?? 15;
    const primaryQ = course.questionTypes[0] ?? "multipleChoice";
    const avgSec = mergedPacing.questionTypeSeconds[primaryQ] ?? 60;
    const minQ = Math.max(2, Math.floor((mins * 60 * 0.75) / avgSec));
    const maxQ = Math.max(minQ + 1, Math.ceil((mins * 60) / avgSec));

    return {
      level: "course",
      courseName: course.courseName,
      subject: course.subject,
      gradeBand: course.gradeBand,
      standards: course.standards,
      assessmentTypes: course.assessmentTypes,
      questionTypes: course.questionTypes,
      multiPartAllowed: course.multiPartAllowed,
      pacingDefaults: mergedPacing,
      typicalDifficulty: course.typicalDifficulty,
      typicalBloomRange: course.typicalBloomRange,
      stylePreferences: { ...profile.stylePreferences, ...(course.stylePreferences ?? {}) },
      estimatedQuestionRange: { min: minQ, max: maxQ },
      estimatedMinutes: mins,
    };
  }

  // ── Global fallback ────────────────────────────────────────────────────────
  const aType = assessmentType ?? profile.assessmentDefaults.assessmentTypes[0] ?? "quiz";
  const mins = profile.pacingDefaults.assessmentDurationMinutes[aType] ?? 15;
  const primaryQ = profile.questionDefaults.questionTypes[0] ?? "multipleChoice";
  const avgSec  = profile.pacingDefaults.questionTypeSeconds[primaryQ] ?? 60;
  const minQ    = Math.max(2, Math.floor((mins * 60 * 0.75) / avgSec));
  const maxQ    = Math.max(minQ + 1, Math.ceil((mins * 60) / avgSec));

  return {
    level: "global",
    assessmentTypes: profile.assessmentDefaults.assessmentTypes,
    questionTypes: profile.questionDefaults.questionTypes,
    multiPartAllowed: false,
    pacingDefaults: profile.pacingDefaults,
    typicalDifficulty: "standard",
    stylePreferences: profile.stylePreferences,
    estimatedQuestionRange: { min: minQ, max: maxQ },
    estimatedMinutes: mins,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pacing feedback (existing)
// ─────────────────────────────────────────────────────────────────────────────

export async function adjustPacingFromFeedback(
  userId: string,
  assessmentType: string,
  feedback: PacingFeedback,
  actualMinutes?: number
): Promise<TeacherProfile> {
  const profile = await loadOrDefaultTeacherProfile(userId);

  const current =
    profile.pacingDefaults.assessmentDurationMinutes[assessmentType] ?? 15;

  let next: number;
  if (actualMinutes != null && actualMinutes > 0) {
    // Teacher entered the real duration — use it as-is
    next = Math.round(actualMinutes);
  } else {
    const MULTIPLIERS: Record<PacingFeedback, number> = {
      too_long: 0.8,
      about_right: 1.0,
      too_short: 1.2,
    };
    next = Math.max(1, Math.round(current * MULTIPLIERS[feedback]));
  }

  const updated: TeacherProfile = {
    ...profile,
    pacingDefaults: {
      ...profile.pacingDefaults,
      assessmentDurationMinutes: {
        ...profile.pacingDefaults.assessmentDurationMinutes,
        [assessmentType]: next,
      },
    },
    updatedAt: new Date().toISOString(),
  };

  await saveTeacherProfile(updated);
  return updated;
}
