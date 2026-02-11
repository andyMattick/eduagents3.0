/**
 * UNIVERSAL SIMULATION CONTRACT
 *
 * Defines the strict input/output contracts for the simulator.
 * These contracts are ENFORCED at schema validation time.
 *
 * Key Principle: Simulator receives immutable problem & student metadata,
 * derives internal simulation state, and returns strictly-typed outputs.
 * Original payloads are NEVER modified.
 */

import { UniversalProblem, CognitiveMetadata, ClassificationMetadata } from "../analysis/diagnosticTypes";
import { BloomLevel } from "../analysis/types";

// ============================================================================
// I. INPUT CONTRACTS
// ============================================================================

/**
 * Overlay definition: describes how a specific accessibility or environmental
 * modification affects student behavior during simulation.
 */
export interface OverlayDefinition {
  name: string;                          // e.g., "adhd", "dyslexic", "timed_pressure"
  category: "accessibility" | "learning" | "environmental";
  description: string;
  modifiers: {
    attentionSpanMultiplier?: number;    // e.g., 0.7 for ADHD (reduces attention)
    fatigueAccelerator?: number;         // e.g., 1.3 for fatigue_sensitive
    timeMultiplier?: number;             // e.g., 1.2 for needs more time
    confusionThreshold?: number;         // e.g., 0.6 (triggers confusion earlier)
    engagementDecay?: number;            // e.g., 0.9 per problem
    bloomOffsetMultiplier?: {            // e.g., {"Remember": 1.0, "Analyze": 0.7}
      [key in BloomLevel]?: number;
    }
  };
}

/**
 * Overlay registry: all allowed overlays must be defined here.
 * Simulator rejects any overlay not in this registry.
 */
export interface OverlayRegistry {
  [overlayName: string]: OverlayDefinition;
}

/**
 * Simulation environment: describes test conditions and constraints.
 */
export interface SimulationEnvironment {
  testMode: "timed" | "practice" | "adaptive";
  timeLimitMinutes: number | null;       // null = no limit
  environmentOverlays: string[];         // e.g., ["test_pressure", "noise_distraction"]
}

/**
 * ROOT INPUT CONTRACT
 *
 * This is the ONLY contract the simulator accepts.
 * Raw UniversalProblem[] and Astronaut[] are WRAPPED in this contract.
 */
export interface SimulationInputContract {
  // Lifecycle
  simulationId: string;                  // e.g., "sim_1707609600000"
  documentId: string;                    // e.g., "doc_1707609600000"
  
  // Problem and student data (IMMUTABLE during simulation)
  problems: UniversalProblem[];
  students: Astronaut[];
  
  // Environment and rules
  environment: SimulationEnvironment;
  overlayRegistry: OverlayRegistry;
  
  // Metadata
  createdAt: string;                     // ISO timestamp
  executionMode: "deterministic" | "stochastic";  // How to handle randomness
}

/**
 * Student profile (Astronaut) - immutable during simulation.
 */
export interface Astronaut {
  studentId: string;
  personaName: string;
  
  // Immutable
  overlays: string[];                    // e.g., ["adhd", "fatigue_sensitive"]
  narrativeTags: string[];               // e.g., ["focused", "curious"]
  
  // Base traits (immutable)
  profileTraits: {
    readingLevel: number;                // 0-1
    mathFluency: number;                 // 0-1
    attentionSpan: number;               // 0-1
    confidence: number;                  // 0-1
  };
  
  gradeLevel?: string;                   // e.g., "11-12"
  isAccessibilityProfile?: boolean;
}

// ============================================================================
// II. INVARIANT DECLARATIONS
// ============================================================================

/**
 * Fields that CANNOT change during or after simulation.
 * If simulator modifies these → ContractViolationError
 */
export const PROBLEM_IMMUTABLE_FIELDS = [
  "problemId",
  "documentId",
  "subject",
  "sectionId",
  "cognitive",
  "classification",
  "structure"
] as const;

export const STUDENT_IMMUTABLE_FIELDS = [
  "studentId",
  "profileTraits",
  "overlays",
  "narrativeTags"
] as const;

/**
 * Fields simulator MAY modify (only):
 * - None directly on problem/student objects
 * - Only through return contract (StudentProblemOutput, StudentAssignmentSimulation)
 */
export const REWRITER_MUTABLE_FIELDS = [
  "content",      // Rewriter may improve problem text
  "version"       // Version increments on rewrite
] as const;

// ============================================================================
// III. OUTPUT CONTRACTS
// ============================================================================

/**
 * Per-problem simulation output.
 * MUST match this schema exactly. No additional fields.
 */
export interface StudentProblemOutput {
  // References (from input)
  studentId: string;
  problemId: string;
  
  // Simulation results
  timeToCompleteSeconds: number;
  percentageSuccessful: number;          // 0-100
  confusionLevel: "low" | "medium" | "high";
  engagementLevel: "low" | "medium" | "high";
  
  // Feedback
  feedback: string;
  suggestions?: string[];
  
  // Diagnostic
  bloomMismatch?: {
    studentCapability: BloomLevel;
    problemDemands: BloomLevel;
    mismatchSeverity: "none" | "mild" | "severe";
  };
}

