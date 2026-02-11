# Universal Simulation Contract - Implementation Guide

## Overview

The **Universal Simulation Contract** enforces strict input/output contracts around the simulator. Instead of the simulator receiving raw data and hoping it works correctly, it:

1. **Receives** a strictly-validated `SimulationInputContract`
2. **Must not modify** problem or student objects
3. **Returns** strictly-validated `SimulationOutputContract` outputs
4. **Verifies** all immutable fields remain unchanged

**Key Principle**: The contract is a legal agreement. Violations are errors, not warnings.

---

## Part 1: Input Contract Flow

### 1.1 What the Simulator Receives

The simulator NEVER receives raw arrays like:
```typescript
// ❌ WRONG - raw objects
simulateStudents([problem1, problem2], [student1, student2]);
```

Instead, it receives:
```typescript
// ✅ CORRECT - wrapped in contract
const input: SimulationInputContract = {
  simulationId: "sim_1707609600000",
  documentId: "doc_1707609600000",
  problems: [problem1, problem2],
  students: [student1, student2],
  environment: { testMode: "timed", timeLimitMinutes: 60, environmentOverlays: [] },
  overlayRegistry: { adhd: {...}, dyslexic: {...} },
  createdAt: new Date().toISOString(),
  executionMode: "deterministic"
};
```

### 1.2 Validation Before Simulator Runs

```typescript
import { 
  validateSimulationInput, 
  createInputSnapshot,
  createProblemSnapshot,
  createStudentSnapshot 
} from "./contractValidator";

// Step 1: Validate input contract
let validatedInput: ValidatedSimulationInput;
try {
  validatedInput = validateSimulationInput(input);
} catch (error) {
  if (error instanceof ContractViolationError) {
    console.error("Input contract violations:");
    error.getErrorViolations().forEach(v => {
      console.error(`  ${v.field}: ${v.message}`);
    });
    throw error;
  }
}

// Step 2: Create snapshots of immutable fields
const problemSnapshots = validatedInput.problems.map(createProblemSnapshot);
const studentSnapshots = validatedInput.students.map(createStudentSnapshot);
const inputSnapshot = createInputSnapshot(validatedInput);

// Step 3: Pass validated input to simulator
const output = await simulateStudents(validatedInput);

// Step 4: Verify invariants after simulation
problemSnapshots.forEach((snapshot, idx) => {
  verifyProblemInvariants(snapshot, validatedInput.problems[idx]);
});

studentSnapshots.forEach((snapshot, idx) => {
  verifyStudentInvariants(snapshot, validatedInput.students[idx]);
});
```

### 1.3 What Gets Validated in Input

```
SimulationInputContract:
  ✓ simulationId is string
  ✓ documentId is string
  ✓ problems is non-empty array
  ✓ students is non-empty array
  ✓ environment is valid
  ✓ overlayRegistry exists
  
UniversalProblem (each):
  ✓ problemId is string
  ✓ cognitive.bloomsLevel is valid
  ✓ cognitive.bloomsConfidence is 0-1
  ✓ cognitive.complexityLevel is 1-5
  ✓ cognitive.estimatedTimeMinutes > 0
  ✓ cognitive.linguisticComplexity is 0-1
  ✓ classification exists
  ✓ structure exists
  
Astronaut (each):
  ✓ studentId is string
  ✓ profileTraits all 0-1
  ✓ overlays is array
  ✓ narrativeTags is array
  
SimulationEnvironment:
  ✓ testMode is timed|practice|adaptive
  ✓ timeLimitMinutes is number or null
  ✓ environmentOverlays is array
  
OverlayRegistry:
  ✓ All student overlays exist in registry
  ✓ No student uses unregistered overlay
```

---

## Part 2: Simulator Internals (What it Derives)

### 2.1 Internal StudentProblemInput

From the contract, simulator derives **internally**:

```typescript
interface StudentProblemInput {
  studentId: string;
  problemId: string;
  bloomLevel: BloomLevel;
  linguisticComplexity: number;        // From problem.cognitive
  complexityLevel: 1 | 2 | 3 | 4 | 5;
  estimatedTimeMinutes: number;
  
  // Derived per problem sequence
  priorFatigueIndex: number;           // Accumulates as student progresses
  priorEngagementScore: number;
  priorSuccessRate: number;
  
  // Generated state
  adjustedTimeMinutes: number;         // After applying overlays
  effectiveBloomLevel: BloomLevel;     // Match to student capability
  expectedSuccessRate: number;
  timePressureIndex: number;
}
```

