/**
 * SIMULATION CONTRACT VALIDATORS
 *
 * Enforces the Universal Simulation Contract at entry and exit points.
 * All functions throw ContractViolationError on failure.
 */

import {
  SimulationInputContract,
  SimulationOutputContract,
  StudentProblemOutput,
  StudentAssignmentSimulation,
  Astronaut,
  ContractViolation,
  ContractViolationError,
  ImmutableProblemSnapshot,
  ImmutableStudentSnapshot,
  ValidatedSimulationInput,
  ValidatedSimulationOutput,
  OverlayRegistry,
} from "./simulationContract";
import { UniversalProblem } from "../analysis/diagnosticTypes";

// ============================================================================
// I. INPUT VALIDATION
// ============================================================================

/**
 * Validate entire input contract before simulator runs.
 * Throws ContractViolationError with detailed violations if any fail.
 */
export function validateSimulationInput(
  input: SimulationInputContract
): ValidatedSimulationInput {
  const violations: ContractViolation[] = [];

  // 1. Check root structure
  if (!input.simulationId || typeof input.simulationId !== "string") {
    violations.push({
      field: "simulationId",
      rule: "required, must be string",
      message: `Invalid simulationId: ${input.simulationId}`,
      severity: "error",
    });
  }

  if (!input.documentId || typeof input.documentId !== "string") {
    violations.push({
      field: "documentId",
      rule: "required, must be string",
      message: `Invalid documentId: ${input.documentId}`,
      severity: "error",
    });
  }

  // 2. Check problems array
  if (!Array.isArray(input.problems) || input.problems.length === 0) {
    violations.push({
      field: "problems",
      rule: "must be non-empty array",
      message: "problems array is empty or not an array",
      severity: "error",
    });
  } else {
    input.problems.forEach((problem, index) => {
      const problemViolations = validateProblemInContract(problem);
      violations.push(
        ...problemViolations.map(v => ({
          ...v,
          field: `problems[${index}].${v.field}`,
        }))
      );
    });
  }

  // 3. Check students array
  if (!Array.isArray(input.students) || input.students.length === 0) {
    violations.push({
      field: "students",
      rule: "must be non-empty array",
      message: "students array is empty or not an array",
      severity: "error",
    });
  } else {
    input.students.forEach((student, index) => {
      const studentViolations = validateStudentInContract(student);
      violations.push(
        ...studentViolations.map(v => ({
          ...v,
          field: `students[${index}].${v.field}`,
        }))
      );
    });
  }

  // 4. Check environment
  if (!input.environment) {
    violations.push({
      field: "environment",
      rule: "required",
      message: "environment object missing",
      severity: "error",
    });
  } else {
    const envViolations = validateEnvironment(input.environment);
    violations.push(...envViolations);
  }

  // 5. Check overlay registry
  if (!input.overlayRegistry || typeof input.overlayRegistry !== "object") {
    violations.push({
      field: "overlayRegistry",
      rule: "required, must be object",
      message: "overlayRegistry is missing or not an object",
      severity: "error",
    });
  } else {
    const registryViolations = validateOverlayRegistry(
      input.overlayRegistry,
      input.students || []
    );
    violations.push(...registryViolations);
  }

  // If any errors, throw
  if (violations.some(v => v.severity === "error")) {
    throw new ContractViolationError(violations, {
      phase: "input",
      simulationId: input.simulationId,
    });
  }

  // Mark as validated and return
  return {
    ...input,
    __validated: {
      valid: true,
      violations,
      validatedAt: new Date().toISOString(),
      validator: "simulationInputValidator",
    },
  };
}

/**
 * Validate a single problem within contract.
 */
