# 🎯 PHASE 1 IMPLEMENTATION CHECKLIST
## Context-Derived Astronaut Generation

**Phase:** 1 of 6  
**Estimated Duration:** 2-3 days  
**Status:** Ready to Start  
**Reference Documents:**
- [ASTRONAUT_SCORING_RUBRIC_V12.md](ASTRONAUT_SCORING_RUBRIC_V12.md)
- [SPACE_CAMP_API_CONTRACT_V12.md](SPACE_CAMP_API_CONTRACT_V12.md)

---

# 🎬 CHECKLIST: PHASE 1

## ✅ Task 1: Add AstronautGenerationContext Type

**File:** `src/types/pipeline.ts`

**What:** Add new interface to capture assessment intent (grade, subject, class level, time target)

**Why:** Pipeline needs to thread this context from Launchpad through to Space Camp

**Code to Add:**
```typescript
// Add to src/types/pipeline.ts

export interface AstronautGenerationContext {
  // Required
  gradeBand: "3-5" | "6-8" | "9-12";
  classLevel: "standard" | "honors" | "AP";
  subject: "math" | "english" | "science" | "history" | "general";
  
  // Optional
  timeTargetMinutes?: number;
  className?: string;
  
  // For reproducibility
  seed?: number;
  
  // Configuration
  overlayStrategy?: "strategic" | "random";  // Default: "strategic"
  selectedOverlays?: string[];               // If user wants specific overlays
}
```

**Acceptance Criteria:**
- ✅ Type compiles without errors
- ✅ Used in PipelineState (next task)
- ✅ Type-safe in all references

---

## ✅ Task 2: Add Context to PipelineState

**File:** `src/hooks/usePipeline.ts`

**What:** Add `astronautContext` field to `PipelineState` and create setter function

**Why:** Pipeline needs to maintain assessment context across steps

**Code to Add:**
```typescript
// In src/hooks/usePipeline.ts

export interface PipelineState {
  // ... existing fields ...
  
  // NEW:
  astronautContext?: AstronautGenerationContext;
}

// In the hook, add setter function:
const setAstronautContext = (context: AstronautGenerationContext) => {
  setState(prev => ({
    ...prev,
    astronautContext: context,
  }));
};

// Return from hook:
return {
  // ... existing functions ...
  setAstronautContext,
};
```

**Acceptance Criteria:**
- ✅ Field added to PipelineState
- ✅ Setter function returns AstronautGenerationContext
- ✅ Pipeline can set context from input screens

---

## ✅ Task 3: Capture Assessment Intent in Launchpad

**File:** `src/components/Pipeline/PipelineShell.tsx`

**What:** When user is in ASTRONOMER_DEFINITION step, capture grade/subject/class via form; store in context

**Why:** These inputs drive astronaut generation; must be captured before Space Camp step

**Code to Add:**

At the ASTRONOMER_DEFINITION step render block:

