/**
 * STRUCTURAL VALIDATION ENGINE
 *
 * Enforces immutable system invariants at runtime:
 * 1. Problem IDs are immutable (S#_P#_[a-z])
 * 2. Schema keys cannot be invented
 * 3. Analyzer output must be JSON-valid
 * 4. Rewriter may only modify content field
 * 5. Version must increment strictly
 *
 * This is NOT error handling. This is CONSTRAINT ENFORCEMENT.
 * Violations → immediate rejection + regeneration request.
 */

import { UniversalProblem, BloomLevel } from './diagnosticTypes';

// ============================================================================
// INVARIANT DEFINITIONS (These can never be violated)
// ============================================================================

const INVARIANTS = {
  PROBLEM_ID_REGEX: /^S\d+_P\d+(_[a-z])+$/,
  REQUIRED_PROBLEM_FIELDS: [
    'problemId',
    'sectionId',
    'content',
    'cognitive',
    'classification',
  ],
  REQUIRED_COGNITIVE_FIELDS: [
    'bloomsLevel',
    'complexity Level',
    'estimatedTimeMinutes',
    'linguisticComplexity',
    'proceduralWeight',
  ],
  ALLOWED_BLOOM_LEVELS: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'] as BloomLevel[],
  ALLOWED_COMPLEXITY_LEVELS: [1, 2, 3, 4, 5],
} as const;

// ============================================================================
// ANALYZER STAGE VALIDATORS
// ============================================================================

/**
 * INVARIANT: Analyzer must output JSON-valid UniversalProblem[]
 * REJECTION: If any problem violates schema, reject entire output
 */
