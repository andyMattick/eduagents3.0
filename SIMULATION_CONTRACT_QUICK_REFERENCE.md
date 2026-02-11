# Universal Simulation Contract - Quick Reference

## The Three Sacred Rules

1. **Simulator NEVER touches problems or students** (immutable by law)
2. **Output MUST match input shape** (all problems, all students, nothing extra)
3. **Violations are errors, not warnings** (stop execution, report fully)

---

## Input Contract (What Simulator Receives)

```typescript
const input: SimulationInputContract = {
  simulationId: "sim_1707609600000",
  documentId: "doc_1707609600000",
  
  // IMMUTABLE - passed through unchanged
  problems: UniversalProblem[],  // cognitive + classification locked
  students: Astronaut[],             // traits + overlays locked
  
  // Configuration
  environment: {
    testMode: "timed" | "practice" | "adaptive",
    timeLimitMinutes: number | null,
    environmentOverlays: string[]
  },
  
  // Registry (all overlays must be pre-registered)
  overlayRegistry: {
    adhd: { name: "adhd", modifiers: {...} },
    dyslexic: { name: "dyslexic", modifiers: {...} },
    // ...
  },
  
  createdAt: ISO timestamp,
  executionMode: "deterministic" | "stochastic"
};
```

---

## Output Contract (What Simulator Returns)

```typescript
const output: SimulationOutputContract = {
  simulationId: input.simulationId,  // MUST MATCH
  documentId: input.documentId,       // MUST MATCH
  executedAt: ISO timestamp,
  
  studentResults: [
    {
      studentId: "student_1",
      personaName: "Alex (ADHD)",
      totalTimeMinutes: 47.3,
      estimatedScore: 76,
      estimatedGrade: "C",
      
      // MUST contain result for EVERY input problem
      problemResults: [
        {
          studentId: "student_1",
          problemId: "S1_P1",  // MUST match input
          timeToCompleteSeconds: 120,
          percentageSuccessful: 85,
          confusionLevel: "low" | "medium" | "high",
          engagementLevel: "low" | "medium" | "high",
          feedback: "string",
          bloomMismatch?: { /* optional */ }
        },
        // ... one for each input problem
      ],
      
      engagement: {
        initial: 0-1,
        atMidpoint: 0-1,
        final: 0-1,
        trend: "increasing" | "declining" | "stable"
      },
      
      fatigue: {
        initial: 0-1,
        peak: 0-1,
        final: 0-1
      },
      
      confusionPoints: ["S1_P5"],  // References valid problemIds
      atRisk: boolean,
      riskFactors: string[]
    },
    // ... one for each input student
  ],
  
  problemsProcessed: input.problems.length,
  studentsProcessed: input.students.length,
  totalSimulationTimeMs: number
};
```

---

## What's Immutable (Cannot Change)

### Problems
```typescript
problem.problemId           // Fixed forever
problem.cognitive           // Entire object locked
problem.classification      // Entire object locked
problem.structure           // Entire object locked
```

### Students
```typescript
student.studentId           // Fixed forever
student.profileTraits       // Entire object locked
student.overlays            // Fixed (can apply modifiers, but don't change array)
student.narrativeTags       // Fixed forever
```

---

## What's Mutable (Rewriter Only)

```typescript
problem.content                       // Problem text can be rewritten
problem.cognitive.estimatedTimeMinutes    // May change if text simplified
problem.cognitive.linguisticComplexity   // May improve if text simplifies
problem.version                       // Increment (e.g., "1.0" → "1.1")
```

---

## Validation Pattern

```typescript
// 1. Take raw data
const problems = await analyzer.analyze(text);
const students = [adhd, dyslexic, strong];

// 2. Wrap in contract
const input = buildSimulationInput(problems, students, 60);

// 3. Validate (throws if invalid)
validateSimulationInput(input);

// 4. Create snapshots (for immutability check)
const inputSnapshot = createInputSnapshot(input);
const problemSnapshots = input.problems.map(createProblemSnapshot);
const studentSnapshots = input.students.map(createStudentSnapshot);

// 5. Call simulator
const output = await runSimulation(input);

// 6. Verify immutability
problemSnapshots.forEach((snap, i) => {
  verifyProblemInvariants(snap, input.problems[i]);
});

studentSnapshots.forEach((snap, i) => {
  verifyStudentInvariants(snap, input.students[i]);
});

// 7. Validate output (throws if invalid)
validateSimulationOutput(output, inputSnapshot);

// 8. Return to caller
return output;
```