```typescript
// In PipelineShell.tsx ASTRONOMER_DEFINITION segment

{state.currentStep === PipelineStep.ASTRONOMER_DEFINITION && (
  <div className="step-container">
    <h2>3️⃣ Astronomer Definition: Assessment Context</h2>
    <p>Define the class context for astronaut generation</p>
    
    <form onSubmit={(e) => {
      e.preventDefault();
      
      // Read form values
      const gradeBand = (document.getElementById('grade-band') as HTMLSelectElement)?.value;
      const classLevel = (document.getElementById('class-level') as HTMLSelectElement)?.value;
      const subject = (document.getElementById('subject') as HTMLSelectElement)?.value;
      const className = (document.getElementById('class-name') as HTMLInputElement)?.value;
      
      // Set context
      dispatchPipeline({
        type: 'SET_ASTRONAUT_CONTEXT',
        payload: {
          gradeBand: gradeBand as "3-5" | "6-8" | "9-12",
          classLevel: classLevel as "standard" | "honors" | "AP",
          subject: subject as "math" | "english" | "science" | "history" | "general",
          className: className || undefined,
        },
      });
      
      // Move to next step
      nextStep();
    }}>
      
      <label>
        Grade Band:
        <select id="grade-band" defaultValue={state.astronautContext?.gradeBand || ''}>
          <option value="">-- Select --</option>
          <option value="3-5">Grades 3-5</option>
          <option value="6-8">Grades 6-8</option>
          <option value="9-12">Grades 9-12</option>
        </select>
      </label>
      
      <label>
        Class Level:
        <select id="class-level" defaultValue={state.astronautContext?.classLevel || ''}>
          <option value="">-- Select --</option>
          <option value="standard">Standard</option>
          <option value="honors">Honors</option>
          <option value="AP">AP / Advanced</option>
        </select>
      </label>
      
      <label>
        Subject:
        <select id="subject" defaultValue={state.astronautContext?.subject || ''}>
          <option value="">-- Select --</option>
          <option value="math">Math</option>
          <option value="english">English / Language Arts</option>
          <option value="science">Science</option>
          <option value="history">History / Social Studies</option>
          <option value="general">General / Multi-subject</option>
        </select>
      </label>
      
      <label>
        Class Name (optional):
        <input id="class-name" type="text" placeholder="e.g., 6th Grade Math Block A" />
      </label>
      
      <button type="submit">Continue to Space Camp →</button>
    </form>
  </div>
)}
```

**Acceptance Criteria:**
- ✅ Form captures all 4 fields (gradeBand, classLevel, subject, className)
- ✅ On submit, sets astronautContext in pipeline state
- ✅ Moves to SPACE_CAMP_ANALYSIS step
- ✅ Form validates that required fields are set

---

## ✅ Task 4: Implement AstronautRubric Type

**File:** `src/types/simulation.ts`

**What:** Add `AstronautRubric` interface that holds all scoring rules (baselines, multipliers, overlays)

**Why:** Space Camp receives and uses this rubric to generate astronauts

**Code to Add:**
```typescript
// In src/types/simulation.ts

export interface AstronautRubric {
  // Grade band baselines (baseline traits for each grade range)
  gradeBandBaselines: {
    "3-5": {
      readingLevel: [number, number];      // [min, max]
      mathLevel: [number, number];
      stamina: [number, number];
      reasoning: [number, number];
      confusionTolerance: [number, number];
    };
    "6-8": {
      readingLevel: [number, number];
      mathLevel: [number, number];
      stamina: [number, number];
      reasoning: [number, number];
      confusionTolerance: [number, number];
    };
    "9-12": {
      readingLevel: [number, number];
      mathLevel: [number, number];
      stamina: [number, number];
      reasoning: [number, number];
      confusionTolerance: [number, number];
    };
  };
  
  // Class level multipliers
  classLevelMultipliers: {
    standard: number;    // Typically 1.0
    honors: number;      // Typically 1.10
    AP: number;          // Typically 1.20
  };
  
  // Subject-specific multiplier profiles
  subjectModifiers: {
    math: {
      mathLevel: number;
      readingLevel: number;
      reasoning: number;
    };
    english: {
      readingLevel: number;
      reasoning: number;
      confidence: number;
    };
    science: {
      mathLevel: number;
      reasoning: number;
      readingLevel: number;
    };
    history: {
      readingLevel: number;
      reasoning: number;
      confidence: number;
    };
    general: {
      mathLevel: number;
      readingLevel: number;
      reasoning: number;
    };
  };
  
  // Overlay multiplier definitions
  overlayMultipliers: {
    adhd: {
      stamina: number;
      reasoning: number;
      confusionTolerance: number;
    };
    dyslexia: {
      readingLevel: number;
      confidence: number;
    };
    fatigue_sensitive: {
      stamina: number;
      reasoning: number;
    };
    esl: {
      readingLevel: number;
      confidence: number;
    };
    anxiety_prone: {
      confidence: number;
      confusionTolerance: number;
    };
  };
}
```

