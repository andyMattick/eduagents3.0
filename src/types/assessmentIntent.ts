/**
 * Assessment Intent Types
 * Minimal teacher input for assessment generation
 * 
 * Core Principle: Simplify teacher input while preserving full pipeline integrity
 */

/**
 * Student level mapping
 * Maps human-friendly labels to grade bands
 */
export type StudentLevel = 'Remedial' | 'Standard' | 'Honors' | 'AP';

/**
 * Grade band for internal systems
 * Remedial→3-5, Standard→6-8, Honors→9-12, AP→9-12
 */
export type GradeBand = '3-5' | '6-8' | '9-12';

/**
 * Assessment type
 * Determines question distribution, timing expectations, and difficulty profile
 */
export type AssessmentType = 'Quiz' | 'Test' | 'Practice';

/**
 * Class level for internal systems
 * Used by Space Camp and Philosopher
 */
export type ClassLevel = 'standard' | 'honors' | 'AP';

/**
 * Subject for internal systems
 */
export type Subject = 'math' | 'english' | 'science' | 'history' | 'general';

/**
 * Assessment emphasis
 * Modifies Bloom distribution after level baseline
 */
export type AssessmentEmphasis = 'Balanced' | 'Procedural' | 'Conceptual' | 'Application' | 'ExamStyle';

/**
 * Difficulty profile
 * Controls spread of difficulty across problems
 */
export type DifficultyProfile = 'Balanced' | 'Foundational' | 'Challenging' | 'Stretch';

/**
 * Bloom levels (matching internal schema)
 */
export type BloomLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';

/**
 * Bloom distribution (percentages as decimals)
 * Sum should equal 1.0 (within ±0.02 tolerance)
 */
export interface BloomDistribution {
  Remember: number;
  Understand: number;
  Apply: number;
  Analyze: number;
  Evaluate: number;
  Create: number;
}

/**
 * Question distribution by Bloom level
 * Represents actual question counts per level (not percentages)
 * Used for detailed assessment breakdown
 */
export interface QuestionDistribution {
  Remember: number;
  Understand: number;
  Apply: number;
  Analyze: number;
  Evaluate: number;
  Create: number;
}

/**
 * Teacher's raw input for assessment generation
 * Step 1: Choose source (upload OR topic)
 * Step 2: Core inputs (Student Level, Type, Time)
 * Step 3: Optional Advanced (collapsed until clicked)
 */
export interface AssessmentIntent {
  // Source (Step 1) — REQUIRED: exactly one of sourceFile or sourceTopic
  sourceFile?: File; // PDF, Word, or text
  sourceTopic?: string; // e.g., "Sampling Distributions"

  // Core inputs (Step 2) — REQUIRED
  studentLevel: StudentLevel;
  assessmentType: AssessmentType;
  timeMinutes: number; // 5-240 minutes

  // Advanced options (Step 3) — OPTIONAL, all default to undefined if not provided
  focusAreas?: string[]; // specific skills to emphasize (max 5)
  emphasis?: AssessmentEmphasis; // what to prioritize
  difficultyProfile?: DifficultyProfile; // how to spread difficulty
  classroomContext?: string; // anything AI should know (max 500 chars)
}

/**
 * Validation result for AssessmentIntent
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Derived metadata for internal systems
 * Not shown to teacher, used to configure Space Camp payload
 */
export interface DerivedMetadata {
  gradeBand: GradeBand;
  classLevel: ClassLevel;
  subject: Subject;
  estimatedBloomDistribution: BloomDistribution;
  estimatedComplexityRange: [number, number]; // [min, max] in 0.0-1.0
  estimatedQuestionCount: number;
  estimatedTotalTimeMinutes: number;
  fatigueMultiplier: number;
}

/**
 * Complete summarized assessment intent
 * Output of summarizer service
 * 
 * - summary: what teacher sees (human-friendly)
 * - prompt: what AI writer sees (rich instructional context)
 * - spaceCampPayload: what Space Camp needs (hidden from teacher)
 * - derivedMetadata: tracking/validation data
 */
export interface SummarizedAssessmentIntent {
  // What teacher sees
  summary: string;

  // What AI writer sees (includes summary + enriched context)
  prompt: string;

