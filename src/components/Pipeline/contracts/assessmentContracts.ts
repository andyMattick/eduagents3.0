export interface AssessmentIntent {
  course: string;
  unit: string;
  studentLevel: string;
  assignmentType: string;
  time: string;
  uploads: UploadedFileSummary[];
  additionalDetails: string;
}

export interface StudentSliderState {
  reading: number;
  reasoning: number;
  fluency: number;
  stamina: number;
  confusionTolerance: number;
  overlays: string[];
}

export interface UnifiedAssessmentRequest {
  intent: AssessmentIntent;
  studentSliders: StudentSliderState;
}

export interface UnifiedAssessmentResponse {
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
  astronomerClusters: AstronomerClusterSummary;
  philosopherExplanation: PhilosopherReport;
  rewriteMeta: {
    cycles: number;
    status: "complete" | "forced-complete";
  };
}

// ------------------------------------------------------
// Temporary placeholder types (replace with real ones later)
// ------------------------------------------------------

export interface DocumentSummary {
  summaryText: string;
}

export interface ProblemPayload {
  id: string;
  type: string;
  difficulty: string;
  prompt: string;
}

export interface StudentProfile {
  id: string;
  traits: Record<string, any>;
}

export interface StudentTester {
  id: string;
  responses: any[];
}

export interface GeneratedAssessment {
  problems: any[];
  metadata: Record<string, any>;
}

export interface AnswerKey {
  answers: any[];
}

export interface CognitiveTrace {
  problemId: string;
  steps: any[];
}

export interface DifficultyEstimate {
  problemId: string;
  level: string;
}

export interface MisconceptionCluster {
  clusterId: string;
  misconceptions: string[];
}

export interface TimeEstimateSummary {
  totalMinutes: number;
  perProblem: number[];
}

export interface AstronomerClusterSummary {
  clusters: any[];
}

export interface PhilosopherReport {
  status: "complete" | "rewrite" | "forced-complete";
  narrativeSummary: string;
  keyFindings: string[];
  recommendations: string[];
}
export interface UploadedFileSummary {
  name: string;
  size: number;
  type: string;
  url?: string; // optional, depending on your uploader
}