**Acceptance Criteria:**
- ✅ Type matches ASTRONAUT_SCORING_RUBRIC_V12.md structure
- ✅ All three grade bands included
- ✅ All subject modifiers included
- ✅ All 5 overlays included

---

## ✅ Task 5: Create generateBaseTraits() Function

**File:** `src/agents/simulation/astronautGenerator.ts`

**What:** Implement core function that calculates base traits using rubric

**Why:** This is the heart of context-derived generation; uses grade baselines + multipliers

**Pseudocode:**
```typescript
/**
 * Calculate base traits for a single astronaut using the scoring rubric
 * 
 * Formula for each trait:
 *   baselineTrait = random between [gradeBandMin, gradeBandMax]
 *   withClassMultiplier = min(1.0, baselineTrait × classMultiplier)
 *   withSubjectModifier = min(1.0, withClassMultiplier × subjectMultiplier)
 *   final = clamp(withSubjectModifier, 0.0, 1.0)
 * 
 * @param gradeBand - "3-5", "6-8", or "9-12"
 * @param classLevel - "standard", "honors", or "AP"
 * @param subject - "math", "english", "science", "history", or "general"
 * @param rubric - The scoring rules
 * @param seed - For deterministic generation (optional)
 * @returns Object with 5 base traits (readingLevel, mathLevel, stamina, reasoning, confusionTolerance)
 */
function generateBaseTraits(
  gradeBand: "3-5" | "6-8" | "9-12",
  classLevel: "standard" | "honors" | "AP",
  subject: "math" | "english" | "science" | "history" | "general",
  rubric: AstronautRubric,
  seed?: number
): {
  readingLevel: number;
  mathLevel: number;
  stamina: number;
  reasoning: number;
  confusionTolerance: number;
} {
  // Step 1: Get random number generator (seeded if provided)
  const rng = seed ? seededRandom(seed) : Math.random;
  
  // Step 2: Get grade band baselines
  const baselines = rubric.gradeBandBaselines[gradeBand];
  
  // Step 3: Get multipliers
  const classMultiplier = rubric.classLevelMultipliers[classLevel];
  const subjectModifiers = rubric.subjectModifiers[subject];
  
  // Step 4: Calculate each trait
  const traits = {
    readingLevel: calculateTrait(
      baselines.readingLevel,
      classMultiplier,
      subjectModifiers.readingLevel ?? 1.0,
      rng
    ),
    mathLevel: calculateTrait(
      baselines.mathLevel,
      classMultiplier,
      subjectModifiers.mathLevel ?? 1.0,
      rng
    ),
    stamina: calculateTrait(
      baselines.stamina,
      classMultiplier,
      subjectModifiers.stamina ?? 1.0,
      rng
    ),
    reasoning: calculateTrait(
      baselines.reasoning,
      classMultiplier,
      subjectModifiers.reasoning ?? 1.0,
      rng
    ),
    confusionTolerance: calculateTrait(
      baselines.confusionTolerance,
      classMultiplier,
      subjectModifiers.confusionTolerance ?? 1.0,
      rng
    ),
  };
  
  // Step 5: Clamp all to [0.0, 1.0]
  Object.keys(traits).forEach(key => {
    traits[key as keyof typeof traits] = Math.max(0.0, Math.min(1.0, traits[key as keyof typeof traits]));
  });
  
  return traits;
}

/**
 * Helper: Calculate single trait applying multipliers
 */
function calculateTrait(
  [min, max]: [number, number],
  classMultiplier: number,
  subjectModifier: number,
  rng: () => number
): number {
  const baseline = min + (max - min) * rng();  // Random between [min, max]
  const withClass = baseline * classMultiplier;
  const withSubject = withClass * subjectModifier;
  return withSubject;
}
```

