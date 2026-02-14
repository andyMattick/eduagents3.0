/**
 * SPACE CAMP CONFIGURATION SCHEMA
 * 
 * TypeScript interfaces and constants for what gets passed to Space Camp
 * for student stats generation.
 * 
 * Export this file for external Space Camp documentation.
 */

// ============================================================================
// PROBLEM PAYLOAD
// ============================================================================

export interface SpaceCampProblem {
  ProblemId: string;
  Type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'matching';
  BloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  Content: string;
  CorrectAnswer: string;
  LinguisticComplexity: number; // 0.0-1.0
  EstimatedTimeMinutes: number;
  Difficulty: 1 | 2 | 3 | 4 | 5;
  SequenceIndex: number;
}

// ============================================================================
// DOCUMENT CONTEXT
// ============================================================================

export type GradeBand = '3-5' | '6-8' | '9-12';
export type Subject = 'math' | 'english' | 'science' | 'history' | 'general';
export type ClassLevel = 'standard' | 'honors' | 'AP';

export interface DocumentMetadata {
  gradeBand: GradeBand;
  subject: Subject;
  classLevel: ClassLevel;
  timeTargetMinutes: number;
}

// ============================================================================
// ASTRONAUT SCORING RULES (THE KEY!)
// ============================================================================

export interface AstronautRubric {
  gradeBandBaselines: {
    '3-5': BaselineStats;
    '6-8': BaselineStats;
    '9-12': BaselineStats;
  };
  classLevelMultipliers: {
    standard: number;
    honors: number;
    AP: number;
  };
  subjectModifiers: {
    math: StatsModifier;
    english: StatsModifier;
    science: StatsModifier;
    history: StatsModifier;
    general: StatsModifier;
  };
  overlayMultipliers: {
    adhd: StatsModifier;
    dyslexia: StatsModifier;
    fatigue_sensitive: StatsModifier;
    esl: StatsModifier;
    anxiety_prone: StatsModifier;
  };
}

export interface BaselineStats {
  readingLevel: [number, number];        // [min, max]
  mathLevel: [number, number];
  stamina: [number, number];
  reasoning: [number, number];
  confusionTolerance: [number, number];
}

export interface StatsModifier {
  readingLevel?: number;
  mathLevel?: number;
  reasoning?: number;
  stamina?: number;
  confidence?: number;
  confusionTolerance?: number;
}

// ============================================================================
// SPACE CAMP REQUEST (WHAT WE SEND)
// ============================================================================

export interface SpaceCampRequest {
  documentId: string;
  problems: SpaceCampProblem[];
  scoring_rules: AstronautRubric;
  document_metadata: DocumentMetadata;
}

// ============================================================================
// STUDENT STATS (WHAT SPACE CAMP GENERATES)
// ============================================================================

export interface StudentBaseStats {
  readingLevel: number;      // 0.0-1.0
  reasoningLevel: number;    // 0.0-1.0
  mathFluency: number;       // 0.0-1.0
  attentionSpan: number;     // 0.0-1.0
  confidence: number;        // 0.0-1.0
}

export interface GeneratedStudent {
  studentId: string;
  personaName: string;
  baseStats: StudentBaseStats;
  overlays: string[];
  gradeBand: GradeBand;
}

// ============================================================================
// SIMULATION OUTPUT (WHAT SPACE CAMP RETURNS)
// ============================================================================

export interface ProblemSimulationResult {
  problemId: string;
  studentId: string;
  
  // Performance metrics
  success: boolean;
  timeSeconds: number;
  confusionIndex: number;    // 0.0-1.0
  engagementScore: number;   // 0.0-1.0
  
  // Cumulative effects
  cumulativeFatigue: number; // 0.0-1.0
  fatigueMultiplier: number; // how much fatigue hurts this problem
}

export interface StudentSimulationResult {
  studentId: string;
  personaName: string;
  overlays: string[];
  
  // Overall performance
  successRate: number;           // 0.0-1.0 (% correct)
  averageTimePerProblem: number; // seconds
  cumulativeFatigue: number;     // 0.0-1.0
  
  // Problem-specific
  problemResults: ProblemSimulationResult[];
  struggledProblemIds: string[];
  
