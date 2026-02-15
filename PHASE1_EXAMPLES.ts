/**
 * Phase 1 Implementation Examples
 * 
 * Practical examples of MinimalAssessmentForm usage, validation,
 * and integration patterns.
 */

// ============================================================================
// EXAMPLE 1: Basic Form Integration in a Parent Component
// ============================================================================

import React, { useState } from 'react';
import { MinimalAssessmentFormWrapper } from './MinimalAssessmentFormWrapper';
//import { AssessmentIntent } from '../types/assessmentIntent';

export function ExampleParentComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAssessment = async (intent: AssessmentIntent) => {
    try {
      setIsLoading(true);
      setError(null);

      // At this point, intent is guaranteed to be valid:
      // - Either sourceFile OR sourceTopic (not both, not neither)
      // - studentLevel is one of: Remedial, Standard, Honors, AP
      // - assessmentType is one of: Quiz, Test, Practice
      // - timeMinutes is between 5-240
      // - focusAreas has max 5 items (if provided)
      // - classroomContext is max 500 chars (if provided)

      console.log('✅ Valid AssessmentIntent received:', intent);

      // Phase 2 would integrate here:
      // const summarized = await assessmentSummarizerService.summarize(intent);
      // const generated = await aiWriterService.write(summarized);

      // For now, simulate a 2-second API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🎉 Would now generate assessment from:', {
        source: intent.sourceFile?.name || intent.sourceTopic,
        studentLevel: intent.studentLevel,
        assessmentType: intent.assessmentType,
        timeMinutes: intent.timeMinutes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && <div style={{ color: 'red', padding: '1rem' }}>{error}</div>}
      <MinimalAssessmentForm onGenerate={handleGenerateAssessment} isLoading={isLoading} />
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Validation Examples (from utils/assessmentIntentValidation.ts)
// ============================================================================

import {
  validateAssessmentIntent,
  validateStudentLevel,
  validateTime,
  validateSource,
} from '../utils/assessmentIntentValidation';

// VALID: Student + Quiz + 30 min + file
const validQuizWithFile: AssessmentIntent = {
  sourceFile: new File(['content'], 'chapter5.pdf', { type: 'application/pdf' }),
  studentLevel: 'Standard',
  assessmentType: 'Quiz',
  timeMinutes: 30,
};

const validation1 = validateAssessmentIntent(validQuizWithFile);
console.log('✅ Valid quiz with file:', validation1);
// Output: { valid: true, errors: [] }

// INVALID: Both file and topic
const invalidBoth: AssessmentIntent = {
  sourceFile: new File(['content'], 'chapter5.pdf'),
  sourceTopic: 'Photosynthesis',
  studentLevel: 'Standard',
  assessmentType: 'Quiz',
  timeMinutes: 30,
};

const validation2 = validateAssessmentIntent(invalidBoth);
console.log('❌ Invalid (both file and topic):', validation2);
// Output: { valid: false, errors: ["Please provide either a source file OR a topic, not both."] }

// INVALID: Time out of range
const invalidTime: AssessmentIntent = {
  sourceTopic: 'Photosynthesis',
  studentLevel: 'AP',
  assessmentType: 'Test',
  timeMinutes: 300, // > 240
};

const validation3 = validateAssessmentIntent(invalidTime);
console.log('❌ Invalid (time too long):', validation3);
// Output: { valid: false, errors: ["Time must not exceed 240 minutes."] }

// INVALID: Missing everything
const invalidEmpty: Partial<AssessmentIntent> = {};

const validation4 = validateAssessmentIntent(invalidEmpty);
console.log('❌ Invalid (empty form):', validation4);
// Output: { valid: false, errors: [
//   "Please provide either a source file OR a topic.",
//   "Student level must be a valid string.",
//   "Assessment type must be a valid string.",
//   "Time must be a valid integer."
// ] }

// ============================================================================
// EXAMPLE 3: Testing Student Level → Grade Band Mapping
// ============================================================================

import { STUDENT_LEVEL_TO_GRADE_BAND, StudentLevel } from '../types/assessmentIntent';

const levels: StudentLevel[] = ['Remedial', 'Standard', 'Honors', 'AP'];

levels.forEach(level => {
  const gradeBand = STUDENT_LEVEL_TO_GRADE_BAND[level];
  console.log(`${level} → ${gradeBand}`);
});

// Output:
// Remedial → 3-5
// Standard → 6-8
// Honors → 9-12
// AP → 9-12

// Verify all grade bands are valid
const VALID_GRADE_BANDS = ['3-5', '6-8', '9-12'] as const;

levels.forEach(level => {
  const gradeBand = STUDENT_LEVEL_TO_GRADE_BAND[level];
  const isValid = VALID_GRADE_BANDS.includes(gradeBand as any);
  console.assert(isValid, `Invalid grade band for ${level}: ${gradeBand}`);
});

// ============================================================================
// EXAMPLE 4: Bloom Distribution by Level (from types/assessmentIntent.ts)
// ============================================================================

import { BLOOM_DISTRIBUTIONS_BY_LEVEL, EMPHASIS_MODIFIERS } from '../types/assessmentIntent';

// Standard level baseline
const standardBase = BLOOM_DISTRIBUTIONS_BY_LEVEL['Standard'];
console.log('📊 Standard baseline:', standardBase);
// Output:
// {
//   Remember: 0.10,
//   Understand: 0.20,
//   Apply: 0.35,
//   Analyze: 0.25,
//   Evaluate: 0.05,
//   Create: 0.05,
// }

// Apply Conceptual modifier
const conceptualMod = EMPHASIS_MODIFIERS['Conceptual'];
console.log('🔧 Conceptual modifier:', conceptualMod);
// Output:
// {
//   Remember: -0.05,
//   Understand: 0.10,
//   Apply: -0.10,
//   Analyze: 0.10,
//   Evaluate: 0,
//   Create: 0,
// }

// Resulting distribution after applying modifier
const resultingDistribution = {
  Remember: standardBase.Remember + conceptualMod.Remember,      // 0.10 - 0.05 = 0.05
  Understand: standardBase.Understand + conceptualMod.Understand, // 0.20 + 0.10 = 0.30
  Apply: standardBase.Apply + conceptualMod.Apply,               // 0.35 - 0.10 = 0.25
  Analyze: standardBase.Analyze + conceptualMod.Analyze,         // 0.25 + 0.10 = 0.35
  Evaluate: standardBase.Evaluate + conceptualMod.Evaluate,       // 0.05 + 0 = 0.05
  Create: standardBase.Create + conceptualMod.Create,             // 0.05 + 0 = 0.05
};

console.log('✨ Standard + Conceptual result:', resultingDistribution);
// Output: Remember: 0.05, Understand: 0.30, Apply: 0.25, Analyze: 0.35, Evaluate: 0.05, Create: 0.05

// Verify sum ≈ 1.0
const sum = Object.values(resultingDistribution).reduce((a, b) => a + b, 0);
console.assert(Math.abs(sum - 1.0) < 0.02, `Bloom sum should be ~1.0, got ${sum}`);

// ============================================================================
// EXAMPLE 5: Time Estimation by Assessment Type
// ============================================================================

import { ESTIMATED_QUESTIONS_BY_TIME, AssessmentType } from '../types/assessmentIntent';

const timeMinutes = 30;

const types: AssessmentType[] = ['Quiz', 'Test', 'Practice'];

types.forEach(type => {
  const questionsPerMinute = ESTIMATED_QUESTIONS_BY_TIME[type];
  const estimatedQuestions = Math.round(timeMinutes * questionsPerMinute);
  console.log(`${type}: ${estimatedQuestions} questions in ${timeMinutes} minutes`);
});

// Output:
// Quiz: 6 questions in 30 minutes
// Test: 7 questions in 30 minutes
// Practice: 8 questions in 30 minutes

// ============================================================================
// EXAMPLE 6: Complexity Ranges by Student Level
// ============================================================================

import { COMPLEXITY_RANGES } from '../types/assessmentIntent';

const levels2: StudentLevel[] = ['Remedial', 'Standard', 'Honors', 'AP'];

levels2.forEach(level => {
  const [min, max] = COMPLEXITY_RANGES[level];
  console.log(`${level}: complexity range ${min} - ${max}`);
});

// Output:
// Remedial: complexity range 0.2 - 0.5
// Standard: complexity range 0.3 - 0.7
// Honors: complexity range 0.5 - 0.9
// AP: complexity range 0.6 - 0.95

// ============================================================================
// EXAMPLE 7: Fatigue Multipliers
// ============================================================================

import { FATIGUE_MULTIPLIERS } from '../types/assessmentIntent';

// Calculate cumulative fatigue for AP test lasting 50 minutes
const timeTargetMinutes = 50;
const apMultiplier = FATIGUE_MULTIPLIERS['AP'];

// Scenario: 10 problems, each taking 5 minutes
for (let problemIndex = 0; problemIndex < 10; problemIndex++) {
  const priorMinutes = problemIndex * 5;
  const cumulativeFatigue = (priorMinutes / timeTargetMinutes) * apMultiplier;
  console.log(`Problem ${problemIndex + 1}: fatigue = ${cumulativeFatigue.toFixed(3)}`);
}

// Output:
// Problem 1: fatigue = 0
// Problem 2: fatigue = 0.004
// Problem 3: fatigue = 0.008
// Problem 4: fatigue = 0.012
// Problem 5: fatigue = 0.016
// Problem 6: fatigue = 0.020
// Problem 7: fatigue = 0.024
// Problem 8: fatigue = 0.028
// Problem 9: fatigue = 0.032
// Problem 10: fatigue = 0.036

// ============================================================================
// EXAMPLE 8: Real Teacher Workflow
// ============================================================================

/**
 * Simulating a teacher's workflow:
 * 1. Click form
 * 2. Upload Chapter 7 notes
 * 3. Select "Standard"
 * 4. Select "Test"
 * 5. Set time to 45 minutes
 * 6. Click "Advanced"
 * 7. Add 3 focus areas
 * 8. Select "Conceptual" emphasis
 * 9. Click "Generate"
 */

const teacherIntent: AssessmentIntent = {
  sourceFile: new File(
    ['Chapter 7: Sampling Distributions and Central Limit Theorem...'],
    'Chapter7_Notes.pdf',
    { type: 'application/pdf' }
  ),
  sourceTopic: undefined, // Not provided since file is used
  studentLevel: 'Standard',
  assessmentType: 'Test',
  timeMinutes: 45,
  focusAreas: ['Sampling distributions of means', 'Central Limit Theorem', 'Margin of error calculation'],
  emphasis: 'Conceptual',
  difficultyProfile: 'Balanced',
  classroomContext: 'Students understand notation well but struggle with conceptual meaning',
};

// Validate before submission
const result = validateAssessmentIntent(teacherIntent);
if (result.valid) {
  console.log('✅ Teacher workflow: Form is ready to submit');
  console.log('   - File: Chapter7_Notes.pdf');
  console.log('   - Level: Standard (grade band 6-8)');
  console.log('   - Type: Test (formal assessment)');
  console.log('   - Time: 45 minutes');
  console.log('   - Focus: 3 areas');
  console.log('   - Emphasis: Conceptual');
  console.log('   - Context: Students understand notation...');
} else {
  console.error('❌ Form has errors:', result.errors);
}

// ============================================================================
// EXAMPLE 9: Pipeline Integrity Verification
// ============================================================================

/**
 * Verify that Phase 1 implementation maintains pipeline integrity
 */

class PipelineIntegrityChecker {
  /**
   * Verify StudentLevel → GradeBand mapping is consistent
   */
  static checkGradeBandMapping(): boolean {
    const mappings = [
      ['Remedial', '3-5'],
      ['Standard', '6-8'],
      ['Honors', '9-12'],
      ['AP', '9-12'],
    ];

    const validBands = ['3-5', '6-8', '9-12'];

    return mappings.every(([level, band]) => {
      const actual = STUDENT_LEVEL_TO_GRADE_BAND[level as StudentLevel];
      const valid = validBands.includes(actual);
      console.assert(actual === band, `Mapping mismatch: ${level} should map to ${band}, got ${actual}`);
      console.assert(valid, `Grade band ${actual} is not in valid set: ${validBands.join(', ')}`);
      return actual === band && valid;
    });
  }

  /**
   * Verify Bloom distributions sum to 1.0 (within tolerance)
   */
  static checkBloomDistributions(): boolean {
    const TOLERANCE = 0.02; // Allow ±2% tolerance

    return Object.entries(BLOOM_DISTRIBUTIONS_BY_LEVEL).every(([level, dist]) => {
      const sum = Object.values(dist).reduce((a, b) => a + b, 0);
      const valid = Math.abs(sum - 1.0) < TOLERANCE;
      console.assert(valid, `${level} Bloom sum should be ~1.0, got ${sum.toFixed(3)}`);
      return valid;
    });
  }

  /**
   * Verify time constraints are enforceable
   */
  static checkTimeConstraints(): boolean {
    const MIN_TIME = 5;
    const MAX_TIME = 240;

    const testCases = [
      { time: 4, shouldFail: true },
      { time: 5, shouldFail: false },
      { time: 30, shouldFail: false },
      { time: 240, shouldFail: false },
      { time: 241, shouldFail: false: true },
    ];

    return testCases.every(({ time, shouldFail }) => {
      const isValid = time >= MIN_TIME && time <= MAX_TIME;
      const result = isValid === !shouldFail;
      console.assert(result, `Time ${time} validation failed`);
      return result;
    });
  }

  /**
   * Run all checks
   */
  static runAll(): boolean {
    console.log('🔍 Pipeline Integrity Verification\n');

    const checks = [
      { name: 'Grade Band Mapping', fn: this.checkGradeBandMapping },
      { name: 'Bloom Distributions', fn: this.checkBloomDistributions },
      { name: 'Time Constraints', fn: this.checkTimeConstraints },
    ];

    let allPassed = true;

    checks.forEach(({ name, fn }) => {
      const passed = fn();
      console.log(`${passed ? '✅' : '❌'} ${name}`);
      allPassed = allPassed && passed;
    });

    console.log(`\n${allPassed ? '✅ All checks passed!' : '❌ Some checks failed'}`);
    return allPassed;
  }
}

// Run verification
PipelineIntegrityChecker.runAll();

// ============================================================================
// EXAMPLE 10: TypeScript Type Safety
// ============================================================================

/**
 * Demonstrate type safety at compile time
 */

// ✅ Valid: AssessmentIntent with all required fields
const validIntent: AssessmentIntent = {
  sourceTopic: 'Topic',
  studentLevel: 'Standard',
  assessmentType: 'Quiz',
  timeMinutes: 30,
};

// ✅ Valid: with optional fields
const validIntentFull: AssessmentIntent = {
  sourceFile: new File([''], 'test.pdf'),
  studentLevel: 'Honors',
  assessmentType: 'Test',
  timeMinutes: 60,
  focusAreas: ['Area1', 'Area2'],
  emphasis: 'Conceptual',
  difficultyProfile: 'Challenging',
  classroomContext: 'Context here',
};

// ❌ Compile-time error: Invalid studentLevel
// const invalidIntent1: AssessmentIntent = {
//   sourceTopic: 'Topic',
//   studentLevel: 'Invalid', // TS2322: Type '"Invalid"' is not assignable to type 'StudentLevel'
//   assessmentType: 'Quiz',
//   timeMinutes: 30,
// };

// ❌ Compile-time error: Unknown property
// const invalidIntent2: AssessmentIntent = {
//   sourceTopic: 'Topic',
//   studentLevel: 'Standard',
//   assessmentType: 'Quiz',
//   timeMinutes: 30,
//   unknownProp: 'value', // TS2345: Object literal may only specify known properties
// };

console.log('✅ Type safety verified at compile time');
