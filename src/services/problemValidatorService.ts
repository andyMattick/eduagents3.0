/**
 * Problem Validator Service (Phase 4)
 *
 * Validates AI-generated problems against strict specifications.
 * Ensures all generated problems meet contract requirements:
 * - Required fields present and valid
 * - Bloom distribution matches targets ±5%
 * - Total time matches target ±10%
 * - All constraints satisfied
 */

import {
  GeneratedProblem,
  ValidationError,
  ProblemValidationResult,
  ProblemsValidationResult,
  BatchValidationError,
  ProblemValidationConfig,
  AssessmentTargets,
  ProblembatchStatistics,
  BloomLevel,
  BloomDistribution,
  DifficultyRating,
} from '../types/problemValidation';

/**
 * Default validation configuration
 * Can be overridden per assessment
 */
export const DEFAULT_VALIDATION_CONFIG: ProblemValidationConfig = {
  timeAllowancePercent: 10, // ±10%
  minTime: 1, // At least 1 minute per problem
  maxTime: 120, // At most 120 minutes per problem
  minComplexity: 0.1, // Never exactly 0
  maxComplexity: 0.9, // Never exactly 1
  bloomTolerancePercent: 5, // ±5%
  requiredFields: ['ProblemId', 'BloomLevel', 'LinguisticComplexity', 'EstimatedTimeMinutes', 'Difficulty', 'Type', 'Content'],
  difficultyRange: [1, 5],
};

/**
 * Validate a single problem against configuration
 *
 * @param problem The problem to validate
 * @param config Validation configuration
 * @param problemIndex Index in batch (for error reporting)
 * @returns Validation result with any errors
 */
export function validateSingleProblem(
  problem: Partial<GeneratedProblem>,
  config: ProblemValidationConfig = DEFAULT_VALIDATION_CONFIG,
  problemIndex: number = 0
): ProblemValidationResult {
  const errors: ValidationError[] = [];

  const problemId = (problem?.ProblemId as string) || `Problem-${problemIndex}`;

  // Check required fields
  config.requiredFields.forEach(field => {
    if (problem?.[field as keyof GeneratedProblem] === undefined || problem?.[field as keyof GeneratedProblem] === null) {
      errors.push({
        problemId,
        problemIndex,
        field,
        value: undefined,
        constraint: `Field ${field} is required`,
        message: `Problem missing required field: ${field}`,
      });
    }
  });

  // Validate BloomLevel
  if (problem?.BloomLevel) {
    const validBloomLevels: BloomLevel[] = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
    if (!validBloomLevels.includes(problem.BloomLevel as BloomLevel)) {
      errors.push({
        problemId,
        problemIndex,
        field: 'BloomLevel',
        value: problem.BloomLevel,
        constraint: `BloomLevel must be one of: ${validBloomLevels.join(', ')}`,
        message: `Invalid BloomLevel: ${problem.BloomLevel}`,
      });
    }
  }

  // Validate LinguisticComplexity
  if (problem?.LinguisticComplexity !== undefined) {
    const complexity = problem.LinguisticComplexity as number;
    if (complexity < 0 || complexity > 1) {
      errors.push({
        problemId,
        problemIndex,
        field: 'LinguisticComplexity',
        value: complexity,
        constraint: `LinguisticComplexity must be in range [0.0, 1.0]`,
        message: `LinguisticComplexity ${complexity} is outside valid range`,
      });
    }
    if (complexity === 0 || complexity === 1) {
      errors.push({
        problemId,
        problemIndex,
        field: 'LinguisticComplexity',
        value: complexity,
        constraint: `LinguisticComplexity must be in range [${config.minComplexity}, ${config.maxComplexity}] (not exactly 0 or 1)`,
        message: `LinguisticComplexity should not be exactly ${complexity}; recommend ${config.minComplexity}–${config.maxComplexity}`,
      });
    }
  }

  // Validate EstimatedTimeMinutes
  if (problem?.EstimatedTimeMinutes !== undefined) {
    const time = problem.EstimatedTimeMinutes as number;
    if (!Number.isInteger(time) || time <= 0) {
      errors.push({
        problemId,
        problemIndex,
        field: 'EstimatedTimeMinutes',
        value: time,
        constraint: 'EstimatedTimeMinutes must be a positive integer',
        message: `EstimatedTimeMinutes ${time} is invalid (must be > 0 and integer)`,
      });
    }
    if (time < config.minTime || time > config.maxTime) {
      errors.push({
        problemId,
        problemIndex,
        field: 'EstimatedTimeMinutes',
        value: time,
        constraint: `EstimatedTimeMinutes must be in range [${config.minTime}, ${config.maxTime}]`,
        message: `EstimatedTimeMinutes ${time} is outside allowed range`,
      });
    }
  }

  // Validate Difficulty
  if (problem?.Difficulty !== undefined) {
    const difficulty = problem.Difficulty as DifficultyRating;
    if (![1, 2, 3, 4, 5].includes(difficulty)) {
      errors.push({
        problemId,
        problemIndex,
        field: 'Difficulty',
        value: difficulty,
        constraint: 'Difficulty must be 1, 2, 3, 4, or 5',
        message: `Invalid Difficulty: ${difficulty}`,
      });
    }
  }

  // Validate SequenceIndex
  if (problem?.SequenceIndex !== undefined) {
    const index = problem.SequenceIndex as number;
    if (!Number.isInteger(index) || index < 0) {
      errors.push({
        problemId,
        problemIndex,
        field: 'SequenceIndex',
        value: index,
        constraint: 'SequenceIndex must be non-negative integer',
        message: `Invalid SequenceIndex: ${index}`,
      });
    }
  }

  // Validate Type
  if (problem?.Type) {
    const validTypes = ['multiple-choice', 'true-false', 'short-answer', 'essay', 'matching'];
    if (!validTypes.includes(problem.Type as string)) {
      errors.push({
        problemId,
        problemIndex,
        field: 'Type',
        value: problem.Type,
        constraint: `Type must be one of: ${validTypes.join(', ')}`,
        message: `Invalid Type: ${problem.Type}`,
      });
    }
  }

  // Validate Content exists and is non-empty
  if (!problem?.Content || (typeof problem.Content === 'string' && problem.Content.trim().length === 0)) {
    errors.push({
      problemId,
      problemIndex,
      field: 'Content',
      value: problem?.Content,
      constraint: 'Content must be non-empty string',
      message: 'Problem Content is missing or empty',
    });
  }

  return {
    valid: errors.length === 0,
    problemId,
    problemIndex,
    errors,
  };
}

