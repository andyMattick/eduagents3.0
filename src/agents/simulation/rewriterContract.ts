/**
 * REWRITER CONTRACT
 *
 * Defines the input/output contract for the Rewriter phase (Phase 5).
 * The rewriter receives simulation results and may improve problems,
 * but must respect immutable cognitive/classification fields.
 */

import { UniversalProblem } from "../analysis/diagnosticTypes";
import { StudentAssignmentSimulation, StudentProblemOutput } from "./simulationContract";
import { BloomLevel } from "../analysis/types";

// ============================================================================
// I. REWRITER INPUT CONTRACT
// ============================================================================

/**
 * Rewriter receives problems + simulation results.
 * May improve text, but may NOT change cognitive or classification.
 */
export interface RewriterInputContract {
  // Lifecycle
  rewriterId: string;                    // e.g., "rewrite_1707609600000"
  simulationId: string;                  // From simulator
  documentId: string;
  
  // Original problems (IMMUTABLE cognitive + classification)
  problems: UniversalProblem[];
  
  // Simulation results (what students struggled with)
  simulationResults: StudentAssignmentSimulation[];
  
  // Rewrite targets (optional teacher guidance)
  rewriteOptions?: {
    focusOnBloom?: boolean;              // Simplify higher Bloom levels
    reduceLinguisticComplexity?: boolean; // Simplify language
    breakMultipart?: boolean;            // Split multipart questions
    improveClarity?: boolean;            // General clarity improvement
    addScaffolding?: boolean;            // Add hints/structure
    generateAccessibilityVariants?: boolean; // Create accessible versions
  };
  
  // Metadata
  createdAt: string;                     // ISO timestamp
}

// ============================================================================
// II. REWRITER INVARIANTS
// ============================================================================

/**
 * Fields that CANNOT change when rewriting.
 * These fields are locked after analyzer runs.
 */
export const REWRITER_IMMUTABLE_FIELDS = [
  "problemId",                 // Never change
  "documentId",               // Never change
  "subject",                  // Never change
  "cognitive.bloomsLevel",    // Analyzer decision (locked)
  "cognitive.bloomsConfidence",
  "cognitive.bloomsReasoning",
  "cognitive.complexityLevel",
  "cognitive.reasoningStepsRequired",
  "cognitive.proceduralWeight",
  "classification.problemType",
  "classification.topics",
  "structure.isSubpart",
  "structure.numberingStyle",
  "structure.multiPartCount",
  "structure.sourceLineStart",
  "structure.sourceLineEnd"
] as const;

/**
 * Fields that rewriter MAY change.
 */
export const REWRITER_MUTABLE_FIELDS = [
  "content",                           // Problem text (can be improved)
  "cognitive.estimatedTimeMinutes",   // May change due to text simplification
  "cognitive.timeBreakdown",          // Must update if time changes
  "cognitive.linguisticComplexity",   // May improve via simplification
  "version"                           // Increment on rewrite
] as const;

// ============================================================================
// III. REWRITER OUTPUT CONTRACT
// ============================================================================

/**
 * Result of rewriting a single problem.
 */
export interface RewrittenProblem {
  // Identity (MUST MATCH INPUT)
  problemId: string;
  documentId: string;
  subject: string;
  version: string;                     // e.g., "1.0" -> "1.1"
  
  // Original content (for comparison)
  originalContent: string;
  
  // Rewritten content
  content: string;
  
  // Metadata (immutable fields preserved from input)
  cognitive: {
    bloomsLevel: BloomLevel;           // ← LOCKED (cannot change)
    bloomsConfidence: number;
    bloomsReasoning: string;
    bloomsContextDependent: boolean;
    complexityLevel: 1 | 2 | 3 | 4 | 5; // ← LOCKED
    estimatedTimeMinutes: number;      // May be adjusted (if simplification reduced it)
    timeBreakdown: {
      readingMinutes: number;
      comprehensionMinutes: number;
      computationMinutes: number;
      reasoningMinutes: number;
      writingMinutes: number;
    };
    linguisticComplexity: number;      // May improve (0.52 -> 0.45)
    reasoningStepsRequired: number;    // ← LOCKED
    proceduralWeight: number;          // ← LOCKED
  };
  
  classification: {
    problemType: string | null;        // ← LOCKED
    topics: string[];                  // ← LOCKED
    requiresCalculator: boolean;
    requiresInterpretation: boolean;
  };
  
  structure: {
    isSubpart: boolean;                // ← LOCKED
    numberingStyle: "1." | "a." | "roman" | "parenthetical" | "inferred";
    multiPartCount: number;            // ← LOCKED
    sourceLineStart: number;           // ← LOCKED
    sourceLineEnd: number;             // ← LOCKED
  };
  
  // Rewrite details
  rewriteLog: {
    rulesApplied: string[];            // e.g., ["simplify-language", "break-multipart"]
    changes: Array<{
      aspect: string;                  // e.g., "linguistic_complexity"
      before: number | string;
      after: number | string;
      explanation: string;
    }>;
    confidenceScore: number;           // 0-1, confidence in rewrite
  };
}

/**
 * Rewriter output envelope.
 */
export interface RewriterOutputContract {
  // Lifecycle
  rewriterId: string;
  simulationId: string;
  documentId: string;
  executedAt: string;                  // ISO timestamp
  
  // Results
  rewrittenProblems: RewrittenProblem[];
  
