/**
 * Represents a single tag detected in a piece of text
 */
export interface Tag {
  name: string;
  confidenceScore: number; // 0-1
  description?: string;
}

/**
 * Represents feedback from a simulated student persona
 * Includes both basic feedback and optional detailed commentary
 */
export interface StudentFeedback {
  studentPersona: string; // e.g., "Visual Learner", "Critical Reader", "📖 Dyslexic Learner"
  feedbackType: 'strength' | 'weakness' | 'suggestion';
  content: string;
  relevantTags?: string[];
  engagementScore?: number; // 0-1
  // Optional detailed feedback fields
  specificQuestions?: string[]; // Questions the student persona would ask
  whatWorked?: string; // What was done well
  whatCouldBeImproved?: string; // What could be better
  // Student performance metrics
  timeToCompleteMinutes?: number; // Estimated time for student to complete
  understoodConcepts?: string[]; // Concepts the persona understood well
  struggledWith?: string[]; // Concepts the persona struggled with
  checkedOutAt?: string; // Where student lost engagement (task ID or section)
  estimatedGrade?: string; // e.g., "A", "B", "C"
  // New: Time estimation with confidence
  timeEstimate?: {
    meanMinutes: number;
    confidenceInterval95: [number, number];
  };
  // New: Difficulty rating
  difficultySummary?: string;
  // New: At-risk indicators
  atRiskProfile?: boolean;
  atRiskFactors?: string[];
}

/**
 * Represents a single version of an assignment
 */
export interface AssignmentVersion {
  id?: string;
  content: string;
  summaryOfChanges: string;
  appliedTags: Tag[];
  timeToRead?: number; // in seconds
  engagementScore?: number; // 0-1
  createdAt?: string;
}

/**
 * Represents a change in a tag between two versions
 */
export interface TagChange {
  tag: string;
  delta: number;
  fromConfidence?: number;
  toConfidence?: number;
}

/**
 * Represents a single step in the pipeline
 */
export enum PipelineStep {
  INPUT = 0,
  TAG_ANALYSIS = 1,
  STUDENT_SIMULATIONS = 2,
  REWRITE_RESULTS = 3,
  VERSION_COMPARISON = 4,
}

/**
 * Represents the complete state of the pipeline
 */
export interface PipelineState {
  originalText: string;
  tags: Tag[];
  studentFeedback: StudentFeedback[];
  rewrittenText: string;
  rewriteSummary: string;
  tagChanges: TagChange[];
  currentStep: PipelineStep;
  isLoading: boolean;
  error?: string;
  selectedStudentTags?: string[]; // Selected student focus areas for analysis
  assignmentMetadata?: {
    gradeLevel?: string;
    subject?: string;
    difficulty?: string;
    type?: string;
    bloomLevels?: Record<string, number>;
    estimatedTimeMinutes?: number;
  };
  // New: Learner profile weighting
  learnerProfileWeights?: Record<string, number>; // { profileId: weight }
  // New: Comprehensive time estimation
  completionTimeEstimate?: {
    meanMinutes: number;
    confidenceInterval95: [number, number];
    perQuestion?: Array<{
      index: number;
      bloomLevel: number;
      estimatedMinutes: number;
      atRiskProfiles: string[];
    }>;
  };
  // New: Student completion simulations
  completionSimulations?: {
    studentSimulations: any[]; // StudentCompletionSimulation[]
    classSummary: any; // ClassCompletionSummary
  };
}

/**
 * Represents analysis comparing two versions of an assignment
 */
export interface VersionAnalysis {
  tagChanges: TagChange[];
  engagementScoreDelta: number;
  timeToReadDelta: number;
  originalEngagementScore: number;
  rewrittenEngagementScore: number;
  originalTimeToRead: number;
  rewrittenTimeToRead: number;
}
