/**
 * Problem Validator Service Test Suite (Phase 4)
 *
 * Comprehensive testing of all validation functions:
 * - Single problem validation
 * - Batch problem validation
 * - Bloom distribution matching
 * - Time constraint checking
 * - Sequence integrity
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateSingleProblem,
  validateProblems,
  calculateBatchStatistics,
  validateBloomDistribution,
  validateTotalTime,
  validateSequenceIndices,
  formatValidationReport,
  DEFAULT_VALIDATION_CONFIG,
} from '../problemValidatorService';
import {
  GeneratedProblem,
  ProblemValidationConfig,
  AssessmentTargets,
} from '../../types/problemValidation';
import { BLOOM_DISTRIBUTIONS_BY_LEVEL } from '../../types/assessmentIntent';

// ────────── SAMPLE DATA ──────────

const validProblem1: GeneratedProblem = {
  ProblemId: 'P001',
  BloomLevel: 'Remember',
  LinguisticComplexity: 0.3,
  EstimatedTimeMinutes: 2,
  Difficulty: 1,
  SequenceIndex: 0,
  Type: 'multiple-choice',
  Content: 'What is 2 + 2?',
  GeneratedAt: new Date().toISOString(),
};

const validProblem2: GeneratedProblem = {
  ProblemId: 'P002',
  BloomLevel: 'Apply',
  LinguisticComplexity: 0.5,
  EstimatedTimeMinutes: 5,
  Difficulty: 2,
  SequenceIndex: 1,
  Type: 'short-answer',
  Content: 'Solve the equation: 2x + 3 = 7',
  GeneratedAt: new Date().toISOString(),
};

const validProblem3: GeneratedProblem = {
  ProblemId: 'P003',
  BloomLevel: 'Analyze',
  LinguisticComplexity: 0.7,
  EstimatedTimeMinutes: 8,
  Difficulty: 3,
  SequenceIndex: 2,
  Type: 'essay',
  Content: 'Compare and contrast...',
  GeneratedAt: new Date().toISOString(),
};

const standardTargets: AssessmentTargets = {
  totalTimeMinutes: 15,
  bloomTargets: BLOOM_DISTRIBUTIONS_BY_LEVEL.Standard,
  expectedQuestionCount: 3,
};

// ────────── TEST SUITES ──────────

describe('validateSingleProblem', () => {
  it('should validate a correct problem', () => {
    const result = validateSingleProblem(validProblem1);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should catch missing required fields', () => {
    const incompleteProblem = { ProblemId: 'P001' } as any;
    const result = validateSingleProblem(incompleteProblem);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.field === 'BloomLevel')).toBe(true);
  });

  it('should validate BloomLevel values', () => {
    const invalidBloom = { ...validProblem1, BloomLevel: 'InvalidLevel' } as any;
    const result = validateSingleProblem(invalidBloom);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'BloomLevel')).toBe(true);
  });

  it('should accept all valid BloomLevel values', () => {
    const bloomLevels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
    bloomLevels.forEach(level => {
      const problem = { ...validProblem1, BloomLevel: level };
      const result = validateSingleProblem(problem);
      expect(result.errors.filter(e => e.field === 'BloomLevel').length).toBe(0);
    });
  });

  it('should enforce LinguisticComplexity range [0.1, 0.9]', () => {
    // Test exactly 0
    let result = validateSingleProblem({ ...validProblem1, LinguisticComplexity: 0 });
    expect(result.errors.some(e => e.field === 'LinguisticComplexity')).toBe(true);

    // Test exactly 1
    result = validateSingleProblem({ ...validProblem1, LinguisticComplexity: 1 });
    expect(result.errors.some(e => e.field === 'LinguisticComplexity')).toBe(true);

    // Test out of range negative
    result = validateSingleProblem({ ...validProblem1, LinguisticComplexity: -0.1 });
    expect(result.errors.some(e => e.field === 'LinguisticComplexity')).toBe(true);

    // Test out of range positive
    result = validateSingleProblem({ ...validProblem1, LinguisticComplexity: 1.1 });
    expect(result.errors.some(e => e.field === 'LinguisticComplexity')).toBe(true);

    // Test valid boundaries
    result = validateSingleProblem({ ...validProblem1, LinguisticComplexity: 0.1 });
    expect(result.errors.filter(e => e.field === 'LinguisticComplexity').length).toBe(0);

    result = validateSingleProblem({ ...validProblem1, LinguisticComplexity: 0.9 });
    expect(result.errors.filter(e => e.field === 'LinguisticComplexity').length).toBe(0);
  });

  it('should enforce EstimatedTimeMinutes > 0 and integer', () => {
    // Test 0
    let result = validateSingleProblem({ ...validProblem1, EstimatedTimeMinutes: 0 });
    expect(result.errors.some(e => e.field === 'EstimatedTimeMinutes')).toBe(true);

    // Test negative
    result = validateSingleProblem({ ...validProblem1, EstimatedTimeMinutes: -5 });
    expect(result.errors.some(e => e.field === 'EstimatedTimeMinutes')).toBe(true);

    // Test float
    result = validateSingleProblem({ ...validProblem1, EstimatedTimeMinutes: 2.5 });
    expect(result.errors.some(e => e.field === 'EstimatedTimeMinutes')).toBe(true);

    // Test valid
    result = validateSingleProblem({ ...validProblem1, EstimatedTimeMinutes: 5 });
    expect(result.errors.filter(e => e.field === 'EstimatedTimeMinutes').length).toBe(0);
  });

  it('should validate Difficulty range [1, 5]', () => {
    // Test each valid difficulty
    for (let i = 1; i <= 5; i++) {
      const result = validateSingleProblem({ ...validProblem1, Difficulty: i as any });
      expect(result.errors.filter(e => e.field === 'Difficulty').length).toBe(0);
    }

    // Test invalid
    let result = validateSingleProblem({ ...validProblem1, Difficulty: 0 });
    expect(result.errors.some(e => e.field === 'Difficulty')).toBe(true);

    result = validateSingleProblem({ ...validProblem1, Difficulty: 6 });
    expect(result.errors.some(e => e.field === 'Difficulty')).toBe(true);
  });

  it('should validate Type values', () => {
    const validTypes = ['multiple-choice', 'true-false', 'short-answer', 'essay', 'matching'];
    
    // Test all valid types
    validTypes.forEach(type => {
      const result = validateSingleProblem({ ...validProblem1, Type: type as any });
      expect(result.errors.filter(e => e.field === 'Type').length).toBe(0);
    });

    // Test invalid type
    const result = validateSingleProblem({ ...validProblem1, Type: 'invalid-type' as any });
    expect(result.errors.some(e => e.field === 'Type')).toBe(true);
  });

  it('should validate Content is non-empty', () => {
    // Test empty string
    let result = validateSingleProblem({ ...validProblem1, Content: '' });
    expect(result.errors.some(e => e.field === 'Content')).toBe(true);

    // Test whitespace only
    result = validateSingleProblem({ ...validProblem1, Content: '   ' });
    expect(result.errors.some(e => e.field === 'Content')).toBe(true);

    // Test valid
    result = validateSingleProblem({ ...validProblem1, Content: 'Non-empty' });
    expect(result.errors.filter(e => e.field === 'Content').length).toBe(0);
  });

  it('should validate SequenceIndex as non-negative integer', () => {
    // Test valid
    let result = validateSingleProblem({ ...validProblem1, SequenceIndex: 0 });
    expect(result.errors.filter(e => e.field === 'SequenceIndex').length).toBe(0);

    result = validateSingleProblem({ ...validProblem1, SequenceIndex: 5 });
    expect(result.errors.filter(e => e.field === 'SequenceIndex').length).toBe(0);

    // Test negative
    result = validateSingleProblem({ ...validProblem1, SequenceIndex: -1 });
    expect(result.errors.some(e => e.field === 'SequenceIndex')).toBe(true);

    // Test float
    result = validateSingleProblem({ ...validProblem1, SequenceIndex: 1.5 });
    expect(result.errors.some(e => e.field === 'SequenceIndex')).toBe(true);
  });

  it('should include problemIndex in errors', () => {
    const result = validateSingleProblem({ ProblemId: 'P001' } as any, DEFAULT_VALIDATION_CONFIG, 5);
    expect(result.problemIndex).toBe(5);
    expect(result.errors.every(e => e.problemIndex === 5)).toBe(true);
  });
});

describe('calculateBatchStatistics', () => {
  it('should calculate statistics for valid problems', () => {
    const problems = [validProblem1, validProblem2, validProblem3];
    const stats = calculateBatchStatistics(problems);

    expect(stats.totalProblems).toBe(3);
    expect(stats.totalTime).toBe(15); // 2 + 5 + 8
    expect(stats.averageComplexity).toBeCloseTo((0.3 + 0.5 + 0.7) / 3, 1);
    expect(stats.averageTimePerProblem).toBeCloseTo(5, 1);
  });

  it('should track Bloom distribution', () => {
    const stats = calculateBatchStatistics([validProblem1, validProblem2, validProblem3]);
    expect(stats.bloomDistribution.Remember).toBeCloseTo(1 / 3, 2);
    expect(stats.bloomDistribution.Apply).toBeCloseTo(1 / 3, 2);
    expect(stats.bloomDistribution.Analyze).toBeCloseTo(1 / 3, 2);
  });

  it('should track difficulty distribution', () => {
    const stats = calculateBatchStatistics([validProblem1, validProblem2, validProblem3]);
    expect(stats.difficultyDistribution[1]).toBe(1);
    expect(stats.difficultyDistribution[2]).toBe(1);
    expect(stats.difficultyDistribution[3]).toBe(1);
  });

  it('should track type distribution', () => {
    const stats = calculateBatchStatistics([validProblem1, validProblem2, validProblem3]);
    expect(stats.typeDistribution['multiple-choice']).toBe(1);
    expect(stats.typeDistribution['short-answer']).toBe(1);
    expect(stats.typeDistribution['essay']).toBe(1);
  });
});

describe('validateBloomDistribution', () => {
  it('should pass when distribution matches target', () => {
    // Create problems that match Standard distribution exactly
    const distribution = {
      Remember: 0.10,
      Understand: 0.20,
      Apply: 0.35,
      Analyze: 0.25,
      Evaluate: 0.05,
      Create: 0.05,
    };

    const result = validateBloomDistribution(distribution, BLOOM_DISTRIBUTIONS_BY_LEVEL.Standard, 5);
    expect(result.valid).toBe(true);
  });

  it('should accept distribution within tolerance', () => {
    // Slightly off but within ±5%
    const distribution = {
      Remember: 0.12, // target 0.10, diff 0.02 within 0.05
      Understand: 0.20,
      Apply: 0.33, // target 0.35, diff 0.02 within 0.05
      Analyze: 0.25,
      Evaluate: 0.05,
      Create: 0.05,
    };

    const result = validateBloomDistribution(distribution, BLOOM_DISTRIBUTIONS_BY_LEVEL.Standard, 5);
    expect(result.valid).toBe(true);
  });

  it('should reject distribution outside tolerance', () => {
    const distribution = {
      Remember: 0.20, // target 0.10, diff 0.10 exceeds 0.05
      Understand: 0.20,
      Apply: 0.35,
      Analyze: 0.15,
      Evaluate: 0.05,
      Create: 0.05,
    };

    const result = validateBloomDistribution(distribution, BLOOM_DISTRIBUTIONS_BY_LEVEL.Standard, 5);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should respect custom tolerance levels', () => {
    const distribution = {
      Remember: 0.20, // target 0.10, difference 0.10 outside ±5% but within ±15%
      Understand: 0.20,
      Apply: 0.35,
      Analyze: 0.15,
      Evaluate: 0.05,
      Create: 0.05,
    };

    // Should fail with 5% tolerance
    let result = validateBloomDistribution(distribution, BLOOM_DISTRIBUTIONS_BY_LEVEL.Standard, 5);
    expect(result.valid).toBe(false);

    // Should pass with 15% tolerance
    result = validateBloomDistribution(distribution, BLOOM_DISTRIBUTIONS_BY_LEVEL.Standard, 15);
    expect(result.valid).toBe(true);
  });
});

describe('validateTotalTime', () => {
  it('should pass when time matches target', () => {
    const result = validateTotalTime(15, 15, 10);
    expect(result.valid).toBe(true);
  });

  it('should pass when time within tolerance', () => {
    // 10 minute target, ±10% allows 9-11
    const result1 = validateTotalTime(9, 10, 10);
    expect(result1.valid).toBe(true);

    const result2 = validateTotalTime(11, 10, 10);
    expect(result2.valid).toBe(true);
  });

  it('should reject time below lower bound', () => {
    // 10 minute target, ±10% allows 9-11, so 8.9 should fail
    const result = validateTotalTime(8.9, 10, 10);
    expect(result.valid).toBe(false);
  });

  it('should reject time above upper bound', () => {
    // 10 minute target, ±10% allows 9-11, so 11.1 should fail
    const result = validateTotalTime(11.1, 10, 10);
    expect(result.valid).toBe(false);
  });

  it('should respect custom tolerance', () => {
    // With ±5% tolerance
    const result = validateTotalTime(9.8, 10, 5); // 9.5-10.5 range
    expect(result.valid).toBe(true);

    const result2 = validateTotalTime(9.4, 10, 5);
    expect(result2.valid).toBe(false);
  });

  it('should include error details', () => {
    const result = validateTotalTime(20, 10, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.type).toBe('TOTAL_TIME_OUT_OF_RANGE');
  });
});

describe('validateSequenceIndices', () => {
  it('should pass for contiguous sequence [0, 1, 2]', () => {
    const problems = [validProblem1, validProblem2, validProblem3];
    const result = validateSequenceIndices(problems);
    expect(result.valid).toBe(true);
  });

  it('should fail for gaps in sequence', () => {
    const problems = [
      validProblem1,
      { ...validProblem2, SequenceIndex: 3 }, // should be 1
      validProblem3,
    ];
    const result = validateSequenceIndices(problems);
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe('SEQUENCE_INDEX_NOT_CONTIGUOUS');
  });

  it('should fail for duplicates', () => {
    const problems = [
      validProblem1,
      { ...validProblem2, SequenceIndex: 0 }, // duplicate 0
      validProblem3,
    ];
    const result = validateSequenceIndices(problems);
    expect(result.valid).toBe(false);
  });

  it('should handle out-of-order input', () => {
    const problems = [
      { ...validProblem3, SequenceIndex: 2 },
      { ...validProblem1, SequenceIndex: 0 },
      { ...validProblem2, SequenceIndex: 1 },
    ];
    const result = validateSequenceIndices(problems);
    expect(result.valid).toBe(true);
  });
});

describe('validateProblems (batch validation)', () => {
  it('should validate batch of all valid problems', () => {
    // Create problems matching Standard distribution: 10% Remember, 20% Understand, 35% Apply, 25% Analyze, 5% Evaluate, 5% Create
    // With 20 problems: 2 Remember, 4 Understand, 7 Apply, 5 Analyze, 1 Evaluate, 1 Create
    const problems: GeneratedProblem[] = [
      // 2 Remember (10%)
      { ...validProblem1, ProblemId: 'P1', SequenceIndex: 0, BloomLevel: 'Remember', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P2', SequenceIndex: 1, BloomLevel: 'Remember', EstimatedTimeMinutes: 2 },
      // 4 Understand (20%)
      { ...validProblem1, ProblemId: 'P3', SequenceIndex: 2, BloomLevel: 'Understand', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P4', SequenceIndex: 3, BloomLevel: 'Understand', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P5', SequenceIndex: 4, BloomLevel: 'Understand', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P6', SequenceIndex: 5, BloomLevel: 'Understand', EstimatedTimeMinutes: 2 },
      // 7 Apply (35%)
      { ...validProblem1, ProblemId: 'P7', SequenceIndex: 6, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P8', SequenceIndex: 7, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P9', SequenceIndex: 8, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P10', SequenceIndex: 9, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P11', SequenceIndex: 10, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P12', SequenceIndex: 11, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P13', SequenceIndex: 12, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      // 5 Analyze (25%)
      { ...validProblem1, ProblemId: 'P14', SequenceIndex: 13, BloomLevel: 'Analyze', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P15', SequenceIndex: 14, BloomLevel: 'Analyze', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P16', SequenceIndex: 15, BloomLevel: 'Analyze', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P17', SequenceIndex: 16, BloomLevel: 'Analyze', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P18', SequenceIndex: 17, BloomLevel: 'Analyze', EstimatedTimeMinutes: 2 },
      // 1 Evaluate (5%)
      { ...validProblem1, ProblemId: 'P19', SequenceIndex: 18, BloomLevel: 'Evaluate', EstimatedTimeMinutes: 2 },
      // 1 Create (5%)
      { ...validProblem1, ProblemId: 'P20', SequenceIndex: 19, BloomLevel: 'Create', EstimatedTimeMinutes: 2 },
    ];

    const targets: AssessmentTargets = {
      totalTimeMinutes: 40, // 20 problems × 2 min
      bloomTargets: BLOOM_DISTRIBUTIONS_BY_LEVEL.Standard,
      expectedQuestionCount: 20,
    };

    const result = validateProblems(problems, targets);

    expect(result.valid).toBe(true);
    expect(result.validProblems).toBe(20);
    expect(result.invalidProblems).toBe(0);
    expect(result.batchErrors.length).toBe(0);
  });

  it('should stop batch checks if problems invalid', () => {
    const invalidProblem = { ProblemId: 'P001' } as any;
    const result = validateProblems([invalidProblem], standardTargets);

    expect(result.valid).toBe(false);
    expect(result.invalidProblems).toBe(1);
    // Batch errors shouldn't be checked (since problems are invalid)
    expect(result.batchErrors.length).toBe(0);
  });

  it('should track individual problem validation results', () => {
    const validProb = { ...validProblem1, SequenceIndex: 0 };
    const invalidProb = { ...validProblem2, BloomLevel: 'Invalid', SequenceIndex: 1 } as any;

    const result = validateProblems([validProb, invalidProb], standardTargets);
    expect(result.invalidProblems).toBe(1);
    expect(result.details[1].valid).toBe(false);
  });

  it('should check Bloom distribution in batch', () => {
    // All problems are Remember level (wrong distribution)
    const problems = [
      { ...validProblem1, SequenceIndex: 0, BloomLevel: 'Remember' as const },
      { ...validProblem2, SequenceIndex: 1, BloomLevel: 'Remember' as const },
      { ...validProblem3, SequenceIndex: 2, BloomLevel: 'Remember' as const },
    ];

    const result = validateProblems(problems, standardTargets);
    expect(result.valid).toBe(false);
    expect(result.batchErrors.some(e => e.type === 'BLOOM_DISTRIBUTION_MISMATCH')).toBe(true);
  });

  it('should check total time in batch', () => {
    // Problems total 100 minutes (way over 15-minute target)
    const problems = [
      { ...validProblem1, SequenceIndex: 0, EstimatedTimeMinutes: 50 },
      { ...validProblem2, SequenceIndex: 1, EstimatedTimeMinutes: 40 },
      { ...validProblem3, SequenceIndex: 2, EstimatedTimeMinutes: 10 },
    ];

    const result = validateProblems(problems, standardTargets);
    expect(result.valid).toBe(false);
    expect(result.batchErrors.some(e => e.type === 'TOTAL_TIME_OUT_OF_RANGE')).toBe(true);
  });

  it('should check sequence indices in batch', () => {
    const problems = [
      validProblem1,
      { ...validProblem2, SequenceIndex: 5 }, // gap
      validProblem3,
    ];

    const result = validateProblems(problems, standardTargets);
    expect(result.valid).toBe(false);
    expect(result.batchErrors.some(e => e.type === 'SEQUENCE_INDEX_NOT_CONTIGUOUS')).toBe(true);
  });

  it('should check problem count matches expected', () => {
    const problems = [validProblem1, validProblem2]; // only 2, expected 3
    const result = validateProblems(problems, standardTargets);

    expect(result.valid).toBe(false);
    expect(result.batchErrors.some(e => e.type === 'PROBLEM_COUNT_MISMATCH')).toBe(true);
  });
});

describe('formatValidationReport', () => {
  it('should format valid result correctly', () => {
    // Use the same valid batch as batch validation test
    const problems: GeneratedProblem[] = [
      { ...validProblem1, ProblemId: 'P1', SequenceIndex: 0, BloomLevel: 'Remember', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P2', SequenceIndex: 1, BloomLevel: 'Remember', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P3', SequenceIndex: 2, BloomLevel: 'Understand', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P4', SequenceIndex: 3, BloomLevel: 'Understand', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P5', SequenceIndex: 4, BloomLevel: 'Understand', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P6', SequenceIndex: 5, BloomLevel: 'Understand', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P7', SequenceIndex: 6, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P8', SequenceIndex: 7, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P9', SequenceIndex: 8, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P10', SequenceIndex: 9, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P11', SequenceIndex: 10, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P12', SequenceIndex: 11, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P13', SequenceIndex: 12, BloomLevel: 'Apply', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P14', SequenceIndex: 13, BloomLevel: 'Analyze', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P15', SequenceIndex: 14, BloomLevel: 'Analyze', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P16', SequenceIndex: 15, BloomLevel: 'Analyze', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P17', SequenceIndex: 16, BloomLevel: 'Analyze', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P18', SequenceIndex: 17, BloomLevel: 'Analyze', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P19', SequenceIndex: 18, BloomLevel: 'Evaluate', EstimatedTimeMinutes: 2 },
      { ...validProblem1, ProblemId: 'P20', SequenceIndex: 19, BloomLevel: 'Create', EstimatedTimeMinutes: 2 },
    ];

    const targets: AssessmentTargets = {
      totalTimeMinutes: 40,
      bloomTargets: BLOOM_DISTRIBUTIONS_BY_LEVEL.Standard,
      expectedQuestionCount: 20,
    };

    const result = validateProblems(problems, targets);
    const report = formatValidationReport(result);

    expect(report).toContain('VALIDATION REPORT');
    expect(report).toContain('✅ VALID');
    expect(report).toContain('20/20 valid');
  });

  it('should format invalid result with details', () => {
    const invalidProblem = { ProblemId: 'P_BAD', BloomLevel: 'InvalidLevel' } as any;
    const result = validateProblems([invalidProblem], standardTargets);
    const report = formatValidationReport(result);

    expect(report).toContain('❌ INVALID');
    expect(report).toContain('PROBLEM-LEVEL ERRORS');
    expect(report).toContain('P_BAD');
  });

  it('should include batch errors in report', () => {
    const problems = [
      { ...validProblem1, EstimatedTimeMinutes: 50 },
      { ...validProblem2, EstimatedTimeMinutes: 50 },
      { ...validProblem3, EstimatedTimeMinutes: 50 },
    ];
    const result = validateProblems(problems, standardTargets);
    const report = formatValidationReport(result);

    expect(report).toContain('BATCH-LEVEL ERRORS');
    expect(report).toContain('TOTAL_TIME_OUT_OF_RANGE');
  });
});

describe('Edge cases and boundary conditions', () => {
  it('should handle empty problem array', () => {
    const result = validateProblems([], standardTargets);
    expect(result.totalProblems).toBe(0);
    expect(result.valid).toBe(false); // Expects 3 problems
  });

  it('should handle large number of problems', () => {
    const problems: GeneratedProblem[] = Array.from({ length: 100 }, (_, i) => ({
      ...validProblem1,
      ProblemId: `P${i}`,
      SequenceIndex: i,
    }));

    const targets: AssessmentTargets = {
      totalTimeMinutes: 200, // 100 problems × 2 min
      bloomTargets: BLOOM_DISTRIBUTIONS_BY_LEVEL.Standard,
      expectedQuestionCount: 100,
    };

    const result = validateProblems(problems, targets);
    expect(result.totalProblems).toBe(100);
    expect(result.validProblems).toBe(100);
  });

  it('should handle special characters in content', () => {
    const problem = {
      ...validProblem1,
      Content: 'What is 2 + 2? <script>alert("xss")</script>',
    };
    const result = validateSingleProblem(problem);
    expect(result.valid).toBe(true); // Content validation doesn't sanitize, just checks non-empty
  });

  it('should handle very high time estimates', () => {
    const problem = { ...validProblem1, EstimatedTimeMinutes: 120 };
    const result = validateSingleProblem(problem);
    expect(result.valid).toBe(true);
  });

  it('should handle very low complexity values', () => {
    const problem = { ...validProblem1, LinguisticComplexity: 0.11 };
    const result = validateSingleProblem(problem);
    expect(result.valid).toBe(true);
  });

  it('should handle very high complexity values', () => {
    const problem = { ...validProblem1, LinguisticComplexity: 0.89 };
    const result = validateSingleProblem(problem);
    expect(result.valid).toBe(true);
  });
});