/**
 * Calculate batch statistics from problems
 *
 * @param problems Array of problems
 * @returns Statistics object
 */
export function calculateBatchStatistics(problems: GeneratedProblem[]): ProblembatchStatistics {
  const bloomDist: Record<BloomLevel, number> = {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  };

  const difficultyDist: Record<DifficultyRating, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  const typeDist: Record<string, number> = {};

  let totalTime = 0;
  let totalComplexity = 0;

  problems.forEach(p => {
    totalTime += p.EstimatedTimeMinutes;
    totalComplexity += p.LinguisticComplexity;
    bloomDist[p.BloomLevel]++;
    difficultyDist[p.Difficulty]++;
    typeDist[p.Type] = (typeDist[p.Type] || 0) + 1;
  });

  // Convert counts to percentages
  const bloomPercentages: Record<BloomLevel, number> = {} as any;
  Object.keys(bloomDist).forEach(key => {
    bloomPercentages[key as BloomLevel] = bloomDist[key as BloomLevel] / problems.length;
  });

  return {
    totalProblems: problems.length,
    totalTime,
    averageComplexity: totalComplexity / problems.length,
    bloomDistribution: bloomPercentages,
    difficultyDistribution: difficultyDist,
    typeDistribution: typeDist,
    averageTimePerProblem: totalTime / problems.length,
  };
}

/**
 * Validate Bloom distribution against targets
 *
 * @param actualDistribution Actual distribution from problems
 * @param targetDistribution Target distribution from teacher intent
 * @param tolerance Tolerance percentage (e.g., 5 for ±5%)
 * @returns { valid: boolean, errors: BatchValidationError[], message: string }
 */
