# Assessment Input Minimization & Summarizer

**Version:** 2.0  
**Date:** February 14, 2026  
**Purpose:** Reduce teacher input complexity while maximizing AI-generated assessment quality + full pipeline integrity

---

## Core Principle

Every UI simplification must preserve full pipeline integrity.

**Non-negotiable requirements:**
- ✅ BloomLevel never disappears
- ✅ LinguisticComplexity always present (0.0–1.0)
- ✅ EstimatedTimeMinutes never drifts
- ✅ SequenceIndex always 0, 1, 2, ...
- ✅ documentMetadata always correct (gradeBand, subject, classLevel)
- ✅ SpaceCamp payload structure unchanged
- ✅ UniversalProblem structure unchanged
- ✅ studentSimulations return shape unchanged
- ✅ useUserFlow contract preserved
- ✅ AssignmentPreview rendering contract preserved

---

## Philosophy

🚀 **2-minute workflow**  
🧠 **High trust in AI**  
✨ **Feels intelligent, not configurable**  
⚙️ **Advanced options only when needed**  
🔒 **All technical complexity hidden, all data integrity preserved**

---

## Teacher Experience

### Step 1: Choose Source

**Generate From Source Materials**
- Upload document (PDF, Word, text)
- AI extracts content automatically

**OR**

**Generate Without Source**
- Enter topic manually
- AI generates from scratch

---

### Step 2: Core Inputs (3-4 fields, ~1 minute)

```
📋 Create Assessment from Your Materials

Using: Chapter 7 Comprehensive Review – Sampling Distributions

🎓 Student Level
  ▾ Remedial
  ▾ Standard (recommended)
  ▾ Honors
  ▾ AP / College

📝 Assessment Type
  ▾ Quiz (10-15 min check for understanding)
  ▾ Test (formal, summative)
  ▾ Practice (skill-building & reinforcement)

⏱ Estimated Time
  [ 30 ] minutes

🚀 Generate Assessment

✔ Balanced cognitive levels
✔ Calibrated difficulty
✔ Answer key & rubric included
```

**Result:** Assessment appears with clean formatting, structured sections, balanced difficulty, answer key, rubric.

---

### Step 3: Optional Advanced (Collapsed by Default)

Teachers can refine without leaving the form:

```
⚙ Advanced Options

1️⃣ Focus Areas (Optional)
   Emphasize specific skills from your material.
   [ Sampling distributions of proportions           ]
   [ Central Limit Theorem reasoning                 ]
   [ Success–failure condition                       ]
   [ Multi-step probability modeling                 ]

2️⃣ Assessment Emphasis (Optional)
   What should this prioritize?
   ▾ Balanced (default)
   ▾ Procedural fluency
   ▾ Conceptual understanding
   ▾ Application & reasoning
   ▾ AP-style free response

3️⃣ Difficulty Profile (Optional)
   ▾ Balanced (default)
   ▾ Mostly foundational
   ▾ Mostly challenging
   ▾ Include 1–2 stretch problems

4️⃣ Classroom Context (Optional)
   Anything the AI should know?
   [ Students struggle with probability notation ]
   [ This is cumulative unit review             ]
   [ Include real-world scenarios               ]
   [ Avoid calculator-heavy questions           ]
```

---

## Bloom Reconfiguration

### Level-Based Bloom Distributions

The summarizer automatically assigns Bloom level targets based on StudentLevel + AssessmentType + Emphasis:

#### Remedial
- **Remember**: 25%
- **Understand**: 30%
- **Apply**: 30%
- **Analyze**: 10%
- **Evaluate**: 5%
- **Create**: 0%

#### Standard (Default)
- **Remember**: 10%
- **Understand**: 20%
- **Apply**: 35%
- **Analyze**: 25%
- **Evaluate**: 5%
- **Create**: 5%

#### Honors
- **Remember**: 5%
- **Understand**: 15%
- **Apply**: 30%
- **Analyze**: 30%
- **Evaluate**: 10%
- **Create**: 10%

#### AP / College
- **Remember**: 0–5%
- **Understand**: 10%
- **Apply**: 25%
- **Analyze**: 30%
- **Evaluate**: 15%
- **Create**: 15%

### Emphasis Modifiers

Applied **after** level baseline:

```typescript
type Emphasis = 'Balanced' | 'Procedural' | 'Conceptual' | 'Application' | 'ExamStyle';

// Emphasis adjustments (add/subtract percentages):
Procedural:
  +10% Apply, -5% Analyze, -5% Evaluate
  → Favors skill execution

Conceptual:
  +10% Understand, +10% Analyze, -10% Apply, -5% Remember
  → Favors deep understanding + reasoning

Application & Reasoning:
  +10% Analyze, +10% Evaluate, -10% Remember
  → Favors synthesis + critical thinking

Exam Style:
  Ensure minimum 20% Analyze + Evaluate
  If Honors/AP: ensure minimum 5% Create
  → Mimics standardized test structure
```

**Example Transformation:**
```
Input: Standard + Conceptual
Base (Standard): R:10% U:20% Ap:35% An:25% E:5% C:5%
Conceptual Mod:  R:-5% U:+10% Ap:-10% An:+10% E:0% C:0%
Result:          R:5%  U:30%  Ap:25%  An:35%  E:5%  C:5%
```

### Bloom → Cognitive Weight Mapping

Each Bloom level weights student traits differently:

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

**Used by**: Space Camp or Philosopher when simulating student performance on problems.

### Fatigue Multipliers by Level

Cumulative fatigue = prior problems' estimated time × fatigueImpactMultiplier

```typescript
fatigueImpactMultiplier: {
  Remedial: 0.02,        // Tires slower
  Standard: 0.03,        // Moderate fatigue
  Honors: 0.035,         // More demanding
  AP: 0.04               // Most taxing
}
```

**Formula:**
```
cumulativeFatigueIndex = (Σ priorEstimatedMinutes / timeTargetMinutes) × multiplier

Example (Standard, 45 min target):
- After Problem 1 (5 min): fatigue = 5 / 45 × 0.03 = 0.003
- After Problem 2 (5 min): fatigue = 10 / 45 × 0.03 = 0.007
- After Problem 10 (150 min cumulative): fatigue = 150 / 45 × 0.03 = 0.1
```

---

## What Teachers Never See

❌ Bloom distribution percentages  
❌ Complexity scaling formulas  
❌ Cognitive difficulty levels  
❌ Question novelty scores  
❌ Subject modifiers or overlays  
❌ Any Space Camp config  

**Instead:** Natural language summary of their intent + polished assessment

---

## System Architecture

### Input Flow

```
Teacher completes 4 core inputs
         ↓
Teacher adds optional advanced inputs (or leaves blank)
         ↓
MinimalAssessmentForm validates → assessmentSummarizerService
         ↓
Summarizer converts inputs to rich prompt
         ↓
Summarizer builds Space Camp payload with derived metadata
         ↓
AI Writer receives summary + payload
         ↓
AI generates problems (never exposed to Space Camp config)
         ↓
Assessment preview shown to teacher
```

---

## Summarizer Service

### Purpose

Convert teacher-friendly inputs into:
1. **Natural language summary** (for AI context)
2. **Internal Space Camp payload** (hidden from teacher)

### Input Type: `AssessmentIntent`

```typescript
{
  // Source
  sourceFile?: File;
  sourceTopic?: string;
  
  // Core (required)
  studentLevel: 'Remedial' | 'Standard' | 'Honors' | 'AP';
  assessmentType: 'Quiz' | 'Test' | 'Practice';
  timeMinutes: number;
  
  // Advanced (optional)
  focusAreas?: string[];
  emphasis?: 'Balanced' | 'Procedural' | 'Conceptual' | 'Application' | 'ExamStyle';
  difficultyProfile?: 'Balanced' | 'Foundational' | 'Challenging' | 'Stretch';
  classroomContext?: string;
}
```

### Output: `SummarizedAssessmentIntent`

```typescript
{
  // What teacher sees
  summary: string;  // e.g., "Create a Standard-level test (45 min) on..."
  
  // What AI writer sees
  prompt: string;  // Rich instructional prompt including summary + context
  
  // What Space Camp receives
  spaceCampPayload: {
    documentMetadata: {
      gradeBand: '9-12';
      subject: 'math';
      classLevel: 'standard';
      timeTargetMinutes: 45;
    };
    // ... full payload with derived Bloom, complexity targets, etc.
  };
  
  // For validation
  derivedMetadata: {
    estimatedBloomDistribution: { Remember: 0.1, Understand: 0.2, ... };
    estimatedComplexityRange: [0.3, 0.7];
    estimatedQuestionCount: 12;
  };
}
```