  // Engagement
  averageEngagement: number;     // 0.0-1.0
  flaggedAsAtRisk: boolean;
}

export interface SpaceCampResponse {
  documentId: string;
  problems: SpaceCampProblem[];
  students: GeneratedStudent[];
  simulations: StudentSimulationResult[];
  
  // Aggregated predictions
  metadata: {
    predictedCompletionRate: number;       // % who finish
    predictedAverageTime: number;          // minutes
    estimatedTotalTime: number;            // minutes needed
    riskLevel: 'low' | 'medium' | 'high';
    averageSuccessRate: number;            // 0.0-1.0
  };
}

// ============================================================================
// EXAMPLE VALUES (FOR DOCUMENTATION)
// ============================================================================

export const EXAMPLE_PROBLEM: SpaceCampProblem = {
  ProblemId: 'prob_001',
  Type: 'multiple-choice',
  BloomLevel: 'Remember',
  Content: 'What is 15 × 3?',
  CorrectAnswer: '45',
  LinguisticComplexity: 0.2,
  EstimatedTimeMinutes: 1.5,
  Difficulty: 1,
  SequenceIndex: 0,
};

export const EXAMPLE_METADATA: DocumentMetadata = {
  gradeBand: '6-8',
  subject: 'math',
  classLevel: 'standard',
  timeTargetMinutes: 45,
};

export const EXAMPLE_BASELINE_STATS: BaselineStats = {
  readingLevel: [0.40, 0.70],
  mathLevel: [0.45, 0.75],
  stamina: [0.45, 0.75],
  reasoning: [0.45, 0.75],
  confusionTolerance: [0.45, 0.75],
};

export const EXAMPLE_STUDENT_STATS: StudentBaseStats = {
  readingLevel: 0.55,
  reasoningLevel: 0.58,
  mathFluency: 0.62,
  attentionSpan: 0.65,
  confidence: 0.60,
};

export const EXAMPLE_GENERATED_STUDENT: GeneratedStudent = {
  studentId: 'astronaut_001',
  personaName: 'Alex (ADHD, Math-Capable)',
  baseStats: EXAMPLE_STUDENT_STATS,
  overlays: ['adhd'],
  gradeBand: '6-8',
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function isValidGradeBand(value: any): value is GradeBand {
  return ['3-5', '6-8', '9-12'].includes(value);
}

export function isValidSubject(value: any): value is Subject {
  return ['math', 'english', 'science', 'history', 'general'].includes(value);
}

export function isValidClassLevel(value: any): value is ClassLevel {
  return ['standard', 'honors', 'AP'].includes(value);
}

export function isValidBloomLevel(value: any): value is SpaceCampProblem['BloomLevel'] {
  return ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].includes(value);
}

export function validateSpaceCampRequest(request: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.problems || !Array.isArray(request.problems)) {
    errors.push('problems must be an array');
  } else {
    request.problems.forEach((p: any, idx: number) => {
      if (!p.ProblemId) errors.push(`Problem ${idx}: missing ProblemId`);
      if (!isValidBloomLevel(p.BloomLevel)) errors.push(`Problem ${idx}: invalid BloomLevel`);
      if (typeof p.LinguisticComplexity !== 'number' || p.LinguisticComplexity < 0 || p.LinguisticComplexity > 1) {
        errors.push(`Problem ${idx}: LinguisticComplexity must be 0.0-1.0`);
      }
      if (typeof p.EstimatedTimeMinutes !== 'number' || p.EstimatedTimeMinutes <= 0) {
        errors.push(`Problem ${idx}: EstimatedTimeMinutes must be positive`);
      }
    });
  }

  if (!isValidGradeBand(request.document_metadata?.gradeBand)) {
    errors.push('document_metadata.gradeBand must be 3-5, 6-8, or 9-12');
  }

  if (!isValidSubject(request.document_metadata?.subject)) {
    errors.push('document_metadata.subject must be valid');
  }

  if (!isValidClassLevel(request.document_metadata?.classLevel)) {
    errors.push('document_metadata.classLevel must be standard, honors, or AP');
  }

  if (!request.scoring_rules) {
    errors.push('scoring_rules (AstronautRubric) is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
