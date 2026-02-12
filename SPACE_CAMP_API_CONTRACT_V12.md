# 🚀 SPACE CAMP API CONTRACT (Final v1.2)
## The Interface Between Launchpad and Simulation Engine

**Version:** 1.2  
**Status:** Ready for Implementation  
**Date:** February 12, 2026

This document defines the **exact interface** that Space Camp uses to:
1. Receive assessment context from Launchpad
2. Generate context-derived astronauts
3. Run deterministic simulation
4. Return results to Philosophers

---

# 📋 CONTRACT OVERVIEW

**Space Camp receives:**
- UniversalProblems (Asteroids)
- Assessment context (gradeBand, classLevel, subject, time target)
- Scoring rubric (how to derive astronauts)
- Overlay registry (which overlays can be applied)
- Environment config (simulation parameters)

**Space Camp returns:**
- Generated astronauts (context-derived, before overlays)
- Astronauts with overlays applied
- Simulation results (per-student feedback)
- Aggregate analytics

---

# 🎯 1. INPUT: LAUNCHPAD → SPACE CAMP

```typescript
interface SpaceCampRequest {
  // Document & context
  documentId: string;
  problems: UniversalProblem[];  // Asteroids from Foundry
  
  // Assessment context
  gradeBand: string;             // "3-5" | "6-8" | "9-12"
  classLevel: string;            // "standard" | "honors" | "AP"
  subject: string;               // "math" | "english" | "science" | "history" | "general"
  
  // Optional
  timeTargetMinutes?: number;    // Teacher's time budget for test
  className?: string;            // e.g., "6th Grade Math Block A"
  
  // Configuration
  astronautScoringRules: AstronautRubric;  // (See Scoring Rubric v1.2)
  overlayRegistry: string[];               // ["adhd", "dyslexia", "fatigue_sensitive", ...]
  overlayStrategy?: "strategic" | "random";  // How to apply overlays (default: strategic)
  
  // Environment
  environmentConfig?: {
    seed?: number;              // For reproducible simulations
    simulationSamples?: number; // How many students to generate
  };
}
```

**Example:**
```json
{
  "documentId": "doc_math_6b_midterm",
  "problems": [ /* 10 UniversalProblems */ ],
  "gradeBand": "6-8",
  "classLevel": "standard",
  "subject": "math",
  "timeTargetMinutes": 45,
  "className": "Mrs. Chen's 6th Grade Math",
  
  "astronautScoringRules": { /* Complete rubric */ },
  "overlayRegistry": ["adhd", "dyslexia", "fatigue_sensitive", "esl"],
  "overlayStrategy": "strategic",
  
  "environmentConfig": {
    "seed": 12345,
    "simulationSamples": 11
  }
}
```

---

# 🧬 2. ASTRONAUT GENERATION ALGORITHM

Space Camp uses this exact process:

```typescript
function generateAstronautsFromContext(
  context: SpaceCampRequest
): {
  baseAstronauts: Astronaut[];
  astronautsWithOverlays: Astronaut[];
  generationLog: string[];
}
{
  const log: string[] = [];
  const baseAstronauts: Astronaut[] = [];
  
  // Step 1: Determine how many astronauts
  const numAstronauts = context.environmentConfig?.simulationSamples ?? 11;
  log.push(`Generating ${numAstronauts} astronauts for ${context.gradeBand} ${context.classLevel} ${context.subject}`);
  
  // Step 2: For each astronaut
  for (let i = 0; i < numAstronauts; i++) {
    // Step 2a: Generate base traits using rubric
    const baseTraits = generateBaseTraits(
      context.gradeBand,
      context.classLevel,
      context.subject,
      context.astronautScoringRules,
      context.environmentConfig?.seed
    );
    log.push(`Astronaut ${i}: base traits = ${JSON.stringify(baseTraits)}`);
    
    // Step 2b: Create astronaut (NO overlays yet)
    const astronaut: Astronaut = {
      StudentId: `astronaut_${context.documentId}_${i}`,
      PersonaName: generatePersonaName(baseTraits),  // e.g., "Strong Math Learner"
      Overlays: [],  // Empty; overlays come in Step 3
      ProfileTraits: {
        ReadingLevel: baseTraits.readingLevel,
        MathFluency: baseTraits.mathLevel,
        AttentionSpan: baseTraits.stamina,
        Confidence: baseTraits.reasoning,
        // Note: confusionTolerance stored separately or in metadata
      },
      GradeLevel: context.gradeBand,
    };
    
    baseAstronauts.push(astronaut);
  }
  
  // Step 3: Apply overlays (strategically or randomly)
  const astronautsWithOverlays = baseAstronauts.map(ast => {
    const overlays = selectOverlays(
      ast,
      context.problems,
      context.overlayStrategy ?? "strategic",
      context.overlayRegistry,
      context.astronautScoringRules.overlayMultipliers
    );
    
    // Apply overlay multipliers to create final traits
    const finalTraits = applyOverlayMultipliers(
      ast.ProfileTraits,
      overlays,
      context.astronautScoringRules.overlayMultipliers
    );
    
    return {
      ...ast,
      Overlays: overlays,
      ProfileTraits: finalTraits,
    };
  });
  
  log.push(`Generated ${astronautsWithOverlays.length} astronauts with overlays applied`);
  
  return {
    baseAstronauts,
    astronautsWithOverlays,
    generationLog: log,
  };
}
```

