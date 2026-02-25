export interface UnifiedAssessmentRequest {
  subscriptionTier: "free" | "tier1" | "tier2" | "admin";
  mode: "write" | "compare" | "playtest";

  // Teacher context
  userId: string;
  gradeLevels: string[];
  course: string;
  unitName: string;
  lessonName: string | null;
  topic: string;

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
  topic: string;
  unitName: string;
  lessonName: string | null;

  // Time context
  timeMinutes: number;

  // Additional teacher notes
  additionalDetails: string | null;
}

export function buildArchitectUAR(uar: UnifiedAssessmentRequest): ArchitectUAR {
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


    // Question count (infer from time if missing)
    questionCount:
      uar.questionCount ??
      inferQuestionCountFromTime(uar.time),

    // Content context
    topic: uar.topic,
    unitName: uar.unitName,
    lessonName: uar.lessonName,

    // Student context
    studentLevel: uar.studentLevel as "remedial" | "standard" | "honors" | "ap",
    // Time context
    timeMinutes: uar.time,

    // Additional notes
    additionalDetails: uar.additionalDetails,
  };
}

function inferQuestionCountFromTime(time: number): number {
  if (time <= 10) return 3;
  if (time <= 20) return 5;
  if (time <= 30) return 7;
  return 10;
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
