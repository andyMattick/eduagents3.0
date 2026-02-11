# Complete Contract System - End-to-End Flow

## Overview

The **Universal Simulation Contract System** enforces strict contracts at every handoff:

1. **Analyzer** → **SimulationInputContract** (problem metadata)
2. **SimulationInputContract** → **Simulator** (with overlays)
3. **Simulator** → **SimulationOutputContract** (results)
4. **SimulationOutputContract** → **RewriterInputContract** (with simulation feedback)
5. **RewriterInputContract** → **Rewriter** (improves content)
6. **Rewriter** → **RewriterOutputContract** (improved problems)
7. **RewriterOutputContract** → **Analyzer** (next cycle, if needed)

---

## Phase 1: Analyzer Output → SimulationInputContract

### What the Analyzer Produces

The analyzer produces `UniversalProblem[]`:

```typescript
interface UniversalProblem {
  problemId: "S1_P1";
  cognitive: {
    bloomsLevel: "Understand";
    bloomsConfidence: 0.88;
    complexityLevel: 2;
    estimatedTimeMinutes: 1.8;
    linguisticComplexity: 0.52;
    // ... more fields
  };
  classification: {
    problemType: "conceptual_identification";
    topics: ["sampling_distributions"];
  };
  structure: { /* ... */ };
  content: "A researcher randomly selects...";
}
```

### Wrapping in Contract

Before passing to simulator, wrap in contract:

```typescript
function buildSimulationInput(
  problems: UniversalProblem[],
  students: Astronaut[],
  timeLimitMinutes: number | null
): SimulationInputContract {
  
  return {
    simulationId: `sim_${Date.now()}`,
    documentId: problems[0].documentId,
    problems,
    students,
    environment: {
      testMode: timeLimitMinutes ? "timed" : "practice",
      timeLimitMinutes,
      environmentOverlays: []
    },
    overlayRegistry: getOverlayRegistry(),
    createdAt: new Date().toISOString(),
    executionMode: "deterministic"
  };
}
```

### Validation

```typescript
import { validateSimulationInput, createInputSnapshot } from "./contractValidator";

const validatedInput = validateSimulationInput(input);
const inputSnapshot = createInputSnapshot(validatedInput);

// Store snapshot for later verification
const problems = validatedInput.problems;
const students = validatedInput.students;
```

---

## Phase 2: SimulationInputContract → Simulator

### Entry Point

```typescript
async function simulateStudentsWithContractEnforcement(
  input: ValidatedSimulationInput
): Promise<ValidatedSimulationOutput> {
  
  // Create snapshots of immutable fields
  const problemSnapshots = input.problems.map(p => createProblemSnapshot(p));
  const studentSnapshots = input.students.map(s => createStudentSnapshot(s));
  const inputSnapshot = createInputSnapshot(input);
  
  // Call simulator with validated input
  const output = await runSimulation(input);
  
  // Verify nothing was modified
  problemSnapshots.forEach((snapshot, idx) => {
    verifyProblemInvariants(snapshot, input.problems[idx]);
  });
  
  studentSnapshots.forEach((snapshot, idx) => {
    verifyStudentInvariants(snapshot, input.students[idx]);
  });
  
  // Validate output
  return validateSimulationOutput(output, inputSnapshot);
}
```

### What Simulator Does

Inside the simulator:

```typescript
// ✅ ALLOWED
const studentWithOverlay = applyAdhd(student);  // Creates copy
const timeEstimate = calculateTime(problem, studentWithOverlay);
const output = generateProblemOutput(problem, studentWithOverlay, timeEstimate);

// ❌ FORBIDDEN
student.profileTraits.mathFluency = 0.95;  // Direct modification
problem.cognitive.bloomsLevel = "Apply";   // Changing immutable
problems.push(newProblem);                  // Adding problems
```

### Output Generation

Simulator generates `StudentProblemOutput` for each (student, problem) pair:

```typescript
{
  studentId: "student_1",
  problemId: "S1_P1",
  timeToCompleteSeconds: 120,
  percentageSuccessful: 85,
  confusionLevel: "low",
  engagementLevel: "high",
  feedback: "...",
  bloomMismatch?: { /* ... */ }
}
```

Then aggregates into `StudentAssignmentSimulation`:

