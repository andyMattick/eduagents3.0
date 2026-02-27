# Assessment Input Minimization & Bloom-Aligned Simulation

**AI Coder Implementation Specification**  
**Version:** 2.2  
**Audience:** Autonomous AI Engineering Agent  
**Date:** February 14, 2026

---

## SECTION 1 — HARD ARCHITECTURAL INVARIANTS (DO NOT VIOLATE)

The following structures are **CONTRACTUAL** and may **NOT** change without full pipeline rewrite:

### Invariant #1: UniversalProblem Interface Shape
```typescript
UniversalProblem {
  ProblemId: string;           // REQUIRED - unique identifier
  Type: ProblemType;           // REQUIRED - exact enum value
  BloomLevel: BloomLevel;      // REQUIRED - never null, never undefined
  Content: string;             // REQUIRED - full problem text
  CorrectAnswer: string;       // REQUIRED - expected answer/solution
  LinguisticComplexity: number; // REQUIRED - 0.0–1.0 range
  EstimatedTimeMinutes: number; // REQUIRED - positive number
  Difficulty: 1 | 2 | 3 | 4 | 5; // REQUIRED - integer 1–5
  SequenceIndex: number;       // REQUIRED - 0-based, contiguous
  
  // Optional fields (safe to add)
  Rubric?: string;
  MultiPart?: boolean;
  Tags?: string[];
  BloomDifficultyWeight?: number;
}
```

**Violation detection:** If any required field is null, undefined, or wrong type → REJECT entire assessment.

### Invariant #2: SpaceCampPayload Schema
```typescript
SpaceCampPayload {
  documentMetadata: {
    gradeBand: '3-5' | '6-8' | '9-12';  // REQUIRED
    subject: 'math' | 'english' | 'science' | 'history' | 'general'; // REQUIRED
    classLevel: 'standard' | 'honors' | 'AP'; // REQUIRED
    timeTargetMinutes: number; // REQUIRED - positive
  };
  
  estimatedBloomTargets: {
    Remember: number;
    Understand: number;
    Apply: number;
    Analyze: number;
    Evaluate: number;
    Create: number;
  };
  
  problems: UniversalProblem[]; // REQUIRED - non-empty array
  
  // Optional (safe to add)
  bloomCognitiveWeights?: { /* ... */ };
  fatigueImpactMultiplier?: { /* ... */ };
  emphasizeConceptual?: boolean;
  scaffoldingNeeded?: string;
}
```

**Violation detection:** If documentMetadata missing or problems array empty → REJECT.

### Invariant #3: studentSimulations Return Structure
```typescript
studentSimulations: {
  studentId: string;          // REQUIRED
  personaName?: string;       // Optional
  successRate: number;        // REQUIRED - 0–1 range
  avgTime: number;            // REQUIRED - seconds
  confusionIndex: number;     // REQUIRED - 0–1 range
  fatigueIndex: number;       // REQUIRED - 0–1 range
  engagementScore: number;    // REQUIRED - 0–1 range
  struggledProblems?: string[]; // Optional - ProblemIds
  engagementArc?: number[];   // Optional - per-problem engagement
  fatigueArc?: number[];      // Optional - per-problem fatigue
}[]
```

**Violation detection:** If successRate, avgTime, confusionIndex, fatigueIndex, or engagementScore missing → simulation fails.

### Invariant #4: AssignmentPreview Rendering Contract
```typescript
props: {
  assignment: GeneratedAssignment; // REQUIRED
  // Optional additional props:
  selectedStudentId?: string;
  showEngagementArc?: boolean;
}

// Must render:
<div class="assignment-preview">
  {sections.map(section => (
    <div class="section">
      <h2>{section.title}</h2>
      {section.problems.map(problem => (
        <div class="problem-item">
          {problem.Content}
        </div>
      ))}
    </div>
  ))}
</div>
```

**Violation detection:** If DOM structure breaks or opacity issues reappear → CSS validation required.

### Invariant #5: useUserFlow State Contract
```typescript
export interface PipelineState {
  originalText: string;
  tags: Tag[];
  studentFeedback: StudentFeedback[];
  assignmentMetadata: AssignmentMetadata;
  selectedStudentTags: string[];
  rewrittenText: string;
  rewriteSummary: string;
  generatedAssignment: GeneratedAssignment;
  // NEW (safe addition):
  summarizedIntent?: SummarizedAssessmentIntent;
}

// Public methods MUST NOT change signature:
{
  state: PipelineState;
  setOriginalText(text: string): void;
  analyzeTextAndTags(): Promise<void>;
  setGeneratedAssignment(assignment: GeneratedAssignment): void;
  setStudentFeedback(feedback: StudentFeedback[]): void;
  setRewriteResults(text: string, summary: string): void;
  // ... preserve all existing public methods
}
```