export function validateBloomDistribution(
  actualDistribution: Record<BloomLevel, number>,
  targetDistribution: BloomDistribution,
  tolerance: number = 5
): { valid: boolean; errors: BatchValidationError[]; message: string } {
  const errors: BatchValidationError[] = [];
  const toleranceFraction = tolerance / 100;

  let allWithinTolerance = true;

  const bloomLevels: BloomLevel[] = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

  bloomLevels.forEach(level => {
    const actual = actualDistribution[level] || 0;
    const target = (targetDistribution as Record<BloomLevel, number>)[level];

    const lowerBound = target - toleranceFraction;
    const upperBound = target + toleranceFraction;

    if (actual < lowerBound || actual > upperBound) {
      allWithinTolerance = false;
    }
  });

  if (!allWithinTolerance) {
    const distribution: Record<string, string> = {};
    bloomLevels.forEach(level => {
      const actual = ((actualDistribution[level] || 0) * 100).toFixed(1);
      const target = ((targetDistribution as Record<BloomLevel, number>)[level] * 100).toFixed(1);
      distribution[level] = `${actual}% (target: ${target}%)`;
    });

    errors.push({
      type: 'BLOOM_DISTRIBUTION_MISMATCH',
      message: `Bloom distribution does not match targets (tolerance: ±${tolerance}%)`,
      details: distribution,
    });
  }

  const message = allWithinTolerance ? 'Bloom distribution matches targets' : 'Bloom distribution exceeds tolerance';

  return {
    valid: allWithinTolerance,
    errors,
    message,
  };
}

/**
 * Validate total time against target
 *
 * @param totalTime Actual total time from problems
 * @param targetTime Target time from teacher intent
 * @param allowancePercent Time allowance percentage (default ±10%)
 * @returns { valid: boolean, error?: BatchValidationError, message: string }
 */
export function validateTotalTime(
  totalTime: number,
  targetTime: number,
  allowancePercent: number = 10
): { valid: boolean; error?: BatchValidationError; message: string } {
  const allowanceFraction = allowancePercent / 100;
  const lowerBound = targetTime * (1 - allowanceFraction);
  const upperBound = targetTime * (1 + allowanceFraction);

  const valid = totalTime >= lowerBound && totalTime <= upperBound;

  if (!valid) {
    return {
      valid: false,
      error: {
        type: 'TOTAL_TIME_OUT_OF_RANGE',
        message: `Total time ${totalTime}min is outside allowed range [${lowerBound.toFixed(0)}, ${upperBound.toFixed(0)}] (target: ${targetTime}min ±${allowancePercent}%)`,
        details: {
          totalTime,
          targetTime,
          lowerBound: lowerBound.toFixed(1),
          upperBound: upperBound.toFixed(1),
          allowancePercent,
        },
      },
      message: `Total time out of range: ${totalTime}min (expected ~${targetTime}min ±${allowancePercent}%)`,
    };
  }

  return {
    valid: true,
    message: `Total time ${totalTime}min is within target range`,
  };
}

/**
 * Validate sequence indices are contiguous
 *
 * @param problems Array of problems
 * @returns { valid: boolean, error?: BatchValidationError }
 */
export function validateSequenceIndices(problems: GeneratedProblem[]): {
  valid: boolean;
  error?: BatchValidationError;
} {
  const indices = problems.map(p => p.SequenceIndex).sort((a, b) => a - b);

  for (let i = 0; i < indices.length; i++) {
    if (indices[i] !== i) {
      return {
        valid: false,
        error: {
          type: 'SEQUENCE_INDEX_NOT_CONTIGUOUS',
          message: `SequenceIndex values are not contiguous. Expected [0, 1, 2, ..., ${indices.length - 1}] but got [${indices.join(', ')}]`,
          details: { actual: indices, expected: Array.from({ length: indices.length }, (_, i) => i) },
        },
      };
    }
  }

  return { valid: true };
}

/**
 * Validate batch of problems against targets
 *
 * @param problems Array of problems to validate
 * @param targets Assessment targets (time, Bloom distribution, etc.)
 * @param config Validation configuration
 * @returns Complete validation result
 */