```typescript
{
  studentId: "student_1",
  personaName: "Alex (ADHD Profile)",
  totalTimeMinutes: 47.3,
  estimatedScore: 76,
  estimatedGrade: "C",
  problemResults: [ /* ... */ ],
  engagement: {
    initial: 0.80,
    atMidpoint: 0.72,
    final: 0.55,
    trend: "declining"
  },
  fatigue: {
    initial: 0.0,
    peak: 0.42,
    final: 0.38
  },
  confusionPoints: ["S1_P5"],
  atRisk: false,
  riskFactors: []
}
```

---

## Phase 3: Simulator → SimulationOutputContract

### Exit Point

Simulator returns:

```typescript
const output: SimulationOutputContract = {
  simulationId: "sim_1707609600000",
  documentId: "doc_1707609600000",
  executedAt: new Date().toISOString(),
  studentResults: [ /* student sims */ ],
  problemsProcessed: 8,
  studentsProcessed: 2,
  totalSimulationTimeMs: 1250
};
```

### Validation

```typescript
import { validateSimulationOutput } from "./contractValidator";

try {
  const validatedOutput = validateSimulationOutput(output, inputSnapshot);
  console.log("✓ Simulation output is valid");
} catch (error) {
  if (error instanceof ContractViolationError) {
    error.getErrorViolations().forEach(v => {
      console.error(`[${v.field}] ${v.message}`);
    });
    throw error;
  }
}
```

### What Gets Checked

```
✓ Every input problem appears exactly once in results
✓ Every input student has exactly one result
✓ confusionPoints reference valid problemIds
✓ engagement/fatigue values are in valid ranges
✓ No extra fields added to schema
✓ All numeric fields are finite numbers
✓ Grades are A|B|C|D|F
```

---

## Phase 4: SimulationOutputContract → RewriterInputContract

### Building Rewriter Input

```typescript
import { RewriterInputContract } from "./rewriterContract";

function buildRewriterInput(
  problems: UniversalProblem[],
  simulationResults: StudentAssignmentSimulation[],
  shouldSimplify: boolean = true
): RewriterInputContract {
  
  return {
    rewriterId: `rewrite_${Date.now()}`,
    simulationId: simulationResults[0].studentId, // Actually from simulation
    documentId: problems[0].documentId,
    
    problems,
    simulationResults,
    
    rewriteOptions: {
      focusOnBloom: shouldSimplify,
      reduceLinguisticComplexity: true,
      breakMultipart: true,
      improveClarity: true,
      addScaffolding: true,
      generateAccessibilityVariants: true
    },
    
    createdAt: new Date().toISOString()
  };
}
```

### Validation

```typescript
import { validateRewriterInput, createRewriteSnapshotMap } from "./rewriterContractValidator";

validateRewriterInput(input);  // Throws if invalid
const snapshotMap = createRewriteSnapshotMap(input.problems);
```

---

## Phase 5: RewriterInputContract → Rewriter

### Entry Point

```typescript
async function rewriteWithContractEnforcement(
  input: RewriterInputContract
): Promise<ValidatedRewriterOutput> {
  
  // Validate input
  validateRewriterInput(input);
  
  // Create snapshots of immutable fields
  const snapshotMap = createRewriteSnapshotMap(input.problems);
  
  // Call rewriter
  const output = await runRewriter(input);
  
  // Verify immutability
  output.rewrittenProblems.forEach(rewritten => {
    const original = snapshotMap.get(rewritten.problemId);
    if (original) {
      verifyRewriteImmutability(original, rewritten);
    }
  });
  
  // Validate output
  validateRewriterOutput(output, snapshotMap);
  
  return output;
}
```

### What Rewriter Does

```typescript
// ✅ ALLOWED - Modifying content
problem.content = "Simplified version...";
problem.cognitive.estimatedTimeMinutes = 1.6;  // Reduced from 1.8
problem.cognitive.linguisticComplexity = 0.45;  // Reduced from 0.52
problem.version = "1.1";

// ❌ FORBIDDEN - Changing cognitive/classification
problem.cognitive.bloomsLevel = "Apply";  // LOCKED - cannot change
problem.classification.topics = [];       // LOCKED - cannot change
problem.classification.problemType = "new_type";  // LOCKED
```

### Rule Application

Rewriter applies rules like:

```typescript
const rules: RewriteRuleConfig[] = [
  {
    name: "simplify-language",
    eligibleProblems: (p) => p.cognitive.linguisticComplexity > 0.6,
    apply: (problem) => ({
      newContent: simplifyText(problem.content),
      linguisticComplexityAdjustment: -0.1,
      timeAdjustment: -0.3,
      reasoning: "Simplified vocabulary and sentence structure"
    })
  },
  
  {
    name: "break-multipart",
    eligibleProblems: (p) => p.structure.multiPartCount > 1,
    apply: (problem) => ({
      newContent: breakIntoSubparts(problem.content),
      timeAdjustment: 0.2,  // Slightly more time for clarity
      reasoning: "Broke multipart question into subparts"
    })
  }
];
```

### Output Structure

Rewriter returns `RewriterOutputContract`:

```typescript
{
  rewriterId: "rewrite_1707609600000",
  simulationId: "sim_1707609600000",
  documentId: "doc_1707609600000",
  executedAt: new Date().toISOString(),
  
  rewrittenProblems: [
    {
      problemId: "S1_P1",
      originalContent: "A researcher...",
      content: "Simplified: A researcher...",
      version: "1.1",
      
      cognitive: {
        bloomsLevel: "Understand",  // ← LOCKED (same as input)
        complexityLevel: 2,  // ← LOCKED
        estimatedTimeMinutes: 1.6,  // Changed (was 1.8)
        linguisticComplexity: 0.45  // Changed (was 0.52)
      },
      
      classification: {
        problemType: "conceptual_identification",  // ← LOCKED
        topics: ["sampling_distributions"]  // ← LOCKED
      },
      
      rewriteLog: {
        rulesApplied: ["simplify-language", "improve-clarity"],
        changes: [
          {
            aspect: "linguistic_complexity",
            before: 0.52,
            after: 0.45,
            explanation: "Simplified vocabulary and shortened sentences"
          },
          {
            aspect: "estimated_time",
            before: 1.8,
            after: 1.6,
            explanation: "Simplified text requires less reading time"
          }
        ],
        confidenceScore: 0.87
      }
    }
    // ... more problems
  ],
  
  summaryOfChanges: {
    totalProblemsProcessed: 8,
    totalProblemsRewritten: 5,
    percentageChanged: 62.5,
    averageLinguisticComplexityImprovement: -0.08,
    averageTimeAdjustment: -1.2,
    accessibilityVariantsGenerated: 3
  },
  
  rulesApplied: {
    "simplify-language": 5,
    "improve-clarity": 4,
    "break-multipart": 2,
    "add-scaffolding": 3
  }
}
```

### Validation

```typescript
try {
  validateRewriterOutput(output, snapshotMap);
  console.log("✓ Rewriter output is valid");
} catch (error) {
  if (error instanceof RewriteContractViolationError) {
    error.getErrorViolations().forEach(v => {
      console.error(`[${v.problemId}/${v.field}] ${v.message}`);
    });
    throw error;
  }
}
```

---

## Phase 6: RewriterOutputContract → Next Cycle

### Feeding Back into Analyzer

```typescript
// Extract rewritten problems for next cycle
const rewrittenProblems: UniversalProblem[] = output.rewrittenProblems.map(rp => ({
  ...input.problems.find(p => p.problemId === rp.problemId)!,
  content: rp.content,
  cognitive: {
    ...rp.cognitive
  },
  version: rp.version
}));

// Run simulation again on rewritten version
const nextInput = buildSimulationInput(rewrittenProblems, students, timeLimitMinutes);
const nextOutput = await simulateStudentsWithContractEnforcement(nextInput);

// Compare results
const improvement = {
  originalScore: firstSimulation.estimatedScore,
  rewrittenScore: nextOutput.estimatedScore,
  improvement: nextOutput.estimatedScore - firstSimulation.estimatedScore,
  averageTimeReduction: 
    (firstSimulation.totalTimeMinutes - nextOutput.totalTimeMinutes) / firstSimulation.totalTimeMinutes * 100
};

console.log(`Original: ${improvement.originalScore} → Rewritten: ${improvement.rewrittenScore}`);
console.log(`Time reduced by ${improvement.averageTimeReduction.toFixed(1)}%`);
```

---

## Error Handling Across Phases

### Input Validation Failure

```typescript
try {
  validateSimulationInput(input);
} catch (error) {
  if (error instanceof ContractViolationError) {
    console.error("Input contract violations detected:");
    error.getErrorViolations().forEach(v => {
      console.error(`  ❌ ${v.field}: ${v.message}`);
    });
    // Don't proceed to simulator
    return { error: "Input validation failed" };
  }
}
```