**Key Rules:**
1. ✅ Base traits **never** include overlays
2. ✅ Overlays are applied **after** base trait calculation
3. ✅ Overlay multipliers are deterministic given seed
4. ✅ Same context + same seed → same astronauts
5. ✅ Each astronaut gets unique StudentId

---

# 🤖 3. SIMULATION EXECUTION

```typescript
function runSimulation(
  astronauts: Astronaut[],
  problems: UniversalProblem[]
): AssignmentSimulationResults {
  
  const studentResults: StudentAssignmentSimulation[] = [];
  
  // For each astronaut
  for (const astronaut of astronauts) {
    // For each problem
    const problemResults: StudentProblemOutput[] = [];
    let cumulativeFatigue = 0;
    let totalTime = 0;
    
    for (const problem of problems) {
      // Calculate student-problem interaction
      const input = simulateStudentProblemPair(
        astronaut,
        problem,
        cumulativeFatigue
      );
      
      // Generate output (success rate, time, confusion, etc.)
      const output = generateProblemOutput(input, problem);
      
      problemResults.push(output);
      totalTime += input.TimeOnTask;
      cumulativeFatigue = input.FatigueIndex;
    }
    
    // Aggregate per-student results
    const studentResult: StudentAssignmentSimulation = {
      studentId: astronaut.StudentId,
      personaName: astronaut.PersonaName,
      overlayed: astronaut.Overlays,
      
      totalTimeMinutes: totalTime / 60,
      estimatedScore: calculateScore(problemResults),
      estimatedGrade: scoreToGrade(estimatedScore),
      
      problemResults,
      confusionPoints: problemResults
        .filter(p => p.confusionLevel === 'high')
        .map(p => p.problemId),
      
      atRisk: isAtRisk(problemResults),
      riskFactors: identifyRiskFactors(problemResults),
    };
    
    studentResults.push(studentResult);
  }
  
  // Aggregate across all students
  return {
    documentId: astronauts[0].StudentId.split('_')[1],
    astronautsUsed: astronauts.length,
    studentResults,
    
    // Aggregate metrics
    averageTimeMinutes: studentResults.avg(s => s.totalTimeMinutes),
    averageScore: studentResults.avg(s => s.estimatedScore),
    completionRate: studentResults.filter(s => s.estimatedGrade !== 'F').length / studentResults.length,
    atRiskCount: studentResults.filter(s => s.atRisk).length,
    
    // Per-problem aggregate
    problemStatistics: computeProblemStatistics(studentResults),
    
    // Bloom distribution in results
    bloomPerformance: computeBloomPerformance(studentResults),
  };
}
```

---

# 📤 4. OUTPUT: SPACE CAMP → PHILOSOPHERS

```typescript
interface SpaceCampResponse {
  // Metadata
  documentId: string;
  timestamp: string;
  astronautsGenerated: number;
  problemsSimulated: number;
  
  // Astronaut details (for record-keeping, not teacher view)
  generationLog: string[];
  baseAstronauts: Astronaut[];          // Before overlays
  astronautsWithOverlays: Astronaut[];  // After overlays
  
  // Simulation results
  simulationResults: AssignmentSimulationResults;
  
  // For Philosophers to interpret
  metrics: {
    averageTimeMinutes: number;
    averageScore: number;
    completionRate: number;  // 0-1
    atRiskCount: number;
    confusionHotspots: string[];  // Problem IDs
    bloomPerformance: Record<string, { avgScore: number; problemCount: number }>;
  };
  
  // Warnings (for Philosophers to note)
  warnings: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>;
}
```