**Key**: These are derived **inside** the simulator. Never exposed. Never part of contract.

### 2.2 Overlay Application

Simulator may apply overlays:

```typescript
// Example: ADHD overlay reduces attention span
if (student.overlays.includes("adhd")) {
  const adhd = overlayRegistry["adhd"];
  
  // Apply modifiers INTERNALLY
  const adjustedAttention = 
    student.profileTraits.attentionSpan * (adhd.modifiers.attentionSpanMultiplier || 1.0);
  
  // This affects simulation metrics, NOT the original student object
}

// ❌ WRONG - modifying student
student.profileTraits.attentionSpan = adjustedAttention;  // DON'T DO THIS

// ✅ CORRECT - working with copy
const studentWithOverlay = {
  ...student,
  profileTraits: {
    ...student.profileTraits,
    attentionSpan: adjustedAttention
  }
};
// Use studentWithOverlay in calculations, discard after
```

### 2.3 What Simulator Must NOT Do

```typescript
// ❌ DO NOT MODIFY PROBLEMS
problem.cognitive.bloomsLevel = "Remember";  // VIOLATION
problem.classification.topics = [];          // VIOLATION
problem.problemId = "new_id";                // VIOLATION

// ❌ DO NOT MODIFY STUDENTS
student.studentId = "new_id";                // VIOLATION
student.profileTraits.mathFluency = 0.95;    // VIOLATION
student.overlays = [];                       // VIOLATION

// ❌ DO NOT MERGE/SPLIT PROBLEMS
problems.splice(1, 1);                       // VIOLATION
problems.push(newProblem);                   // VIOLATION

// ❌ DO NOT RECALCULATE COGNITIVE
problem.cognitive.bloomsLevel = recalculateBloom(); // VIOLATION
```

---

## Part 3: Output Contract Flow

### 3.1 What the Simulator Returns

After simulation, the simulator returns:

```typescript
const output: SimulationOutputContract = {
  simulationId: "sim_1707609600000",
  documentId: "doc_1707609600000",
  executedAt: new Date().toISOString(),
  
  studentResults: [
    {
      studentId: "student_1",
      personaName: "Alex (ADHD Profile)",
      totalTimeMinutes: 47.3,
      estimatedScore: 76,
      estimatedGrade: "C",
      
      problemResults: [
        {
          studentId: "student_1",
          problemId: "S1_P1",
          timeToCompleteSeconds: 120,
          percentageSuccessful: 85,
          confusionLevel: "low",
          engagementLevel: "high",
          feedback: "...",
          bloomMismatch: { ... }
        },
        // ... more problems
      ],
      
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
  ],
  
  problemsProcessed: 8,
  studentsProcessed: 2,
  totalSimulationTimeMs: 1250
};
```

### 3.2 Validation After Simulator Runs

```typescript
import { 
  validateSimulationOutput,
  verifyProblemInvariants,
  verifyStudentInvariants
} from "./contractValidator";

// Step 1: Verify immutables weren't touched
problemSnapshots.forEach((snapshot, idx) => {
  try {
    verifyProblemInvariants(snapshot, validatedInput.problems[idx]);
  } catch (error) {
    console.error(`Problem ${snapshot.problemId} was modified!`);
    throw error;
  }
});

studentSnapshots.forEach((snapshot, idx) => {
  try {
    verifyStudentInvariants(snapshot, validatedInput.students[idx]);
  } catch (error) {
    console.error(`Student ${snapshot.studentId} was modified!`);
    throw error;
  }
});

// Step 2: Validate output contract
let validatedOutput: ValidatedSimulationOutput;
try {
  validatedOutput = validateSimulationOutput(output, inputSnapshot);
} catch (error) {
  if (error instanceof ContractViolationError) {
    console.error("Output contract violations:");
    error.getErrorViolations().forEach(v => {
      console.error(`  ${v.field}: ${v.message}`);
    });
    throw error;
  }
}

// Step 3: Use validated output
console.log(validatedOutput.__validated);  // { valid: true, ... }
return validatedOutput;
```

### 3.3 What Gets Validated in Output