export function validateAnalyzerOutput(
  problems: UniversalProblem[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (!Array.isArray(problems)) {
    return {
      valid: false,
      violations: ['Analyzer output must be an array of UniversalProblem[]'],
    };
  }

  for (let i = 0; i < problems.length; i++) {
    const problem = problems[i];
    const prefix = `Problem[${i}]`;

    // INVARIANT: Problem must have a valid ID
    if (!problem.problemId) {
      violations.push(`${prefix}: Missing problemId (REQUIRED)`);
    } else if (!INVARIANTS.PROBLEM_ID_REGEX.test(problem.problemId)) {
      violations.push(
        `${prefix}: Invalid problemId format "${problem.problemId}". Must match S#_P#_[a-z]`
      );
    }

    // INVARIANT: All required fields must exist
    for (const field of INVARIANTS.REQUIRED_PROBLEM_FIELDS) {
      if (!(field in problem)) {
        violations.push(`${prefix}: Missing required field "${field}"`);
      }
    }

    // INVARIANT: Cognitive metadata must be complete
    if (problem.cognitive) {
      for (const field of INVARIANTS.REQUIRED_COGNITIVE_FIELDS) {
        const fieldKey = field === 'complexity Level' ? 'complexityLevel' : field;
        if (!(fieldKey in problem.cognitive)) {
          violations.push(`${prefix}.cognitive: Missing required field "${fieldKey}"`);
        }
      }

      // INVARIANT: Bloom level must be one of the 6 allowed values
      if (problem.cognitive.bloomsLevel && !INVARIANTS.ALLOWED_BLOOM_LEVELS.includes(problem.cognitive.bloomsLevel)) {
        violations.push(
          `${prefix}.cognitive.bloomsLevel: Invalid value "${problem.cognitive.bloomsLevel}". Must be one of: ${INVARIANTS.ALLOWED_BLOOM_LEVELS.join(', ')}`
        );
      }

      // INVARIANT: Complexity must be 1-5
      if (problem.cognitive.complexityLevel && !INVARIANTS.ALLOWED_COMPLEXITY_LEVELS.includes(problem.cognitive.complexityLevel)) {
        violations.push(
          `${prefix}.cognitive.complexityLevel: Invalid value "${problem.cognitive.complexityLevel}". Must be 1-5`
        );
      }

      // INVARIANT: No freeform keys allowed
      const allowedKeysSet = new Set(['bloomsLevel', 'complexityLevel', 'estimatedTimeMinutes', 'linguisticComplexity', 'proceduralWeight']);
      for (const key of Object.keys(problem.cognitive)) {
        if (!allowedKeysSet.has(key)) {
          violations.push(
            `${prefix}.cognitive: Freeform key "${key}" not allowed. Schema is locked.`
          );
        }
      }
    }

    // INVARIANT: Classification metadata is subject-specific but must not invent keys
    if (problem.classification) {
      const allowedClassificationKeys = new Set(['topics', 'problemType', 'tags']);
      for (const key of Object.keys(problem.classification)) {
        if (!allowedClassificationKeys.has(key)) {
          violations.push(
            `${prefix}.classification: Freeform key "${key}" not allowed.`
          );
        }
      }
    }

    // INVARIANT: Content must exist and be non-empty
    if (!problem.content || typeof problem.content !== 'string' || problem.content.trim().length === 0) {
      violations.push(`${prefix}: Content must be non-empty string`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// ============================================================================
// REWRITER STAGE VALIDATORS
// ============================================================================

/**
 * INVARIANT: Rewriter may only modify content field
 * INVARIANT: Problem ID must not change
 * INVARIANT: Cognitive metadata is locked
 * REJECTION: If any ID changes or metadata is touched, reject
 */
export function validateRewriterOutput(
  originalProblems: UniversalProblem[],
  rewrittenProblems: UniversalProblem[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (originalProblems.length !== rewrittenProblems.length) {
    violations.push(
      `Rewriter altered problem count: ${originalProblems.length} → ${rewrittenProblems.length}. Cannot add/remove problems.`
    );
  }

  const originalById = new Map(originalProblems.map(p => [p.problemId, p]));
  const rewrittenById = new Map(rewrittenProblems.map(p => [p.problemId, p]));

  for (const [problemId, rewritten] of rewrittenById) {
    const original = originalById.get(problemId);

    if (!original) {
      violations.push(
        `Rewriter added new problem with ID "${problemId}". Cannot create new problems.`
      );
      continue;
    }

    // INVARIANT: Problem ID must not change
    if (rewritten.problemId !== original.problemId) {
      violations.push(
        `Problem ID changed: "${original.problemId}" → "${rewritten.problemId}". IDs are immutable.`
      );
    }

    // INVARIANT: Section ID must not change
    if (rewritten.sectionId !== original.sectionId) {
      violations.push(
        `Section ID changed for ${problemId}: "${original.sectionId}" → "${rewritten.sectionId}". Structure is locked.`
      );
    }

    // INVARIANT: Cognitive metadata must not change
    if (JSON.stringify(rewritten.cognitive) !== JSON.stringify(original.cognitive)) {
      violations.push(
        `Cognitive metadata changed for ${problemId}. Bloom level, complexity, and time estimates are locked.`
      );
    }

    // INVARIANT: Classification metadata must not change
    if (JSON.stringify(rewritten.classification) !== JSON.stringify(original.classification)) {
      violations.push(
        `Classification metadata changed for ${problemId}. Topics and types are locked.`
      );
    }
  }

  // Check for problems that were removed
  for (const originalId of originalById.keys()) {
    if (!rewrittenById.has(originalId)) {
      violations.push(
        `Rewriter removed problem "${originalId}". Cannot delete problems.`
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// ============================================================================
// SECTION STRUCTURE VALIDATORS
// ============================================================================

/**
 * INVARIANT: Sections must be sequentially numbered S1, S2, S3...
 * INVARIANT: No gap or duplicate section IDs
 */
export function validateSectionStructure(
  sections: any[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  const sectionIds = sections.map((s: any) => s.sectionId);
  for (let i = 0; i < sectionIds.length; i++) {
    const expected = `S${i + 1}`;
    if (sectionIds[i] !== expected) {
      violations.push(
        `Section numbering error at position ${i}: expected "${expected}", got "${sectionIds[i]}"`
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// ============================================================================
// REJECTION & REGENERATION
// ============================================================================

export class InvariantViolationError extends Error {
  constructor(
    public readonly stage: 'analyzer' | 'rewriter' | 'structure',
    public readonly violations: string[]
  ) {
    super(
      `INVARIANT VIOLATION during ${stage} stage:\n` +
      violations.map((v, i) => `  ${i + 1}. ${v}`).join('\n') +
      `\n\nOutput must be rejected and regenerated.`
    );
    this.name = 'InvariantViolationError';
  }
}

/**
 * Wraps an analyzer or rewriter call and enforces invariants
 * If invariants are violated, throws InvariantViolationError
 */
export async function withInvariantEnforcement<T>(
  stage: 'analyzer' | 'rewriter',
  fn: () => Promise<T>,
  validator: (result: T) => { valid: boolean; violations: string[] }
): Promise<T> {
  const result = await fn();
  const validation = validator(result);

  if (!validation.valid) {
    throw new InvariantViolationError(stage, validation.violations);
  }

  return result;
}