  // Aggregated metadata
  summaryOfChanges: {
    totalProblemsProcessed: number;
    totalProblemsRewritten: number;
    percentageChanged: number;         // 0-100
    averageLinguisticComplexityImprovement: number; // e.g., -0.12
    averageTimeAdjustment: number;    // e.g., -2.1 (minutes)
    accessibilityVariantsGenerated: number;
  };
  
  // Statistics
  rulesApplied: {
    [ruleName: string]: number;        // e.g., { "simplify-language": 5, "break-multipart": 3 }
  };
}

// ============================================================================
// IV. REWRITE RULES
// ============================================================================

/**
 * Possible rewrite rules that can be applied.
 * Each rule transforms content but preserves immutable fields.
 */
export type RewriteRule =
  | "simplify-language"               // Reduce linguistic complexity
  | "break-multipart"                 // Split multipart questions
  | "improve-clarity"                 // Clarify wording
  | "add-scaffolding"                 // Add hints/structure
  | "reduce-bloated-preamble"         // Shorten long context
  | "add-visual-structure"            // Formatting for ADHD/dyslexia
  | "generate-accessible-variant";    // Create accessibility version

/**
 * Rule configuration: what each rule does and how it affects metrics.
 */
export interface RewriteRuleConfig {
  name: RewriteRule;
  description: string;
  eligibleProblems: (problem: UniversalProblem) => boolean;
  
  // How to apply the rule
  apply: (problem: UniversalProblem) => {
    newContent: string;
    timeAdjustment?: number;          // e.g., -0.5 (shorten by 30 seconds)
    linguisticComplexityAdjustment?: number; // e.g., -0.1
    reasoning: string;
  };
  
  // Metadata
  priority: number;                   // 0 = lowest, 10 = highest
  inverseOf?: RewriteRule;           // If this rule is applied, skip inverse
}

// ============================================================================
// V. ACCESSIBILITY VARIANTS
// ============================================================================

/**
 * Alternative version of a problem for specific accessibility profile.
 */
export interface AccessibilityVariant {
  originalProblemId: string;
  variantId: string;                  // e.g., "S1_P1_adhd_variant"
  overlay: string;                    // e.g., "adhd", "dyslexic"
  
  content: string;                    // Adapted content
  
  // Preserved from original
  cognitive: UniversalProblem["cognitive"];
  classification: UniversalProblem["classification"];
  
  // Accessibility-specific metadata
  adaptations: {
    fontFamily?: string;              // e.g., "Arial, sans-serif"
    fontSize?: number;                // e.g., 14
    lineHeight?: number;              // e.g., 1.8
    maxLineLength?: number;           // e.g., 70 characters
    color?: string;                   // High contrast
    backgroundColor?: string;
    
    // Cognitive adaptations
    breakIntoSteps?: boolean;
    addCheckpointQuestions?: boolean;
    reduceNonsementialInfo?: boolean;
    addVisualCues?: boolean;
    estimatedExtraTimeMinutes?: number;
  };
}

// ============================================================================
// VI. ERROR TYPES
// ============================================================================

export interface RewriteViolation {
  problemId: string;
  field: string;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

export class RewriteContractViolationError extends Error {
  constructor(
    public violations: RewriteViolation[],
    public context: {
      rewriterId?: string;
      simulationId?: string;
    }
  ) {
    const summary = violations
      .filter(v => v.severity === "error")
      .map(v => `${v.problemId}/${v.field}: ${v.message}`)
      .join("; ");
    
    super(`Rewrite Contract Violation: ${summary}`);
    this.name = "RewriteContractViolationError";
  }

  getErrorViolations(): RewriteViolation[] {
    return this.violations.filter(v => v.severity === "error");
  }

  getWarningViolations(): RewriteViolation[] {
    return this.violations.filter(v => v.severity === "warning");
  }
}

// ============================================================================
// VII. IMMUTABILITY SNAPSHOT
// ============================================================================

export interface ImmutableRewriteSnapshot {
  problemId: string;
  bloomsLevel: BloomLevel;
  complexityLevel: 1 | 2 | 3 | 4 | 5;
  topics: string[];
  problemType: string | null;
}

// ============================================================================
// VIII. REWRITER STATE MACHINE
// ============================================================================

/**
 * Rewriter operates in these phases:
 * 1. ACCEPT - Receive input contract + simulation results
 * 2. ANALYZE - Identify problems that need rewriting
 * 3. PLAN - Decide which rules to apply
 * 4. APPLY - Apply rules to content
 * 5. VALIDATE - Check immutability + schema
 * 6. GENERATE - Create accessibility variants (if requested)
 * 7. RETURN - Output rewritten problems + summary
 */

export type RewriterPhase =
  | "accept"
  | "analyze"
  | "plan"
  | "apply"
  | "validate"
  | "generate"
  | "return";

// ============================================================================
// IX. HELPER TYPES
// ============================================================================

/**
 * Document structure for applying rules.
 * Maps problems to sections/flow.
 */
export interface ProblemFlow {
  sectionId: string;
  problemIndex: number;              // Position in section
  totalInSection: number;
  previousBloomLevel?: BloomLevel;
  nextBloomLevel?: BloomLevel;
}

/**
 * Context for rule application.
 */
export interface RewriteContext {
  problem: UniversalProblem;
  flow: ProblemFlow;
  simulationResult: StudentProblemOutput;
  studentProfile: {
    overlays: string[];
    averageSuccessRate: number;
  };
}
