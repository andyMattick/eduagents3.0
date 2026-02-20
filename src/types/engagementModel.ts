/**
 * Engagement Modeling Types (Phase 5–6)
 *
 * Defines engagement calculation and tracking throughout problem-solving.
 * Engagement formula: engagement = baseWeight × confidence × (1 - fatigueIndex) × noveltyFactor
 */

/**
 * Configuration for engagement calculation
 * Maps problem types to base engagement weights
 */
export interface EngagementBaseWeights {
  'multiple-choice': number;
  'true-false': number;
  'short-answer': number;
  'essay': number;
  'matching': number;
}

/**
 * Breakdown of engagement score components
 * Used for transparency and debugging
 */
export interface EngagementBreakdown {
  baseWeight: number; // From problem type
  confidence: number; // From student profile (0-1)
  fatigueComponent: number; // (1 - fatigueIndex)
  noveltyBoost: number; // Math.sqrt(2 - similarityToPrevious); high novelty (low similarity) boosts engagement
  finalScore: number; // Final engagement score (0-1)
  reasoning: string; // Human-readable explanation
}

/**
 * Engagement metrics for a single problem interaction
 */
export interface ProblemEngagementMetrics {
  problemId: string;
  sequenceIndex: number;
  engagementScore: number; // 0-1
  breakdown: EngagementBreakdown;
  timestamp: string;
}

/**
 * Student-level engagement tracking across all problems
 */
export interface StudentEngagementArc {
  studentId: string;
  studentLevel: 'Remedial' | 'Standard' | 'Honors' | 'AP';
  totalProblems: number;
  metrics: ProblemEngagementMetrics[];
  averageEngagement: number; // Mean of all engagement scores
  engagementTrend: 'improving' | 'declining' | 'stable' | 'volatile';
  minEngagement: number;
  maxEngagement: number;
  fatigueImpact: {
    engagementAtStart: number; // engagement of first 1-3 problems
    engagementAtEnd: number; // engagement of last 1-3 problems
    declinePercent: number; // How much fatigue reduced engagement
  };
}

/**
 * Expected engagement ranges by student level
 */
export const ENGAGEMENT_RANGES_BY_LEVEL = {
  Remedial: { min: 0.4, max: 0.65 },
  Standard: { min: 0.55, max: 0.75 },
  Honors: { min: 0.65, max: 0.85 },
  AP: { min: 0.7, max: 0.9 },
} as const;

/**
 * Default engagement base weights by problem type
 * These are empirically-derived; can be tuned per assessment
 */
export const DEFAULT_ENGAGEMENT_BASE_WEIGHTS: EngagementBaseWeights = {
  'multiple-choice': 0.8, // Easy to engage, clear feedback
  'true-false': 0.75, // Simple format, low cognitive load
  'short-answer': 0.85, // Requires thought, moderately engaging
  'essay': 0.7, // High effort, can be draining
  'matching': 0.78, // Moderate engagement, visual variety
};