function validateProblemInContract(problem: UniversalProblem): ContractViolation[] {
  const violations: ContractViolation[] = [];

  if (!problem.problemId || typeof problem.problemId !== "string") {
    violations.push({
      field: "problemId",
      rule: "required, must be string",
      message: `Invalid problemId: ${problem.problemId}`,
      severity: "error",
    });
  }

  if (!problem.cognitive) {
    violations.push({
      field: "cognitive",
      rule: "required",
      message: "cognitive metadata missing",
      severity: "error",
    });
  } else {
    const cognitiveFields = [
      "bloomsLevel",
      "bloomsConfidence",
      "complexityLevel",
      "estimatedTimeMinutes",
      "linguisticComplexity",
    ];
    cognitiveFields.forEach(field => {
      if ((problem.cognitive as any)[field] === undefined) {
        violations.push({
          field: `cognitive.${field}`,
          rule: "required",
          message: `Missing required cognitive field: ${field}`,
          severity: "error",
        });
      }
    });
  }

  if (!problem.classification) {
    violations.push({
      field: "classification",
      rule: "required",
      message: "classification metadata missing",
      severity: "error",
    });
  }

  if (!problem.structure) {
    violations.push({
      field: "structure",
      rule: "required",
      message: "structure metadata missing",
      severity: "error",
    });
  }

  return violations;
}

/**
 * Validate a single student within contract.
 */
function validateStudentInContract(student: Astronaut): ContractViolation[] {
  const violations: ContractViolation[] = [];

  if (!student.studentId || typeof student.studentId !== "string") {
    violations.push({
      field: "studentId",
      rule: "required, must be string",
      message: `Invalid studentId: ${student.studentId}`,
      severity: "error",
    });
  }

  if (!student.profileTraits) {
    violations.push({
      field: "profileTraits",
      rule: "required",
      message: "profileTraits missing",
      severity: "error",
    });
  } else {
    const traitFields = ["readingLevel", "mathFluency", "attentionSpan", "confidence"];
    traitFields.forEach(field => {
      const value = (student.profileTraits as any)[field];
      if (typeof value !== "number" || value < 0 || value > 1) {
        violations.push({
          field: `profileTraits.${field}`,
          rule: "must be number 0-1",
          message: `Invalid trait value: ${field} = ${value}`,
          severity: "error",
        });
      }
    });
  }

  if (!Array.isArray(student.overlays)) {
    violations.push({
      field: "overlays",
      rule: "must be array",
      message: `overlays is not an array: ${typeof student.overlays}`,
      severity: "error",
    });
  }

  if (!Array.isArray(student.narrativeTags)) {
    violations.push({
      field: "narrativeTags",
      rule: "must be array",
      message: `narrativeTags is not an array: ${typeof student.narrativeTags}`,
      severity: "error",
    });
  }

  return violations;
}

/**
 * Validate environment.
 */
function validateEnvironment(env: any): ContractViolation[] {
  const violations: ContractViolation[] = [];

  if (!["timed", "practice", "adaptive"].includes(env.testMode)) {
    violations.push({
      field: "environment.testMode",
      rule: "must be 'timed' | 'practice' | 'adaptive'",
      message: `Invalid testMode: ${env.testMode}`,
      severity: "error",
    });
  }

  if (env.timeLimitMinutes !== null && typeof env.timeLimitMinutes !== "number") {
    violations.push({
      field: "environment.timeLimitMinutes",
      rule: "must be number or null",
      message: `Invalid timeLimitMinutes: ${env.timeLimitMinutes}`,
      severity: "error",
    });
  }

  if (!Array.isArray(env.environmentOverlays)) {
    violations.push({
      field: "environment.environmentOverlays",
      rule: "must be array",
      message: `environmentOverlays is not an array`,
      severity: "error",
    });
  }

  return violations;
}

/**
 * Validate overlay registry + check that all student overlays exist in registry.
 */
function validateOverlayRegistry(
  registry: OverlayRegistry,
  students: Astronaut[]
): ContractViolation[] {
  const violations: ContractViolation[] = [];

  const registeredOverlays = new Set(Object.keys(registry));

  students.forEach((student) => {
    (student.overlays || []).forEach(overlay => {
      if (!registeredOverlays.has(overlay)) {
        violations.push({
          field: `overlayRegistry`,
          rule: "all student overlays must be registered",
          message: `Student ${student.studentId} uses unregistered overlay: "${overlay}"`,
          severity: "error",
        });
      }
    });
  });

  return violations;
}