```
SimulationOutputContract:
  ✓ simulationId matches input
  ✓ documentId matches input
  ✓ studentResults is array
  
Per Student Result:
  ✓ studentId matches input student
  ✓ personaName is non-empty string
  ✓ totalTimeMinutes ≥ 0
  ✓ estimatedScore is 0-100
  ✓ estimatedGrade is A|B|C|D|F
  ✓ problemResults contains ALL input problems (exact count)
  ✓ NO duplicate problems
  ✓ engagement: all 0-1, trend is valid
  ✓ fatigue: all 0-1
  ✓ confusionPoints references valid problemIds
  ✓ atRisk is boolean
  ✓ riskFactors is array
  
Per Problem Result:
  ✓ problemId matches input problem
  ✓ timeToCompleteSeconds ≥ 0
  ✓ percentageSuccessful is 0-100
  ✓ confusionLevel is low|medium|high
  ✓ engagementLevel is low|medium|high
  ✓ feedback is non-empty string
  ✓ suggestions (if present) is array
  ✓ bloomMismatch (if present) has valid fields

Cross-Contract Rules:
  ✓ Every input problem appears exactly once in results
  ✓ Every input student has exactly one result
  ✓ No extraneous problems or students in output
  ✓ All confusionPoints reference valid problemIds
```

---

## Part 4: Complete Integration Pattern

### 4.1 Handler Wrapper Pattern

```typescript
/**
 * Wraps simulator with contract enforcement.
 * Auto-validates input, calls simulator, validates output, checks invariants.
 */
export async function simulateStudentsWithContractEnforcement(
  input: SimulationInputContract
): Promise<ValidatedSimulationOutput> {
  
  // 1. Validate input
  const validatedInput = validateSimulationInput(input);
  
  // 2. Create snapshots
  const problemSnapshots = validatedInput.problems.map(createProblemSnapshot);
  const studentSnapshots = validatedInput.students.map(createStudentSnapshot);
  const inputSnapshot = createInputSnapshot(validatedInput);
  
  // 3. Call simulator
  let output: SimulationOutputContract;
  try {
    output = await runSimulation(validatedInput);
  } catch (error) {
    throw new Error(`Simulator failed: ${error.message}`);
  }
  
  // 4. Verify invariants
  problemSnapshots.forEach((snapshot, idx) => {
    verifyProblemInvariants(snapshot, validatedInput.problems[idx]);
  });
  
  studentSnapshots.forEach((snapshot, idx) => {
    verifyStudentInvariants(snapshot, validatedInput.students[idx]);
  });
  
  // 5. Validate output
  const validatedOutput = validateSimulationOutput(output, inputSnapshot);
  
  // 6. Return validated output
  return validatedOutput;
}
```

### 4.2 Error Handling Pattern

```typescript
import { ContractViolationError } from "./simulationContract";

try {
  const result = await simulateStudentsWithContractEnforcement(input);
  // Use result...
} catch (error) {
  if (error instanceof ContractViolationError) {
    // Extract details
    const errors = error.getErrorViolations();
    const warnings = error.getWarningViolations();
    
    console.log(`Phase: ${error.context.phase}`);
    console.log(`Item: ${error.context.problematicItemId}`);
    console.log(`Error count: ${errors.length}`);
    
    // Report to user
    errors.forEach(v => {
      console.error(`[${v.field}] ${v.message}`);
    });
    
    // Reject or retry
    throw new Error("Contract violation detected. Simulation rejected.");
  } else {
    throw error;
  }
}
```

### 4.3 Building the Input Contract

```typescript
import { SimulationInputContract, OverlayRegistry } from "./simulationContract";
import { getOverlayRegistry } from "./accessibilityProfiles";

// From API handler
function buildSimulationInput(
  problems: UniversalProblem[],
  students: Astronaut[],
  timeLimitMinutes: number | null
): SimulationInputContract {
  
  return {
    simulationId: `sim_${Date.now()}`,
    documentId: problems[0].documentId,  // All problems from same document
    
    problems,
    students,
    
    environment: {
      testMode: timeLimitMinutes ? "timed" : "practice",
      timeLimitMinutes,
      environmentOverlays: []  // Add environment overlays if needed
    },
    
    overlayRegistry: getOverlayRegistry(),  // Load all defined overlays
    
    createdAt: new Date().toISOString(),
    executionMode: "deterministic"
  };
}
```

---

## Part 5: Overlay Registry Pattern

### 5.1 Defining Overlays

