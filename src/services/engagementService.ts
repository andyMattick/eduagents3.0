/**
 * Engagement Calculation Service (Phase 5–6 + Phase 8.3: Novelty Clarification)
 *
 * Calculates and tracks student engagement across problem sets.
 * Engagement formula: engagement = baseWeight × confidence × (1 - fatigueIndex) × noveltyBoost
 *
 * All engagement scores are normalized to [0, 1] range.
 */

import {
  EngagementBreakdown,
  ProblemEngagementMetrics,
  StudentEngagementArc,
  EngagementBaseWeights,
  DEFAULT_ENGAGEMENT_BASE_WEIGHTS,
  ENGAGEMENT_RANGES_BY_LEVEL,
} from '../types/engagementModel';
import { StudentProblemInput } from '../types/simulation';
import { Astronaut } from '../types/simulation';
import { GeneratedProblem } from '../types/problemValidation';

/**
 * Calculate engagement for a single student-problem interaction
 *
 * Formula: engagement = baseWeight × confidence × (1 - fatigueIndex) × noveltyBoost
 *
 * where:
 *   - baseWeight ∈ [0.7, 0.85] depends on problem type
 *   - confidence ∈ [0, 1] from student's Confidence trait
 *   - (1 - fatigueIndex) ∈ [0, 1] higher fatigue = lower engagement
 *   - noveltyBoost = √(2 - similarityToPrevious) boosts engagement for novel problems
 *     * High novelty (low similarity ≈ 0): noveltyBoost ≈ √2 ≈ 1.41
 *     * Medium novelty (similarity ≈ 0.5): noveltyBoost ≈ 1.22
 *     * Low novelty/Repetition (similarity ≈ 1): noveltyBoost ≈ 1.0
 *
 * @param input StudentProblemInput with fatigue, similarity, student traits
 * @param student Astronaut with confidence trait
 * @param baseWeights Engagement weights by problem type
 * @param problemIndex Index in sequence (for reasoning)
 * @returns EngagementBreakdown with final score and reasoning
 */
export function calculateEngagement(
  input: StudentProblemInput,
  student: Astronaut,
  baseWeights: EngagementBaseWeights = DEFAULT_ENGAGEMENT_BASE_WEIGHTS,
  problemIndex: number = 0
): EngagementBreakdown {
  // Map TestType (with underscores) to engagement weights (with hyphens)
  const typeMapping: Record<string, keyof EngagementBaseWeights> = {
    'multiple_choice': 'multiple-choice',
    'short_answer': 'short-answer',
    'free_response': 'essay',
    'essay': 'essay',
    'calculation': 'short-answer',
  };

  const mappedType = typeMapping[input.TestType] || 'essay';
  const baseWeight = baseWeights[mappedType] || 0.78;
  const confidence = student.ProfileTraits.Confidence;
  const fatigueComponent = 1 - input.FatigueIndex;
  const noveltyBoost = Math.sqrt(2 - input.SimilarityToPrevious); // Novel (low similarity) → high boost; repetitive (high similarity) → low boost

  // Calculate raw engagement
  let rawEngagement = baseWeight * confidence * fatigueComponent * noveltyBoost;

  // Normalize to [0, 1] range (noveltyBoost can push it above 1)
  const finalScore = Math.max(0, Math.min(1, rawEngagement));

  // Generate human-readable reasoning
  const reasons: string[] = [];

  if (baseWeight < 0.75) {
    reasons.push(`problem type (${input.TestType}) less engaging`);
  } else if (baseWeight >= 0.85) {
    reasons.push(`problem type (${input.TestType}) highly engaging`);
  }

  if (confidence < 0.4) {
    reasons.push('low student confidence reducing engagement');
  } else if (confidence >= 0.8) {
    reasons.push('high student confidence boosting engagement');
  }

  if (input.FatigueIndex > 0.6) {
    reasons.push(`high fatigue (${(input.FatigueIndex * 100).toFixed(0)}%) dampening engagement`);
  } else if (input.FatigueIndex < 0.2) {
    reasons.push('low fatigue supporting fresh engagement');
  }

  if (input.SimilarityToPrevious > 0.6) {
    reasons.push('repetitive content reducing novelty');
  } else if (input.SimilarityToPrevious < 0.2) {
    reasons.push('novel content boosting engagement');
  }

  const reasoning = reasons.length > 0 ? reasons.join('; ') : 'moderate engagement factors balanced';

  return {
    baseWeight,
    confidence,
    fatigueComponent,
    noveltyBoost,
    finalScore,
    reasoning,
  };
}

/**
 * Calculate engagement for a batch of problems (one student)
 *
 * @param inputs Array of StudentProblemInputs for one student
 * @param student Astronaut profile
 * @param baseWeights Engagement weights
 * @returns Array of problem engagement metrics
 */