// ============================================================================
// II. OUTPUT VALIDATION
// ============================================================================

/**
 * Validate entire output contract from simulator.
 * Throws ContractViolationError with detailed violations if any fail.
 */
export function validateSimulationOutput(
  output: SimulationOutputContract,
  inputSnapshot: {
    problemIds: Set<string>;
    studentIds: Set<string>;
  }
): ValidatedSimulationOutput {
  const violations: ContractViolation[] = [];

  // 1. Check root structure
  if (!output.simulationId || typeof output.simulationId !== "string") {
    violations.push({
      field: "simulationId",
      rule: "required, must be string",
      message: `Invalid simulationId: ${output.simulationId}`,
      severity: "error",
    });
  }

  if (!output.documentId || typeof output.documentId !== "string") {
    violations.push({
      field: "documentId",
      rule: "required, must be string",
      message: `Invalid documentId: ${output.documentId}`,
      severity: "error",
    });
  }

  // 2. Check student results
  if (!Array.isArray(output.studentResults)) {
    violations.push({
      field: "studentResults",
      rule: "must be array",
      message: "studentResults is not an array",
      severity: "error",
    });
  } else {
    // Check each result
    output.studentResults.forEach((result, idx) => {
      const resultViolations = validateStudentAssignmentSimulation(
        result,
        inputSnapshot
      );
      violations.push(
        ...resultViolations.map(v => ({
          ...v,
          field: `studentResults[${idx}].${v.field}`,
        }))
      );
    });

    // Check that all input students have results
    const outputStudentIds = new Set(output.studentResults.map(r => r.studentId));
    inputSnapshot.studentIds.forEach(studentId => {
      if (!outputStudentIds.has(studentId)) {
        violations.push({
          field: "studentResults",
          rule: "must contain result for every input student",
          message: `Missing result for student: ${studentId}`,
          severity: "error",
        });
      }
    });

    // Check no duplicate students
    const seen = new Set<string>();
    output.studentResults.forEach(result => {
      if (seen.has(result.studentId)) {
        violations.push({
          field: "studentResults",
          rule: "no duplicate students",
          message: `Duplicate result for student: ${result.studentId}`,
          severity: "error",
        });
      }
      seen.add(result.studentId);
    });
  }

  // If any errors, throw
  if (violations.some(v => v.severity === "error")) {
    throw new ContractViolationError(violations, {
      phase: "output",
      simulationId: output.simulationId,
    });
  }

  return {
    ...output,
    __validated: {
      valid: true,
      violations,
      validatedAt: new Date().toISOString(),
      validator: "simulationOutputValidator",
    },
  };
}

/**
 * Validate a StudentAssignmentSimulation result.
 */
