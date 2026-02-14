/**
 * Bloom's Taxonomy Constraint Enforcement
 * Ensures question types align with cognitive levels
 * Bloom classification is metadata only - never appears in student-facing text
 */

import { BloomLevel } from './types';

/**
 * Valid question format for each Bloom level
 * Maps cognitive demand to appropriate assessment type
 */
export const BLOOM_TO_QUESTION_FORMATS: Record<BloomLevel, string[]> = {
  Remember: [
    'multiple-choice',    // Recognition task
    'true-false',         // Yes/no identification
    'short-answer',       // Recall with minimal elaboration
    'fill-blank',         // Completion task
  ],
  Understand: [
    'multiple-choice',    // Comprehension of concepts
    'short-answer',       // Explanation in own words
    'true-false',         // Concept clarification (limited)
    'free-response',      // Simple explanations
  ],
  Apply: [
    'free-response',      // Apply in new situation
    'short-answer',       // Procedure demonstration
    'problem-solving',    // Practical application
    'scenario-based',     // Real-world application
  ],
  Analyze: [
    'free-response',      // Detailed breakdown
    'essay',              // Multi-part analysis
    'problem-solving',    // Complex analysis
    'comparative',        // Compare/contrast analysis
  ],
  Evaluate: [
    'free-response',      // Judgment with reasoning
    'essay',              // Critical evaluation
    'problem-solving',    // Evidence-based decision
  ],
  Create: [
    'free-response',      // Original synthesis
    'essay',              // Composition/design
    'project',            // Creative artifact
    'problem-solving',    // Novel solution design
  ],
};

/**
 * Invalid combinations that must be rejected
 */
export const INVALID_BLOOM_FORMAT_COMBINATIONS: Array<{
  bloomLevel: BloomLevel;
  invalidFormats: string[];
  reason: string;
}> = [
  {
    bloomLevel: 'Create',
    invalidFormats: ['true-false', 'fill-blank', 'multiple-choice'],
    reason: 'Create level requires open-ended response, not selection-based'
  },
  {
    bloomLevel: 'Evaluate',
    invalidFormats: ['true-false', 'fill-blank'],
    reason: 'Evaluate level requires reasoning explanation'
  },
  {
    bloomLevel: 'Analyze',
    invalidFormats: ['true-false', 'fill-blank'],
    reason: 'Analyze level requires articulation of breakdown/relationships'
  },
];

/**
 * Validates that a Bloom level and question format are compatible
 * Throws error if invalid combination detected
 */
export function validateBloomFormatCompatibility(
  bloomLevel: BloomLevel,
  questionFormat: string
): { valid: boolean; reason?: string } {
  // Check if format is explicitly valid for this Bloom level
  const validFormats = BLOOM_TO_QUESTION_FORMATS[bloomLevel];
  
  // Normalize format names for comparison
  const normalizedFormat = questionFormat.toLowerCase().replace(/[_\s-]/g, '');
  const normalizedValidFormats = validFormats.map(f => f.toLowerCase().replace(/[_\s-]/g, ''));
  
  const isValid = normalizedValidFormats.some(vf => 
    vf === normalizedFormat || 
    normalizedFormat.includes(vf) || 
    vf.includes(normalizedFormat)
  );

  if (!isValid) {
    // Find explicit invalid combination for better error message
    const invalidRule = INVALID_BLOOM_FORMAT_COMBINATIONS.find(
      rule => rule.bloomLevel === bloomLevel && rule.invalidFormats.includes(questionFormat)
    );

    return {
      valid: false,
      reason: invalidRule
        ? invalidRule.reason
        : `${questionFormat} is not appropriate for ${bloomLevel} level cognition`
    };
  }

  return { valid: true };
}

/**
 * Selects an appropriate question format for a given Bloom level
 * Provides constraint-respecting default when format is ambiguous
 */
export function selectAppropriateFormat(
  bloomLevel: BloomLevel,
  preferredFormat?: string
): string {
  // If no preference provided, use most common format for this level
  if (!preferredFormat) {
    const defaults: Record<BloomLevel, string> = {
      Remember: 'multiple-choice',
      Understand: 'short-answer',
      Apply: 'free-response',
      Analyze: 'essay',
      Evaluate: 'essay',
      Create: 'free-response'
    };
    return defaults[bloomLevel];
  }

  // Validate preferred format against Bloom level
  const validation = validateBloomFormatCompatibility(bloomLevel, preferredFormat);
  
  if (validation.valid) {
    return preferredFormat;
  }

  // If preferred format is invalid, fall back to default for this Bloom level
  const defaults: Record<BloomLevel, string> = {
    Remember: 'multiple-choice',
    Understand: 'short-answer',
    Apply: 'free-response',
    Analyze: 'essay',
    Evaluate: 'essay',
    Create: 'free-response'
  };
  
  console.warn(
    `⚠️ Format "${preferredFormat}" invalid for ${bloomLevel} (${validation.reason}). Using "${defaults[bloomLevel]}" instead.`
  );
  
  return defaults[bloomLevel];
}

/**
 * Validates an entire set of problems for Bloom-format alignment
 * Returns validation report with any violations found
 */
export function validateProblemBloomAlignment(problems: Array<{
  bloomLevel: BloomLevel;
  questionFormat: string;
  problemText: string;
}>): {
  valid: boolean;
  violations: Array<{
    problemIndex: number;
    bloomLevel: BloomLevel;
    questionFormat: string;
    reason: string;
  }>;
  totalValidated: number;
} {
  const violations: Array<{
    problemIndex: number;
    bloomLevel: BloomLevel;
    questionFormat: string;
    reason: string;
  }> = [];

  problems.forEach((problem, index) => {
    const validation = validateBloomFormatCompatibility(
      problem.bloomLevel,
      problem.questionFormat
    );

    if (!validation.valid) {
      violations.push({
        problemIndex: index,
        bloomLevel: problem.bloomLevel,
        questionFormat: problem.questionFormat,
        reason: validation.reason || 'Invalid Bloom-format combination',
      });
    }

    // Also check that Bloom metadata is NOT in student-facing text
    if (problem.problemText.includes('[') && problem.problemText.includes(']')) {
      const hasBracketedMetadata = /\[.*?(?:level|Bloom)/i.test(problem.problemText);
      if (hasBracketedMetadata) {
        violations.push({
          problemIndex: index,
          bloomLevel: problem.bloomLevel,
          questionFormat: problem.questionFormat,
          reason: 'Problem text contains bracketed metadata - must be removed for student view'
        });
      }
    }
  });

  return {
    valid: violations.length === 0,
    violations,
    totalValidated: problems.length,
  };
}

/**
 * Generates validation summary for display/logging
 */
export function formatValidationReport(report: ReturnType<typeof validateProblemBloomAlignment>): string {
  if (report.valid) {
    return `✅ All ${report.totalValidated} problems pass Bloom enforcement`;
  }

  const lines = [
    `❌ ${report.violations.length}/${report.totalValidated} problems fail Bloom enforcement:`,
    ...report.violations.map((v, i) => 
      `  ${i + 1}. Question ${v.problemIndex + 1}: ${v.bloomLevel} + ${v.questionFormat} → ${v.reason}`
    )
  ];

  return lines.join('\n');
}
