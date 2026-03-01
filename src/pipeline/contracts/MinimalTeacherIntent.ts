export interface MinimalTeacherIntent {
  gradeLevels: string[];
  course: string;
  unitName: string;
  lessonName?: string | null;
  topic: string;
  studentLevel: string;

  assessmentType:
    | "bellRinger"
    | "exitTicket"
    | "quiz"
    | "test"
    | "worksheet"
    | "testReview";

  time: number;

  additionalDetails?: string | null;

  // ── Adaptive fields (populated for structured assessment types) ──────
  /** "mcqOnly" | "saOnly" | "essayOnly" | "frqOnly" | "fitbOnly" | "trueFalseOnly" | "mixed" */
  questionFormat?: string | null;
  /** "lower" | "apply" | "higher" | "balanced" */
  bloomPreference?: string | null;
  /** "single" | "multiple" | "auto" */
  sectionStructure?: string | null;
  /** "commonCore" | "state" | "ap" | "none" */
  standards?: string | null;
  /** State abbreviation when standards === "state", e.g. "GA" */
  stateCode?: string | null;
  /** "yes" | "no" — whether to include multi-part questions (A → B → C) */
  multiPartQuestions?: string | null;

  sourceDocuments?: Array<{
    id: string;
    name: string;
    content: string;
  }>;

  exampleAssessment?: {
    id: string;
    content: string;
  };
}