**Code to Add to astronautGenerator.ts:**
```typescript
import { AstronautRubric } from '../../types/simulation';

export function generateBaseTraits(
  gradeBand: "3-5" | "6-8" | "9-12",
  classLevel: "standard" | "honors" | "AP",
  subject: "math" | "english" | "science" | "history" | "general",
  rubric: AstronautRubric,
  seed?: number
): {
  readingLevel: number;
  mathLevel: number;
  stamina: number;
  reasoning: number;
  confusionTolerance: number;
} {
  // Use seeded RNG if seed provided, otherwise Math.random
  const rng = seed ? createSeededRandom(seed) : Math.random;
  
  const baselines = rubric.gradeBandBaselines[gradeBand];
  const classMultiplier = rubric.classLevelMultipliers[classLevel];
  const subjectModifiers = rubric.subjectModifiers[subject];
  
  const traits = {
    readingLevel: applyMultipliers(baselines.readingLevel, classMultiplier, subjectModifiers.readingLevel, rng),
    mathLevel: applyMultipliers(baselines.mathLevel, classMultiplier, subjectModifiers.mathLevel, rng),
    stamina: applyMultipliers(baselines.stamina, classMultiplier, subjectModifiers.stamina, rng),
    reasoning: applyMultipliers(baselines.reasoning, classMultiplier, subjectModifiers.reasoning, rng),
    confusionTolerance: applyMultipliers(baselines.confusionTolerance, classMultiplier, subjectModifiers.confusionTolerance, rng),
  };
  
  // Clamp all to [0.0, 1.0]
  Object.keys(traits).forEach(key => {
    traits[key as keyof typeof traits] = Math.max(0.0, Math.min(1.0, traits[key as keyof typeof traits]));
  });
  
  return traits;
}

function applyMultipliers(
  [min, max]: [number, number],
  classMultiplier: number,
  subjectModifier: number,
  rng: () => number
): number {
  const baseline = min + (max - min) * rng();
  return baseline * classMultiplier * subjectModifier;
}

function createSeededRandom(seed: number): () => number {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}
```

**Acceptance Criteria:**
- ✅ Generates 5 traits for single astronaut
- ✅ Uses grade band baselines
- ✅ Applies class multiplier
- ✅ Applies subject modifier
- ✅ Clamps result to [0.0, 1.0]
- ✅ Deterministic with seed
- ✅ Random without seed

---

## ✅ Task 6: Implement generateAstronautsFromContext()

**File:** `src/agents/simulation/astronautGenerator.ts`

**What:** Main entry point; generates N astronauts with context-derived base traits

**Why:** This is what Space Camp calls to create astronauts