export function validateProblems(
  problems: Partial<GeneratedProblem>[],
  targets: AssessmentTargets,
  config: ProblemValidationConfig = DEFAULT_VALIDATION_CONFIG
): ProblemsValidationResult {
  const details: ProblemValidationResult[] = [];
  const batchErrors: BatchValidationError[] = [];

  // Validate individual problems
  problems.forEach((problem, index) => {
    const result = validateSingleProblem(problem, config, index);
    details.push(result);
  });

  // Count valid/invalid
  const validProblems = details.filter(d => d.valid).length;
  const invalidProblems = details.length - validProblems;

  // Only proceed with batch checks if all individual problems are valid
  if (invalidProblems === 0) {
    // Cast to full problems (we know they're valid)
    const validProblemsList = problems as GeneratedProblem[];

    // Check sequence indices
    const seqIndexCheck = validateSequenceIndices(validProblemsList);
    if (!seqIndexCheck.valid) {
      batchErrors.push(seqIndexCheck.error!);
    }

    // Calculate statistics
    const stats = calculateBatchStatistics(validProblemsList);

    // Check total time
    const timeCheck = validateTotalTime(stats.totalTime, targets.totalTimeMinutes, config.timeAllowancePercent);
    if (!timeCheck.valid) {
      batchErrors.push(timeCheck.error!);
    }

    // Check Bloom distribution
    const bloomCheck = validateBloomDistribution(stats.bloomDistribution, targets.bloomTargets, config.bloomTolerancePercent);
    if (!bloomCheck.valid) {
      batchErrors.push(...bloomCheck.errors);
    }

    // Check problem count matches target
    if (targets.expectedQuestionCount && validProblemsList.length !== targets.expectedQuestionCount) {
      batchErrors.push({
        type: 'PROBLEM_COUNT_MISMATCH',
        message: `Problem count ${validProblemsList.length} does not match expected count ${targets.expectedQuestionCount}`,
        details: {
          actual: validProblemsList.length,
          expected: targets.expectedQuestionCount,
        },
      });
    }
  }

  const overallValid = invalidProblems === 0 && batchErrors.length === 0;

  return {
    valid: overallValid,
    totalProblems: problems.length,
    validProblems,
    invalidProblems,
    details,
    batchErrors,
  };
}

/**
 * Generate human-readable validation report
 *
 * @param result Validation result
 * @returns Formatted report string
 */
export function formatValidationReport(result: ProblemsValidationResult): string {
  const lines: string[] = [];

  lines.push(`\n${'='.repeat(70)}`);
  lines.push(`VALIDATION REPORT`);
  lines.push(`${'='.repeat(70)}`);

  // Summary
  lines.push(`\nStatus: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
  lines.push(`Problems: ${result.validProblems}/${result.totalProblems} valid`);

  // Individual problem errors
  if (result.invalidProblems > 0) {
    lines.push(`\n${'─'.repeat(70)}`);
    lines.push(`PROBLEM-LEVEL ERRORS (${result.invalidProblems})`);
    lines.push(`${'─'.repeat(70)}`);

    result.details
      .filter(d => !d.valid)
      .forEach(detail => {
        lines.push(`\n[${detail.problemIndex}] ${detail.problemId}`);
        detail.errors.forEach(err => {
          lines.push(`  • ${err.field}: ${err.message}`);
          lines.push(`    Constraint: ${err.constraint}`);
        });
      });
  }

  // Batch-level errors
  if (result.batchErrors.length > 0) {
    lines.push(`\n${'─'.repeat(70)}`);
    lines.push(`BATCH-LEVEL ERRORS (${result.batchErrors.length})`);
    lines.push(`${'─'.repeat(70)}`);

    result.batchErrors.forEach(err => {
      lines.push(`\n[${err.type}] ${err.message}`);
      if (Object.keys(err.details).length > 0) {
        lines.push(`  Details:`);
        Object.entries(err.details).forEach(([key, value]) => {
          lines.push(`    ${key}: ${JSON.stringify(value)}`);
        });
      }
    });
  }

  lines.push(`\n${'='.repeat(70)}\n`);

  return lines.join('\n');
}
