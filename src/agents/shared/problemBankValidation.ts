/**
 * Problem Bank Validation System
 * Prevents schema drift, ID instability, and immutable field modification
 */

import {
  UniversalProblem,
  CognitiveMetadata,
  ClassificationMetadata,
} from './universalPayloads';
import {
  ProblemBankEntry,
  ImmutableFieldLock,
  SchemaValidationResult,
  SchemaValidationError,
  SchemaValidationWarning,
  IdResequencingMap,
  ProblemAssemblyResult,
  IMMUTABLE_FIELDS,
  MUTABLE_FIELDS,
  PROBLEM_ID_PATTERN,
  VALID_BLOOM_LEVELS,
  COMPLEXITY_LEVEL_RANGE,
} from './problemBank';

/**
 * Validates that a field modification is allowed
 */
export function validateFieldModification(
  entry: ProblemBankEntry,
  fieldPath: string,
  newValue: unknown
): { allowed: boolean; reason?: string } {
  if (!entry.immutableLock) {
    return { allowed: true }; // No lock = modifications allowed
  }

  // Check if field is in immutable layers
  if (fieldPath.startsWith('problem.cognitive.')) {
    if (entry.immutableLock.cognitiveLocked) {
      return {
        allowed: false,
        reason: `Cannot modify cognitive layer - locked since ${entry.immutableLock.lockedAt}`,
      };
    }
  }

  if (fieldPath.startsWith('problem.classification.')) {
    if (entry.immutableLock.classificationLocked) {
      return {
        allowed: false,
        reason: `Cannot modify classification layer - locked since ${entry.immutableLock.lockedAt}`,
      };
    }
  }

  if (fieldPath.startsWith('problem.structure.')) {
    if (entry.immutableLock.structureLocked) {
      return {
        allowed: false,
        reason: `Cannot modify structure layer - locked since ${entry.immutableLock.lockedAt}`,
      };
    }
  }

  // Only content is mutable
  if (fieldPath === 'problem.content') {
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Validates problem ID format and consistency
 */
export function validateProblemId(problemId: string): {
  valid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  // Check format
  if (!PROBLEM_ID_PATTERN.test(problemId)) {
    errors.push(
      `Invalid problem ID format: "${problemId}". Expected format: Section_Problem or Section_Problem_subpart (e.g., S1_P1, S1_P2_a)`
    );
  }

  // Check for empty
  if (!problemId || problemId.trim().length === 0) {
    errors.push('Problem ID cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validates Bloom level
 */
export function validateBloomLevel(
  level: string
): { valid: boolean; error?: string } {
  if (!VALID_BLOOM_LEVELS.includes(level as any)) {
    return {
      valid: false,
      error: `Invalid Bloom level: "${level}". Must be one of: ${VALID_BLOOM_LEVELS.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validates complexity level (1-5)
 */
export function validateComplexityLevel(
  level: number
): { valid: boolean; error?: string } {
  if (
    !Number.isInteger(level) ||
    level < COMPLEXITY_LEVEL_RANGE.min ||
    level > COMPLEXITY_LEVEL_RANGE.max
  ) {
    return {
      valid: false,
      error: `Complexity level must be an integer between ${COMPLEXITY_LEVEL_RANGE.min} and ${COMPLEXITY_LEVEL_RANGE.max}, got: ${level}`,
    };
  }
  return { valid: true };
}

/**
 * Validates cognitive metadata structure
 */
export function validateCognitiveMetadata(
  cognitive: CognitiveMetadata
): SchemaValidationResult {
  const errors: SchemaValidationError[] = [];
  const warnings: SchemaValidationWarning[] = [];

  // Bloom level
  const bloomValidation = validateBloomLevel(cognitive.bloomsLevel);
  if (!bloomValidation.valid) {
    errors.push({
      field: 'cognitive.bloomsLevel',
      issue: 'invalid_enum',
      severity: 'error',
      message: bloomValidation.error!,
    });
  }

  // Bloom confidence (0-1)
  if (cognitive.bloomsConfidence < 0 || cognitive.bloomsConfidence > 1) {
    errors.push({
      field: 'cognitive.bloomsConfidence',
      issue: 'out_of_range',
      severity: 'error',
      message: `Bloom confidence must be between 0 and 1, got: ${cognitive.bloomsConfidence}`,
    });
  }

  // Complexity level
  const complexityValidation = validateComplexityLevel(cognitive.complexityLevel);
  if (!complexityValidation.valid) {
    errors.push({
      field: 'cognitive.complexityLevel',
      issue: 'invalid_range',
      severity: 'error',
      message: complexityValidation.error!,
    });
  }

  // Linguistic complexity (0-1)
  if (cognitive.linguisticComplexity < 0 || cognitive.linguisticComplexity > 1) {
    errors.push({
      field: 'cognitive.linguisticComplexity',
      issue: 'out_of_range',
      severity: 'error',
      message: `Linguistic complexity must be between 0 and 1, got: ${cognitive.linguisticComplexity}`,
    });
  }

  // Procedural weight (0-1)
  if (cognitive.proceduralWeight < 0 || cognitive.proceduralWeight > 1) {
    errors.push({
      field: 'cognitive.proceduralWeight',
      issue: 'out_of_range',
      severity: 'error',
      message: `Procedural weight must be between 0 and 1, got: ${cognitive.proceduralWeight}`,
    });
  }

  // Check time breakdown sums approximately to estimated time
  const breakdownTotal =
    cognitive.timeBreakdown.readingMinutes +
    cognitive.timeBreakdown.comprehensionMinutes +
    cognitive.timeBreakdown.computationMinutes +
    cognitive.timeBreakdown.reasoningMinutes +
    cognitive.timeBreakdown.writingMinutes;

  const tolerance = 0.1; // 6 second tolerance
  if (Math.abs(breakdownTotal - cognitive.estimatedTimeMinutes) > tolerance) {
    warnings.push({
      field: 'cognitive.timeBreakdown',
      issue: 'sum_mismatch',
      message: `Time breakdown sum (${breakdownTotal.toFixed(1)}m) doesn't match estimated time (${cognitive.estimatedTimeMinutes}m)`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates entire UniversalProblem for schema drift
 */
export function validateUniversalProblem(
  problem: UniversalProblem
): SchemaValidationResult {
  const errors: SchemaValidationError[] = [];
  const warnings: SchemaValidationWarning[] = [];

  // Validate problemId
  const idValidation = validateProblemId(problem.problemId);
  if (!idValidation.valid) {
    errors.push({
      field: 'problemId',
      issue: 'invalid_format',
      severity: 'critical',
      message: idValidation.errors![0],
    });
  }

  // Validate cognitive metadata
  const cognitiveValidation = validateCognitiveMetadata(problem.cognitive);
  errors.push(...cognitiveValidation.errors);
  warnings.push(...cognitiveValidation.warnings);

  // Validate classification topics
  if (!Array.isArray(problem.classification.topics)) {
    errors.push({
      field: 'classification.topics',
      issue: 'invalid_type',
      severity: 'error',
      message: `Topics must be an array, got: ${typeof problem.classification.topics}`,
    });
  }

  // Validate content is not empty
  if (!problem.content || problem.content.trim().length === 0) {
    errors.push({
      field: 'content',
      issue: 'empty_content',
      severity: 'error',
      message: 'Problem content cannot be empty',
    });
  }

  // Validate analysis confidence (0-1)
  if (problem.analysis.confidenceScore < 0 || problem.analysis.confidenceScore > 1) {
    errors.push({
      field: 'analysis.confidenceScore',
      issue: 'out_of_range',
      severity: 'error',
      message: `Confidence score must be between 0 and 1, got: ${problem.analysis.confidenceScore}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Creates an immutable field lock after analysis
 */
export function createImmutableLock(
  problemId: string,
  lockedBy: 'analyzer' | 'system' = 'analyzer'
): ImmutableFieldLock {
  return {
    problemId,
    lockedAt: new Date().toISOString(),
    lockedBy,
    cognitiveLocked: true,
    classificationLocked: true,
    structureLocked: true,
    lockReason: 'Post-analysis immutability enforcement',
  };
}

/**
 * Re-sequences a problem's ID and updates structure
 * Used when assembling problems from ProblemBank into new assessments
 */
export function resequenceProblem(
  originalProblem: UniversalProblem,
  newProblemId: string,
  newSectionId: string,
  parentProblemId?: string
): { problem: UniversalProblem; mapping: IdResequencingMap } {
  // Validate new ID format
  const validation = validateProblemId(newProblemId);
  if (!validation.valid) {
    throw new Error(`Invalid new problem ID: ${validation.errors![0]}`);
  }

  // Create new problem with updated IDs but preserved cognitive/classification
  const resequencedProblem: UniversalProblem = {
    ...originalProblem,
    problemId: newProblemId,
    sectionId: newSectionId,
    parentProblemId,
    // Preserve all immutable layers exactly
    cognitive: { ...originalProblem.cognitive },
    classification: { ...originalProblem.classification },
    structure: {
      ...originalProblem.structure,
      // Note: source line numbers are from original document, kept for audit trail
    },
    analysis: {
      ...originalProblem.analysis,
      processedAt: originalProblem.analysis.processedAt, // Keep original analysis timestamp
    },
  };

  const mapping: IdResequencingMap = {
    oldProblemId: originalProblem.problemId,
    newProblemId,
    sectionId: newSectionId,
    order: parseInt(newProblemId.match(/P(\d+)/)?.[1] || '0', 10),
  };

  return { problem: resequencedProblem, mapping };
}

/**
 * Assembles problems from ProblemBank for a new assessment
 */
export function assembleProblemForAssignment(
  entry: ProblemBankEntry,
  newProblemId: string,
  newSectionId: string
): ProblemAssemblyResult {
  // Validate the entry's problem
  const validation = validateUniversalProblem(entry.problem);

  // Re-sequence the problem
  const { problem: resequencedProblem, mapping } = resequenceProblem(
    entry.problem,
    newProblemId,
    newSectionId
  );

  return {
    originalProblemBankEntryId: entry.id,
    originalProblemId: entry.problem.problemId,
    newProblemId,
    problem: resequencedProblem,
    idMappings: mapping,
    immutableLock: entry.immutableLock,
    validationResult: validation,
    warnings: validation.warnings.map(w => `${w.field}: ${w.message}`),
  };
}

/**
 * Detects if cognitive metadata has been modified vs. original
 */
export function detectCognitiveDrift(
  original: CognitiveMetadata,
  current: CognitiveMetadata
): { hasDrift: boolean; driftedFields: string[] } {
  const driftedFields: string[] = [];
  const drift = (field: keyof CognitiveMetadata) => {
    // Handle nested objects
    if (field === 'timeBreakdown') {
      const origBreakdown = original.timeBreakdown;
      const currBreakdown = current.timeBreakdown;
      const tolerance = 0.01; // 0.6 second tolerance

      if (Math.abs(origBreakdown.readingMinutes - currBreakdown.readingMinutes) > tolerance)
        driftedFields.push('timeBreakdown.readingMinutes');
      if (
        Math.abs(origBreakdown.comprehensionMinutes - currBreakdown.comprehensionMinutes) >
        tolerance
      )
        driftedFields.push('timeBreakdown.comprehensionMinutes');
      if (
        Math.abs(origBreakdown.computationMinutes - currBreakdown.computationMinutes) > tolerance
      )
        driftedFields.push('timeBreakdown.computationMinutes');
      if (Math.abs(origBreakdown.reasoningMinutes - currBreakdown.reasoningMinutes) > tolerance)
        driftedFields.push('timeBreakdown.reasoningMinutes');
      if (Math.abs(origBreakdown.writingMinutes - currBreakdown.writingMinutes) > tolerance)
        driftedFields.push('timeBreakdown.writingMinutes');
    } else {
      if (original[field] !== current[field]) {
        driftedFields.push(`cognitive.${String(field)}`);
      }
    }
  };

  // Check all fields in IMMUTABLE_FIELDS.cognitive
  IMMUTABLE_FIELDS.cognitive.forEach(field => {
    drift(field as keyof CognitiveMetadata);
  });

  return {
    hasDrift: driftedFields.length > 0,
    driftedFields,
  };
}

/**
 * Detects if classification metadata has been modified vs. original
 */
export function detectClassificationDrift(
  original: ClassificationMetadata,
  current: ClassificationMetadata
): { hasDrift: boolean; driftedFields: string[] } {
  const driftedFields: string[] = [];

  IMMUTABLE_FIELDS.classification.forEach(field => {
    if (field === 'topics') {
      // Compare arrays element by element
      const originalTopics = new Set(original.topics);
      const currentTopics = new Set(current.topics);

      if (originalTopics.size !== currentTopics.size) {
        driftedFields.push('classification.topics (count mismatch)');
      } else {
        for (const topic of originalTopics) {
          if (!currentTopics.has(topic)) {
            driftedFields.push(`classification.topics (missing: ${topic})`);
            break;
          }
        }
      }
    } else {
      if (original[field as keyof ClassificationMetadata] !== current[field as keyof ClassificationMetadata]) {
        driftedFields.push(`classification.${field}`);
      }
    }
  });

  return {
    hasDrift: driftedFields.length > 0,
    driftedFields,
  };
}
