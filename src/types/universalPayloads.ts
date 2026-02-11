/**
 * Universal Payload Types
 * Defines the complete data structure for problems, students, and simulations
 * across the eduagents3.0 platform
 */

// ============================================================================
// 1. COGNITIVE METADATA - Immutable cognitive layer for problems
// ============================================================================

export type BloomsLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
export type ComplexityLevel = 1 | 2 | 3 | 4 | 5;

export interface TimeBreakdown {
  readingMinutes: number;
  comprehensionMinutes: number;
  computationMinutes: number;
  reasoningMinutes: number;
  writingMinutes: number;
}

export interface CognitiveMetadata {
  bloomsLevel: BloomsLevel;
  bloomsConfidence: number; // 0-1, e.g., 0.92
  bloomsReasoning: string; // e.g., "Uses contextual clues to identify"
  bloomsContextDependent: boolean;

  complexityLevel: ComplexityLevel;

  estimatedTimeMinutes: number;
  timeBreakdown: TimeBreakdown;

  linguisticComplexity: number; // 0-1, e.g., 0.64
  reasoningStepsRequired: number;
  proceduralWeight: number; // 0-1, e.g., 0.7
}

// ============================================================================
// 2. CLASSIFICATION METADATA - Subject-specific classification
// ============================================================================

export interface ClassificationMetadata {
  problemType: string | null; // e.g., "hypothesis_test"
  topics: string[]; // e.g., ["sampling_distributions", "central_limit_theorem"]
  requiresCalculator: boolean;
  requiresInterpretation: boolean;
}

// ============================================================================
// 3. STRUCTURE METADATA - Problem structure and layout
// ============================================================================

export type NumberingStyle = '1.' | 'a.' | 'roman' | 'parenthetical' | 'inferred';

export interface StructureMetadata {
  isSubpart: boolean;
  numberingStyle: NumberingStyle;
  multiPartCount: number;
  sourceLineStart: number;
  sourceLineEnd: number;
}

// ============================================================================
// 4. ANALYSIS METADATA - Processing metadata
// ============================================================================

export interface AnalysisMetadata {
  confidenceScore: number; // 0-1, overall confidence
  processedAt: string; // ISO timestamp
}

// ============================================================================
// 5. UNIVERSAL PROBLEM - Complete problem payload
// ============================================================================

export interface UniversalProblem {
  // Identity
  problemId: string; // e.g., "S1_P3_a" - hierarchical format
  documentId: string; // e.g., "doc_1707609600000"
  subject: string; // e.g., "AP_Statistics"
  sectionId: string; // e.g., "S1"
  parentProblemId?: string; // If subpart, e.g., "S1_P3"

  // Content
  content: string; // The actual problem text

  // Cognitive layer (IMMUTABLE after analyzer)
  cognitive: CognitiveMetadata;

  // Classification layer (IMMUTABLE after analyzer, subject-specific)
  classification: ClassificationMetadata;

  // Structure
  structure: StructureMetadata;

  // Meta
  analysis: AnalysisMetadata;

  // Version tracking
  version?: string; // e.g., "1.0"
}

// ============================================================================
// 6. ASTRONAUT - Student profile/persona
// ============================================================================

export interface ProfileTraits {
  readingLevel: number; // 0-1, e.g., 0.65
  mathFluency: number; // 0-1, e.g., 0.72
  attentionSpan: number; // 0-1, e.g., 0.55
  confidence: number; // 0-1, e.g., 0.68
}

export interface Astronaut {
  studentId: string; // e.g., "student_adhd_001"
  personaName: string; // e.g., "Alex (ADHD Profile)"

  overlays: string[]; // e.g., ["adhd", "fatigue_sensitive"]
  narrativeTags: string[]; // e.g., ["focused", "curious", "visual-learner"]

  profileTraits: ProfileTraits;

  gradeLevel?: string; // e.g., "11-12"
  isAccessibilityProfile?: boolean;
}

// ============================================================================
// 7. STUDENT-PROBLEM INTERACTION - Single interaction payload
// ============================================================================

export type TestType = 'multiple_choice' | 'short_answer' | 'free_response' | 'essay' | 'calculation';

export interface StudentProblemInput {
  studentId: string;
  problemId: string;
  testType: TestType;

  // Problem characteristics (from UniversalProblem)
  problemLength: number;
  multiPart: boolean;
  bloomLevel: string;
  linguisticComplexity: number;
  similarityToPrevious: number;
  noveltyScore: number;