  // What Space Camp receives (hidden from teacher)
  spaceCampPayload: {
    documentMetadata: {
      gradeBand: GradeBand;
      subject: Subject;
      classLevel: ClassLevel;
      timeTargetMinutes: number;
    };
    estimatedBloomTargets: BloomDistribution;
    complexityRange: [number, number];
    estimatedQuestionCount: number;
    // Optional enrichments (backward compatible)
    bloomCognitiveWeights?: Record<BloomLevel, Record<string, number>>;
    fatigueImpactMultiplier?: number;
    emphasizeConceptual?: boolean;
    emphasizeProcedural?: boolean;
    emphasizeApplication?: boolean;
    emphasizeExamStyle?: boolean;
    scaffoldingNeeded?: string;
    focusAreas?: string[];
  };

  // For validation/tracking
  derivedMetadata: DerivedMetadata;
}

/**
 * Mapping: StudentLevel → GradeBand
 */
export const STUDENT_LEVEL_TO_GRADE_BAND: Record<StudentLevel, GradeBand> = {
  Remedial: '3-5',
  Standard: '6-8',
  Honors: '9-12',
  AP: '9-12',
};

/**
 * Mapping: StudentLevel → ClassLevel
 */
export const STUDENT_LEVEL_TO_CLASS_LEVEL: Record<StudentLevel, ClassLevel> = {
  Remedial: 'standard',
  Standard: 'standard',
  Honors: 'honors',
  AP: 'AP',
};

/**
 * Bloom distributions by StudentLevel
 * Base distributions before emphasis modifiers
 */
export const BLOOM_DISTRIBUTIONS_BY_LEVEL: Record<StudentLevel, BloomDistribution> = {
  Remedial: {
    Remember: 0.25,
    Understand: 0.30,
    Apply: 0.30,
    Analyze: 0.10,
    Evaluate: 0.05,
    Create: 0.00,
  },
  Standard: {
    Remember: 0.10,
    Understand: 0.20,
    Apply: 0.35,
    Analyze: 0.25,
    Evaluate: 0.05,
    Create: 0.05,
  },
  Honors: {
    Remember: 0.05,
    Understand: 0.15,
    Apply: 0.30,
    Analyze: 0.30,
    Evaluate: 0.10,
    Create: 0.10,
  },
  AP: {
    Remember: 0.05,
    Understand: 0.10,
    Apply: 0.25,
    Analyze: 0.30,
    Evaluate: 0.15,
    Create: 0.15,
  },
};

/**
 * Emphasis modifiers
 * Applied AFTER level baseline (add/subtract percentages)
 */
export const EMPHASIS_MODIFIERS: Record<AssessmentEmphasis, BloomDistribution> = {
  Balanced: {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  },
  Procedural: {
    Remember: 0,
    Understand: 0,
    Apply: 0.10,
    Analyze: -0.05,
    Evaluate: -0.05,
    Create: 0,
  },
  Conceptual: {
    Remember: -0.05,
    Understand: 0.10,
    Apply: -0.10,
    Analyze: 0.10,
    Evaluate: 0,
    Create: 0,
  },
  Application: {
    Remember: 0,
    Understand: -0.05,
    Apply: 0.10,
    Analyze: 0.10,
    Evaluate: -0.05,
    Create: 0,
  },
  ExamStyle: {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
    // Special rules enforced separately: min 20% Analyze+Evaluate, min 5% Create if Honors/AP
  },
};

/**
 * Expected question counts by assessment type and time
 * Questions = timeMinutes / avgTimePerQuestion
 */
export const ESTIMATED_QUESTIONS_BY_TIME: Record<AssessmentType, number> = {
  Quiz: 0.2, // roughly 5 min per question
  Test: 0.24, // roughly 4 min per question
  Practice: 0.25, // roughly 4 min per question
};

/**
 * Fatigue multipliers by student level
 * Cumulative fatigue = (Σ priorEstimatedMinutes / timeTargetMinutes) × multiplier
 */
export const FATIGUE_MULTIPLIERS: Record<StudentLevel, number> = {
  Remedial: 0.02,
  Standard: 0.03,
  Honors: 0.035,
  AP: 0.04,
};

/**
 * Default complexity ranges by student level
 */
export const COMPLEXITY_RANGES: Record<StudentLevel, [number, number]> = {
  Remedial: [0.2, 0.5],
  Standard: [0.3, 0.7],
  Honors: [0.5, 0.9],
  AP: [0.6, 0.95],
};
