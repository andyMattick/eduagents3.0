export interface MinimalTeacherIntent {
  gradeLevels: string[];
  course: string;
  unit: string;
  studentLevel: string;
  unitName: string;
  lessonName: string;
  topic: string;


  assessmentType: "bellRinger" | "exitTicket" | "quiz" | "test" | "worksheet" | "testReview";

  time: number;

  additionalDetails?: string;

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

//
// --- Unified Assessment Request ---
//
export interface UnifiedAssessmentRequest {
  //
  // Core teacher inputs
  //
  
  title: string;            // e.g., "Algebra I – Linear Functions"
  gradeLevels?: string[];      // e.g., "Grade 8", "Advanced"
  subject?: string;         // e.g., "Algebra I"

  //
  // Assessment type + time (required)
  //
  assessmentType:
    | "bellRinger"
    | "exitTicket"
    | "quiz"
    | "test"
    | "worksheet"
    | "testReview";

  time: number;             // minutes

  //
  // Source materials (optional)
  //
  sourceDocuments?: Array<{
    id: string;
    name: string;
    content: string;
  }>;

  exampleAssessment?: {
    id: string;
    content: string;
  };

  //
  // Problem generation parameters
  //
  numProblems: number;

  difficultyProfile?: {
    target: number;   // 0–1 difficulty target
    spread?: number;  // 0–1 variability
  };

  focusAreas?: string[];
  emphasis?: string[];
  classroomContext?: string;
  notesForWriter?: string;

  //
  // Rubric alignment (optional)
  //
  rubricGoals?: string[];

  //
  // Student modeling (optional)
  //
  studentProfiles?: Array<{
    studentId: string;
    readingLevel: number;          // 0–1
    mathLevel: number;             // 0–1
    stamina: number;               // 0–1
    reasoning: number;             // 0–1
    confusionTolerance: number;    // 0–1
  }>;

  //
  // Advanced options
  //
  allowAIEnhancements?: boolean;
  preserveTeacherStyle?: boolean;

  //
  // Versioning + student interaction
  //
  pipelineVersion?: string;
  studentInteraction?: StudentInteraction[];
}


export interface ProblemEmbedding {
  problemId: string;
  vector: number[]; // multidimensional embedding
}

export interface ClusterSummary {
  clusterId: string;
  misconceptionLabels: string[];
  problemIds: string[];
}


export interface StudentTraversalStep {
  problemId: string;
  estimatedCorrectRate: number;   // 0–1
  estimatedTime: number;          // seconds
  cognitiveLoad: number;          // 0–1
  likelyMisconceptions: string[];
  fatigueRisk: "low" | "medium" | "high";
  confusionRisk: "low" | "medium" | "high";
}

export interface StudentTraversal {
  studentId: string;
  path: StudentTraversalStep[];
}

export interface BlueprintViolation {
  problemId: string;
  violation: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface StudentInteraction {
  studentId: string;
  problemId: string;
  estimatedCorrectRate: number;
  estimatedTime: number;
  cognitiveLoad: number;
  likelyMisconceptions: string[];
  fatigueRisk: "low" | "medium" | "high";
  confusionRisk: "low" | "medium" | "high";
}




export interface AstronomerResult {
  problemEmbeddings: ProblemEmbedding[];
  clusters: ClusterSummary[];
  studentTraversal: StudentTraversal[];
  studentInteraction: StudentInteraction[];
  culpritProblems: string[];
  blueprintViolations: BlueprintViolation[];
  notes: string[];
}





export interface PhilosopherIssue {
  id: string;
  problemId?: string;
  severity: "low" | "medium" | "high" | "critical";
  category:
    | "difficulty-mismatch"
    | "bloom-mismatch"
    | "misconception-risk"
    | "pacing-issue"
    | "blueprint-violation"
    | "rubric-misalignment"
    | "fairness-concern"
    | "clarity-issue";
  summary: string;
  details: string;
  suggestedFix?: string;
}

export interface PhilosopherDecision {
  status: "complete" | "rewrite-required";
  culpritProblems: string[];
  globalSeverity: "low" | "medium" | "high" | "critical";
}

export interface PhilosopherReport {
  decision: PhilosopherDecision;
  issues: PhilosopherIssue[];
  teacherSummary: string;
  blueprintNotes?: string[];
}


export interface WriterBlueprint {
  bloomDistribution: Array<{
    level: string;
    count: number;
  }>;

  difficultyCurve: Array<{
    problemIndex: number;
    targetDifficulty: number;
  }>;

  misconceptionAvoidance: string[];

  rubricAlignment: string[];

  problemTypes: Array<{
    type: string;
    count: number;
  }>;

  pacing: {
    estimatedMinutes: number;
    perProblem: number[];
  };

  formattingRules: {
    numberingStyle: "1." | "1)" | "Q1";
    explanationStyle: "concise" | "detailed";
    optionStyle: "A/B/C/D" | "1/2/3/4";
  };

  referenceTestInsights?: {
    bloomDistribution: any;
    difficultyCurve: any;
    structureNotes: string[];
  };
}
//
// --- Minimal teacher-facing request ---
//

export interface UnifiedAssessmentResponse {
  //
  // --- Writer Core Output ---
  //
  writerBlueprint?: WriterBlueprint;   // <-- NEW
  writerDraft: WriterDraft; 
  astronomerReport: AstronomerReport;

  documentSummary: DocumentSummary;
  problemPayload: ProblemPayload[];
  studentProfiles: StudentProfile[];
  studentTesters: StudentTester[];
  finalDocument: GeneratedAssessment;
  answerKey: AnswerKey;

  cognitiveTraces: CognitiveTrace[];
  difficultyEstimates: DifficultyEstimate[];
  misconceptionClusters: MisconceptionCluster[];
  timeEstimates: TimeEstimateSummary;

  //
  // --- Astronomer ---
  //
  astronomerClusters?: {
  clusters: ClusterSummary[];
};

  studentInteraction?: StudentInteraction[];

  //
  // Derived for UI
  //
  misconceptionHeatmap?: Array<{
    problemId: string;
    misconceptionLabels: string[];
    confusionRisk: string;
    fatigueRisk: string;
  }>;

  //
  // --- Philosopher ---
  //
  philosopherExplanation: PhilosopherReport;

  //
  // --- Rewrite loop metadata ---
  //
  rewriteMeta: {
    cycles: number;
    status: "complete" | "forced-complete";
  };

  //
  // --- Final teacher-facing summary ---
  //
  finalSummary?: {
    totalCycles: number;
    finalStatus: "complete" | "forced-complete";
    keyImprovements: string[];
    remainingRisks: string[];
  };
}

//
// --- Document Summary ---
//
export interface DocumentSummary {
  summaryText: string;
}

//
// --- Problem Payload ---
// (You already have this one, but including for completeness)
//
export interface ProblemPayload {
  problemId: string;
  question: string;
  questionType?: string; // <-- add this
  options?: string[];
  answer?: string;
  explanation?: string;
  bloomLevel: string;
  complexity: number;
}

//
// --- Student Profiles ---
//
export interface StudentProfile {
  id: string;
  traits: Record<string, any>;
}

//
// --- Student Testers ---
//
export interface StudentTester {
  id: string;
  responses: any[];
}

//
// --- Final Document ---
//
export interface GeneratedAssessment {
  problems: any[];
  metadata: Record<string, any>;
}

//
// --- Answer Key ---
//
export interface AnswerKey {
  answers: any[];
}

//
// --- Cognitive Traces ---
//
export interface CognitiveTrace {
  problemId: string;
  steps: any[];
}

//
// --- Difficulty Estimates ---
//
export interface DifficultyEstimate {
  problemId: string;
  level: string;
}

//
// --- Misconception Clusters ---
//
export interface MisconceptionCluster {
  clusterId: string;
  misconceptions: string[];
}

//
// --- Time Estimates ---
//
export interface TimeEstimateSummary {
  totalMinutes: number;
  perProblem: number[];
}
export interface WriterAstronomerResponse {
  writerDraft: WriterDraft;
  astronomerReport: AstronomerReport;
}




export interface WriterBlueprint {
  bloomDistribution: Array<{
    level: string;        // e.g. "Remember", "Apply", "Analyze"
    count: number;
  }>;

  difficultyCurve: Array<{
    problemIndex: number;
    targetDifficulty: number; // 0–1
  }>;

  misconceptionAvoidance: string[]; // extracted from source docs

  rubricAlignment: string[]; // teacher rubric goals

  problemTypes: Array<{
    type: string;         // e.g. "multiple-choice", "short-answer"
    count: number;
  }>;

  pacing: {
    estimatedMinutes: number;
    perProblem: number[];
  };

  formattingRules: {
    numberingStyle: "1." | "1)" | "Q1";
    explanationStyle: "concise" | "detailed";
    optionStyle: "A/B/C/D" | "1/2/3/4";
  };

  referenceTestInsights?: {
    bloomDistribution: any;
    difficultyCurve: any;
    structureNotes: string[];
  };
}