---

## Error Handling Pattern

```typescript
try {
  const result = await simulateStudentsWithContractEnforcement(input);
} catch (error) {
  if (error instanceof ContractViolationError) {
    // Get all violations
    const errors = error.getErrorViolations();
    const warnings = error.getWarningViolations();
    
    // Report
    errors.forEach(v => {
      console.error(`❌ ${v.field}: ${v.message}`);
    });
    
    warnings.forEach(v => {
      console.warn(`⚠️ ${v.field}: ${v.message}`);
    });
    
    // Decide: reject, retry, escalate
    throw new Error("Simulation contract violation");
  }
}
```

---

## Overlay Registry Pattern

```typescript
export function getOverlayRegistry(): OverlayRegistry {
  return {
    adhd: {
      name: "adhd",
      category: "accessibility",
      modifiers: {
        attentionSpanMultiplier: 0.7,    // 30% reduction
        fatigueAccelerator: 1.3,         // 30% faster fatigue
        timeMultiplier: 1.1,             // 10% more time
        bloomOffsetMultiplier: {
          "Remember": 1.0,
          "Understand": 0.95,
          "Apply": 0.85,
          "Analyze": 0.75
        }
      }
    },
    
    dyslexic: {
      name: "dyslexic",
      category: "accessibility",
      modifiers: {
        timeMultiplier: 1.3,             // 30% more time (reading)
        bloomOffsetMultiplier: {
          "Remember": 0.85,
          "Understand": 0.80,
          "Analyze": 0.90                // Stronger conceptually
        }
      }
    },
    
    test_pressure: {
      name: "test_pressure",
      category: "environmental",
      modifiers: {
        timeMultiplier: 1.2,             // Rushed feeling
        bloomOffsetMultiplier: {
          "Remember": 1.0,
          "Apply": 0.80,
          "Analyze": 0.70                // Struggles with complex under time pressure
        }
      }
    }
  };
}
```

---

## What FAILS (Gets Rejected)

```typescript
// ❌ Missing immutable field
const problem = {
  problemId: "P1",
  // ❌ Missing: cognitive
  classification: {...}
};
// Result: validateSimulationInput throws "cognitive metadata missing"

// ❌ Simulator modifies problem
problem.cognitive.bloomsLevel = "Apply";
// Result: verifyProblemInvariants throws "cognitive was modified"

// ❌ Unregistered overlay
const student = {
  overlays: ["unknown_overlay"],  // ❌ Not in overlayRegistry
};
// Result: validateSimulationInput throws "unregistered overlay"

// ❌ Output missing problem
const output: StudentAssignmentSimulation = {
  problemResults: [
    { problemId: "S1_P1", ... },
    // ❌ Missing: S1_P2 (was in input)
  ]
};
// Result: validateSimulationOutput throws "Missing result for problem: S1_P2"

// ❌ Output has extra problem
const output: StudentAssignmentSimulation = {
  problemResults: [
    { problemId: "S1_P1", ... },
    { problemId: "S1_P2", ... },
    { problemId: "EXTRA_PROBLEM", ... }  // ❌ Not in input
  ]
};
// Result: validateSimulationOutput throws "Unknown problemId in result"

// ❌ Invalid confusionPoints
const output: StudentAssignmentSimulation = {
  confusionPoints: ["UNKNOWN_PROBLEM_ID"]  // ❌ Not in input
};
// Result: validateSimulationOutput throws "confusionPoints references unknown problem"

// ❌ Duplicate problems
const output: StudentAssignmentSimulation = {
  problemResults: [
    { problemId: "S1_P1", ... },
    { problemId: "S1_P1", ... }  // ❌ Duplicate
  ]
};
// Result: validateSimulationOutput throws "Duplicate result for problem"
```

---

## What PASSES (Gets Accepted)