**Code to Add:**
```typescript
export interface GenerateAstronautsPayload {
  gradeBand: "3-5" | "6-8" | "9-12";
  classLevel: "standard" | "honors" | "AP";
  subject: "math" | "english" | "science" | "history" | "general";
  rubric: AstronautRubric;
  documentId: string;
  numberOfAstronauts?: number;
  seed?: number;
}

export function generateAstronautsFromContext(
  payload: GenerateAstronautsPayload
): {
  astronauts: Astronaut[];
  log: string[];
} {
  const {
    gradeBand,
    classLevel,
    subject,
    rubric,
    documentId,
    numberOfAstronauts = 11,
    seed,
  } = payload;
  
  const log: string[] = [];
  const astronauts: Astronaut[] = [];
  
  log.push(
    `Generating ${numberOfAstronauts} astronauts for ` +
    `${gradeBand} ${classLevel} ${subject}`
  );
  
  for (let i = 0; i < numberOfAstronauts; i++) {
    // Generate base traits (NO overlays yet)
    const baseTraits = generateBaseTraits(
      gradeBand,
      classLevel,
      subject,
      rubric,
      seed ? seed + i : undefined
    );
    
    log.push(
      `Astronaut ${i}: ` +
      `reading=${baseTraits.readingLevel.toFixed(2)}, ` +
      `math=${baseTraits.mathLevel.toFixed(2)}, ` +
      `stamina=${baseTraits.stamina.toFixed(2)}`
    );
    
    // Create astronaut
    const personaName = generatePersonaName(baseTraits, gradeBand, subject);
    
    const astronaut: Astronaut = {
      StudentId: `ast_${documentId}_${i}`,
      PersonaName: personaName,
      Overlays: [],  // To be added in Space Camp
      NarrativeTags: generateNarrativeTags(baseTraits),
      ProfileTraits: {
        ReadingLevel: baseTraits.readingLevel,
        MathFluency: baseTraits.mathLevel,
        AttentionSpan: baseTraits.stamina,
        Confidence: baseTraits.reasoning,
      },
      GradeLevel: gradeBand,
      IsAccessibilityProfile: false,
      ConfusionTolerance: baseTraits.confusionTolerance, // Custom field
    };
    
    astronauts.push(astronaut);
  }
  
  log.push(`Generated ${astronauts.length} astronauts successfully`);
  
  return { astronauts, log };
}

function generatePersonaName(
  traits: { readingLevel: number; mathLevel: number; stamina: number; reasoning: number },
  gradeBand: string,
  subject: string
): string {
  const readers = ['Struggling Reader', 'Average Reader', 'Strong Reader', 'Advanced Reader'];
  const mathers = ['Struggling Mathematician', 'Average Mathematician', 'Strong Mathematician', 'Advanced Mathematician'];
  
  const readingIdx = Math.floor(traits.readingLevel * 3.99);
  const mathIdx = Math.floor(traits.mathLevel * 3.99);
  
  const readingDesc = readers[readingIdx] || 'Reader';
  const mathDesc = mathers[mathIdx] || 'Mathematician';
  
  if (subject === 'math') {
    return mathDesc;
  } else if (subject === 'english') {
    return readingDesc;
  }
  
  return [readingDesc, 'with', mathDesc, 'skills'].join(' ');
}

function generateNarrativeTags(traits: any): string[] {
  const tags: string[] = [];
  
  if (traits.reasoning > 0.7) tags.push('analytical');
  if (traits.readingLevel > 0.7) tags.push('avid-reader');
  if (traits.stamina > 0.7) tags.push('persistent');
  if (traits.confidence > 0.7) tags.push('confident');
  
  if (traits.stamina < 0.4) tags.push('easily-tired');
  if (traits.readingLevel < 0.4) tags.push('reading-challenged');
  
  return tags;
}
```

**Acceptance Criteria:**
- ✅ Takes `GenerateAstronautsPayload` input
- ✅ Returns array of N astronauts (no overlays yet)
- ✅ Each gets unique StudentId
- ✅ Each gets PersonaName based on traits
- ✅ Returns generation log for debugging
- ✅ Traits clamped to [0.0, 1.0]
- ✅ Same context + seed = same astronauts (deterministic)

---

## ✅ Task 7: Wire Space Camp Step to Use New Generation

**File:** `src/components/Pipeline/PipelineShell.tsx`

**What:** Update SPACE_CAMP_ANALYSIS step to call `generateAstronautsFromContext()` instead of random generation

**Why:** Make Space Camp step use context-derived astronauts

**Code to Replace:**
```typescript
// OLD (in SPACE_CAMP_ANALYSIS step):
{state.currentStep === PipelineStep.SPACE_CAMP_ANALYSIS && (
  <div className="step-container">
    <h2>4️⃣ Space Camp: Student Simulation</h2>
    
    {/* OLD CODE - DELETE THIS */}
    const astronauts = getAllAstronauts();  // <-- Random!
    
    {/* NEW CODE - ADD THIS */}
    useEffect(() => {
      if (!state.astronautContext) {
        alert('Missing assessment context');
        return;
      }
      
      // Generate astronauts from context
      const { astronauts, log } = generateAstronautsFromContext({
        gradeBand: state.astronautContext.gradeBand,
        classLevel: state.astronautContext.classLevel,
        subject: state.astronautContext.subject,
        rubric: ASTRONAUT_SCORING_RUBRIC,  // (import from constants)
        documentId: state.documentId || 'unknown',
        numberOfAstronauts: 11,
        seed: state.astronautContext.seed,
      });
      
      // Run simulation
      simulateAssignmentWithAstronauts(astronauts, state.problems);
      
      setSpaceCampLog(log);
    }, [state.astronautContext]);
  </div>
)}
```