**Violation detection:** If public method signature changes → all downstream components break.

---

## SECTION 2 — REQUIRED PROBLEM METADATA (WRITER OUTPUT)

**Every generated problem MUST include the following fields:**

| Field | Type | Range | Required | Notes |
|-------|------|-------|----------|-------|
| `ProblemId` | string | N/A | YES | Unique identifier (e.g., "prob_001") |
| `Type` | enum | multiple-choice, true-false, short-answer, essay, matching | YES | Must be one of exact values |
| `BloomLevel` | enum | Remember, Understand, Apply, Analyze, Evaluate, Create | YES | Never null, never undefined |
| `Content` | string | N/A | YES | Full problem text (no truncation) |
| `CorrectAnswer` | string | N/A | YES | Expected answer or solution stub |
| `LinguisticComplexity` | number | 0.0–1.0 | YES | Flesch-Kincaid or word rarity index |
| `EstimatedTimeMinutes` | number | >0 | YES | Positive integer recommended |
| `Difficulty` | integer | 1–5 | YES | 1=Easy, 5=Very Hard |
| `SequenceIndex` | number | 0, 1, 2, ... N-1 | YES | Must be contiguous, starting at 0 |
| `Rubric` | string | N/A | NO | Optional grading criteria |
| `MultiPart` | boolean | true, false | NO | Optional flag for compound problems |

### Validation Rules (HARD STOPS)

**If ANY field is missing, null, or malformed → REJECT ENTIRE ASSESSMENT with error message:**

```
"Generated assessment validation failed:
- Problem 3: BloomLevel is null
- Problem 5: EstimatedTimeMinutes is negative
- Problem 7: SequenceIndex has gap (expected 6, got 8)

Please regenerate."
```

### SequenceIndex Validation

**Must be contiguous:**
```typescript
const indices = problems.map(p => p.SequenceIndex);
const expected = Array.from({ length: problems.length }, (_, i) => i);
if (!arraysEqual(indices, expected)) {
  throw new Error(`SequenceIndex validation failed. Expected ${expected}, got ${indices}`);
}
```

### Time Estimation Validation

**Total estimated time MUST be within ±10% of target:**
```typescript
const totalTime = problems.reduce((sum, p) => sum + p.EstimatedTimeMinutes, 0);
const target = spaceCampPayload.documentMetadata.timeTargetMinutes;
const minAllowed = target * 0.9;
const maxAllowed = target * 1.1;

if (totalTime < minAllowed || totalTime > maxAllowed) {
  throw new Error(
    `Time validation failed: ${totalTime} min outside [${minAllowed}, ${maxAllowed}]`
  );
}
```

---

## SECTION 3 — BLOOM DISTRIBUTION ENGINE

### Level-Based Default Targets

**Remedial students (grades 3–5)**
```
Remember:   25%
Understand: 30%
Apply:      30%
Analyze:    10%
Evaluate:   5%
Create:     0%
```

**Standard students (grades 6–8)**
```
Remember:   10%
Understand: 20%
Apply:      35%
Analyze:    25%
Evaluate:   5%
Create:     5%
```

**Honors students (grades 9–12)**
```
Remember:   5%
Understand: 15%
Apply:      30%
Analyze:    30%
Evaluate:   10%
Create:     10%
```

**AP / College students**
```
Remember:   0–5%
Understand: 10%
Apply:      25%
Analyze:    30%
Evaluate:   15%
Create:     15%
```

### Emphasis Modifiers

Applied **AFTER** level baseline, then **RENORMALIZED** to 100%:

```typescript
// Procedural Fluency
Procedural: {
  Apply: +10%,
  Analyze: -5%,
  Evaluate: -5%
}
// Result: Favors skill execution over reasoning

// Conceptual Understanding
Conceptual: {
  Understand: +10%,
  Analyze: +10%,
  Apply: -10%,
  Remember: -5%
}
// Result: Favors deep understanding + reasoning

// Application & Reasoning
Application: {
  Analyze: +10%,
  Evaluate: +10%,
  Remember: -10%
}
// Result: Favors synthesis + critical thinking

// Exam Style
ExamStyle: {
  Enforce: {
    minAnalyzeEvaluate: 0.20, // At least 20% combined
    minCreateIfHonorsAP: 0.05  // If Honors/AP: 5% Create minimum
  }
}
// Result: Mimics standardized assessment structure
```