```typescript
// ✅ Valid input
const input = {
  simulationId: "sim_1",
  documentId: "doc_1",
  problems: [...],  // With cognitive, classification, structure
  students: [...],  // With profileTraits, overlays
  environment: { testMode: "timed", timeLimitMinutes: 60, environmentOverlays: [] },
  overlayRegistry: { adhd: {...}, dyslexic: {...} }
};
validateSimulationInput(input);  // ✅ Passes

// ✅ Simulator doesn't touch originals
const output = await runSimulation(input);
verifyProblemInvariants(snapshot, input.problems[0]);  // ✅ Passes
verifyStudentInvariants(snapshot, input.students[0]);  // ✅ Passes

// ✅ Output has all problems and students
const output = {
  studentResults: [
    {
      studentId: "student_1",
      problemResults: [
        { problemId: "S1_P1", ... },
        { problemId: "S1_P2", ... }
      ]
    },
    {
      studentId: "student_2",
      problemResults: [
        { problemId: "S1_P1", ... },
        { problemId: "S1_P2", ... }
      ]
    }
  ]
};
validateSimulationOutput(output, inputSnapshot);  // ✅ Passes
```

---

## Rewriter Pattern

```typescript
// Input to rewriter
const rewriteInput: RewriterInputContract = {
  rewriterId: "rewrite_1",
  simulationId: "sim_1",
  problems: UniversalProblem[],  // With locked cognitive + classification
  simulationResults: StudentAssignmentSimulation[],  // Shows what failed
  rewriteOptions: {
    focusOnBloom: true,
    reduceLinguisticComplexity: true,
    breakMultipart: true
  }
};

// Validation
validateRewriterInput(rewriteInput);
const snapshotMap = createRewriteSnapshotMap(rewriteInput.problems);

// Rewriting
const output: RewriterOutputContract = {
  rewrittenProblems: [
    {
      problemId: "S1_P1",
      originalContent: "...",
      content: "Simplified version...",
      version: "1.1",
      
      cognitive: {
        bloomsLevel: "Understand",       // ← LOCKED (same as input)
        complexityLevel: 2,              // ← LOCKED
        estimatedTimeMinutes: 1.6,       // ✅ Changed (was 1.8)
        linguisticComplexity: 0.45       // ✅ Changed (was 0.52)
      },
      
      classification: {
        problemType: "conceptual",       // ← LOCKED
        topics: ["sampling"]             // ← LOCKED
      },
      
      rewriteLog: {
        rulesApplied: ["simplify-language"],
        changes: [{
          aspect: "linguistic_complexity",
          before: 0.52,
          after: 0.45,
          explanation: "Simplified vocabulary"
        }],
        confidenceScore: 0.87
      }
    }
  ]
};

// Validation
validateRewriterOutput(output, snapshotMap);  // Ensures locked fields unchanged
```

---

## Import Everything You Need

```typescript
// Types
import {
  SimulationInputContract,
  SimulationOutputContract,
  StudentProblemOutput,
  StudentAssignmentSimulation,
  Astronaut,
  OverlayRegistry,
  ContractViolationError,
  ValidatedSimulationInput,
  ValidatedSimulationOutput,
} from "./simulationContract";

// Validators
import {
  validateSimulationInput,
  validateSimulationOutput,
  createProblemSnapshot,
  createStudentSnapshot,
  verifyProblemInvariants,
  verifyStudentInvariants,
  createInputSnapshot,
} from "./contractValidator";

// Rewriter
import {
  RewriterInputContract,
  RewriterOutputContract,
  RewriteViolationError,
} from "./rewriterContract";

import {
  validateRewriterInput,
  validateRewriterOutput,
  createRewriteSnapshot,
  createRewriteSnapshotMap,
  verifyRewriteImmutability,
} from "./rewriterContractValidator";
```

---

## Debugging Checklist

- [ ] Input has all required fields? → Run `validateSimulationInput()`
- [ ] Simulator modified a problem? → Check invariant snapshots
- [ ] Output missing a problem? → Check `problemResults` array has all IDs
- [ ] confusionPoints invalid? → Verify they match `problemId` format
- [ ] Not sure what failed? → Look at `error.getErrorViolations()`
- [ ] Need to retry? → Fix violation, throw away output, try again

---

## One-Liner Commands

```typescript
// Check if input is valid
validateSimulationInput(input);  // Throws if fails

// Check if problems unchanged
input.problems.forEach((p, i) => verifyProblemInvariants(snapshots[i], p));

// Check if output is valid
validateSimulationOutput(output, inputSnapshot);  // Throws if fails

// Get all violations
error.getErrorViolations().forEach(v => console.log(v.message));
```

---

**Remember**: The contract is not optional. Violations are errors. There is no "mostly valid."

