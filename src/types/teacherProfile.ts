/**
 * teacherProfile.ts
 *
 * Persistent teacher defaults used as a constraint-injection layer throughout
 * the Architect → Feasibility → Writer → Gatekeeper pipeline.
 *
 * This is NOT a new agent or workflow. It is a profile that seeds sensible
 * defaults into the UAR so teachers answer fewer questions per generation.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary types
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionType =
  | "multipleChoice"
  | "shortAnswer"
  | "freeResponse"
  | "passageBased"
  | "trueFalse"
  | "fillInTheBlank"
  | "matching"
  | "ordering"
  | "constructedResponse"
  | "arithmeticFluency"
  | "graphInterpretation"
  | "essay";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-profiles
// ─────────────────────────────────────────────────────────────────────────────

/** Which subjects and grade bands this teacher covers. */
export interface SubjectProfile {
  subject: string;
  gradeBands: string[];   // e.g. ["6", "7", "8"]
  courses: string[];      // e.g. ["Algebra I", "Pre-Algebra"]
}

/** Default assessment types when teacher doesn't specify one. */
export interface AssessmentTypeDefaults {
  /** Ordered preference list — index 0 is the primary default. */
  assessmentTypes: string[];
}

/** Default question type mix. */
export interface QuestionTypeDefaults {
  /** Ordered preference list — used when teacher doesn't specify types. */
  questionTypes: QuestionType[];
}

/**
 * Per-type timing defaults (seconds).
 * Used by the Architect to derive questionCount from duration,
 * and by Feasibility to compute realistic load ratios.
 */
export interface PacingDefaults {
  /** Expected total minutes per assessment type. */
  assessmentDurationMinutes: Record<string, number>;
  /** Expected seconds per question type. */
  questionTypeSeconds: Record<string, number>;
}

/** Writing style and tone preferences applied to every generation. */
export interface StylePreferences {
  /** Overall voice of generated questions. */
  tone: "formal" | "conversational";
  /** Vocabulary register. */
  languageLevel: "academic" | "studentFriendly";
  /** How long instructions / stems should be. */
  instructionLength: "short" | "detailed";
  /** Scenario framing preference. */
  contextPreference: "realWorld" | "abstract" | "mixed";
}

/** Document-in-loop (DIL) — controls how uploaded source docs are treated. */
export interface DILPreferences {
  /** Automatically summarise uploaded documents before generation. */
  autoSummarize: boolean;
  /** Require teacher to confirm the summary before proceeding. */
  requireSummaryConfirmation: boolean;
  /** Extract key vocabulary from source docs automatically. */
  autoExtractVocabulary: boolean;
  /** Extract question-worthy angles from source docs automatically. */
  autoExtractAngles: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root profile
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Course-level profile  (strongest level in the three-tier hierarchy)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full defaults stored for a single course (e.g. "AP Statistics", "Algebra 1").
 * These override subject-level and global defaults when that course is active.
 */
export interface CourseProfile {
  /** Display name exactly as the teacher types it, e.g. "AP Statistics". */
  courseName: string;
  /** Parent subject, e.g. "Math" or "English". */
  subject: string;
  /** Grade band label, e.g. "AP", "9", "6–8". */
  gradeBand: string;
  /** Standards label, e.g. "AP Statistics" or "Common Core Algebra 1". */
  standards?: string;
  /** Preferred assessment types for this course in priority order. */
  assessmentTypes: string[];
  /** Preferred question types for this course in priority order. */
  questionTypes: QuestionType[];
  /** Whether multi-part questions are expected in this course. */
  multiPartAllowed: boolean;
  /** Course-level pacing (merged over global defaults by the resolver). */
  pacingDefaults: PacingDefaults;
  /** Typical difficulty / rigor level. */
  typicalDifficulty: "remedial" | "standard" | "honors" | "AP";
  /** Human-readable Bloom range, e.g. "Apply – Analyze". */
  typicalBloomRange?: string;
  /** Style overrides specific to this course. */
  stylePreferences?: Partial<StylePreferences>;
}

/**
 * The fully-resolved defaults for a given course/context,
 * after merging course → global hierarchy.
 * Passed into ConversationalAssessment to pre-fill the defaults card.
 */
export interface ResolvedCourseDefaults {
  /** Where these defaults came from. */
  level: "course" | "global";
  courseName?: string;
  subject?: string;
  gradeBand?: string;
  standards?: string;
  assessmentTypes: string[];
  questionTypes: QuestionType[];
  multiPartAllowed: boolean;
  pacingDefaults: PacingDefaults;
  typicalDifficulty: string;
  typicalBloomRange?: string;
  stylePreferences: StylePreferences;
  /** Derived min/max question count for the primary assessment type. */
  estimatedQuestionRange: { min: number; max: number };
  /** Derived estimated minutes for the primary assessment type. */
  estimatedMinutes: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root profile
// ─────────────────────────────────────────────────────────────────────────────

export interface TeacherProfile {
  userId: string;
  subjects: SubjectProfile[];
  /** Per-course profiles — course-level defaults (strongest tier). */
  courseProfiles?: CourseProfile[];
  assessmentDefaults: AssessmentTypeDefaults;
  questionDefaults: QuestionTypeDefaults;
  pacingDefaults: PacingDefaults;
  stylePreferences: StylePreferences;
  dilPreferences: DILPreferences;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory — safe fallback when no profile exists yet
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PACING_SECONDS: Record<string, number> = {
  multipleChoice: 60,
  trueFalse: 30,
  shortAnswer: 150,
  constructedResponse: 240,
  freeResponse: 600,
  essay: 600,
  fillInTheBlank: 75,
  matching: 75,
  ordering: 90,
  arithmeticFluency: 25,
  passageBased: 180,
  graphInterpretation: 90,
};

export function makeDefaultProfile(userId: string): TeacherProfile {
  const now = new Date().toISOString();
  return {
    userId,
    subjects: [],
    assessmentDefaults: {
      assessmentTypes: ["quiz", "exitTicket", "test"],
    },
    questionDefaults: {
      questionTypes: ["multipleChoice", "shortAnswer"],
    },
    pacingDefaults: {
      assessmentDurationMinutes: {
        bellRinger: 5,
        exitTicket: 5,
        quiz: 15,
        test: 45,
        worksheet: 20,
        testReview: 30,
      },
      questionTypeSeconds: { ...DEFAULT_PACING_SECONDS },
    },
    stylePreferences: {
      tone: "formal",
      languageLevel: "studentFriendly",
      instructionLength: "short",
      contextPreference: "mixed",
    },
    dilPreferences: {
      autoSummarize: true,
      requireSummaryConfirmation: false,
      autoExtractVocabulary: true,
      autoExtractAngles: true,
    },
    createdAt: now,
    updatedAt: now,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Conflict Resolution types
// ─────────────────────────────────────────────────────────────────────────────

export type ConflictResolutionOption = "updateDefault" | "useOnce" | "cancel";

export interface PacingConflict {
  type: "pacingConflict";
  /** Minimum minutes required to fit the requested question count. */
  requiredMinutes: number;
  /** Default assessment duration from the teacher's profile. */
  defaultMinutes: number;
  /** Human-readable description for the UI dialog. */
  message: string;
  /** Resolution choices to present to the teacher. */
  options: ConflictResolutionOption[];
}