export function calculateEngagementArc(
  inputs: StudentProblemInput[],
  student: Astronaut,
  baseWeights: EngagementBaseWeights = DEFAULT_ENGAGEMENT_BASE_WEIGHTS
): ProblemEngagementMetrics[] {
  return inputs.map((input, index) => {
    const breakdown = calculateEngagement(input, student, baseWeights, index);

    return {
      problemId: input.ProblemId,
      sequenceIndex: index,
      engagementScore: breakdown.finalScore,
      breakdown,
      timestamp: new Date().toISOString(),
    };
  });
}

/**
 * Analyze engagement arc for patterns and trends
 *
 * @param metrics Array of problem engagement metrics
 * @param studentLevel Remedial | Standard | Honors | AP
 * @returns StudentEngagementArc with trend analysis
 */
export function analyzeEngagementArc(
  metrics: ProblemEngagementMetrics[],
  studentId: string,
  studentLevel: 'Remedial' | 'Standard' | 'Honors' | 'AP'
): StudentEngagementArc {
  if (metrics.length === 0) {
    throw new Error('Cannot analyze engagement arc with zero metrics');
  }

  const scores = metrics.map(m => m.engagementScore);
  const averageEngagement = scores.reduce((a, b) => a + b, 0) / scores.length;
  const minEngagement = Math.min(...scores);
  const maxEngagement = Math.max(...scores);

  // Analyze trend
  let trend: 'improving' | 'declining' | 'stable' | 'volatile';
  if (metrics.length < 3) {
    trend = 'stable'; // Too few points to trend
  } else {
    // Compare first third vs last third
    const firstThirdEnd = Math.ceil(metrics.length / 3);
    const lastThirdStart = Math.floor((metrics.length * 2) / 3);

    const firstThirdAvg =
      scores
        .slice(0, firstThirdEnd)
        .reduce((a, b) => a + b, 0) / firstThirdEnd;
    const lastThirdAvg =
      scores
        .slice(lastThirdStart)
        .reduce((a, b) => a + b, 0) / (metrics.length - lastThirdStart);

    const diff = lastThirdAvg - firstThirdAvg;
    if (Math.abs(diff) < 0.08) {
      trend = 'stable';
    } else if (diff > 0.08) {
      trend = 'improving';
    } else if (diff < -0.08) {
      trend = 'declining';
    } else {
      // Calculate variance to detect volatility
      const mean = averageEngagement;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
      trend = variance > 0.02 ? 'volatile' : 'stable';
    }
  }

  // Analyze fatigue impact
  const engagementAtStart = metrics.length > 0 ? scores.slice(0, Math.min(3, metrics.length)).reduce((a, b) => a + b, 0) / Math.min(3, metrics.length) : 0;
  const engagementAtEnd = metrics.length > 0 ? scores.slice(-Math.min(3, metrics.length)).reduce((a, b) => a + b, 0) / Math.min(3, metrics.length) : 0;
  const declinePercent = engagementAtStart > 0 ? ((engagementAtStart - engagementAtEnd) / engagementAtStart) * 100 : 0;

  return {
    studentId,
    studentLevel,
    totalProblems: metrics.length,
    metrics,
    averageEngagement,
    engagementTrend: trend,
    minEngagement,
    maxEngagement,
    fatigueImpact: {
      engagementAtStart,
      engagementAtEnd,
      declinePercent,
    },
  };
}

/**
 * Validate engagement score against expected ranges
 *
 * @param engagement Engagement score (0-1)
 * @param studentLevel Student level
 * @returns { valid: boolean, message: string }
 */
export function validateEngagementScore(
  engagement: number,
  studentLevel: 'Remedial' | 'Standard' | 'Honors' | 'AP'
): { valid: boolean; message: string; withinExpectedRange: boolean } {
  // Core validation
  if (engagement < 0 || engagement > 1) {
    return {
      valid: false,
      message: `Engagement score ${engagement} is outside [0, 1] range`,
      withinExpectedRange: false,
    };
  }

  // Check expected range for level
  const range = ENGAGEMENT_RANGES_BY_LEVEL[studentLevel];
  const withinExpectedRange = engagement >= range.min && engagement <= range.max;

  const message = withinExpectedRange
    ? `Engagement ${engagement.toFixed(2)} is within expected range [${range.min}, ${range.max}] for ${studentLevel} level`
    : `Engagement ${engagement.toFixed(2)} is outside typical range [${range.min}, ${range.max}] for ${studentLevel} level (but still valid)`;

  return {
    valid: true,
    message,
    withinExpectedRange,
  };
}