function validateStudentAssignmentSimulation(
  result: StudentAssignmentSimulation,
  inputSnapshot: { problemIds: Set<string> }
): ContractViolation[] {
  const violations: ContractViolation[] = [];

  if (!result.studentId || typeof result.studentId !== "string") {
    violations.push({
      field: "studentId",
      rule: "required, must be string",
      message: `Invalid studentId: ${result.studentId}`,
      severity: "error",
    });
  }

  if (!result.personaName || typeof result.personaName !== "string") {
    violations.push({
      field: "personaName",
      rule: "required, must be string",
      message: `Invalid personaName: ${result.personaName}`,
      severity: "error",
    });
  }

  if (typeof result.totalTimeMinutes !== "number" || result.totalTimeMinutes < 0) {
    violations.push({
      field: "totalTimeMinutes",
      rule: "must be non-negative number",
      message: `Invalid totalTimeMinutes: ${result.totalTimeMinutes}`,
      severity: "error",
    });
  }

  if (typeof result.estimatedScore !== "number" || result.estimatedScore < 0 || result.estimatedScore > 100) {
    violations.push({
      field: "estimatedScore",
      rule: "must be number 0-100",
      message: `Invalid estimatedScore: ${result.estimatedScore}`,
      severity: "error",
    });
  }

  if (!["A", "B", "C", "D", "F"].includes(result.estimatedGrade)) {
    violations.push({
      field: "estimatedGrade",
      rule: "must be A|B|C|D|F",
      message: `Invalid estimatedGrade: ${result.estimatedGrade}`,
      severity: "error",
    });
  }

  // Validate problem results
  if (!Array.isArray(result.problemResults)) {
    violations.push({
      field: "problemResults",
      rule: "must be array",
      message: "problemResults is not an array",
      severity: "error",
    });
  } else {
    // Check each problem result
    result.problemResults.forEach((pr, idx) => {
      const prViolations = validateStudentProblemOutput(pr);
      violations.push(
        ...prViolations.map(v => ({
          ...v,
          field: `problemResults[${idx}].${v.field}`,
        }))
      );

      // Check that problem exists in input
      if (!inputSnapshot.problemIds.has(pr.problemId)) {
        violations.push({
          field: `problemResults[${idx}].problemId`,
          rule: "must reference input problem",
          message: `Unknown problemId in result: ${pr.problemId}`,
          severity: "error",
        });
      }
    });

    // Check that every input problem has a result
    const resultProblemIds = new Set(result.problemResults.map(pr => pr.problemId));
    inputSnapshot.problemIds.forEach(problemId => {
      if (!resultProblemIds.has(problemId)) {
        violations.push({
          field: "problemResults",
          rule: "must contain result for every input problem",
          message: `Missing result for problem: ${problemId}`,
          severity: "error",
        });
      }
    });

    // Check no duplicate problems
    const seen = new Set<string>();
    result.problemResults.forEach(pr => {
      if (seen.has(pr.problemId)) {
        violations.push({
          field: "problemResults",
          rule: "no duplicate problems",
          message: `Duplicate result for problem: ${pr.problemId}`,
          severity: "error",
        });
      }
      seen.add(pr.problemId);
    });
  }

  // Validate engagement
  if (!result.engagement) {
    violations.push({
      field: "engagement",
      rule: "required",
      message: "engagement object missing",
      severity: "error",
    });
  } else {
    const engViolations = validateEngagementTrajectory(result.engagement);
    violations.push(...engViolations);
  }

  // Validate fatigue
  if (!result.fatigue) {
    violations.push({
      field: "fatigue",
      rule: "required",
      message: "fatigue object missing",
      severity: "error",
    });
  } else {
    const fatViolations = validateFatigueTrajectory(result.fatigue);
    violations.push(...fatViolations);
  }

  // Validate confusion points
  if (!Array.isArray(result.confusionPoints)) {
    violations.push({
      field: "confusionPoints",
      rule: "must be array",
      message: "confusionPoints is not an array",
      severity: "error",
    });
  } else {
    result.confusionPoints.forEach(problemId => {
      if (!inputSnapshot.problemIds.has(problemId)) {
        violations.push({
          field: "confusionPoints",
          rule: "must reference valid problemIds",
          message: `confusionPoints references unknown problem: ${problemId}`,
          severity: "error",
        });
      }
    });
  }

  // Validate atRisk and riskFactors
  if (typeof result.atRisk !== "boolean") {
    violations.push({
      field: "atRisk",
      rule: "must be boolean",
      message: `Invalid atRisk: ${result.atRisk}`,
      severity: "error",
    });
  }

  if (!Array.isArray(result.riskFactors)) {
    violations.push({
      field: "riskFactors",
      rule: "must be array",
      message: "riskFactors is not an array",
      severity: "error",
    });
  }

  return violations;
}

/**
 * Validate StudentProblemOutput.
 */
