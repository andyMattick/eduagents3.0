/**
 * Prompt Engineer Agent
 *
 * Pre-pipeline validation layer that inspects the teacher's conversational
 * intent and flags:
 *   1. Contradictions     – conflicting signals (e.g., 5-minute test with 20 essay questions)
 *   2. Missing info       – fields the pipeline needs but that are empty / vague
 *   3. Time estimate      – rough wall-clock estimate derived from question-type pacing
 *   4. Suggestions        – actionable tips to improve the request
 *
 * This agent is *deterministic* — no LLM calls.  It runs in ≤1 ms and is
 * invoked client-side before the pipeline is dispatched.
 */

import type { ConversationalIntent } from "@/components_new/Pipeline/ConversationalAssessment";

// ── Public result type ────────────────────────────────────────────────────────

export interface PromptEngineerResult {
  /** Hard contradictions the teacher should fix before generating. */
  contradictions: string[];
  /** Fields that are missing or too vague for a quality assessment. */
  missingInfo: string[];
  /** Estimated minutes the finished assessment would take a student. */
  estimatedTimeMinutes: number | null;
  /** Estimated seconds for the pipeline to *create* the assessment. */
  estimatedCreationSeconds: number;
  /** Non-blocking advice to improve quality. */
  suggestions: string[];
  /** true when contradictions is non-empty — caller should block pipeline. */
  shouldBlock: boolean;
}

// ── Pacing constants (minutes per question, by assessment type) ───────────────

const TYPE_PACING: Record<string, { avgMinPerQ: number; minQCount: number; maxQCount: number }> = {
  bellRinger:  { avgMinPerQ: 1.0,  minQCount: 1,  maxQCount: 5  },
  exitTicket:  { avgMinPerQ: 1.5,  minQCount: 1,  maxQCount: 5  },
  quiz:        { avgMinPerQ: 1.5,  minQCount: 5,  maxQCount: 20 },
  test:        { avgMinPerQ: 2.0,  minQCount: 10, maxQCount: 50 },
  worksheet:   { avgMinPerQ: 2.0,  minQCount: 5,  maxQCount: 30 },
  testReview:  { avgMinPerQ: 1.5,  minQCount: 5,  maxQCount: 40 },
};

const DEFAULT_PACING = { avgMinPerQ: 1.5, minQCount: 3, maxQCount: 25 };

// ── Creation-time model ───────────────────────────────────────────────────────
// Empirical constants calibrated against Gemini 2.5 Flash throughput.
// Pipeline stages: Architect → Writer (parallel chunks) → Gatekeeper → Philosopher → Builder.
// Each LLM call ≈ 3-8 s depending on output length; Writer runs N parallel chunks.

/**
 * Base overhead per pipeline run (DB lookups, SCRIBE selection, Architect prompt,
 * Gatekeeper + Philosopher deterministic passes, Builder assembly).
 */
const BASE_CREATION_SECONDS = 12;

/** Seconds per question the Writer needs (parallelised, so sublinear). */
const WRITER_SEC_PER_Q = 1.8;

/** Additional seconds per 500 input characters (longer prompts = more tokens). */
const INPUT_LENGTH_PENALTY_PER_500 = 0.6;

/**
 * Multiplier by assessment type.  Tests and worksheets produce more complex
 * blueprints and richer Writer prompts than bell ringers.
 */
const TYPE_COMPLEXITY: Record<string, number> = {
  bellRinger: 0.7,
  exitTicket: 0.75,
  quiz:       1.0,
  test:       1.35,
  worksheet:  1.2,
  testReview: 1.1,
};
const DEFAULT_COMPLEXITY = 1.0;

// ── Vague-topic detection ─────────────────────────────────────────────────────

const VAGUE_TOPICS = new Set([
  "stuff", "things", "misc", "random", "idk", "whatever", "anything",
  "everything", "general", "review", "test", "quiz",
]);

// ── Core validator ────────────────────────────────────────────────────────────