### Example Transformation

**Teacher Input:**
```
Student Level: Standard
Assessment Type: Test
Time: 45 minutes
Topic: Sampling Distributions
Focus Areas: CLT, success-failure conditions
Emphasis: Conceptual Understanding
Difficulty: Balanced
Context: "Students struggle with probability notation"
```

**Summary Output (Teacher sees):**
```
"Create a Standard-level test (45 min) on Sampling Distributions.
Focus on Central Limit Theorem reasoning and success-failure conditions.
Emphasize conceptual understanding with balanced difficulty.
Students struggle with probability notation — include clear definitions and scaffolding.
Target ~12 questions with answer key and rubric."
```

**Space Camp Payload (Derived):**
```json
{
  "documentMetadata": {
    "gradeBand": "9-12",
    "subject": "math",
    "classLevel": "standard",
    "timeTargetMinutes": 45
  },
  "estimatedBloomTargets": {
    "Remember": 0.1,
    "Understand": 0.25,
    "Apply": 0.25,
    "Analyze": 0.25,
    "Evaluate": 0.1,
    "Create": 0.05
  },
  "complexityRange": [0.3, 0.7],
  "estimatedQuestionCount": 12,
  "emphasizeConceptual": true,
  "scaffoldingNeeded": "probability notation foundations"
}
```

---

## Implementation Phases

### Phase 1 – Minimal UI Replacement

**Deliverables:**
- `MinimalAssessmentForm.tsx` — 2-step form with collapsed advanced
- `types/assessmentIntent.ts` — Input types
- Form validation layer

**Key Features:**
- Step 1: Choose source (upload OR topic)
- Step 2: Core inputs (Student Level, Type, Time)
- Step 3: Optional Advanced (collapsed until clicked)
- Real-time validation with error messages

**Pipeline Integrity Checklist:**
- [ ] StudentLevel maps to correct grade band (Remedial→3-5, Standard→6-8, Honors→9-12, AP→9-12)
- [ ] AssessmentType maps correctly (Quiz, Test, Practice)
- [ ] Time validated (5–240 minutes)
- [ ] Either sourceFile OR sourceTopic required (not both, not neither)
- [ ] useUserFlow() hook untouched in component tree
- [ ] AssignmentPreview can still access generatedAssignment
- [ ] No new props added to AssignmentPreview
- [ ] CSS doesn't break existing theme/colors

---

### Phase 2 – Summarizer Service

**Deliverables:**
- `services/assessmentSummarizerService.ts` — Core logic
- `types/spaceCampSchema.ts` updated for Bloom targets (if not already)

**Functions to implement:**
1. `estimateBloomDistribution(level, type, emphasis)` → BloomDistribution
2. `mapStudentLevelToGradeBand(level)` → '3-5' | '6-8' | '9-12'
3. `deriveSpaceCampMetadata(intent)` → Partial SpaceCampPayload
4. `buildNaturalLanguageSummary(intent)` → string
5. `summarizeAssessmentIntent(intent)` → SummarizedAssessmentIntent

**Phase 2 Integrity Checklist:**
- [ ] SpaceCampPayload schema structure unchanged
- [ ] gradeBand always one of: '3-5', '6-8', '9-12'
- [ ] classLevel always one of: 'standard', 'honors', 'AP'
- [ ] subject always one of: 'math', 'english', 'science', 'history', 'general'
- [ ] estimatedBloomTargets sums to ~1.0 (within 0.02 tolerance)
- [ ] Bloom distributions respect min/max per level
- [ ] Emphasis modifiers applied correctly
- [ ] Natural language summary is teacher-friendly
- [ ] Space Camp payload hidden from summary (never shown to UI)
- [ ] All optional fields (focusAreas, context) handled gracefully

---

### Phase 3 – AstronautRubricV2 Upgrade

**Deliverables:**
- Update `src/config/astronautScoringRules.ts` to include new multipliers
- Update `src/types/simulation.ts` if needed