**Complete Code Block:**
```typescript
{state.currentStep === PipelineStep.SPACE_CAMP_ANALYSIS && (
  <div className="step-container">
    <h2>4️⃣ Space Camp: Student Simulation</h2>
    <p>Running simulation with context-derived astronauts...</p>
    
    {spaceCampLog.length > 0 && (
      <div className="log-viewer">
        <h3>Generation Log</h3>
        <pre>{spaceCampLog.join('\n')}</pre>
      </div>
    )}
    
    {state.studentFeedback && state.studentFeedback.length > 0 && (
      <div className="simulation-results">
        <h3>Simulation Complete</h3>
        <p>Generated {state.studentFeedback.length} student profiles</p>
        <button onClick={nextStep}>View Results in Philosopher →</button>
      </div>
    )}
    
    {!state.studentFeedback && (
      <p>Loading simulation results...</p>
    )}
  </div>
)}
```

**Acceptance Criteria:**
- ✅ Uses context from astronautContext
- ✅ Calls generateAstronautsFromContext()
- ✅ Passes rubric and parameters correctly
- ✅ Shows generation log
- ✅ Runs simulation once astronauts generated
- ✅ Moves to next step when complete

---

## ✅ Task 8: Create Test Suite for generateAstronautsFromContext()

**File:** `src/agents/simulation/__tests__/astronautGenerator.test.ts`

**What:** Unit tests verifying context-derived generation works correctly

**Why:** Ensure determinism, correctness, and edge cases

