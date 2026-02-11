/**
 * REWRITER CONTRACT VALIDATORS
 *
 * Enforces the Rewriter Contract at input and output points.
 * Ensures that immutable fields are not modified during rewriting.
 */

import {
  RewriterInputContract,
  RewriterOutputContract,
  RewrittenProblem,
  ImmutableRewriteSnapshot,
  RewriteViolation,
  RewriteContractViolationError,
} from "./rewriterContract";
import { UniversalProblem } from "../analysis/diagnosticTypes";

// ============================================================================
// I. INPUT VALIDATION
// ============================================================================

/**
 * Validate rewriter input contract before rewriting begins.
 * Throws RewriteContractViolationError if invalid.
 */
export function validateRewriterInput(input: RewriterInputContract): void {
  const violations: RewriteViolation[] = [];

  // Check root structure
  if (!input.rewriterId || typeof input.rewriterId !== "string") {
    violations.push({
      problemId: "root",
      field: "rewriterId",
      rule: "required, must be string",
      message: `Invalid rewriterId: ${input.rewriterId}`,
      severity: "error",
    });
  }

  if (!input.simulationId || typeof input.simulationId !== "string") {
    violations.push({
      problemId: "root",
      field: "simulationId",
      rule: "required, must be string",
      message: `Invalid simulationId: ${input.simulationId}`,
      severity: "error",
    });
  }

  if (!input.documentId || typeof input.documentId !== "string") {
    violations.push({
      problemId: "root",
      field: "documentId",
      rule: "required, must be string",
      message: `Invalid documentId: ${input.documentId}`,
      severity: "error",
    });
  }

  // Check problems array
  if (!Array.isArray(input.problems) || input.problems.length === 0) {
    violations.push({
      problemId: "root",
      field: "problems",
      rule: "must be non-empty array",
      message: "problems array is empty or not an array",
      severity: "error",
    });
  } else {
    input.problems.forEach((problem) => {
      const problemViolations = validateProblemImmutability(problem);
      violations.push(...problemViolations);
    });
  }

  // Check simulation results array
  if (!Array.isArray(input.simulationResults)) {
    violations.push({
      problemId: "root",
      field: "simulationResults",
      rule: "must be array",
      message: "simulationResults is not an array",
      severity: "error",
    });
  } else {
    // Verify alignment: each problem should have simulation results
    const problemIds = new Set(input.problems.map(p => p.problemId));
    input.simulationResults.forEach(result => {
      result.problemResults.forEach(pr => {
        if (!problemIds.has(pr.problemId)) {
          violations.push({
            problemId: pr.problemId,
            field: "simulationResults",
            rule: "must reference input problems",
            message: `Simulation result for problem not in input: ${pr.problemId}`,
            severity: "warning",
          });
        }
      });
    });
  }

  if (violations.some(v => v.severity === "error")) {
    throw new RewriteContractViolationError(violations, {
      rewriterId: input.rewriterId,
      simulationId: input.simulationId,
    });
  }
}

/**
 * Validate that a problem has all immutable fields properly set.
 */
function validateProblemImmutability(problem: UniversalProblem): RewriteViolation[] {
  const violations: RewriteViolation[] = [];

  if (!problem.problemId) {
    violations.push({
      problemId: "unknown",
      field: "problemId",
      rule: "required",
      message: "problemId is missing",
      severity: "error",
    });
    return violations;
  }

  // Check immutable cognitive fields
  if (!problem.cognitive) {
    violations.push({
      problemId: problem.problemId,
      field: "cognitive",
      rule: "required",
      message: "cognitive metadata missing",
      severity: "error",
    });
  } else {
    const requiredCognitiveFields = [
      "bloomsLevel",
      "bloomsConfidence",
      "complexityLevel",
      "reasoningStepsRequired",
      "proceduralWeight",
    ];
    requiredCognitiveFields.forEach(field => {
      if ((problem.cognitive as any)[field] === undefined) {
        violations.push({
          problemId: problem.problemId,
          field: `cognitive.${field}`,
          rule: "immutable field must be present",
          message: `Missing immutable cognitive field: ${field}`,
          severity: "error",
        });
      }
    });
  }

  // Check immutable classification fields
  if (!problem.classification) {
    violations.push({
      problemId: problem.problemId,
      field: "classification",
      rule: "required",
      message: "classification metadata missing",
      severity: "error",
    });
  } else {
    if (!Array.isArray(problem.classification.topics)) {
      violations.push({
        problemId: problem.problemId,
        field: "classification.topics",
        rule: "immutable field must be array",
        message: "topics is not an array",
        severity: "error",
      });
    }
  }

  // Check immutable structure fields
  if (!problem.structure) {
    violations.push({
      problemId: problem.problemId,
      field: "structure",
      rule: "required",
      message: "structure metadata missing",
      severity: "error",
    });
  }

  return violations;
}

// ============================================================================
// II. OUTPUT VALIDATION
// ============================================================================

/**
 * Validate rewriter output contract after rewriting.
 * Throws RewriteContractViolationError if invalid.
 */