**Add to AstronautRubric:**
```typescript
{
  // Existing fields (unchanged)
  gradeBandBaselines: { /* ... */ },
  classLevelMultipliers: { /* ... */ },
  subjectModifiers: { /* ... */ },
  overlayMultipliers: { /* ... */ },
  
  // NEW Fields v2.0
  bloomCognitiveWeights: { /* see above */ },
  fatigueImpactMultiplier: { /* see above */ },
  engagementBaseWeights: {
    'multiple-choice': 0.75,
    'true-false': 0.65,
    'short-answer': 0.70,
    'matching': 0.80,
    'essay': 0.60
  }
}
```

**Phase 3 Integrity Checklist:**
- [ ] Simulation output shape unchanged (studentSimulations still returns same fields)
- [ ] successRate still numeric 0–1
- [ ] engagementScore still numeric 0–1
- [ ] confusionSignals still integer
- [ ] fatigueIndex still 0–1
- [ ] timeToCompleteMinutes still numeric
- [ ] No breaking changes to StudentFeedback interface
- [ ] Philosopher engine reads new fields without crashing
- [ ] Old simulations (without new fields) still work

---

### Phase 4 – Writer Script Enforcement

**Deliverables:**
- Update `aiConfig.ts` — Add problem validation before Gemini call
- Update `agents/rewrite/rewriteAssignment.ts` — Enforce all fields

**Each generated problem MUST include:**
```typescript
{
  ProblemId: string;
  BloomLevel: 'Remember' | 'Understand' | ... | 'Create';
  LinguisticComplexity: number; // 0.0–1.0
  EstimatedTimeMinutes: number; // positive integer
  Difficulty: 1 | 2 | 3 | 4 | 5;
  SequenceIndex: number; // 0, 1, 2, ...
  Type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'matching';
  Content: string;
  // ... other fields
}
```

**Validation rules:**
1. All problems have BloomLevel (no null/undefined)
2. All problems have LinguisticComplexity ∈ [0.0, 1.0]
3. All problems have EstimatedTimeMinutes > 0
4. SequenceIndex is contiguous (0, 1, 2, ... N-1)
5. Total estimated time ≈ target ±10%
   ```
   totalTime = Σ EstimatedTimeMinutes per problem
   allowed = [target × 0.9, target × 1.1]
   ASSERT totalTime ∈ allowed
   ```
6. Bloom distribution matches estimated targets ±5%

**Phase 4 Integrity Checklist:**
- [ ] Gemini prompt includes Bloom targets
- [ ] Gemini prompt includes time target + ±10% allowance
- [ ] All returned problems validated against rules above
- [ ] Validation errors logged with problem index
- [ ] If validation fails, show user: "Generated assessment doesn't match targets. Retrying..."
- [ ] SequenceIndex correct after any problem reordering
- [ ] Difficulty ∈ [1, 5]
- [ ] No orphaned BloomLevel values
- [ ] LinguisticComplexity never 0 or 1 (should be 0.1–0.9)

---

### Phase 5 – Engagement Modeling

**Deliverables:**
- Update Philosopher engine or Space Camp simulation layer
- Add engagement calculation to StudentProblemInput

**Engagement Formula:**
```typescript
engagement = baseWeight × confidence × (1 - fatigueIndex) × noveltyFactor

where:
  baseWeight = engagementBaseWeights[problemType]
  confidence = student.confidence ∈ [0, 1]
  fatigueIndex = cumulative fatigue (0–1)
  noveltyFactor = (1 + similarityToPrevious)^0.5 // novelty bump
```

**Engagement ranges by level:**
- Remedial: expect lower engagement (0.4–0.65)
- Standard: mid range (0.55–0.75)
- Honors: higher (0.65–0.85)
- AP: highest (0.70–0.90)

**Phase 5 Integrity Checklist:**
- [ ] engagementScore ∈ [0, 1]
- [ ] For each problem, engagement logged with reason breakdown
- [ ] Fatigue visibly reduces engagement (not hidden)
- [ ] Novelty factor increases engagement (problem variety helps)
- [ ] BaseWeights come from engagementBaseWeights config
- [ ] StudentFeedback includes engagementArc (array of scores)
- [ ] AssignmentPreview can show engagement trend line (optional)

---

### Phase 6 – End-to-End Testing Matrix

**Test all combinations:**