function validateStudentProblemOutput(output: StudentProblemOutput): ContractViolation[] {
  const violations: ContractViolation[] = [];

  if (!output.studentId || typeof output.studentId !== "string") {
    violations.push({
      field: "studentId",
      rule: "required, must be string",
      message: `Invalid studentId: ${output.studentId}`,
      severity: "error",
    });
  }

  if (!output.problemId || typeof output.problemId !== "string") {
    violations.push({
      field: "problemId",
      rule: "required, must be string",
      message: `Invalid problemId: ${output.problemId}`,
      severity: "error",
    });
  }

  if (typeof output.timeToCompleteSeconds !== "number" || output.timeToCompleteSeconds < 0) {
    violations.push({
      field: "timeToCompleteSeconds",
      rule: "must be non-negative number",
      message: `Invalid timeToCompleteSeconds: ${output.timeToCompleteSeconds}`,
      severity: "error",
    });
  }

  if (typeof output.percentageSuccessful !== "number" || output.percentageSuccessful < 0 || output.percentageSuccessful > 100) {
    violations.push({
      field: "percentageSuccessful",
      rule: "must be number 0-100",
      message: `Invalid percentageSuccessful: ${output.percentageSuccessful}`,
      severity: "error",
    });
  }

  if (!["low", "medium", "high"].includes(output.confusionLevel)) {
    violations.push({
      field: "confusionLevel",
      rule: "must be 'low' | 'medium' | 'high'",
      message: `Invalid confusionLevel: ${output.confusionLevel}`,
      severity: "error",
    });
  }

  if (!["low", "medium", "high"].includes(output.engagementLevel)) {
    violations.push({
      field: "engagementLevel",
      rule: "must be 'low' | 'medium' | 'high'",
      message: `Invalid engagementLevel: ${output.engagementLevel}`,
      severity: "error",
    });
  }

  if (!output.feedback || typeof output.feedback !== "string") {
    violations.push({
      field: "feedback",
      rule: "required, must be string",
      message: `Invalid feedback: ${output.feedback}`,
      severity: "error",
    });
  }

  if (output.suggestions !== undefined && !Array.isArray(output.suggestions)) {
    violations.push({
      field: "suggestions",
      rule: "if present, must be array",
      message: "suggestions is not an array",
      severity: "error",
    });
  }

  // bloomMismatch if present must be valid
  if (output.bloomMismatch !== undefined) {
    const bloomViolations = validateBloomMismatch(output.bloomMismatch);
    violations.push(...bloomViolations);
  }

  return violations;
}

function validateEngagementTrajectory(engagement: any): ContractViolation[] {
  const violations: ContractViolation[] = [];

  const fields = ["initial", "atMidpoint", "final"];
  fields.forEach(field => {
    const value = engagement[field];
    if (typeof value !== "number" || value < 0 || value > 1) {
      violations.push({
        field: `engagement.${field}`,
        rule: "must be number 0-1",
        message: `Invalid ${field}: ${value}`,
        severity: "error",
      });
    }
  });

  if (!["increasing", "declining", "stable"].includes(engagement.trend)) {
    violations.push({
      field: "engagement.trend",
      rule: "must be 'increasing' | 'declining' | 'stable'",
      message: `Invalid trend: ${engagement.trend}`,
      severity: "error",
    });
  }

  return violations;
}

function validateFatigueTrajectory(fatigue: any): ContractViolation[] {
  const violations: ContractViolation[] = [];

  const fields = ["initial", "peak", "final"];
  fields.forEach(field => {
    const value = fatigue[field];
    if (typeof value !== "number" || value < 0 || value > 1) {
      violations.push({
        field: `fatigue.${field}`,
        rule: "must be number 0-1",
        message: `Invalid ${field}: ${value}`,
        severity: "error",
      });
    }
  });

  return violations;
}

function validateBloomMismatch(mismatch: any): ContractViolation[] {
  const violations: ContractViolation[] = [];

  const bloomLevels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

  if (!bloomLevels.includes(mismatch.studentCapability)) {
    violations.push({
      field: "bloomMismatch.studentCapability",
      rule: "must be valid BloomLevel",
      message: `Invalid studentCapability: ${mismatch.studentCapability}`,
      severity: "error",
    });
  }

  if (!bloomLevels.includes(mismatch.problemDemands)) {
    violations.push({
      field: "bloomMismatch.problemDemands",
      rule: "must be valid BloomLevel",
      message: `Invalid problemDemands: ${mismatch.problemDemands}`,
      severity: "error",
    });
  }

  if (!["none", "mild", "severe"].includes(mismatch.mismatchSeverity)) {
    violations.push({
      field: "bloomMismatch.mismatchSeverity",
      rule: "must be 'none' | 'mild' | 'severe'",
      message: `Invalid mismatchSeverity: ${mismatch.mismatchSeverity}`,
      severity: "error",
    });
  }

  return violations;
}