export function validateRewriterOutput(
  output: RewriterOutputContract,
  inputSnapshot: Map<string, ImmutableRewriteSnapshot>
): void {
  const violations: RewriteViolation[] = [];

  // Check root structure
  if (!output.rewriterId || typeof output.rewriterId !== "string") {
    violations.push({
      problemId: "root",
      field: "rewriterId",
      rule: "required, must be string",
      message: `Invalid rewriterId: ${output.rewriterId}`,
      severity: "error",
    });
  }

  if (!output.simulationId) {
    violations.push({
      problemId: "root",
      field: "simulationId",
      rule: "required",
      message: "simulationId missing from output",
      severity: "error",
    });
  }

  if (!Array.isArray(output.rewrittenProblems)) {
    violations.push({
      problemId: "root",
      field: "rewrittenProblems",
      rule: "must be array",
      message: "rewrittenProblems is not an array",
      severity: "error",
    });
  } else {
    // Validate each rewritten problem
    output.rewrittenProblems.forEach(problem => {
      const problemViolations = validateRewrittenProblem(problem, inputSnapshot);
      violations.push(...problemViolations);
    });

    // Check that all input problems appear in output
    const outputProblemIds = new Set(output.rewrittenProblems.map(p => p.problemId));
    inputSnapshot.forEach((_, problemId) => {
      if (!outputProblemIds.has(problemId)) {
        violations.push({
          problemId,
          field: "rewrittenProblems",
          rule: "must include all input problems",
          message: `Input problem missing from output: ${problemId}`,
          severity: "error",
        });
      }
    });

    // Check no duplicates
    const seen = new Set<string>();
    output.rewrittenProblems.forEach(problem => {
      if (seen.has(problem.problemId)) {
        violations.push({
          problemId: problem.problemId,
          field: "rewrittenProblems",
          rule: "no duplicate problems",
          message: `Duplicate rewritten problem: ${problem.problemId}`,
          severity: "error",
        });
      }
      seen.add(problem.problemId);
    });
  }

  // Validate summary
  if (!output.summaryOfChanges) {
    violations.push({
      problemId: "root",
      field: "summaryOfChanges",
      rule: "required",
      message: "summaryOfChanges missing",
      severity: "error",
    });
  }

  if (violations.some(v => v.severity === "error")) {
    throw new RewriteContractViolationError(violations, {
      rewriterId: output.rewriterId,
      simulationId: output.simulationId,
    });
  }
}

/**
 * Validate a single rewritten problem.
 */
function validateRewrittenProblem(
  problem: RewrittenProblem,
  inputSnapshot: Map<string, ImmutableRewriteSnapshot>
): RewriteViolation[] {
  const violations: RewriteViolation[] = [];

  if (!problem.problemId) {
    violations.push({
      problemId: "unknown",
      field: "problemId",
      rule: "required",
      message: "problemId missing from rewritten problem",
      severity: "error",
    });
    return violations;
  }

  const snapshot = inputSnapshot.get(problem.problemId);
  if (!snapshot) {
    violations.push({
      problemId: problem.problemId,
      field: "problemId",
      rule: "must reference input problem",
      message: `problemId not in input: ${problem.problemId}`,
      severity: "error",
    });
    return violations;
  }

  // Verify immutable fields match snapshot
  if (problem.cognitive.bloomsLevel !== snapshot.bloomsLevel) {
    violations.push({
      problemId: problem.problemId,
      field: "cognitive.bloomsLevel",
      rule: "IMMUTABLE - cannot change",
      message: `bloomsLevel was changed: "${snapshot.bloomsLevel}" → "${problem.cognitive.bloomsLevel}"`,
      severity: "error",
    });
  }

  if (problem.cognitive.complexityLevel !== snapshot.complexityLevel) {
    violations.push({
      problemId: problem.problemId,
      field: "cognitive.complexityLevel",
      rule: "IMMUTABLE - cannot change",
      message: `complexityLevel was changed: ${snapshot.complexityLevel} → ${problem.cognitive.complexityLevel}`,
      severity: "error",
    });
  }

  if (JSON.stringify(problem.classification.topics.sort()) !== JSON.stringify(snapshot.topics.sort())) {
    violations.push({
      problemId: problem.problemId,
      field: "classification.topics",
      rule: "IMMUTABLE - cannot change",
      message: "topics were modified during rewriting",
      severity: "error",
    });
  }

  if (problem.classification.problemType !== snapshot.problemType) {
    violations.push({
      problemId: problem.problemId,
      field: "classification.problemType",
      rule: "IMMUTABLE - cannot change",
      message: `problemType was changed: "${snapshot.problemType}" → "${problem.classification.problemType}"`,
      severity: "error",
    });
  }

  // Validate content changed (if rewritten)
  if (!problem.content || typeof problem.content !== "string") {
    violations.push({
      problemId: problem.problemId,
      field: "content",
      rule: "required, must be string",
      message: `Invalid content: ${problem.content}`,
      severity: "error",
    });
  }

  // Version must be updated
  if (!problem.version || typeof problem.version !== "string") {
    violations.push({
      problemId: problem.problemId,
      field: "version",
      rule: "required, must be string",
      message: `Invalid version: ${problem.version}`,
      severity: "warning",
    });
  }

  // Validate time metrics
  if (typeof problem.cognitive.estimatedTimeMinutes !== "number" || problem.cognitive.estimatedTimeMinutes <= 0) {
    violations.push({
      problemId: problem.problemId,
      field: "cognitive.estimatedTimeMinutes",
      rule: "must be positive number",
      message: `Invalid estimatedTimeMinutes: ${problem.cognitive.estimatedTimeMinutes}`,
      severity: "error",
    });
  }

  if (typeof problem.cognitive.linguisticComplexity !== "number" || 
      problem.cognitive.linguisticComplexity < 0 || 
      problem.cognitive.linguisticComplexity > 1) {
    violations.push({
      problemId: problem.problemId,
      field: "cognitive.linguisticComplexity",
      rule: "must be number 0-1",
      message: `Invalid linguisticComplexity: ${problem.cognitive.linguisticComplexity}`,
      severity: "error",
    });
  }

  // Validate rewrite log
  if (!problem.rewriteLog) {
    violations.push({
      problemId: problem.problemId,
      field: "rewriteLog",
      rule: "required",
      message: "rewriteLog missing",
      severity: "error",
    });
  } else {
    if (!Array.isArray(problem.rewriteLog.rulesApplied)) {
      violations.push({
        problemId: problem.problemId,
        field: "rewriteLog.rulesApplied",
        rule: "must be array",
        message: "rulesApplied is not an array",
        severity: "error",
      });
    }

    if (!Array.isArray(problem.rewriteLog.changes)) {
      violations.push({
        problemId: problem.problemId,
        field: "rewriteLog.changes",
        rule: "must be array",
        message: "changes is not an array",
        severity: "error",
      });
    }

    if (typeof problem.rewriteLog.confidenceScore !== "number" ||
        problem.rewriteLog.confidenceScore < 0 ||
        problem.rewriteLog.confidenceScore > 1) {
      violations.push({
        problemId: problem.problemId,
        field: "rewriteLog.confidenceScore",
        rule: "must be number 0-1",
        message: `Invalid confidenceScore: ${problem.rewriteLog.confidenceScore}`,
        severity: "error",
      });
    }
  }

  return violations;
}