**Tests to Implement:**
```typescript
describe('generateAstronautsFromContext', () => {
  const MOCK_RUBRIC = {
    gradeBandBaselines: {
      "3-5": {
        readingLevel: [0.3, 0.6],
        mathLevel: [0.4, 0.7],
        stamina: [0.5, 0.8],
        reasoning: [0.4, 0.7],
        confusionTolerance: [0.6, 0.9],
      },
      "6-8": {
        readingLevel: [0.4, 0.7],
        mathLevel: [0.5, 0.8],
        stamina: [0.5, 0.8],
        reasoning: [0.5, 0.8],
        confusionTolerance: [0.5, 0.8],
      },
      "9-12": {
        readingLevel: [0.6, 0.9],
        mathLevel: [0.6, 0.9],
        stamina: [0.5, 0.8],
        reasoning: [0.6, 0.9],
        confusionTolerance: [0.5, 0.8],
      },
    },
    classLevelMultipliers: {
      standard: 1.0,
      honors: 1.1,
      AP: 1.2,
    },
    subjectModifiers: {
      math: { mathLevel: 1.1, readingLevel: 1.0, reasoning: 1.0 },
      english: { readingLevel: 1.1, reasoning: 1.0, mathLevel: 1.0 },
      // ... etc
    },
    overlayMultipliers: { /* ... */ },
  };

  test('generates correct number of astronauts', () => {
    const result = generateAstronautsFromContext({
      gradeBand: '6-8',
      classLevel: 'standard',
      subject: 'math',
      rubric: MOCK_RUBRIC,
      documentId: 'test_123',
      numberOfAstronauts: 11,
    });

    expect(result.astronauts).toHaveLength(11);
  });

  test('all traits are clamped to [0.0, 1.0]', () => {
    const result = generateAstronautsFromContext({
      gradeBand: '9-12',
      classLevel: 'AP',
      subject: 'math',
      rubric: MOCK_RUBRIC,
      documentId: 'test_123',
      numberOfAstronauts: 5,
    });

    result.astronauts.forEach(ast => {
      expect(ast.ProfileTraits.ReadingLevel).toBeGreaterThanOrEqual(0.0);
      expect(ast.ProfileTraits.ReadingLevel).toBeLessThanOrEqual(1.0);
      expect(ast.ProfileTraits.MathFluency).toBeGreaterThanOrEqual(0.0);
      expect(ast.ProfileTraits.MathFluency).toBeLessThanOrEqual(1.0);
      // ... etc for all traits
    });
  });

  test('same seed produces same astronauts (determinism)', () => {
    const result1 = generateAstronautsFromContext({
      gradeBand: '6-8',
      classLevel: 'standard',
      subject: 'math',
      rubric: MOCK_RUBRIC,
      documentId: 'test_123',
      numberOfAstronauts: 5,
      seed: 42,
    });

    const result2 = generateAstronautsFromContext({
      gradeBand: '6-8',
      classLevel: 'standard',
      subject: 'math',
      rubric: MOCK_RUBRIC,
      documentId: 'test_123',
      numberOfAstronauts: 5,
      seed: 42,
    });

    expect(JSON.stringify(result1.astronauts)).toBe(JSON.stringify(result2.astronauts));
  });

  test('honors class level raises math fluency', () => {
    const standardResult = generateAstronautsFromContext({
      gradeBand: '6-8',
      classLevel: 'standard',
      subject: 'math',
      rubric: MOCK_RUBRIC,
      documentId: 'test_123',
      numberOfAstronauts: 1,
      seed: 42,
    });

    const honorsResult = generateAstronautsFromContext({
      gradeBand: '6-8',
      classLevel: 'honors',
      subject: 'math',
      rubric: MOCK_RUBRIC,
      documentId: 'test_123',
      numberOfAstronauts: 1,
      seed: 42,
    });

    // Honors should have slightly higher math fluency (due to 1.1x multiplier)
    expect(honorsResult.astronauts[0].ProfileTraits.MathFluency)
      .toBeGreaterThan(standardResult.astronauts[0].ProfileTraits.MathFluency);
  });

  test('math subject emphasizes reading for word problems', () => {
    // (Verify that subject modifier impacts correct trait)
  });

  test('astronauts have no overlays at generation', () => {
    const result = generateAstronautsFromContext({
      gradeBand: '6-8',
      classLevel: 'standard',
      subject: 'math',
      rubric: MOCK_RUBRIC,
      documentId: 'test_123',
      numberOfAstronauts: 5,
    });

    result.astronauts.forEach(ast => {
      expect(ast.Overlays).toEqual([]);
    });
  });

  test('grade band 9-12 produces higher average traits than 3-5', () => {
    const lower = generateAstronautsFromContext({
      gradeBand: '3-5',
      classLevel: 'standard',
      subject: 'math',
      rubric: MOCK_RUBRIC,
      documentId: 'test_123',
      numberOfAstronauts: 5,
      seed: 42,
    });

    const upper = generateAstronautsFromContext({
      gradeBand: '9-12',
      classLevel: 'standard',
      subject: 'math',
      rubric: MOCK_RUBRIC,
      documentId: 'test_123',
      numberOfAstronauts: 5,
      seed: 42,
    });

    const lowerAvgMath = lower.astronauts.reduce((sum, a) => sum + a.ProfileTraits.MathFluency, 0) / 5;
    const upperAvgMath = upper.astronauts.reduce((sum, a) => sum + a.ProfileTraits.MathFluency, 0) / 5;

    expect(upperAvgMath).toBeGreaterThan(lowerAvgMath);
  });
});
```

**Acceptance Criteria:**
- ✅ All 8 tests pass
- ✅ Determinism verified
- ✅ Clamping verified
- ✅ Grade band variation verified
- ✅ Class level multiplier verified
- ✅ No overlays at generation verified

---

## ✅ Task 9: Build & Verify

**File:** Terminal

**What:** Build project and verify no TypeScript errors

**Command:**
```bash
npm run build
```

**Expected Output:**
```
vite v5.4.0 building for production...
✓ 1234 modules transformed.
dist/index.html                 0.00 KiB │ gzip:   0.00 KiB
dist/assets/index-XXX.js        1234.56 KiB │ gzip: 234.56 KiB
✓ built in 13.99s
```