| Level | Type | Source | Advanced | Expected Behavior |
|-------|------|--------|----------|-------------------|
| Remedial | Quiz | Upload | No | 8 questions, Remember/Understand heavy |
| Standard | Test | Topic | No | 12 questions, balanced difficulty |
| Standard | Test | Upload | Conceptual | More Analyze/Evaluate |
| Honors | Test | Upload | Procedural | More Apply |
| AP | Test | Upload | Exam Style | Min 20% Analyze+Evaluate, 5% Create |
| Standard | Practice | Topic | No | Shorter, foundational |

**For each combination, verify:**
- [ ] Assessment generates without error
- [ ] AssignmentPreview renders all problems
- [ ] Bloom distribution matches targets
- [ ] Total time ≈ target ±10%
- [ ] LinguisticComplexity varies (0.2–0.8 range)
- [ ] SequenceIndex correct
- [ ] Space Camp simulation runs
- [ ] Student fatigue visible
- [ ] No console errors
- [ ] Engagement scores realistic

**Critical simulations to run:**

1. **Standard, 30 min quiz:**
   - Expected: ~6 questions, avg time 5 min
   - Verify: No fatigue by end

2. **AP, 50 min test:**
   - Expected: ~12 questions, mixed complexity
   - Verify: Fatigue index rises toward end, success rates vary by Bloom level

3. **Remedial, 20 min practice:**
   - Expected: ~4 questions, mostly Remember/Understand
   - Verify: Low fatigue, high engagement

---

## Files to Create / Modify

### 1. **types/assessmentIntent.ts** (NEW)
Teacher input types and summarizer output

```typescript
export interface AssessmentIntent {
  sourceFile?: File;
  sourceTopic?: string;
  studentLevel: StudentLevel;
  assessmentType: AssessmentType;
  timeMinutes: number;
  focusAreas?: string[];
  emphasis?: AssessmentEmphasis;
  difficultyProfile?: DifficultyProfile;
  classroomContext?: string;
}

export interface SummarizedAssessmentIntent {
  summary: string;
  prompt: string;
  spaceCampPayload: SpaceCampPayload;
  derivedMetadata: DerivedMetadata;
}
```

### 2. **services/assessmentSummarizerService.ts**
Converts inputs to summary + payload

```typescript
export async function summarizeAssessmentIntent(
  intent: AssessmentIntent
): Promise<SummarizedAssessmentIntent>

export function deriveSpaceCampMetadata(
  intent: AssessmentIntent
): SpaceCampPayload

export function buildNaturalLanguageSummary(
  intent: AssessmentIntent
): string

export function mapStudentLevelToGradeBand(
  level: StudentLevel
): GradeBand

export function estimateBloomDistribution(
  emphasis: AssessmentEmphasis,
  assessmentType: AssessmentType
): BloomDistribution
```

### 3. **components/Pipeline/MinimalAssessmentForm.tsx**
New minimal UI form

```typescript
export function MinimalAssessmentForm({
  onGenerate: (intent: SummarizedAssessmentIntent) => void;
  isLoading?: boolean;
}): JSX.Element
```

Features:
- Source selection (upload vs. topic)
- 4 core fields (Student Level, Type, Time)
- Collapsed advanced section
- Real-time validation
- 2-minute completion target

### 4. **components/Pipeline/MinimalAssessmentForm.css**
Minimal, clean styling optimized for fast input

---

## Integration Points

### Current → New

**Remove/Replace:**
- ❌ `AssignmentIntentForm.tsx` (old multi-step form)
- ❌ Detailed metadata inputs
- ❌ Teacher-visible Bloom/complexity fields

**Add:**
- ✅ `MinimalAssessmentForm.tsx` (new 2-step form)
- ✅ `assessmentSummarizerService.ts` (hidden processing)
- ✅ `types/assessmentIntent.ts` (input types)

**Keep (unchanged):**
- ✅ `useUserFlow()` hook (state management)
- ✅ `AssignmentPreview.tsx` (display generated assessment)
- ✅ Space Camp simulation pipeline
- ✅ Philosopher analysis

### Data Flow

```
MinimalAssessmentForm
         ↓
assessmentSummarizerService.summarizeAssessmentIntent()
         ↓
SummarizedAssessmentIntent {
  summary: string              ← show to teacher
  spaceCampPayload: {...}      ← send to writer
}
         ↓
useUserFlow().setGeneratedAssignment(assessment)
         ↓
AssignmentPreview (unchanged)
```

---

## Advanced Options Logic

