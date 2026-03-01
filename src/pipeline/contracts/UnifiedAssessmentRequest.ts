export interface UnifiedAssessmentRequest {
  subscriptionTier: "free" | "tier1" | "tier2" | "admin";
  mode: "write" | "compare" | "playtest";

  // Teacher context
  userId: string;
  gradeLevels: string[];
  course: string;
  unitName: string;
  lessonName: string | null;
  topic: string | null;

  // Assessment context
  assessmentType:
    | "bellRinger"
    | "exitTicket"
    | "quiz"
    | "test"
    | "worksheet"
    | "testReview";

  studentLevel: string;
  time: number;

  // Optional question planning
  questionTypes?: string[];
  questionCount?: number;

  // Optional teacher preferences (merged from predictive defaults)
  difficultyPreference?: string;
  orderingStrategy?: string;
  pacingSecondsPerItem?: number;
  guardrails?: Record<string, any>;

  // Additional teacher notes
  additionalDetails: string | null;

  // Versioned storage — passed from UI when regenerating or branching
  templateId?: string | null;
  previousVersionId?: string | null;

  // ── Adaptive fields from conversational flow ──────────────────────
  questionFormat?: string | null;
  bloomPreference?: string | null;
  sectionStructure?: string | null;
  standards?: string | null;
  /** State abbreviation when standards === "state", e.g. "GA" */
  stateCode?: string | null;
  /** "yes" | "no" — include multi-part questions where parts chain: A → B → C */
  multiPartQuestions?: string | null;

  /**
   * Display format for mathematical notation in generated questions.
   * "unicode" (default) — √(x + 7), x², (4x − 5)/(x + 2)
   * "plain"             — sqrt(x + 7), x^2, (4x - 5)/(x + 2)
   * "latex"             — \\sqrt{x + 7}, x^{2}, \\frac{4x-5}{x+2}
   */
  mathFormat?: "unicode" | "plain" | "latex";

  // Optional teacher-provided materials
  sourceDocuments: Array<{
    id: string;
    name: string;
    content: string;
  }>;

  exampleAssessment?: {
    id: string;
    content: string;
  };
}

export interface ArchitectUAR {
  version: "3.2";

  // Core context Architect needs
  domain: string;              // derived from course
  grade: string;               // derived from gradeLevels[0]
  assessmentType: string;      // same as UAR.assessmentType

  // Question planning
  questionTypes: string[];     // defaulted if missing
  questionCount: number;       // inferred from time if missing

  studentLevel: "remedial" | "standard" | "honors" | "ap";

  // Content context
  topic: string | null;
  unitName: string;
  lessonName: string | null;

  // Time context
  timeMinutes: number;

  // Additional teacher notes
  additionalDetails: string | null;
}

export function buildArchitectUAR(uar: UnifiedAssessmentRequest): ArchitectUAR {
  // Enrich additionalDetails with adaptive fields so the Architect prompt sees them
  const detailParts: string[] = [];
  if (uar.additionalDetails) detailParts.push(uar.additionalDetails);
  if (uar.bloomPreference && uar.bloomPreference !== "balanced") {
    const bloomDescriptions: Record<string, string> = {
      lower:  "Focus on Remember and Understand (recall-heavy).",
      apply:  "Emphasize Application-level questions.",
      higher: "Prioritize Analyze, Evaluate, and Create (higher-order thinking).",
    };
    detailParts.push(`Bloom preference: ${bloomDescriptions[uar.bloomPreference] ?? uar.bloomPreference}`);
  }
  if (uar.sectionStructure === "multiple") {
    detailParts.push("Structure the assessment in multiple sections (e.g., Section 1: MCQ, Section 2: Short Answer).");
  }
  if (uar.standards && uar.standards !== "none") {
    const stdLabels: Record<string, string> = {
      commonCore: "Align items to Common Core standards where applicable.",
      state: uar.stateCode
        ? `Align items to ${uar.stateCode.toUpperCase()} state standards.`
        : "Align items to state standards where applicable.",
      ap: "Align items to the AP framework.",
    };
    detailParts.push(stdLabels[uar.standards] ?? `Standards: ${uar.standards}`);
  }
  if (uar.multiPartQuestions === "yes") {
    detailParts.push(
      "Include multi-part questions where each part depends on the previous " +
      "(e.g., Part A gives context, Part B requires applying that result, Part C extends further). " +
      "Label them Part A, Part B, Part C."
    );
  }
  const enrichedDetails = detailParts.length > 0 ? detailParts.join(" ") : null;

  return {
    version: "3.2",

    // Domain + grade inference
    domain: uar.course,
    grade: uar.gradeLevels?.[0] ?? "Unknown",

    // Assessment type
    assessmentType: uar.assessmentType,

    // Question types (fallback if teacher didn't specify)
    questionTypes: uar.questionTypes?.length
      ? uar.questionTypes
      : defaultQuestionTypes(uar.assessmentType),


    // Question count (infer from time + question type mix if missing)
    questionCount:
      uar.questionCount ??
      inferQuestionCount(
        uar.time,
        uar.questionTypes?.length ? uar.questionTypes : defaultQuestionTypes(uar.assessmentType)
      ),

    // Content context
    topic: uar.topic,
    unitName: uar.unitName,
    lessonName: uar.lessonName,

    // Student context
    studentLevel: uar.studentLevel as "remedial" | "standard" | "honors" | "ap",
    // Time context
    timeMinutes: uar.time,

    // Additional notes (enriched with adaptive fields)
    additionalDetails: enrichedDetails,
  };
}

/** Minutes a student typically spends on each question type. */
const PACING_MINUTES: Record<string, number> = {
  multipleChoice:       1.0,
  trueFalse:            0.5,
  matching:             0.75,
  shortAnswer:          2.5,
  constructedResponse:  6.0,
  essay:                10.0,
  fillInTheBlank:       1.5,
};
const DEFAULT_PACING = 2.0; // fallback for unknown types

/**
 * Infer question count from available time and the mix of question types.
 * Computes a weighted-average minutes-per-question from the type list, then
 * divides total time by that average.
 */
export function inferQuestionCount(time: number, questionTypes: string[]): number {
  const types = questionTypes.length > 0 ? questionTypes : ["multipleChoice", "shortAnswer"];
  const avgPacing =
    types.reduce((sum, t) => sum + (PACING_MINUTES[t] ?? DEFAULT_PACING), 0) / types.length;
  return Math.max(1, Math.round(time / avgPacing));
}


function defaultQuestionTypes(assessmentType: string): string[] {
  switch (assessmentType) {
    case "exitTicket":
      return ["shortAnswer", "multipleChoice"];
    case "bellRinger":
      return ["shortAnswer"];
    case "worksheet":
      return ["multipleChoice", "shortAnswer", "constructedResponse"];
    case "test":
      return ["multipleChoice", "shortAnswer", "constructedResponse"];
    default:
      return ["multipleChoice", "shortAnswer"];
  }
}
