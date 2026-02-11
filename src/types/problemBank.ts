/**
 * Problem Bank Types
 * Complete UniversalProblem storage with immutable field locking
 * and ID re-sequencing for assessment assembly
 */

import { UniversalProblem, CognitiveMetadata, ClassificationMetadata } from './universalPayloads';

// ============================================================================
// PROBLEM BANK STORAGE
// ============================================================================

/**
 * Immutable field lock tracks which layers are locked after analysis
 * Once locked, cognitive and classification cannot be modified
 */
export interface ImmutableFieldLock {
  problemId: string;
  lockedAt: string; // ISO timestamp when locked
  lockedBy: 'analyzer' | 'system'; // Who locked it
  cognitiveLocked: boolean; // Can't modify cognitive.* after analyzer
  classificationLocked: boolean; // Can't modify classification.* after analyzer
  structureLocked: boolean; // Can't modify structure.* after analyzer
  lockReason?: string; // Why it was locked (e.g., "Post-analysis immutability")
}

/**
 * Problem Bank Entry: Complete UniversalProblem with metadata
 * Stored in Supabase problem_bank collection
 */
export interface ProblemBankEntry {
  id: string; // UUID, unique in problem bank
  teacherId: string;
  
  // Full UniversalProblem (source of truth)
  problem: UniversalProblem;
  
  // Immutable layer tracking
  immutableLock: ImmutableFieldLock;
  
  // Usage tracking
  isFavorite: boolean;
  usageCount: number;
  usedInAssignmentIds: string[]; // Which assignments used this
  lastUsed?: string; // ISO timestamp
  
  // Source tracking
  sourceAssignmentId?: string; // Where it came from (if imported)
  sourceDocumentId?: string; // Which document it was extracted from
  
  // Metadata
  notes?: string;
  tags?: string[]; // Teacher-added tags (independent of problem tags)
  createdAt: string;
  updatedAt: string;
}

/**
 * ID Re-sequencing Context: Maps old IDs to new IDs
 * Used when assembling problems from ProblemBank into new assessments
 */
export interface IdResequencingMap {
  oldProblemId: string; // Original problemId (e.g., "S1_P3_a")
  newProblemId: string; // New problemId in new context (e.g., "Section2_P1")
  sectionId: string; // New section they belong to
  order: number; // Order within section
}

/**
 * Validation result after checking for schema drift
 */
export interface SchemaValidationResult {
  isValid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
}

export interface SchemaValidationError {
  field: string;
  issue: string;
  severity: 'critical' | 'error';
  message: string;
}

export interface SchemaValidationWarning {
  field: string;
  issue: string;
  message: string;
}

/**
 * Immutability violation audit log
 */
export interface ImmutabilityViolationLog {
  id: string; // UUID
  problemId: string;
  teacherId: string;
  attemptedField: string; // Which field they tried to change
  attemptedValue: unknown;
  originalValue: unknown;
  timestamp: string; // ISO
  reason: string; // Why it was attempted
  blocked: boolean; // Whether the change was prevented
}

/**
 * Problem Bank Assembly Result
 * When creating a new assessment from ProblemBank problems
 */
export interface ProblemAssemblyResult {
  originalProblemBankEntryId: string;
  originalProblemId: string;
  newProblemId: string;
  problem: UniversalProblem; // With updated problemId, cognitive/classification preserved
  idMappings: IdResequencingMap;
  immutableLock: ImmutableFieldLock; // Lock status preserved
  validationResult: SchemaValidationResult;
  warnings: string[];
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Immutable layers that cannot change after analysis
 */
export const IMMUTABLE_FIELDS = {
  cognitive: [
    'bloomsLevel',
    'bloomsConfidence',
    'bloomsReasoning',
    'bloomsContextDependent',
    'complexityLevel',
    'estimatedTimeMinutes',
    'timeBreakdown',
    'linguisticComplexity',
    'reasoningStepsRequired',
    'proceduralWeight',
  ] as const,
  
  classification: [
    'problemType',
    'topics',
    'requiresCalculator',
    'requiresInterpretation',
  ] as const,
  
  structure: [
    'isSubpart',
    'numberingStyle',
    'multiPartCount',
    'sourceLineStart',
    'sourceLineEnd',
  ] as const,
};

/**
 * Only these can be modified by the rewriter
 */
export const MUTABLE_FIELDS = {
  content: true, // Problem text can be rewritten
};

/**
 * Problem ID format: Section_Problem[_Subpart]
 * Examples: S1_P1, S1_P2_a, Section2_P3_b
 */
export const PROBLEM_ID_PATTERN = /^[A-Za-z0-9]+_P\d+(_[a-z])?$/;

/**
 * Valid Bloom levels
 */
export const VALID_BLOOM_LEVELS = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
] as const;

/**
 * Complexity level range
 */
export const COMPLEXITY_LEVEL_RANGE = { min: 1, max: 5 };