/**
 * Aggregated per-student simulation output.
 * MUST match this schema exactly. No additional fields.
 */
export interface StudentAssignmentSimulation {
  // Identity
  studentId: string;
  personaName: string;
  
  // Aggregates
  totalTimeMinutes: number;
  estimatedScore: number;                // 0-100
  estimatedGrade: "A" | "B" | "C" | "D" | "F";
  
  // Per-problem results (MUST contain every problem from input)
  problemResults: StudentProblemOutput[];
  
  // Engagement trajectory
  engagement: {
    initial: number;                     // 0-1
    atMidpoint: number;                  // 0-1
    final: number;                       // 0-1
    trend: "increasing" | "declining" | "stable";
  };
  
  // Fatigue trajectory
  fatigue: {
    initial: number;                     // 0-1
    peak: number;                        // 0-1
    final: number;                       // 0-1
  };
  
  // Risk assessment
  confusionPoints: string[];             // problemIds where confusion rose
  atRisk: boolean;
  riskFactors: string[];                 // e.g., ["declining_engagement", "high_fatigue"]
}

/**
 * Complete simulation output envelope.
 */
export interface SimulationOutputContract {
  simulationId: string;
  documentId: string;
  executedAt: string;                    // ISO timestamp
  studentResults: StudentAssignmentSimulation[];
  
  // Metadata
  problemsProcessed: number;
  studentsProcessed: number;
  totalSimulationTimeMs: number;
}

// ============================================================================
// IV. INTERNAL SIMULATION STATE
// ============================================================================

/**
 * Internal model that simulator derives from contract inputs.
 * NOT part of output contract.
 * Simulator generates these internally; they're never exposed.
 */
export interface StudentProblemInput {
  // From student profile
  studentId: string;
  
  // From problem
  problemId: string;
  bloomLevel: BloomLevel;
  linguisticComplexity: number;          // 0-1
  complexityLevel: number;               // 1-5
  estimatedTimeMinutes: number;
  
  // Context
  testType: "multiple_choice" | "short_answer" | "free_response" | "essay" | "calculation";
  problemIndex: number;                  // Position in assignment
  totalProblems: number;
  
  // Derived from student + environment
  narrativeTags: string[];
  overlays: string[];
  
  // Accumulators (change per problem as student progresses)
  priorFatigueIndex: number;             // 0-1, from previous problems
  priorEngagementScore: number;          // 0-1, from previous problems
  priorSuccessRate: number;              // 0-1, of previous problems
  
  // Generated during simulation
  adjustedTimeMinutes: number;           // After overlay modifiers
  effectiveBloomLevel: BloomLevel;       // After capability matching
  expectedSuccessRate: number;           // 0-1
  timePressureIndex: number;             // >1 = rushed
}

// ============================================================================
// V. ERROR TYPES
// ============================================================================

/**
 * Detailed contract violation.
 */
export interface ContractViolation {
  field: string;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Contract violation error - thrown when validator detects breach.
 */
export class ContractViolationError extends Error {
  constructor(
    public violations: ContractViolation[],
    public context: {
      phase: "input" | "output";
      simulationId?: string;
      problematicItemId?: string;
    }
  ) {
    const summary = violations
      .filter(v => v.severity === "error")
      .map(v => `${v.field}: ${v.message}`)
      .join("; ");
    
    super(`Contract Violation (${context.phase}): ${summary}`);
    this.name = "ContractViolationError";
  }

  getAllViolations(): ContractViolation[] {
    return this.violations;
  }

  getErrorViolations(): ContractViolation[] {
    return this.violations.filter(v => v.severity === "error");
  }

  getWarningViolations(): ContractViolation[] {
    return this.violations.filter(v => v.severity === "warning");
  }
}

// ============================================================================
// VI. VALIDATION MARKERS
// ============================================================================

/**
 * Marks data as contract-validated.
 * Attach to outputs to indicate they've been checked.
 */
export interface ContractValidationResult {
  valid: boolean;
  violations: ContractViolation[];
  validatedAt: string;
  validator: "simulationInputValidator" | "simulationOutputValidator" | "invariantValidator";
}

/**
 * Wrapper for validated data.
 */
export interface ValidatedSimulationInput extends SimulationInputContract {
  __validated: ContractValidationResult;
}

export interface ValidatedSimulationOutput extends SimulationOutputContract {
  __validated: ContractValidationResult;
}

// ============================================================================
// VII. HELPER TYPES
// ============================================================================

/**
 * Immutability marker for problem.
 * Use in runtime checks to ensure simulator didn't modify.
 */
export interface ImmutableProblemSnapshot {
  problemId: string;
  cognitive: CognitiveMetadata;
  classification: ClassificationMetadata;
  structure: {
    isSubpart: boolean;
    numberingStyle: string;
    multiPartCount: number;
    sourceLineStart: number;
    sourceLineEnd: number;
  };
}

/**
 * Immutability marker for student.
 */
export interface ImmutableStudentSnapshot {
  studentId: string;
  overlays: string[];
  profileTraits: Astronaut["profileTraits"];
}

export type BloomLevelString = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";