Only display advanced if:
- User clicks "⚙ Advanced"
- User has uploaded source material (more context available for refinement)
- User wants non-default emphasis

**Default behavior** (no advanced inputs):
- Balanced Bloom distribution
- Balanced difficulty
- Generic context (no special scaffolding)
- Mixed question types

---

## Validation

```typescript
function validateAssessmentIntent(intent: AssessmentIntent): {
  valid: boolean;
  errors: string[];
}
```

Check:
- ✅ Student level is valid
- ✅ Assessment type is valid
- ✅ Time is 5-240 minutes
- ✅ Source (file OR topic) provided
- ✅ Focus areas if provided (max 5)
- ✅ Classroom context if provided (max 500 chars)

---

## Error Handling

**If source file upload fails:**
```
"Couldn't read your file. Try uploading as PDF, Word, or plain text.
Or enter a topic instead."
```

**If summarizer fails:**
```
"Something went wrong creating your assessment. Try with fewer focus areas
or simpler classroom context."
```

**If Gemini API fails:**
```
"We're having trouble generating your assessment right now. 
Please try again in a moment."
```

---

## Critical Rules: Non-Negotiable Pipeline Integrity

### Rule #1: SpaceCampPayload Structure
Any changes to payload must be backward compatible. If adding fields:
```typescript
// OLD (always kept)
spaceCampPayload: {
  documentMetadata: { gradeBand, subject, classLevel, timeTargetMinutes },
  estimatedBloomTargets: { Remember, Understand, Apply, Analyze, Evaluate, Create },
  problems: UniversalProblem[]
}

// NEW additions (optional, non-breaking)
spaceCampPayload: {
  // all above fields unchanged
  // NEW:
  bloomCognitiveWeights?: { /* ... */ },
  fatigueImpactMultiplier?: { /* ... */ },
  emphasizeConceptual?: boolean,
  scaffoldingNeeded?: string
}
```

### Rule #2: UniversalProblem Structure
Never remove or rename fields:
```typescript
UniversalProblem {
  ProblemId: string;           // REQUIRED
  BloomLevel: BloomLevel;      // REQUIRED - never null
  Type: ProblemType;           // REQUIRED
  Content: string;             // REQUIRED
  LinguisticComplexity: number; // REQUIRED - 0.0–1.0
  EstimatedTimeMinutes: number; // REQUIRED - positive
  Difficulty: 1–5;             // REQUIRED
  SequenceIndex: number;       // REQUIRED - 0, 1, 2, ...
  
  // Optional (may exist)
  CorrectAnswer?: string;
  Rubric?: string;
  MultiPart?: boolean;
  Tags?: string[];
}
```

**Violations:**
- ❌ Removing `BloomLevel` → breaks Philosopher
- ❌ Removing `LinguisticComplexity` → breaks fatigue calculation
- ❌ Removing `SequenceIndex` → breaks problem ordering
- ✅ Adding `bloomDifficultyWeight?: number` → safe

### Rule #3: studentSimulations Return Shape
Philosopher must return:
```typescript
studentSimulations: {
  studentId: string;
  personaName?: string;
  successRate: number;          // 0–1
  avgTime: number;              // seconds
  confusionIndex: number;       // 0–1
  fatigueIndex: number;         // 0–1
  engagementScore: number;      // 0–1
  struggledProblems?: string[]; // ProblemIds
  // NEW (safe addition):
  engagementArc?: number[];     // [e1, e2, e3, ...] per problem
  fatigueArc?: number[];        // [f1, f2, f3, ...] per problem
}[]
```

### Rule #4: useUserFlow Contract
No changes to this hook's public interface:
```typescript
// KEEP AS-IS
{
  state: PipelineState,
  setOriginalText(text: string): void,
  analyzeTextAndTags(): Promise<void>,
  setGeneratedAssignment(assignment: GeneratedAssignment): void,
  setStudentFeedback(feedback: StudentFeedback[]): void,
  setRewriteResults(text: string, summary: string): void,
  // ... other public methods
}
```

**Violations:**
- ❌ Changing parameter types
- ❌ Removing public methods
- ✅ Adding new private state keys
- ✅ Adding new optional fields to state

### Rule #5: AssignmentPreview Render Contract
Component must still accept:
```typescript
props: {
  assignment: GeneratedAssignment,
  // maybe: ?selectedStudentId: string
  // maybe: ?showEngagementArc: boolean
}
```

