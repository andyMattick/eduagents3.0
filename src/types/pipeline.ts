/**
 * Represents a single tag detected in a piece of text
 */
export interface Tag {
  name: string;
  confidenceScore: number; // 0-1
  description?: string;
}

/**
 * Represents a single piece of feedback from the Philosopher
 */
export interface FeedbackItem {
  id?: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: 'clarity' | 'engagement' | 'accessibility' | 'difficulty' | 'pacing' | 'coverage';
  description: string;
  affectedProblems?: string[]; // Problem IDs
  recommendation: string;
  estimatedImpact?: 'high' | 'medium' | 'low';
}

/**
 * Represents visual analytics bundle (charts, maps, etc.)
 */
export interface VisualizationBundle {
  clusterHeatMap?: string;        // base64 PNG or SVG of student clustering
  bloomComplexityScatter?: string; // Bloom level vs. linguistic complexity scatter plot
  confusionDensityMap?: string;    // Heat map of confusion hotspots
  fatigueCurve?: string;           // Line chart of cumulative fatigue
  topicRadarChart?: string;        // Radar chart of topic coverage by Bloom
  sectionRiskMatrix?: string;      // 2D matrix of section risk assessment
}

/**
 * Represents the Philosopher's complete analysis output
 */
export interface TeacherFeedbackOptions {
  rankedFeedback: FeedbackItem[];
  visualizations?: VisualizationBundle;
}

/**
 * Represents a student profile in the teacher's class
 */
export interface ClassStudentProfile {
  id: string;
  name: string;
  profileType: 'standard' | 'accessibility' | 'custom';
  basePersona?: string; // e.g., "Strong Reader", "ADHD Learner"
  overlays: string[]; // e.g., ["adhd", "fatigue_sensitive"]
  traits: {
    readingLevel: number; // 0.0-1.0
    mathFluency: number; // 0.0-1.0
    attentionSpan: number; // 0.0-1.0
    confidence: number; // 0.0-1.0
  };
}

/**
 * Represents a class built by the teacher
 */
export interface ClassDefinition {
  id: string;
  name: string;
  gradeLevel: string;
  subject: string;
  studentProfiles: ClassStudentProfile[];
  createdAt: string;
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
  DOCUMENT_PREVIEW = 1,  // Quick validation (sections, problem count)
  DOCUMENT_ANALYSIS = 2,  // Analyze document structure & problem types
  PROBLEM_ANALYSIS = 3,   // Show metadata, allow export
  DOCUMENT_NOTES = 4,    // Show document + teacher notes + inferred metadata
  PHILOSOPHER_REVIEW = 5,    // Show analysis results, accept/reject before rewrite
  REWRITE_RESULTS = 6,   // After analysis accepted: rewrite results
  EXPORT = 7,            // Final export
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
  documentStructure?: any; // DocumentStructure from phase 1 analysis
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
  // New: Asteroid/Astronaut simulation data
  asteroids?: any[]; // Asteroid[]
  astronauts?: any[]; // Astronaut[]
  simulationResults?: any; // AssignmentSimulationResults
  // New: Problem metadata visibility toggle
  showProblemMetadata?: boolean;
  // New: Class definition
  classDefinition?: ClassDefinition;
  // PHASE 3: Goal + Source Framework
  phase3Context?: {
    goal: 'create' | 'analyze' | 'refine';
    source: 'hasNotes' | 'noNotes';
    uploadedSourceContent?: string; // For hasNotes: extracted text from notes
    sourceFileName?: string;
    intentTags?: any; // AssignmentIntentTags
  };
  // Rewrite Tracking
  studentFeedbackNotes?: string; // Accumulated notes about what to change
  activeStudentPersonas?: string[]; // Personas used in current simulation (for re-analysis)
  rewriteHistory?: Array<{
    iteration: number;
    timestamp: string;
    originalText: string;
    rewrittenText: string;
    notes: string;
    feedbackFromPersonas: string[];
  }>;
  hasUnsavedChanges?: boolean; // Track if changes have been made but not saved
  // New Pipeline Steps (Phase 4 restructuring)
  teacherNotes?: string; // Notes from teacher during document review step
  persistentTeacherNotes?: any; // Organized notes from database (document + problem level)
  philosopherAnalysis?: { // Analysis results from Space Camp simulation
    analysisContent: string;
    recommendations: string[];
    bloomDistribution?: Record<string, number>;
    acceptedByTeacher?: boolean;
  };
  // Phase 1: Document metadata (inferred + overridden)
  documentMetadata?: DocumentMetadata;
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

export interface DocumentMetadata {
  inferredGradeBand: "3-5" | "6-8" | "9-12";
  inferredSubject: "math" | "english" | "science" | "history" | "general";
  inferredClassLevel: "standard" | "honors" | "AP";
  
  // Overrides (user can change inferred values)
  gradeBand?: "3-5" | "6-8" | "9-12";
  subject?: "math" | "english" | "science" | "history" | "general";
  classLevel?: "standard" | "honors" | "AP";
  
  // Confidence scores for inference
  gradeBandConfidence?: number;  // 0.0-1.0
  subjectConfidence?: number;    // 0.0-1.0
  classLevelConfidence?: number; // 0.0-1.0
}

// Helper function to get effective value (override or inferred)
export function getEffectiveGradeBand(metadata: DocumentMetadata): "3-5" | "6-8" | "9-12" {
  return metadata.gradeBand || metadata.inferredGradeBand;
}

export function getEffectiveSubject(metadata: DocumentMetadata): "math" | "english" | "science" | "history" | "general" {
  return metadata.subject || metadata.inferredSubject;
}

export function getEffectiveClassLevel(metadata: DocumentMetadata): "standard" | "honors" | "AP" {
  return metadata.classLevel || metadata.inferredClassLevel;
}

/**
 * Payload sent to Space Camp (backend astronaut generation & simulation)
 */
export interface SpaceCampPayload {
  documentId: string;
  problems: any[]; // UniversalProblem[]
  scoringRules: any; // AstronautRubric
  documentMetadata: {
    gradeBand: "3-5" | "6-8" | "9-12";
    subject: "math" | "english" | "science" | "history" | "general";
    classLevel: "standard" | "honors" | "AP";
  };
  // NOT included: Pre-generated astronauts, student previews, etc.
}