**Acceptance Criteria:**
- ✅ Build succeeds with 0 errors
- ✅ No TypeScript errors
- ✅ All imports resolve
- ✅ No warnings about unused code

---

## ✅ Task 10: Manual Testing in UI

**What:** Test entire flow in browser

**Steps:**
1. Start dev server: `npm run dev`
2. Open http://localhost:5173
3. Upload test PDF or enter assignment text
4. Click INPUT_ANALYSIS → DOCUMENT_NOTES → ASTRONOMER_DEFINITION
5. In ASTRONOMER step, select:
   - Grade Band: "6-8"
   - Class Level: "standard"
   - Subject: "math"
6. Click "Continue to Space Camp"
7. Watch SPACE_CAMP_ANALYSIS step:
   - Should show "Generating 11 astronauts..."
   - Should show generation log with trait values
   - Should complete with "View Results" button
8. Click "View Results in Philosopher →"
9. Verify Philosopher step shows 11 student simulations

**Acceptance Criteria:**
- ✅ Form captures inputs correctly
- ✅ Astronauts generated within 2 seconds
- ✅ Generation log shows readable trait values
- ✅ Move to next step works
- ✅ Pipeline state persists context
- ✅ No runtime errors in console

---

# 📊 PROGRESS TRACKING

Copy and update this table as you complete tasks:

| Task | Status | Notes | Time |
|------|--------|-------|------|
| 1. Add AstronautGenerationContext | ⬜ Not Started | | |
| 2. Add Context to PipelineState | ⬜ Not Started | | |
| 3. Capture Intent in ASTRONOMER | ⬜ Not Started | | |
| 4. Implement AstronautRubric Type | ⬜ Not Started | | |
| 5. Create generateBaseTraits() | ⬜ Not Started | | |
| 6. Implement generateAstronautsFromContext() | ⬜ Not Started | | |
| 7. Wire Space Camp Step | ⬜ Not Started | | |
| 8. Create Test Suite | ⬜ Not Started | | |
| 9. Build & Verify | ⬜ Not Started | | |
| 10. Manual Testing | ⬜ Not Started | | |

---

# 🎯 SUCCESS CRITERIA FOR PHASE 1

When all tasks complete, verify:

- ✅ Astronauts are **not random**
- ✅ Astronauts are **derived from context** (gradeBand, classLevel, subject)
- ✅ Grade band baselines are **applied correctly**
- ✅ Class level multipliers are **applied correctly**
- ✅ Subject modifiers are **applied correctly**
- ✅ All traits are **clamped to [0.0, 1.0]**
- ✅ Overlays are **NOT applied at generation** (empty Overlays array)
- ✅ Same context + seed = **same astronauts** (deterministic)
- ✅ Build passes with **0 errors**
- ✅ All tests pass
- ✅ UI flow works end-to-end
- ✅ Generation log is readable and helpful for debugging

---

# 🚀 NEXT PHASE

Once Phase 1 is complete, Phase 2 begins: **Teacher Notes Persistence**

Pre-requisites for Phase 2:
- ✅ Phase 1 complete (context-derived astronauts)
- ✅ Build passing
- ✅ Tests passing

Phase 2 adds:
- Database table for teacher notes in Launchpad
- UI component for capturing notes
- Notes displayed in final export

---

# 📋 REFERENCES

- [ASTRONAUT_SCORING_RUBRIC_V12.md](ASTRONAUT_SCORING_RUBRIC_V12.md) — Complete scoring specification
- [SPACE_CAMP_API_CONTRACT_V12.md](SPACE_CAMP_API_CONTRACT_V12.md) — Full API definition
- [V12_IMPLEMENTATION_CHECKLIST.md](V12_IMPLEMENTATION_CHECKLIST.md) — All 6 phases

---

**Created:** February 12, 2026  
**Status:** Ready for Implementation  
**Estimated Duration:** 2-3 days  
**Contact:** For questions, reference the spec documents above