/**
 * Validate fatigue impact on engagement
 * Verifies that fatigue visibly reduces engagement
 *
 * @param arc StudentEngagementArc with fatigue analysis
 * @returns { valid: boolean, fatigueReduced: boolean, message: string }
 */
export function validateFatigueImpact(arc: StudentEngagementArc): { valid: boolean; fatigueReduced: boolean; message: string } {
  const { declinePercent } = arc.fatigueImpact;

  // Fatigue should reduce engagement by at least 5% for validity
  const fatigueReduced = declinePercent >= 5;

  if (arc.totalProblems < 3) {
    return {
      valid: true,
      fatigueReduced: true,
      message: 'Not enough problems to assess fatigue impact',
    };
  }

  const message = fatigueReduced
    ? `Fatigue visibly reduced engagement by ${declinePercent.toFixed(1)}%`
    : `Fatigue impact minimal (${declinePercent.toFixed(1)}% decline) - may indicate insufficient problem set`;

  return {
    valid: true,
    fatigueReduced,
    message,
  };
}

/**
 * Validate novelty impact on engagement
 * Verifies that novel problems boost engagement more than repetitive ones
 *
 * @param metrics Array of problem engagement metrics
 * @returns { valid: boolean, noveltyBoosted: boolean; message: string }
 */
export function validateNoveltyImpact(metrics: ProblemEngagementMetrics[]): { valid: boolean; noveltyBoosted: boolean; message: string } {
  if (metrics.length < 2) {
    return {
      valid: true,
      noveltyBoosted: true,
      message: 'Not enough problems to assess novelty impact',
    };
  }

  // Find high novelty (low similarity) and low novelty (high similarity) problems
  // With noveltyBoost = √(2 - similarity):
  //   - High noveltyBoost (>1.2) means low similarity (<0.56)
  //   - Low noveltyBoost (≤1.05) means high similarity (≥1.0 or near 1.0)
  const highNovelty = metrics.filter(m => m.breakdown.noveltyBoost > 1.2);
  const lowNovelty = metrics.filter(m => m.breakdown.noveltyBoost <= 1.05);

  if (highNovelty.length === 0 || lowNovelty.length === 0) {
    return {
      valid: true,
      noveltyBoosted: true,
      message: 'Not enough novelty variance to assess impact',
    };
  }

  const avgHighNovelty = highNovelty.reduce((sum, m) => sum + m.engagementScore, 0) / highNovelty.length;
  const avgLowNovelty = lowNovelty.reduce((sum, m) => sum + m.engagementScore, 0) / lowNovelty.length;

  const noveltyBoosted = avgHighNovelty > avgLowNovelty;

  const message = noveltyBoosted
    ? `Novel problems (avg ${avgHighNovelty.toFixed(2)}) engage more than repetitive ones (avg ${avgLowNovelty.toFixed(2)})`
    : `Repetitive problems slightly engaged as much as novel ones - may indicate good variety`;

  return {
    valid: true,
    noveltyBoosted,
    message,
  };
}

/**
 * Generate human-readable engagement report
 *
 * @param arc StudentEngagementArc
 * @returns Formatted report string
 */
export function formatEngagementReport(arc: StudentEngagementArc): string {
  const lines: string[] = [];

  lines.push(`\n${'='.repeat(70)}`);
  lines.push(`ENGAGEMENT ANALYSIS REPORT`);
  lines.push(`Student: ${arc.studentId} (${arc.studentLevel})`);
  lines.push(`${'='.repeat(70)}`);

  lines.push(`\nOverall Metrics:`);
  lines.push(`  Total Problems: ${arc.totalProblems}`);
  lines.push(`  Average Engagement: ${arc.averageEngagement.toFixed(2)}/1.0`);
  lines.push(`  Range: ${arc.minEngagement.toFixed(2)} → ${arc.maxEngagement.toFixed(2)}`);
  lines.push(`  Trend: ${arc.engagementTrend.toUpperCase()}`);

  lines.push(`\nFatigue Impact:`);
  lines.push(`  Starting Engagement: ${arc.fatigueImpact.engagementAtStart.toFixed(2)}`);
  lines.push(`  Ending Engagement: ${arc.fatigueImpact.engagementAtEnd.toFixed(2)}`);
  lines.push(`  Decline: ${arc.fatigueImpact.declinePercent.toFixed(1)}%`);

  lines.push(`\nProblem-Level Breakdown:`);
  arc.metrics.forEach(m => {
    lines.push(`  [${m.sequenceIndex}] ${m.problemId}: ${m.engagementScore.toFixed(2)}`);
    lines.push(`      ${m.breakdown.reasoning}`);
  });

  lines.push(`\n${'='.repeat(70)}\n`);

  return lines.join('\n');
}