// ============================================================================
// III. INVARIANT CHECKING
// ============================================================================

/**
 * Create immutable snapshot of problems before simulation.
 * Used to verify problems weren't modified during simulation.
 */
export function createProblemSnapshot(problem: UniversalProblem): ImmutableProblemSnapshot {
  return {
    problemId: problem.problemId,
    cognitive: { ...problem.cognitive },
    classification: { ...problem.classification },
    structure: { ...problem.structure },
  };
}

/**
 * Create immutable snapshot of students before simulation.
 * Used to verify students weren't modified during simulation.
 */
export function createStudentSnapshot(student: Astronaut): ImmutableStudentSnapshot {
  return {
    studentId: student.studentId,
    overlays: [...student.overlays],
    profileTraits: { ...student.profileTraits },
  };
}

/**
 * Verify problems weren't modified during simulation.
 * Throws ContractViolationError if any immutable field changed.
 */
export function verifyProblemInvariants(
  original: ImmutableProblemSnapshot,
  current: UniversalProblem
): void {
  const violations: ContractViolation[] = [];

  if (original.problemId !== current.problemId) {
    violations.push({
      field: "problemId",
      rule: "immutable",
      message: `problemId was modified: "${original.problemId}" → "${current.problemId}"`,
      severity: "error",
    });
  }

  if (JSON.stringify(original.cognitive) !== JSON.stringify(current.cognitive)) {
    violations.push({
      field: "cognitive",
      rule: "immutable",
      message: "cognitive metadata was modified during simulation",
      severity: "error",
    });
  }

  if (JSON.stringify(original.classification) !== JSON.stringify(current.classification)) {
    violations.push({
      field: "classification",
      rule: "immutable",
      message: "classification metadata was modified during simulation",
      severity: "error",
    });
  }

  if (JSON.stringify(original.structure) !== JSON.stringify(current.structure)) {
    violations.push({
      field: "structure",
      rule: "immutable",
      message: "structure metadata was modified during simulation",
      severity: "error",
    });
  }

  if (violations.length > 0) {
    throw new ContractViolationError(violations, {
      phase: "output",
      problematicItemId: original.problemId,
    });
  }
}

/**
 * Verify students weren't modified during simulation.
 * Throws ContractViolationError if any immutable field changed.
 */
export function verifyStudentInvariants(
  original: ImmutableStudentSnapshot,
  current: Astronaut
): void {
  const violations: ContractViolation[] = [];

  if (original.studentId !== current.studentId) {
    violations.push({
      field: "studentId",
      rule: "immutable",
      message: `studentId was modified: "${original.studentId}" → "${current.studentId}"`,
      severity: "error",
    });
  }

  if (JSON.stringify(original.profileTraits) !== JSON.stringify(current.profileTraits)) {
    violations.push({
      field: "profileTraits",
      rule: "immutable",
      message: "profileTraits were modified during simulation",
      severity: "error",
    });
  }

  if (JSON.stringify(original.overlays.sort()) !== JSON.stringify(current.overlays.sort())) {
    violations.push({
      field: "overlays",
      rule: "immutable",
      message: "overlays were modified during simulation",
      severity: "error",
    });
  }

  if (violations.length > 0) {
    throw new ContractViolationError(violations, {
      phase: "output",
      problematicItemId: original.studentId,
    });
  }
}

// ============================================================================
// IV. SNAPSHOT FOR INPUT VALIDATION
// ============================================================================

/**
 * Create input snapshot for use in output validation.
 * Records which problems and students were in input.
 */
export function createInputSnapshot(
  input: SimulationInputContract
): { problemIds: Set<string>; studentIds: Set<string> } {
  return {
    problemIds: new Set(input.problems.map(p => p.problemId)),
    studentIds: new Set(input.students.map(s => s.studentId)),
  };
}