### Normalization Rule

```typescript
function normalizeDistribution(dist: BloomDistribution): BloomDistribution {
  const sum = Object.values(dist).reduce((a, b) => a + b, 0);
  const tolerance = 0.02; // ±2% allowed
  
  if (Math.abs(sum - 1.0) > tolerance) {
    throw new Error(`Bloom distribution does not sum to 1.0. Got ${sum}`);
  }
  
  // Scale to exactly 1.0
  return Object.fromEntries(
    Object.entries(dist).map(([k, v]) => [k, v / sum])
  );
}
```

### Question Count Mapping

**Given target question count N and Bloom distribution:**

```typescript
function mapBloomToQuestionCounts(
  distribution: BloomDistribution,
  totalQuestions: number
): { [level: string]: number } {
  const counts = {};
  let remaining = totalQuestions;
  
  // Decrement highest percentages first to maintain proportions
  const sorted = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [level, percentage] of sorted) {
    const count = Math.round(percentage * totalQuestions);
    counts[level] = count;
    remaining -= count;
  }
  
  // Adjust for rounding errors
  if (remaining !== 0) {
    counts[sorted[0][0]] += remaining;
  }
  
  return counts;
}
```

### Multi-part Question Rule

If `MultiPart: true`, **count the problem only by its HIGHEST Bloom level.**

```typescript
// Example: Multi-part question with Remember, Understand, Apply
// → Counts toward Apply, NOT toward other levels
```

---

## SECTION 4 — SPACE CAMP ALIGNMENT REQUIREMENTS

### Bloom → Cognitive Weight Mapping

**THESE WEIGHTS MUST BE IMMUTABLE in AstronautRubricV2:**

```typescript
bloomCognitiveWeights: {
  Remember: {
    readingLevel: 0.6,
    reasoningLevel: 0.2,
    confidence: 0.2
  },
  Understand: {
    readingLevel: 0.4,
    reasoningLevel: 0.4,
    confidence: 0.2
  },
  Apply: {
    mathFluency: 0.5,
    reasoningLevel: 0.3,
    readingLevel: 0.2
  },
  Analyze: {
    reasoningLevel: 0.6,
    readingLevel: 0.3,
    confidence: 0.1
  },
  Evaluate: {
    reasoningLevel: 0.7,
    readingLevel: 0.2,
    confidence: 0.1
  },
  Create: {
    reasoningLevel: 0.6,
    confidence: 0.3,
    readingLevel: 0.1
  }
}
```

### Fatigue Impact Multipliers

**These values control how quickly students tire by level:**

```typescript
fatigueImpactMultiplier: {
  Remedial: 0.02,    // Tires slower (less cognitively demanding)
  Standard: 0.03,    // Moderate fatigue accumulation
  Honors: 0.035,     // Faster fatigue (more demanding)
  AP: 0.04           // Fastest fatigue (most taxing)
}
```

**Fatigue calculation (when Space Camp is called):**
```typescript
cumulativeFatigue = (Σ priorEstimatedMinutes / timeTarget) × multiplier

Example (Standard, 45 min target):
- After problem 1 (5 min): 5/45 × 0.03 = 0.003
- After problem 5 (25 min): 25/45 × 0.03 = 0.017
- After problem 10 (50 min): 50/45 × 0.03 = 0.033
```

### studentSimulations Output Integrity

**DO NOT MODIFY the return structure:**

```typescript
studentSimulations: {
  studentId: string;
  successRate: number;      // Must remain 0–1 numeric
  avgTime: number;          // Must remain seconds numeric
  confusionIndex: number;   // Must remain 0–1 numeric
  fatigueIndex: number;     // Must remain 0–1 numeric
  engagementScore: number;  // Must remain 0–1 numeric
}[]
```

If Philosopher returns different field names or types → pipeline crashes.

---

## SECTION 5 — ENGAGEMENT MODEL CONSTRAINTS

### Base Engagement Weights by Problem Type

**DO NOT CHANGE THESE VALUES:**