export function runPromptEngineer(
  intent: ConversationalIntent
): PromptEngineerResult {
  const contradictions: string[] = [];
  const missingInfo: string[] = [];
  const suggestions: string[] = [];
  let estimatedTimeMinutes: number | null = null;

  const pacing = TYPE_PACING[intent.assessmentType] ?? DEFAULT_PACING;
  const timeBudget = intent.time ?? 0;

  // ── 1. Missing info checks ──────────────────────────────────────────────

  if (!intent.course || intent.course.trim().length < 2) {
    missingInfo.push("Course / subject is missing or too short — the pipeline needs this to scope content.");
  }

  if (!intent.topic || intent.topic.trim().length < 3) {
    missingInfo.push("Topic is missing or too brief — add a specific lesson, chapter, or concept.");
  } else if (VAGUE_TOPICS.has(intent.topic.trim().toLowerCase())) {
    missingInfo.push(`"${intent.topic}" is too vague — try a specific concept like "photosynthesis" or "quadratic equations".`);
  }

  if (!intent.gradeLevels?.length || intent.gradeLevels.every(g => !g.trim())) {
    missingInfo.push("Grade level is missing — the pipeline uses it to calibrate vocabulary and Bloom difficulty.");
  }

  if (!timeBudget || timeBudget <= 0) {
    missingInfo.push("Time budget is missing — the Architect needs it to size the assessment.");
  }

  // ── 2. Contradiction checks ─────────────────────────────────────────────

  // 2a. Time vs assessment type
  if (timeBudget > 0) {
    const impliedQCount = Math.round(timeBudget / pacing.avgMinPerQ);
    estimatedTimeMinutes = timeBudget; // teacher set it — echo back as the estimate

    // Tiny time + big assessment type
    if ((intent.assessmentType === "test" || intent.assessmentType === "worksheet") && timeBudget < 10) {
      contradictions.push(
        `A "${intent.assessmentType}" typically needs ≥15 minutes, but you set ${timeBudget} min. ` +
        `That only fits ~${impliedQCount} questions — consider switching to a bell ringer or exit ticket, or increasing the time.`
      );
    }

    // Huge time + tiny assessment type
    if ((intent.assessmentType === "bellRinger" || intent.assessmentType === "exitTicket") && timeBudget > 15) {
      contradictions.push(
        `A "${intent.assessmentType}" is designed for ≤10 minutes, but you set ${timeBudget} min. ` +
        `Consider switching to a quiz or worksheet if you need the extra time.`
      );
    }

    // Extreme question density (< 30 sec per question)
    if (impliedQCount > pacing.maxQCount * 1.5) {
      contradictions.push(
        `${timeBudget} minutes / ${impliedQCount} implied questions = extremely tight pacing. ` +
        `Students may not finish. Consider reducing scope or increasing time.`
      );
    }
  } else {
    // No time budget — estimate from type defaults
    estimatedTimeMinutes = Math.round(
      ((pacing.minQCount + pacing.maxQCount) / 2) * pacing.avgMinPerQ
    );
  }

  // 2b. Student level vs assessment type / time mismatch
  if (intent.studentLevel === "remedial" && intent.assessmentType === "test" && timeBudget > 0 && timeBudget < 20) {
    contradictions.push(
      "Remedial students on a full test with < 20 minutes is very tight. " +
      "Consider increasing time or switching to a quiz."
    );
  }

  if (intent.studentLevel === "AP" && intent.assessmentType === "bellRinger" && timeBudget > 10) {
    suggestions.push(
      "AP-level bell ringers are typically ≤5 minutes — consider a higher-order warm-up problem rather than a long activity."
    );
  }

  // 2c. Multi-grade span
  if (intent.gradeLevels.length > 2) {
    suggestions.push(
      `You selected ${intent.gradeLevels.length} grade levels (${intent.gradeLevels.join(", ")}). ` +
      `Wide grade spans can dilute difficulty targeting — consider generating separate assessments per grade band.`
    );
  }

  // 2d. Grade-level / course sanity
  const gradeNums = intent.gradeLevels
    .map(g => parseInt(g, 10))
    .filter(n => !isNaN(n));
  const courseLower = intent.course.toLowerCase();

  if (gradeNums.some(n => n <= 5) && /\b(calculus|ap\s|physics|chemistry)\b/i.test(courseLower)) {
    contradictions.push(
      `Grade ${intent.gradeLevels.join(",")} with "${intent.course}" looks unusual — ` +
      `double-check the grade level or course name.`
    );
  }

  // 2e. Adaptive field contradictions
  if (intent.bloomPreference === "higher" && intent.studentLevel === "remedial") {
    suggestions.push(
      "Higher-order thinking focus with remedial students can be challenging. " +
      "The pipeline will still generate appropriate items, but expect more scaffolding."
    );
  }

  if (intent.sectionStructure === "multiple" && timeBudget > 0 && timeBudget < 15) {
    contradictions.push(
      `Multiple sections in a ${timeBudget}-minute assessment is tight. ` +
      `Consider a single section or increasing the time to 20+ minutes.`
    );
  }

  if (intent.questionFormat === "saOnly" && intent.assessmentType === "bellRinger") {
    suggestions.push(
      "Short-answer-only bell ringers may take longer to grade. " +
      "Consider mixed format for quicker turnaround."
    );
  }

  if (intent.standards === "ap" && intent.studentLevel !== "AP") {
    contradictions.push(
      `AP framework alignment with "${intent.studentLevel}" level students may produce ` +
      `items that are too difficult. Consider switching to "AP / Advanced" student level.`
    );
  }

  // ── 3. Suggestions ─────────────────────────────────────────────────────

  if (!intent.additionalDetails?.trim()) {
    suggestions.push(
      "Adding specific instructions (e.g., 'include vocabulary', 'focus on application') " +
      "helps the Writer produce a more targeted assessment."
    );
  }

  if (intent.assessmentType === "test" && timeBudget && timeBudget >= 30 && !intent.additionalDetails?.toLowerCase().includes("section")) {
    suggestions.push(
      "For longer tests, consider mentioning section preferences " +
      "(e.g., 'Section 1: MCQ, Section 2: Short Answer') in additional details."
    );
  }

  // ── 4. Estimate creation time ──────────────────────────────────────────

  const impliedQuestions = timeBudget > 0
    ? Math.round(timeBudget / pacing.avgMinPerQ)
    : Math.round((pacing.minQCount + pacing.maxQCount) / 2);

  // Proxy for total input token size: topic + course + additional details
  const inputChars =
    (intent.course?.length ?? 0) +
    (intent.topic?.length ?? 0) +
    (intent.additionalDetails?.length ?? 0);

  const complexity = TYPE_COMPLEXITY[intent.assessmentType] ?? DEFAULT_COMPLEXITY;
  const inputPenalty = Math.floor(inputChars / 500) * INPUT_LENGTH_PENALTY_PER_500;

  const estimatedCreationSeconds = Math.round(
    (BASE_CREATION_SECONDS + (impliedQuestions * WRITER_SEC_PER_Q) + inputPenalty) * complexity
  );

  return {
    contradictions,
    missingInfo,
    estimatedTimeMinutes,
    estimatedCreationSeconds,
    suggestions,
    shouldBlock: contradictions.length > 0,
  };
}