**Example Output:**
```json
{
  "documentId": "doc_math_6b_midterm",
  "timestamp": "2026-02-12T14:30:00Z",
  "astronautsGenerated": 11,
  "problemsSimulated": 10,
  
  "simulationResults": {
    "studentResults": [
      {
        "studentId": "astronaut_doc_math_6b_midterm_0",
        "personaName": "Math-Strong Reader",
        "overlayed": [],
        "totalTimeMinutes": 42.5,
        "estimatedScore": 88,
        "estimatedGrade": "B",
        "confusionPoints": ["problem_3"],
        "atRisk": false,
        "riskFactors": []
      },
      {
        "studentId": "astronaut_doc_math_6b_midterm_2",
        "personaName": "Dyslexic Learner",
        "overlayed": ["dyslexia"],
        "totalTimeMinutes": 55.2,
        "estimatedScore": 62,
        "estimatedGrade": "D",
        "confusionPoints": ["problem_2", "problem_5"],
        "atRisk": true,
        "riskFactors": ["Extended time needed due to reading challenges", "Confusion on word-heavy problems"]
      }
    ],
    
    "averageTimeMinutes": 48.3,
    "averageScore": 76.4,
    "completionRate": 0.91,
    "atRiskCount": 2,
    
    "bloomPerformance": {
      "Remember": { "avgScore": 91, "problemCount": 2 },
      "Understand": { "avgScore": 85, "problemCount": 3 },
      "Apply": { "avgScore": 74, "problemCount": 3 },
      "Analyze": { "avgScore": 61, "problemCount": 2 }
    }
  },
  
  "warnings": [
    {
      "severity": "warning",
      "message": "2 students at-risk; suggest review of Analyze-level problems for clarity"
    },
    {
      "severity": "info",
      "message": "Dyslexic overlay students took 15% longer; consider extended time accommodations"
    }
  ]
}
```

---

# ✅ 5. DETERMINISM & REPRODUCIBILITY

**Critical Requirement:** Same input + same seed → same results.

```typescript
interface DeterminismSpec {
  // All randomness must use seed
  seed?: number;
  
  // Consequences:
  // - Same context always produces same astronauts
  // - Same astronauts + same problems always produce same simulation
  // - Useful for debugging, regression testing
}

// Example: Run simulation twice with same seed
const req1: SpaceCampRequest = { gradeBand: "6-8", ..., environmentConfig: { seed: 42 } };
const req2: SpaceCampRequest = { gradeBand: "6-8", ..., environmentConfig: { seed: 42 } };

const res1 = spacecamp.simulate(req1);
const res2 = spacecamp.simulate(req2);

// assert(res1.baseAstronauts === res2.baseAstronauts)  // Identical
// assert(res1.simulationResults === res2.simulationResults)  // Identical
```

---

# 🎯 6. OVERLAY STRATEGY: STRATEGIC vs RANDOM

### Strategy: "STRATEGIC" (Recommended)

Apply overlays based on problem difficulty and student traits:

```typescript
function selectOverlaysStrategically(
  astronaut: Astronaut,
  problems: UniversalProblem[],
  overlayRegistry: string[]
): string[] {
  const overlays: string[] = [];
  
  const avgComplexity = problems.avg(p => p.LinguisticComplexity);
  const avgBloom = problems.avg(p => bloomToNumber(p.BloomLevel));
  const totalTimeSeconds = problems.sum(p => p.EstimatedTimeSeconds || 0);
  
  // Rule 1: High text load + weak reader → dyslexia
  if (avgComplexity > 0.75 && astronaut.ProfileTraits.ReadingLevel < 0.45) {
    overlays.push('dyslexia');
  }
  
  // Rule 2: Long test + low stamina → fatigue_sensitive
  if (totalTimeSeconds > 3600 && astronaut.ProfileTraits.AttentionSpan < 0.45) {
    overlays.push('fatigue_sensitive');
  }
  
  // Rule 3: High Bloom jump → anxiety_prone
  if (hasBloomJump(problems)) {
    overlays.push('anxiety_prone');
  }
  
  // Rule 4: Advanced student in ESL context (optional)
  if (astronaut.ProfileTraits.Confidence > 0.7 && context.subject === 'english') {
    overlays.push('esl');
  }
  
  return overlays.filter(o => overlayRegistry.includes(o));
}
```

### Strategy: "RANDOM" (Simpler)

Randomly assign overlays to X% of students:

```typescript
function selectOverlaysRandomly(
  astronaut: Astronaut,
  overlayRegistry: string[],
  seed: number
): string[] {
  const rng = seededRandom(seed + astronaut.StudentId);
  const numOverlays = rng() < 0.3 ? 0 : rng() < 0.7 ? 1 : 2;
  
  const shuffled = shuffle(overlayRegistry, rng);
  return shuffled.slice(0, numOverlays);
}
```

---

# 🔄 7. ERROR HANDLING & VALIDATION

Space Camp must validate inputs before proceeding:

```typescript
function validateSpaceCampRequest(req: SpaceCampRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate gradeBand
  if (!["3-5", "6-8", "9-12"].includes(req.gradeBand)) {
    errors.push(`Invalid gradeBand: ${req.gradeBand}`);
  }
  
  // Validate classLevel
  if (!["standard", "honors", "AP"].includes(req.classLevel)) {
    errors.push(`Invalid classLevel: ${req.classLevel}`);
  }
  
  // Validate problems
  if (!req.problems || req.problems.length === 0) {
    errors.push("No problems provided");
  }
  
  // Validate rubric
  if (!req.astronautScoringRules) {
    errors.push("Scoring rubric required");
  }
  
  // Validate overlays
  for (const overlay of req.overlayRegistry) {
    if (!VALID_OVERLAYS.includes(overlay)) {
      errors.push(`Unknown overlay: ${overlay}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

# 📊 8. EXAMPLE: Full Request → Response Cycle

**Step 1: Teacher (Launchpad) prepares context**
```
Grade Band: 6-8
Class Level: Standard
Subject: Math
Time Target: 45 minutes
Problems: 10 Asteroids
```

**Step 2: Space Camp receives request**
```typescript
const req: SpaceCampRequest = {
  documentId: "doc_abc123",
  problems: [...asteroids...],
  gradeBand: "6-8",
  classLevel: "standard",
  subject: "math",
  timeTargetMinutes: 45,
  astronautScoringRules: {...},
  overlayRegistry: ["adhd", "dyslexia", "fatigue_sensitive", "esl"],
  overlayStrategy: "strategic",
};
```

**Step 3: Space Camp generates astronauts**
```
Generated 11 astronauts:
- 9 without overlays (standard 6-8 math students)
- 1 with dyslexia (weak reader on math test)
- 1 with fatigue_sensitive (long test duration)
```

**Step 4: Space Camp simulates**
```
Results:
- Average score: 74.2
- Average time: 47.3 minutes
- Completion rate: 90%
- At-risk: 2 students
```

**Step 5: Space Camp returns results to Philosophers**
```
{
  documentId: "doc_abc123",
  simulationResults: {...},
  metrics: {...},
  warnings: [...]
}
```

**Step 6: Philosophers interpret and prepare feedback for teacher**
```
- 2 students at-risk (Analyze level too hard)
- Time estimate OK (47 min vs 45 min target)
- Dyslexic students struggling with word problems (reduce linguistic complexity)
```

---

# 🎓 CLASSROOM SIMULATION EXAMPLE

**Real-world scenario:**

Your 6th-grade math class has:
- 3 advanced readers (math-focused)
- 4 typical students
- 2 struggling readers
- 1 ESL student
- 1 ADHD student

Space Camp generates 11 astronauts (for statistical reliability) **representing** this distribution:

```
Astronaut 0:  Advanced math, strong reader     [base traits, no overlay]
Astronaut 1:  Advanced math, strong reader     [base traits, no overlay]
Astronaut 2:  Advanced math, strong reader     [base traits, no overlay]
Astronaut 3:  Typical learner                  [base traits, no overlay]
Astronaut 4:  Typical learner                  [base traits, no overlay]
Astronaut 5:  Typical learner                  [base traits, no overlay]
Astronaut 6:  Typical learner                  [base traits, no overlay]
Astronaut 7:  Struggling reader                [base traits + dyslexia overlay]
Astronaut 8:  Struggling reader                [base traits + dyslexia overlay]
Astronaut 9:  ESL student                      [base traits + esl overlay]
Astronaut 10: ADHD student                     [base traits + adhd overlay]
```

Simulation runs all 11 × 10 problems = 110 interactions, returns aggregate insights.

---

# 📝 IMPLEMENTATION STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| Scoring Rubric | ✅ COMPLETE | See ASTRONAUT_SCORING_RUBRIC_V12.md |
| API Contract | ✅ COMPLETE | This document |
| Determinism Spec | ✅ COMPLETE | Seed-based reproducibility |
| Overlay Strategy | ✅ DEFINED | Strategic (recommended) + Random (simple) |
| Error Handling | ✅ DEFINED | Validation checks above |
| Example Cycle | ✅ SHOWN | Full request→response flow |

---

# 🚀 READY FOR IMPLEMENTATION

This contract is:
- ✅ **Complete:** All inputs, outputs, algorithms specified
- ✅ **Deterministic:** Seed-based, reproducible results
- ✅ **Extensible:** Easy to add new overlays or traits
- ✅ **Clear:** Worked examples show exact behavior
- ✅ **Aligned:** Matches v1.2 spec requirements

**Next step:** Implement in code following this contract exactly.