**Must output:**
- One `<div class="assignment-preview">`
- Sections with problems rendered
- No breaking CSS changes (colors may evolve, layout stays same)

---

## Pre-Merge Testing Checklist

**Critical simulations to complete before merge:**

### Simulation 1: Standard Level, 30 min
```
Input:
- StudentLevel: Standard
- AssessmentType: Quiz
- TimeTarget: 30 min
- Emphasis: Balanced

Expected Output:
- ~6 questions (30 min ÷ 5 min avg = 6)
- Bloom: R:10% U:20% Ap:35% An:25% E:5% C:5%
- Avg Difficulty: 2–3
- By problem 5: fatigueIndex ≈ 0.05–0.08
- By problem 6: fatigueIndex ≈ 0.08–0.12
- Fatigue should visibly reduce success rate on last problem

Validation:
✓ Total time ∈ [27, 33] min
✓ Each problem has BloomLevel, LinguisticComplexity, EstimatedTimeMinutes
✓ Bloom distribution matches ±5%
✓ SequenceIndex: 0, 1, 2, 3, 4, 5
✓ No console errors
```

### Simulation 2: AP Level, 50 min Test
```
Input:
- StudentLevel: AP / College
- AssessmentType: Test
- TimeTarget: 50 min
- Emphasis: Exam Style

Expected Output:
- ~10–12 questions
- Bloom: R:0–5% U:10% Ap:25% An:30% E:15% C:15%
- Min 20% Analyze + Evaluate (exam style rule)
- Min 5% Create
- Difficulty mixed (2–4)
- Fatigue arc: 0 → 0.15–0.25 by end
- Engagement trend shows dip at problems 7–9 (fatigue), slight recovery at end (novelty)

Validation:
✓ Total time ∈ [45, 55] min
✓ Analyze + Evaluate ≥ 20% of problems
✓ Create ≥ 5% of problems
✓ LinguisticComplexity avg ≥ 0.6 (AP-level difficulty)
✓ No Remember-only problems (Create-capable students should have higher levels)
```

### Simulation 3: Remedial Level, 20 min Practice
```
Input:
- StudentLevel: Remedial
- AssessmentType: Practice
- TimeTarget: 20 min
- Emphasis: Balanced

Expected Output:
- ~4 questions (20 min ÷ 5 min avg = 4)
- Bloom: R:25% U:30% Ap:30% An:10% E:5% C:0%
- Difficulty: mostly 1–2
- Fatigue should stay low (<0.05 throughout)
- Engagement higher (foundational problems, less confusion)

Validation:
✓ Total time ∈ [18, 22] min
✓ No Create problems
✓ Min 50% Remember or Understand
✓ LinguisticComplexity avg ≤ 0.5 (simple language)
✓ Fatigue index ≤ 0.08 on last problem
```

### Simulation 4: Standard with Conceptual Emphasis
```
Input:
- StudentLevel: Standard
- AssessmentType: Test
- TimeTarget: 45 min
- Emphasis: Conceptual Understanding

Expected Output:
- ~9–10 questions
- Bloom (modified): R:5% U:30% Ap:25% An:35% E:5% C:5%
- More analysis-heavy than default Standard
- Difficulty: 2–4 (mix of procedural + conceptual)
- Student confusion may rise (higher Bloom)

Validation:
✓ Understand + Analyze ≥ 65% of problems
✓ Remember ≤ 10% of problems
✓ LinguisticComplexity avg ≥ 0.5 (conceptual problems demand clarity)
```

---

## Example Teacher Workflows

### Workflow 1: Quick Quiz (30 seconds)
```
1. Upload Chapter 7 notes
2. Select "Standard"
3. Select "Quiz"
4. Change time to 15 min
5. Click Generate
```

### Workflow 2: Custom Test (1.5 minutes)
```
1. Upload Midterm Study Guide
2. Select "AP / College"
3. Select "Test"
4. Time: 50 min
5. Click Advanced
6. Add 3 focus areas
7. Select "Application & Reasoning"
8. Add context: "Students weak on CLT"
9. Click Generate
```

### Workflow 3: Practice From Scratch (2 minutes)
```
1. Click "Without Source"
2. Topic: "Quadratic Equations"
3. Select "Standard"
4. Select "Practice"
5. Time: 20 min
6. Click Generate
```

