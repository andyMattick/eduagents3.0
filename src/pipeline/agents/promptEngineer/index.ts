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

// ── Complex/canonical literary works (mirrors feasibilityPrecheck.ts) ─────────
// Used to detect cross-domain requests: literary text in a non-ELA course.

const COMPLEX_TEXTS_PE = [
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

/**
 * Signals that a course is *not* ELA / English / Literature.
 * If a canonical literary text appears in the topic/details but the course
 * matches one of these, that's a cross-domain contradiction.
 */
const NON_ELA_COURSE_SIGNALS = [
  "science", "math", "mathematics", "algebra", "geometry", "calculus",
  "biology", "chemistry", "physics", "history", "geography",
  "social studies", "social science", "health", "pe",
  "physical education", "art", "music", "technology", "coding",
  "computer", "economics", "psychology", "sociology", "earth science",
  "environmental", "astronomy",
];

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

    // NOTE: Assessment type vs. time contradictions removed.
    // The QuestionMixPreview on the conversation screen now shows actual timing
    // breakdown and lets teachers adjust before generation. Removed:
    // - "Tiny time + big assessment type" check
    // - "Huge time + tiny assessment type" check
    // - "Extreme question density" check
  } else {
    // No time budget — estimate from type defaults
    estimatedTimeMinutes = Math.round(
      ((pacing.minQCount + pacing.maxQCount) / 2) * pacing.avgMinPerQ
    );
  }

  // 2b. Student level vs assessment type / time mismatch
  // Removed "remedial on test < 20 min" check — teacher has already reviewed timing in mix preview

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

  // 2e-i. Cross-domain literary text check
  // A canonical literary work in topic/details + a clearly non-ELA course is
  // almost always a confused or broken prompt.  Flag it as a contradiction so
  // the teacher is stopped before a useless assessment is generated.
  {
    const topicSearchText = [
      intent.topic ?? "",
      intent.additionalDetails ?? "",
    ].join(" ").toLowerCase();

    const matchedTitle = COMPLEX_TEXTS_PE.find(t => topicSearchText.includes(t));
    const isNonElaCourse = NON_ELA_COURSE_SIGNALS.some(sig =>
      courseLower.includes(sig)
    );

    if (matchedTitle && isNonElaCourse) {
      contradictions.push(
        `Your topic references "${matchedTitle}" — a literary work — but your course ` +
        `("${intent.course}") doesn't appear to be ELA or English. ` +
        `If this is a cross-curricular assessment, clarify in Additional Details how the ` +
        `text connects to the course content. If it's a reading activity, update the course name.`
      );
    }

    // 2e-ii. Chapter reference without a clear source
    // "Chapter X" or "chapters X and Y" in details when the course is non-ELA
    // suggests the teacher may have confused which materials to use.
    const hasChapterRef = /\bchapter[s]?\s*\d/i.test(topicSearchText);
    if (hasChapterRef && isNonElaCourse && !matchedTitle) {
      // Only flag if there's no identifiable title — if there IS a title,
      // the cross-domain check above already covers it.
      missingInfo.push(
        `Your additional details reference a specific chapter, but it's not clear ` +
        `which book or textbook this refers to. Name the source explicitly so the ` +
        `AI knows what content to draw from.`
      );
    }
  }

  // 2e. Adaptive field contradictions
  if (intent.bloomPreference === "higher" && intent.studentLevel === "remedial") {
    suggestions.push(
      "Higher-order thinking focus with remedial students can be challenging. " +
      "The pipeline will still generate appropriate items, but expect more scaffolding."
    );
  }

  // Removed "multiple sections in tight time" check — teacher has reviewed timing in mix preview

  if (
    ["saOnly", "essayOnly", "frqOnly"].includes(intent.questionFormat ?? "") &&
    intent.assessmentType === "bellRinger"
  ) {
    suggestions.push(
      "Open-response bell ringers may take longer to grade. " +
      "Consider mixed format or MCQ for quicker turnaround."
    );
  }

  if (
    intent.bloomPreference === "lower" &&
    intent.additionalDetails?.toLowerCase().includes("rigorous")
  ) {
    suggestions.push(
      '"Lower-order" Bloom focus conflicts with "rigorous" in your notes. ' +
      'Consider switching to a balanced or higher-order Bloom preference if rigor is the goal.'
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

  // 2f. High question count + thin additional details → redundancy risk
  {
    const impliedQ = timeBudget > 0
      ? Math.round(timeBudget / pacing.avgMinPerQ)
      : Math.round((pacing.minQCount + pacing.maxQCount) / 2);
    const detailsLen = intent.additionalDetails?.trim().length ?? 0;
    if (impliedQ > 10 && detailsLen < 40) {
      missingInfo.push(
        `With ~${impliedQ} questions and no specific instructions, the AI may generate ` +
        `repetitive or overlapping content. Add specific sub-topics, key vocabulary, events, ` +
        `or concepts you want each question to cover in the Additional Details field.`
      );
    }
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