  // Student characteristics (from Astronaut)
  narrativeTags: string[];
  overlays: string[];

  // Simulation metrics
  perceivedSuccess: number; // 0-1, likelihood of success
  actualCorrect?: boolean; // If answered
  timeOnTask: number; // seconds
  timePressureIndex: number; // >1 = rushed, <1 = relaxed
  fatigueIndex: number; // 0-1, cumulative fatigue
  confusionSignals: number; // count of confusion triggers
  engagementScore: number; // 0-1
}

// ============================================================================
// 8. STUDENT-PROBLEM OUTPUT - Simulation result for one interaction
// ============================================================================

export type ConfusionLevel = 'low' | 'medium' | 'high';
export type EngagementLevel = 'low' | 'medium' | 'high';
export type MismatchSeverity = 'none' | 'mild' | 'severe';

export interface BloomMismatch {
  studentCapability: BloomsLevel;
  problemDemands: BloomsLevel;
  mismatchSeverity: MismatchSeverity;
}

export interface StudentProblemOutput {
  studentId: string;
  problemId: string;

  timeToCompleteSeconds: number;
  percentageSuccessful: number; // 0-100
  confusionLevel: ConfusionLevel;
  engagementLevel: EngagementLevel;

  feedback: string;
  suggestions?: string[];

  bloomMismatch?: BloomMismatch;
}

// ============================================================================
// 9. ENGAGEMENT & FATIGUE TRACKING
// ============================================================================

export interface EngagementTrajectory {
  initial: number;
  atMidpoint: number;
  final: number;
  trend: 'increasing' | 'stable' | 'declining';
}

export interface FatigueTrajectory {
  initial: number;
  peak: number;
  final: number;
}

// ============================================================================
// 10. STUDENT ASSIGNMENT SIMULATION - Aggregated results
// ============================================================================

export interface StudentAssignmentSimulation {
  studentId: string;
  personaName: string;

  totalTimeMinutes: number;
  estimatedScore: number;
  estimatedGrade: string; // A, B, C, D, F

  problemResults: StudentProblemOutput[];

  engagement: EngagementTrajectory;
  fatigue: FatigueTrajectory;

  confusionPoints: string[]; // Problem IDs where student was confused
  atRisk: boolean;
  riskFactors: string[];
}

// ============================================================================
// 11. BATCH SIMULATION RESULTS
// ============================================================================

export interface ClassCompletionSummary {
  avgTimeMinutes: number;
  avgScore: number;
  completionRatePercent: number;
  atRiskCount: number;
  topConfusionPoints: string[];
}

export interface AssignmentSimulationBatch {
  assignmentId: string;
  timestamp: string;
  studentSimulations: StudentAssignmentSimulation[];
  classSummary: ClassCompletionSummary;
}

// ============================================================================
// 12. INVARIANT ENFORCEMENT - Locks for immutable fields
// ============================================================================

/**
 * INVARIANTS: Fields that CANNOT change after analyzer processes them
 * - problemId format (S1_P2_a)
 * - cognitive.* (locked after analyzer)
 * - classification.* (locked after analyzer)
 *
 * MUTABLE: Only these can change
 * - content (rewriter can improve text)
 * - version (1.0 → 1.1)
 */

export interface UniversalProblemImmutable {
  // These fields are LOCKED after analyzer runs
  problemId: string;
  cognitive: CognitiveMetadata;
  classification: ClassificationMetadata;
}

/**
 * Validates that immutable fields have not been modified
 */
export function validateProblemInvariants(
  original: UniversalProblem,
  updated: UniversalProblem
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check problemId
  if (original.problemId !== updated.problemId) {
    violations.push(`problemId cannot change: "${original.problemId}" → "${updated.problemId}"`);
  }

  // Check cognitive fields
  if (JSON.stringify(original.cognitive) !== JSON.stringify(updated.cognitive)) {
    violations.push('cognitive metadata cannot be modified after analyzer');
  }

  // Check classification fields
  if (JSON.stringify(original.classification) !== JSON.stringify(updated.classification)) {
    violations.push('classification metadata cannot be modified after analyzer');
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// ============================================================================
// 13. BATCH PAYLOADS FOR API OPERATIONS
// ============================================================================

export interface SimulateStudentsPayload {
  problems: UniversalProblem[];
  astronauts: Astronaut[];
  assignmentId: string;
  timestamp: string;
}

export interface SimulateStudentsResponse {
  batchId: string;
  simulations: StudentAssignmentSimulation[];
  classSummary: ClassCompletionSummary;
  processedAt: string;
}