```typescript
engagementBaseWeights: {
  'multiple-choice': 0.75,      // High engagement format
  'true-false': 0.65,           // Lower engagement (binary)
  'short-answer': 0.70,         // Moderate engagement
  'matching': 0.80,             // Highest engagement (active)
  'essay': 0.60                 // Lower engagement (writing fatigue)
}
```

### Engagement Formula (DETERMINISTIC, NO RANDOMNESS)

```typescript
function calculateEngagement(
  problemType: string,
  studentConfidence: number,    // 0–1
  fatigueIndex: number,         // 0–1
  similarityToPrevious: number // 0–1 (cosine similarity)
): number {
  const baseWeight = engagementBaseWeights[problemType];
  const noveltyFactor = Math.sqrt(1 + similarityToPrevious); // Novelty bump
  
  const engagement =
    baseWeight *
    studentConfidence *
    (1 - fatigueIndex) *
    noveltyFactor;
  
  return Math.max(0, Math.min(1, engagement)); // Clamp to [0, 1]
}
```

**Violation detection:** If engagement is random or includes non-deterministic elements → FAIL validation.

### Expected Engagement Ranges by Level

- **Remedial**: 0.40–0.65 (foundational problems → moderate engagement)
- **Standard**: 0.55–0.75 (balanced mix → good engagement)
- **Honors**: 0.65–0.85 (challenging problems → high engagement)
- **AP**: 0.70–0.90 (expert-level problems → very high engagement)

---

## SECTION 6 — PIPELINE VALIDATION CHECKLIST (MANDATORY BEFORE MERGE)

**After ANY modification, run this checklist. If ANY check fails → REVERT CHANGE.**

### TypeScript Compilation
```bash
npm run build
```
- [ ] Zero TypeScript errors
- [ ] Zero type mismatches
- [ ] All imports resolve

### Problem Metadata Validation
For each problem in generated assignment:
- [ ] BloomLevel defined (not null)
- [ ] LinguisticComplexity ∈ [0.0, 1.0]
- [ ] EstimatedTimeMinutes > 0
- [ ] Difficulty ∈ [1, 5]
- [ ] SequenceIndex contiguous from 0

### Time Estimation Validation
- [ ] Total time ≈ target ±10%
- [ ] No individual problem > target (unless single-question assessment)

### SpaceCampPayload Schema Validation
- [ ] documentMetadata present with all required fields
- [ ] estimatedBloomTargets sums ≈ 1.0 (within ±0.02)
- [ ] problems array non-empty

### studentSimulations Return Shape
- [ ] successRate numeric ∈ [0, 1]
- [ ] avgTime numeric (seconds)
- [ ] confusionIndex numeric ∈ [0, 1]
- [ ] fatigueIndex numeric ∈ [0, 1]
- [ ] engagementScore numeric ∈ [0, 1]

### Simulation Testing (All 4 Levels)

**Remedial, 20 min:**
- [ ] 3–5 questions generated
- [ ] Remember + Understand ≥ 50%
- [ ] fatigueIndex < 0.1 on last problem
- [ ] No console errors

**Standard, 30 min:**
- [ ] 6–7 questions generated
- [ ] Apply + Analyze ≥ 60%
- [ ] fatigueIndex ≈ 0.08–0.12 on last problem
- [ ] No console errors

**Honors, 45 min:**
- [ ] 9–10 questions generated
- [ ] Analyze + Evaluate ≥ 40%
- [ ] fatigueIndex ≈ 0.12–0.16 on last problem
- [ ] No console errors

**AP, 50 min:**
- [ ] 10–12 questions generated
- [ ] Create ≥ 5%
- [ ] fatigueIndex ≈ 0.15–0.25 on last problem
- [ ] No console errors

### Engagement Variance Validation
- [ ] Engagement varies by problem type (matching > essay)
- [ ] Fatigue reduces engagement (monotonically)
- [ ] No negative engagement scores
- [ ] No engagement scores > 1.0

### Bloom Distribution Validation
- [ ] Generated problems match target ±5%
- [ ] No orphaned BloomLevel values
- [ ] Emphasis modifiers applied correctly

### UI / Rendering Validation
- [ ] AssignmentPreview renders all sections
- [ ] All problems visible (opacity: 1)
- [ ] No CSS breaks
- [ ] No console errors

---

## SECTION 7 — FAILURE MODES TO AVOID

