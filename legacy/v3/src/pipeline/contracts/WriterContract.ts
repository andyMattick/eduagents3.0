/**
 * WriterContract.ts
 *
 * The durable, evolving contract that governs every Writer call.
 *
 * Created by the Architect stage; updated by the Gatekeeper, Rewriter,
 * teacher revision, and student performance responses.  Every pipeline
 * stage reads from — and writes to — this single source of truth.
 *
 * Solves four concrete problems:
 *   1. Question-type collapse → explicit per-slot type distribution
 *   2. Repeated questions    → per-slot topic angles
 *   3. JSON errors in revise → accumulated json-safety prescriptions
 *   4. Invisible prescriptions → finalWriterGuidelines exposed in the UI
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core contract shape
// ─────────────────────────────────────────────────────────────────────────────

export interface WriterContract {
  /** Unique run identifier (userId + timestamp). */
  id: string;
  createdAt: string;
  updatedAt: string;

  // ── 1. Teacher intent ─────────────────────────────────────────────────────
  teacherIntent: {
    course: string;
    topic: string;
    grade: string;
    timeMinutes: number;
    questionCount: number;
    questionTypes: string[];
    assessmentType: string;
    additionalDetails?: string | null;
  };

  // ── 2. System-derived constraints (set by Architect) ──────────────────────
  systemConstraints: {
    bloomFloor: string;
    bloomCeiling: string;
    difficultyProfile: string;
    slotCount: number;
    pacingSecondsPerItem: number;
    mathFormat: string;
    uniquenessRequired: boolean;
    jsonSafety: boolean;
    /** How many slots of each questionType the blueprint allocated. */
    questionTypeDistribution: Record<string, number>;
    /** True when the constraint engine activated preferMultipleChoice. */
    preferMultipleChoiceActivated: boolean;
    /**
     * One unique scenario angle per slot, in slot order.
     * Injected into the chunk prompt as a diversification hint.
     */
    topicAngles: string[];
  };

  // ── 2b. Teacher style constraints (injected from TeacherProfile) ──────────
  /**
   * When present, Writer must honour these constraints in every generated item.
   * Sourced from the teacher's stored profile stylePreferences.
   */
  styleConstraints?: {
    /** "formal" | "conversational" */
    tone: string;
    /** "academic" | "studentFriendly" */
    languageLevel: string;
    /** "short" | "detailed" */
    instructionLength: string;
    /** "realWorld" | "abstract" | "mixed" */
    contextPreference: string;
  } | null;

  // ── 3. Gatekeeper-added prescriptions ─────────────────────────────────────
  gatekeeperPrescriptions: {
    /** Violation type strings seen across all runs. */
    violations: string[];
    /** Plain-English constraints added because of those violations. */
    addedConstraints: string[];
  };

  // ── 4. Teacher revision overrides ─────────────────────────────────────────
  revisionHistory: Array<{
    timestamp: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
    reason: "teacherOverride" | "gatekeeperFix" | "jsonRepair" | "studentPerformance";
  }>;

  // ── 5. Student-performance adjustments ────────────────────────────────────
  studentPerformanceAdjustments: Array<{
    timestamp: string;
    correct: number;
    incorrect: number;
    misconceptions?: string[];
    adjustments: string[];
  }>;

  /**
   * The complete, human-readable list of guidelines that was passed to the
   * Writer for the most recent generation.  Shown verbatim in the UI.
   */
  finalWriterGuidelines: string[];
}