```typescript
import { OverlayRegistry, OverlayDefinition } from "./simulationContract";

export function getOverlayRegistry(): OverlayRegistry {
  return {
    adhd: {
      name: "adhd",
      category: "accessibility",
      description: "Attention Deficit/Hyperactivity Disorder accommodations",
      modifiers: {
        attentionSpanMultiplier: 0.7,        // Attention drops faster
        fatigueAccelerator: 1.3,             // Tires sooner
        timeMultiplier: 1.1,                 // Needs 10% more time
        confusionThreshold: 0.6,             // Gets confused easier
        engagementDecay: 0.92,               // Per-problem decay
        bloomOffsetMultiplier: {
          "Remember": 1.0,
          "Understand": 0.95,
          "Apply": 0.85,
          "Analyze": 0.75,
          "Evaluate": 0.70,
          "Create": 0.65
        }
      }
    },
    
    dyslexic: {
      name: "dyslexic",
      category: "accessibility",
      description: "Dyslexia accommodations",
      modifiers: {
        attentionSpanMultiplier: 0.9,
        timeMultiplier: 1.3,                 // 30% more time for reading
        bloomOffsetMultiplier: {
          "Remember": 0.85,                  // Struggles with recall (reading-based)
          "Understand": 0.80,
          "Apply": 0.85,
          "Analyze": 0.90,                   // Stronger conceptually
          "Evaluate": 0.88,
          "Create": 0.90
        }
      }
    },
    
    fatigue_sensitive: {
      name: "fatigue_sensitive",
      category: "accessibility",
      description: "Student tires quickly",
      modifiers: {
        fatigueAccelerator: 1.5,             // Fatigue accumulates 50% faster
        engagementDecay: 0.88                // Per-problem engagement drops more
      }
    },
    
    test_pressure: {
      name: "test_pressure",
      category: "environmental",
      description: "Student feels time pressure",
      modifiers: {
        timeMultiplier: 1.2,                 // Rush effect
        bloomOffsetMultiplier: {
          "Remember": 1.0,
          "Understand": 0.95,
          "Apply": 0.80,
          "Analyze": 0.70,
          "Evaluate": 0.65,
          "Create": 0.60
        }
      }
    }
  };
}
```

### 5.2 Using Overlays in Simulator

```typescript
function applyOverlayModifiers(
  student: Astronaut,
  overlayRegistry: OverlayRegistry,
  environment: SimulationEnvironment
): { adjustedAttention: number; adjustedTime: number; bloomOffsets: Record<string, number> } {
  
  // Start with base
  let attentionMultiplier = 1.0;
  let timeMultiplier = 1.0;
  let bloomOffsets: Record<string, number> = {};
  
  // Apply student overlays
  student.overlays.forEach(overlayName => {
    const overlay = overlayRegistry[overlayName];
    if (!overlay) throw new Error(`Unknown overlay: ${overlayName}`);
    
    if (overlay.modifiers.attentionSpanMultiplier) {
      attentionMultiplier *= overlay.modifiers.attentionSpanMultiplier;
    }
    
    if (overlay.modifiers.timeMultiplier) {
      timeMultiplier *= overlay.modifiers.timeMultiplier;
    }
    
    // Merge bloom offsets
    if (overlay.modifiers.bloomOffsetMultiplier) {
      Object.entries(overlay.modifiers.bloomOffsetMultiplier).forEach(
        ([level, offset]) => {
          bloomOffsets[level] = offset;
        }
      );
    }
  });
  
  // Apply environment overlays
  environment.environmentOverlays.forEach(overlayName => {
    const overlay = overlayRegistry[overlayName];
    if (!overlay) throw new Error(`Unknown overlay: ${overlayName}`);
    
    // Same logic...
  });
  
  return {
    adjustedAttention: student.profileTraits.attentionSpan * attentionMultiplier,
    adjustedTime: 100 * timeMultiplier,  // base 100 minutes
    bloomOffsets
  };
}
```

---

## Part 6: Verification Checklist

### Before Simulator Runs
- [ ] Input validated (all required fields present)
- [ ] Problems have cognitive + classification + structure
- [ ] All students have profileTraits (0-1 range)
- [ ] All student overlays exist in overlayRegistry
- [ ] Environment is valid (testMode, timeLimitMinutes)
- [ ] Snapshots created for all problems and students

### During Simulator
- [ ] No modifications to problem objects
- [ ] No modifications to student objects
- [ ] Overlays applied only to internal copies
- [ ] Derived StudentProblemInput created per interaction
- [ ] Fatigue/engagement accumulators updated internally

### After Simulator Runs
- [ ] Immutable field snapshots match originals (problems + students)
- [ ] Output has same simulationId + documentId as input
- [ ] Every problem appears exactly once in results
- [ ] Every student appears exactly once in results
- [ ] All numeric fields are valid
- [ ] All enums have correct values
- [ ] confusionPoints reference valid problemIds
- [ ] engagement/fatigue trends are consistent