### Output Validation Failure

```typescript
try {
  validateSimulationOutput(output, inputSnapshot);
} catch (error) {
  if (error instanceof ContractViolationError) {
    console.error("Output contract violations:");
    error.getErrorViolations().forEach(v => {
      console.error(`  ❌ ${v.field}: ${v.message}`);
    });
    // Simulation output rejected
    // Options: reject entire simulation, request regeneration, escalate
    return { error: "Output validation failed", violations: error.violations };
  }
}
```

### Invariant Violation

```typescript
try {
  verifyProblemInvariants(snapshot, problem);
} catch (error) {
  if (error instanceof ContractViolationError) {
    const violation = error.violations[0];
    console.error(`❌ INVARIANT VIOLATION: ${violation.field}`);
    console.error(`   Problem ${snapshot.problemId} was modified during simulation`);
    // Invariant violations are fatal - reject immediately
    throw error;
  }
}
```

---

## Complete Integration Example

```typescript
// PHASE 1: Analyze document → create problems
const problems = await analyzeDocument(assignmentText);

// PHASE 2: Get student profiles
const students = loadStudentProfiles();

// PHASE 3: Build and validate simulation input
const simInput = buildSimulationInput(problems, students, 60);
const validatedSimInput = validateSimulationInput(simInput);
const inputSnapshot = createInputSnapshot(validatedSimInput);

// PHASE 4: Run simulation with enforcement
let simOutput: ValidatedSimulationOutput;
try {
  simOutput = await simulateStudentsWithContractEnforcement(validatedSimInput);
} catch (error) {
  console.error("Simulation failed:", error.message);
  return { error: "Simulation contract violation" };
}

// PHASE 5: Analyze results
const struggling = simOutput.studentResults
  .filter(r => r.atRisk)
  .flatMap(r => r.confusionPoints);

if (struggling.length === 0) {
  console.log("✓ No at-risk students detected");
  return { success: true, simulation: simOutput };
}

// PHASE 6: Build rewriter input
const rewriteInput = buildRewriterInput(problems, simOutput.studentResults);
validateRewriterInput(rewriteInput);
const snapshotMap = createRewriteSnapshotMap(problems);

// PHASE 7: Rewrite problems
let rewriteOutput: RewriterOutputContract;
try {
  rewriteOutput = await rewriteWithContractEnforcement(rewriteInput);
} catch (error) {
  console.error("Rewrite failed:", error.message);
  return { error: "Rewriter contract violation" };
}

// PHASE 8: Run simulation on rewritten version
const rewriteProblems = rewriteOutput.rewrittenProblems.map(/* ... */);
const simInput2 = buildSimulationInput(rewriteProblems, students, 60);
const simOutput2 = await simulateStudentsWithContractEnforcement(simInput2);

// PHASE 9: Report improvement
return {
  success: true,
  original: simOutput,
  rewritten: rewriteOutput,
  rewrittenSimulation: simOutput2,
  improvement: {
    originalScore: simOutput.estimatedScore,
    rewrittenScore: simOutput2.estimatedScore,
    improvement: simOutput2.estimatedScore - simOutput.estimatedScore
  }
};
```

---

## Contract Evolution

As the system evolves, contracts may change. Use versioning:

```typescript
interface SimulationInputContract {
  contractVersion: "1.0" | "1.1" | "2.0";  // Breaking changes increment major
  // ... fields ...
}
```

**Non-Breaking Changes** (minor bump):
- Add optional field
- Add new overlay to registry
- Expand enum (accept old + new values)

**Breaking Changes** (major bump):
- Remove required field
- Change field type
- Reorganize structure
- Rename invariant

---

## Testing Checklist

- [ ] Valid input → simulator succeeds
- [ ] Invalid input → ContractViolationError (before simulator runs)
- [ ] Simulator modifies problem → invariant error (after simulator runs)
- [ ] Simulator modifies student → invariant error
- [ ] Output missing problem → output validation error
- [ ] Output has extra problem → output validation error
- [ ] Output confusionPoints invalid → output validation error
- [ ] Rewriter changes bloomsLevel → rewrite validation error
- [ ] Rewriter changes topics → rewrite validation error
- [ ] Rewriter improves content → rewrite succeeds
- [ ] Error reports full violation list (not summary)
- [ ] Severity levels respected (stop on error, warn on warning)