### Failure Mode #1: BloomLevel Undefined
**Cause:** Writer returns problem without BloomLevel  
**Impact:** Simulation breaks (cognitive weights can't apply)  
**Prevention:** Validate `if (!problem.BloomLevel) throw Error`

### Failure Mode #2: LinguisticComplexity Null
**Cause:** Reading complexity not calculated  
**Impact:** Reading-dependent students assessed incorrectly  
**Prevention:** Validate `if (typeof problem.LinguisticComplexity !== 'number') throw Error`

### Failure Mode #3: EstimatedTimeMinutes Inaccurate
**Cause:** Time estimates don't match actual content  
**Impact:** Fatigue model breaks, students rush or idle  
**Prevention:** Validate total time ±10% of target

### Failure Mode #4: SequenceIndex Discontinuous
**Cause:** Problems reordered without updating indices  
**Impact:** Time ordering breaks, fatigue calculation wrong  
**Prevention:** Validate `indices must be [0, 1, 2, ..., N-1]`

### Failure Mode #5: Schema Mutation
**Cause:** Adding required field to problem without migration  
**Impact:** Space Camp crashes on old assessment data  
**Prevention:** Only add OPTIONAL fields; never change required field names

### Failure Mode #6: Hidden UI Complexity Leaking
**Cause:** Bloom targets, cognitive weights, or fatigue multipliers shown to teacher  
**Impact:** UI complexity goal defeated  
**Prevention:** Hide all technical fields from SummarizedAssessmentIntent summary

### Failure Mode #7: Opacity Issue Returns
**Cause:** CSS variables not resolving or opacity reset to 0  
**Impact:** Assessment invisible on screen despite correct data  
**Prevention:** Use explicit hex colors, validate `element.style.opacity !== '0'`

### Failure Mode #8: useUserFlow Contract Break
**Cause:** Adding required parameter to hook method  
**Impact:** All components using hook crash  
**Prevention:** Only add optional properties to state, never change method signatures

---

## SECTION 8 — FINAL DIRECTIVE

### ALLOWED OPERATIONS
✅ Optimization (faster algorithms)  
✅ Refactoring (cleaner code, same behavior)  
✅ Adding optional fields  
✅ Adding new helper functions  
✅ Improving error messages  

### FORBIDDEN OPERATIONS
❌ Removing required fields  
❌ Changing return types  
❌ Renaming schema properties  
❌ Modifying engagement/fatigue formulas  
❌ Adding randomness to deterministic calculations  
❌ Changing public method signatures  

### DECISION TREE

```
Question: "Will this change affect the pipeline?"

IF modifying UniversalProblem, SpaceCampPayload, studentSimulations,
   AssignmentPreview props, or useUserFlow signature
THEN → Assume YES, validate end-to-end

ELSE IF modifying Bloom distribution, engagement formula, fatigue multipliers
THEN → Assume YES, run simulation matrix

ELSE IF modifying error messages, logging, or CSS styling
THEN → Assume NO, proceed with caution

WHEN IN DOUBT → Validate end-to-end
```

### Pre-Merge Gate (MANDATORY)

Before merging ANY change to `dev` branch:

```bash
# 1. Compile
npm run build

# 2. Run tests (if exist)
npm run test

# 3. Manual validation: Complete 4 assessment workflows
# - Remedial quiz, 20 min
# - Standard test, 30 min
# - Honors test, 45 min
# - AP test, 50 min

# 4. Console check (dev tools)
# - No errors
# - No warnings from pipeline
# - Bloom distribution logged correctly
# - Fatigue variance visible

# 5. Space Camp payload validation
# - Export JSON from last simulation
# - Verify all required fields present
# - Verify bloom targets match problem distribution
```

**If ANY step fails → REVERT and document issue.**

---

## References

**Contractual Documents:**
- [INPUT_MINIMIZATION_README.md](INPUT_MINIMIZATION_README.md) — Design spec (v2.0)
- [SPACE_CAMP_CONFIG_GUIDE.md](SPACE_CAMP_CONFIG_GUIDE.md) — External interface spec

**Source of Truth:**
- `src/config/astronautScoringRules.ts` — AstronautRubricV2 definitions
- `src/types/assignmentTypes.ts` — UniversalProblem interface
- `src/types/spaceCampSchema.ts` — SpaceCampPayload interface

**Critical Files (DO NOT BREAK):**
- `src/hooks/usePipeline.ts` — useUserFlow contract
- `src/components/Pipeline/AssignmentPreview.tsx` — Rendering contract
- `src/agents/analysis/philosophers.ts` — studentSimulations return