### Error Response
- [ ] Throw ContractViolationError (not generic Error)
- [ ] Include all violations (not just first)
- [ ] Log field name, rule, and message
- [ ] Include context (phase, item ID)
- [ ] Allow consumer to get errors vs warnings

---

## Part 7: Examples

### Example 1: Happy Path

```typescript
const input = buildSimulationInput(
  problems,      // 5 UniversalProblems
  students,      // 2 Astronauts
  60             // time limit
);

const result = await simulateStudentsWithContractEnforcement(input);
// result.__validated.valid === true
// result.studentResults.length === 2
// result.studentResults[0].problemResults.length === 5
```

### Example 2: Input Violation

```typescript
const input = {
  simulationId: "sim_1",
  documentId: "doc_1",
  problems: [
    {
      problemId: "P1",
      // ❌ MISSING: cognitive field
      classification: {...},
      structure: {...}
    }
  ],
  students: [...],
  environment: {...},
  overlayRegistry: {...}
};

try {
  validateSimulationInput(input);
} catch (error) {
  // error.violations[0] = {
  //   field: "problems[0].cognitive",
  //   rule: "required",
  //   message: "cognitive metadata missing",
  //   severity: "error"
  // }
}
```

### Example 3: Invariant Violation

```typescript
// Simulator modifies a problem
const problemSnapshot = createProblemSnapshot(problem);
// ... simulator runs ...
problem.cognitive.bloomsLevel = "Remember";  // Oops!

try {
  verifyProblemInvariants(problemSnapshot, problem);
} catch (error) {
  // error.violations[0] = {
  //   field: "cognitive",
  //   rule: "immutable",
  //   message: "cognitive metadata was modified during simulation",
  //   severity: "error"
  // }
}
```

### Example 4: Output Violation

```typescript
const output = {
  simulationId: "sim_1",
  documentId: "doc_1",
  studentResults: [
    {
      studentId: "stu_1",
      personaName: "Alice",
      totalTimeMinutes: 45,
      estimatedScore: 85,
      estimatedGrade: "B",
      problemResults: [
        { studentId: "stu_1", problemId: "P1", ... },
        { studentId: "stu_1", problemId: "P2", ... }
        // ❌ MISSING: P3 result
      ],
      engagement: {...},
      fatigue: {...},
      confusionPoints: [],
      atRisk: false,
      riskFactors: []
    }
  ],
  problemsProcessed: 3,
  studentsProcessed: 1,
  totalSimulationTimeMs: 1200
};

try {
  validateSimulationOutput(output, inputSnapshot);
} catch (error) {
  // error.violations[0] = {
  //   field: "problemResults",
  //   rule: "must contain result for every input problem",
  //   message: "Missing result for problem: P3",
  //   severity: "error"
  // }
}
```

---

## Part 8: Integration Checklist

To integrate the contract system:

- [ ] Import `SimulationInputContract`, `SimulationOutputContract` types
- [ ] Import validator functions: `validateSimulationInput`, `validateSimulationOutput`
- [ ] Import snapshot functions: `createProblemSnapshot`, `createStudentSnapshot`, etc.
- [ ] Import error class: `ContractViolationError`
- [ ] Build `SimulationInputContract` before calling simulator
- [ ] Create snapshots before calling simulator
- [ ] Validate input before calling simulator
- [ ] Call simulator with validated input
- [ ] Verify invariants after simulator returns
- [ ] Validate output after invariant verification
- [ ] Return `ValidatedSimulationOutput` to caller
- [ ] Handle `ContractViolationError` in error handler
- [ ] Log violations with severity levels
- [ ] Test with bad payloads to ensure validation works

---

## Part 9: Why This Works

**Problem**: AI systems can drift. Problems can be modified. Overlays can be invented. Output schemas can drift.

**Solution**: Contracts are legal. They're not suggestions.

- **Input Contract**: Defines what simulator receives. Rejected if invalid.
- **Snapshot Protocol**: Records immutable fields before execution. Checked after.
- **Output Contract**: Strictly-typed output. Rejected if schema doesn't match.
- **Invariant Verification**: Ensures nothing unexpected changed.
- **Error Reporting**: Full violation list, not summary. Severity levels.

**Result**: System can tell you exactly what went wrong and why. No ambiguity. No guessing.