// ============================================================================
// III. IMMUTABILITY SNAPSHOTS
// ============================================================================

/**
 * Create snapshot of immutable fields before rewriting.
 */
export function createRewriteSnapshot(problem: UniversalProblem): ImmutableRewriteSnapshot {
  return {
    problemId: problem.problemId,
    bloomsLevel: problem.cognitive.bloomsLevel,
    complexityLevel: problem.cognitive.complexityLevel,
    topics: [...problem.classification.topics],
    problemType: problem.classification.problemType,
  };
}

/**
 * Create snapshot map for all problems.
 */
export function createRewriteSnapshotMap(problems: UniversalProblem[]): Map<string, ImmutableRewriteSnapshot> {
  const map = new Map<string, ImmutableRewriteSnapshot>();
  problems.forEach(problem => {
    map.set(problem.problemId, createRewriteSnapshot(problem));
  });
  return map;
}

/**
 * Verify immutable fields weren't changed during rewriting.
 */
export function verifyRewriteImmutability(
  original: ImmutableRewriteSnapshot,
  rewritten: RewrittenProblem
): void {
  const violations: RewriteViolation[] = [];

  if (original.bloomsLevel !== rewritten.cognitive.bloomsLevel) {
    violations.push({
      problemId: original.problemId,
      field: "cognitive.bloomsLevel",
      rule: "immutable",
      message: `bloomsLevel was modified: "${original.bloomsLevel}" → "${rewritten.cognitive.bloomsLevel}"`,
      severity: "error",
    });
  }

  if (original.complexityLevel !== rewritten.cognitive.complexityLevel) {
    violations.push({
      problemId: original.problemId,
      field: "cognitive.complexityLevel",
      rule: "immutable",
      message: `complexityLevel was modified: ${original.complexityLevel} → ${rewritten.cognitive.complexityLevel}`,
      severity: "error",
    });
  }

  if (JSON.stringify(original.topics.sort()) !== JSON.stringify(rewritten.classification.topics.sort())) {
    violations.push({
      problemId: original.problemId,
      field: "classification.topics",
      rule: "immutable",
      message: "topics were modified during rewriting",
      severity: "error",
    });
  }

  if (original.problemType !== rewritten.classification.problemType) {
    violations.push({
      problemId: original.problemId,
      field: "classification.problemType",
      rule: "immutable",
      message: `problemType was modified: "${original.problemType}" → "${rewritten.classification.problemType}"`,
      severity: "error",
    });
  }

  if (violations.length > 0) {
    throw new RewriteContractViolationError(violations, {});
  }
}
