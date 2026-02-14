/**
 * Assessment Intent Validation Utilities
 * 
 * Validates AssessmentIntent inputs to ensure pipeline integrity:
 * - StudentLevel maps correctly to gradeBand
 * - AssessmentType is valid
 * - Time validated (5–240 minutes)
 * - Either sourceFile OR sourceTopic required (not both, not neither)
 */

import {
  AssessmentIntent,
  StudentLevel,
  AssessmentType,
  ValidationResult,
  STUDENT_LEVEL_TO_GRADE_BAND,
} from '../types/assessmentIntent';

/**
 * Validate that a StudentLevel exists and maps to correct gradeBand
 */
export function validateStudentLevel(level: unknown): { valid: boolean; gradeBand?: string; errors: string[] } {
  const errors: string[] = [];

  if (!level || typeof level !== 'string') {
    return {
      valid: false,
      errors: ['Student level must be a valid string.'],
    };
  }

  if (!(['Remedial', 'Standard', 'Honors', 'AP'] as const).includes(level as any)) {
    return {
      valid: false,
      errors: [`Invalid student level "${level}". Must be one of: Remedial, Standard, Honors, AP.`],
    };
  }

  const studentLevel = level as StudentLevel;
  const gradeBand = STUDENT_LEVEL_TO_GRADE_BAND[studentLevel];

  if (!gradeBand) {
    errors.push(`Failed to map student level "${studentLevel}" to grade band.`);
  }

  return {
    valid: errors.length === 0,
    gradeBand,
    errors,
  };
}

/**
 * Validate that an AssessmentType is valid
 */
export function validateAssessmentType(type: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!type || typeof type !== 'string') {
    return {
      valid: false,
      errors: ['Assessment type must be a valid string.'],
    };
  }

  if (!(['Quiz', 'Test', 'Practice'] as const).includes(type as any)) {
    return {
      valid: false,
      errors: [`Invalid assessment type "${type}". Must be one of: Quiz, Test, Practice.`],
    };
  }

  return { valid: true, errors };
}

/**
 * Validate time is between 5 and 240 minutes
 */
export function validateTime(minutes: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof minutes !== 'number' || !Number.isInteger(minutes)) {
    return {
      valid: false,
      errors: ['Time must be a valid integer.'],
    };
  }

  if (minutes < 5) {
    errors.push('Time must be at least 5 minutes.');
  }

  if (minutes > 240) {
    errors.push('Time must not exceed 240 minutes.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate source: exactly one of sourceFile or sourceTopic required
 */
export function validateSource(
  sourceFile: unknown,
  sourceTopic: unknown
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const hasFile = sourceFile instanceof File;
  const hasTopic = typeof sourceTopic === 'string' && sourceTopic.trim().length > 0;

  if (hasFile && hasTopic) {
    errors.push('Please provide either a source file OR a topic, not both.');
  } else if (!hasFile && !hasTopic) {
    errors.push('Please provide either a source file OR a topic.');
  }

  if (sourceFile && !(sourceFile instanceof File)) {
    errors.push('Source file must be a File object.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate focus areas
 */
export function validateFocusAreas(areas: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (areas === undefined || areas === null) {
    // Optional field is OK
    return { valid: true, errors };
  }

  if (!Array.isArray(areas)) {
    errors.push('Focus areas must be an array.');
    return { valid: false, errors };
  }

  if (areas.length > 5) {
    errors.push('Maximum 5 focus areas allowed.');
  }

  for (const area of areas) {
    if (typeof area !== 'string' || area.trim().length === 0) {
      errors.push('Each focus area must be a non-empty string.');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate classroom context
 */
export function validateClassroomContext(context: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (context === undefined || context === null) {
    // Optional field is OK
    return { valid: true, errors };
  }

  if (typeof context !== 'string') {
    errors.push('Classroom context must be a string.');
    return { valid: false, errors };
  }

  if (context.length > 500) {
    errors.push('Classroom context must not exceed 500 characters.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive validation of AssessmentIntent
 * Returns detailed validation result including which fields failed
 */
export function validateAssessmentIntent(intent: Partial<AssessmentIntent>): ValidationResult {
  const errors: string[] = [];

  // Validate source (either file or topic, but not both)
  const sourceValidation = validateSource(intent.sourceFile, intent.sourceTopic);
  errors.push(...sourceValidation.errors);

  // Validate student level
  const levelValidation = validateStudentLevel(intent.studentLevel);
  errors.push(...levelValidation.errors);

  // Validate assessment type
  const typeValidation = validateAssessmentType(intent.assessmentType);
  errors.push(...typeValidation.errors);

  // Validate time
  const timeValidation = validateTime(intent.timeMinutes);
  errors.push(...timeValidation.errors);

  // Validate optional fields
  const focusAreasValidation = validateFocusAreas(intent.focusAreas);
  errors.push(...focusAreasValidation.errors);

  const contextValidation = validateClassroomContext(intent.classroomContext);
  errors.push(...contextValidation.errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive assertion that validates and throws on failure
 */
export function assertValidAssessmentIntent(intent: Partial<AssessmentIntent>): void {
  const validation = validateAssessmentIntent(intent);
  if (!validation.valid) {
    const errorSummary = validation.errors.join('\n- ');
    throw new Error(`Invalid AssessmentIntent:\n- ${errorSummary}`);
  }
}