---

## Future Enhancements

- **Reusable templates** ("AP Pre-Calc", "Middle School Algebra")
- **Quick suggestions** ("Most teachers use 40 min for tests")
- **Saved preferences** (remember last student level, etc.)
- **Assessment library** (import from other teachers)

---

## Final Recommendation: Before Merge

### Pre-Merge Checklist

**Code Quality:**
- [ ] All TypeScript files compile without errors (`npm run build`)
- [ ] No console.errors in development mode
- [ ] All Copilot instructions followed (see .github/copilot-instructions.md)

**Component Integration:**
- [ ] MinimalAssessmentForm integrates into PipelineShell
- [ ] Form passes SummarizedAssessmentIntent to useUserFlow
- [ ] AssignmentPreview renders unchanged
- [ ] No new props required by downstream components

**Service Layer:**
- [ ] assessmentSummarizerService compiles
- [ ] estimateBloomDistribution() tested with all 4 levels
- [ ] mappings (StudentLevel → GradeBand) verified
- [ ] deriveSpaceCampMetadata() outputs valid SpaceCampPayload

**Database/Config:**
- [ ] astronautScoringRules.ts includes new fields
- [ ] Simulation engine reads new fields gracefully

**Testing Matrix Completion:**
- [ ] ✅ Standard 30 min quiz
- [ ] ✅ AP 50 min test  
- [ ] ✅ Remedial 20 min practice
- [ ] ✅ Standard test with Conceptual emphasis
- [ ] ✅ Honors test with Procedural emphasis
- [ ] ✅ AP test with Exam Style emphasis

**Validation Results:**
- [ ] Total time ±10% for all combinations
- [ ] Bloom distributions match targets ±5%
- [ ] Fatigue multipliers apply correctly
- [ ] Engagement scores show realistic variance
- [ ] No orphaned BloomLevel values
- [ ] SequenceIndex always contiguous

**Documentation:**
- [ ] This README updated with v2.0 specs
- [ ] Code comments explain Bloom weighting
- [ ] Space Camp payload examples updated
- [ ] Developer setup guide clear

---

## Recommended Merge Strategy

1. **Merge branches in order:**
   - Phase 1 (UI) → Phase 2 (Summarizer) → Phase 3 (Rubric) → Phase 4 (Validation) → Phase 5 (Engagement) → Phase 6 (Tests)

2. **Run full test suite after each phase:**
   ```bash
   npm run build
   npm run test
   npm run dev
   # Manual: complete 2 assessment workflows
   ```

3. **After Phase 6, run simulation matrix:**
   - Use the 4 critical simulations listed above
   - Export JSON payloads for inspection
   - Verify Space Camp receives all necessary fields

4. **Final sign-off:**
   - Teachers sign off on form UX
   - QA confirms no rendering issues
   - DevOps confirms build succeeds on CI/CD

---

## References

**Configuration:**
- [src/config/astronautScoringRules.ts](src/config/astronautScoringRules.ts) — AstronautRubric definitions
- [src/config/aiConfig.ts](src/config/aiConfig.ts) — Gemini API wrapper (model settings)

**Types:**
- [src/types/spaceCampSchema.ts](src/types/spaceCampSchema.ts) — SpaceCamp payload structure
- [src/types/pipeline.ts](src/types/pipeline.ts) — PipelineState, StudentFeedback
- [src/types/assignmentTypes.ts](src/types/assignmentTypes.ts) — UniversalProblem, GeneratedAssignment

**Services:**
- [src/services/assignmentFeedbackService.ts](src/services/assignmentFeedbackService.ts) — Feedback storage (Phase 3 extension)
- [src/agents/analysis/completionSimulation.ts](src/agents/analysis/completionSimulation.ts) — Time estimation
- [src/agents/analysis/analyzeAssignment.ts](src/agents/analysis/analyzeAssignment.ts) — Bloom classification

**Components:**
- [src/components/Pipeline/AssignmentPreview.tsx](src/components/Pipeline/AssignmentPreview.tsx) — Output rendering
- [src/hooks/usePipeline.ts](src/hooks/usePipeline.ts) — State orchestration

**Guides:**
- [SPACE_CAMP_CONFIG_GUIDE.md](SPACE_CAMP_CONFIG_GUIDE.md) — What Space Camp needs
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — Architecture overview

