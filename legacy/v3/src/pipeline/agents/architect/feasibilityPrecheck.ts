/**
 * feasibilityPrecheck.ts
 *
 * Lightweight pre-generation feasibility check that can be called from
 * the front-end (PromptEngineerPanel flow) WITHOUT running the full Architect.
 *
 * Uses the same evaluateFeasibility() algorithm as the Architect, but derives
 * the required inputs from a ConversationalIntent directly — no LLM calls,
 * pure deterministic computation (~0ms).
 *
 * This gives teachers a warning BEFORE they click "Generate" rather than
 * discovering the auto-adjustment post-generation.
 */

import { evaluateFeasibility, type FeasibilityReport } from "./feasibility";
import { resolveRigorProfile } from "./rigorProfile";
import { inferQuestionCount } from "pipeline/contracts/UnifiedAssessmentRequest";

// ── Minimal input shape (matches ConversationalIntent fields) ────────────────

export interface FeasibilityPrecheckInput {
  topic: string;
  additionalDetails?: string | null;
  assessmentType: string;
  studentLevel: string;
  /** Minutes available for assessment (teacher-entered). */
  timeMinutes: number;
  /** Teacher's selected question format ("mcqOnly" | "saOnly" | "mixed" | "auto" | null). */
  questionFormat?: string | null;
  /** Teacher's Bloom preference ("lower" | "apply" | "higher" | "balanced" | null). */
  bloomPreference?: string | null;
  /** Grade levels from the form — used for grade-text plausibility check. */
  gradeLevels?: string[];
}

// ── Grade-text plausibility ───────────────────────────────────────────────────
// Canonical complex/mature texts that are typically studied at secondary level.
// Mirrors the COMPLEX_TEXTS array in architect/index.ts.

const COMPLEX_TEXTS = [
  "frankenstein", "1984", "lord of the flies", "macbeth", "hamlet",
  "romeo and juliet", "the great gatsby", "to kill a mockingbird",
  "animal farm", "brave new world", "the crucible", "the odyssey",
  "the iliad", "beowulf", "heart of darkness", "crime and punishment",
  "war and peace", "les misérables", "moby dick", "dracula",
  "of mice and men", "the scarlet letter", "fahrenheit 451",
  "a tale of two cities", "jane eyre", "wuthering heights",
  "pride and prejudice", "the catcher in the rye", "slaughterhouse-five",
  "beloved", "invisible man", "their eyes were watching god",
  "the handmaid's tale", "things fall apart", "an inspector calls",
];

function checkGradeTextPlausibility(
  input: FeasibilityPrecheckInput
): string | null {
  if (!input.gradeLevels?.length) return null;

  // Parse lowest numeric grade in the selection
  const nums = input.gradeLevels
    .map((g) => parseInt(g.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  if (!nums.length) return null;
  const lowestGrade = Math.min(...nums);

  // Only flag for elementary / primary audience (≤ 6)
  if (lowestGrade > 6) return null;

  const searchText = [
    input.topic ?? "",
    input.additionalDetails ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const matchedText = COMPLEX_TEXTS.find((t) => searchText.includes(t));
  if (!matchedText) return null;

  return (
    `Grade–text plausibility: "${matchedText}" is typically studied at the ` +
    `secondary level. This assessment targets grade ${lowestGrade}. ` +
    `The literary work may exceed typical reading level and content ` +
    `appropriateness for this age group. Confirm intent?`
  );
}

// ── Question type derivation (mirrors architect/UnifiedAssessmentRequest) ────

function deriveQuestionTypes(input: FeasibilityPrecheckInput): string[] {
  const fmt = input.questionFormat;

  if (fmt === "mcqOnly")  return ["multipleChoice"];
  if (fmt === "saOnly")   return ["shortAnswer"];
  if (fmt === "mixed")    return ["multipleChoice", "shortAnswer"];

  // Auto / null — fallback per assessment type
  switch (input.assessmentType) {
    case "bellRinger":    return ["shortAnswer"];
    case "exitTicket":    return ["shortAnswer", "multipleChoice"];
    case "worksheet":     return ["multipleChoice", "shortAnswer", "constructedResponse"];
    case "test":          return ["multipleChoice", "shortAnswer", "constructedResponse"];
    case "quiz":          return ["multipleChoice", "shortAnswer"];
    case "testReview":    return ["multipleChoice", "shortAnswer"];
    default:              return ["multipleChoice", "shortAnswer"];
  }
}

// ── Bloom preference → ceiling override ──────────────────────────────────────

function bloomPrefToCeiling(pref: string | null | undefined): string | null {
  if (pref === "higher")  return "evaluate";
  if (pref === "apply")   return "apply";
  if (pref === "lower")   return "understand";
  return null; // "balanced" or undefined → let rigorProfile decide
}

// ── Main precheck ─────────────────────────────────────────────────────────────

/**
 * Run a deterministic feasibility precheck before generation.
 * Returns a FeasibilityReport with risk level, warnings, and recommended range.
 */
export function runFeasibilityPrecheck(
  input: FeasibilityPrecheckInput
): FeasibilityReport {
  const questionTypes = deriveQuestionTypes(input);

  // Rigor profile — pure deterministic, no LLM needed
  const bloomOverrideCeiling = bloomPrefToCeiling(input.bloomPreference);
  const rigorProfile = resolveRigorProfile({
    studentLevel: (input.studentLevel ?? "standard") as
      "remedial" | "standard" | "honors" | "ap",
    assessmentType: input.assessmentType,
    timeMinutes: input.timeMinutes,
    derivedStructuralConstraints: bloomOverrideCeiling
      ? { raiseBloomCeiling: undefined, capBloomAt: undefined }
      : undefined,
  });

  // Apply an explicit "higher" bloom preference as a ceiling lift
  const depthCeiling = bloomOverrideCeiling ?? rigorProfile.depthCeiling;

  // Infer question count the same way the Architect would
  const requestedSlotCount = inferQuestionCount(input.timeMinutes, questionTypes);

  const report = evaluateFeasibility({
    topic: input.topic,
    additionalDetails: input.additionalDetails ?? null,
    sourceDocuments: null,
    requestedSlotCount,
    questionTypes,
    depthFloor: rigorProfile.depthFloor,
    depthCeiling,
  });

  // Grade-text plausibility — blocks generation, requires explicit confirmation.
  report.gradeTextWarning = checkGradeTextPlausibility(input);

  return report;
}
