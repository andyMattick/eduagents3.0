# Simulation v4 - Assessment Simulator (CLASS-Aware, ML-Ready)

Teacher-intelligent, CLASS-aware assessment simulation engine.

Phase C implementation contract: see PHASE_C_SPEC.md for the finalized Class Builder, synthetic student generation, trait overlays, API, schema, and migration plan.
Phase C implementation guardrails: see PHASE_C_CODER_ADMONITIONS.md before editing Phase C modules.

This service analyzes an assessment PDF, computes measurables, merges teacher inputs, applies a CLASS profile, predicts correctness, evaluates partial credit, aligns PREP vs TEST docs, generates narratives (LLM), and optionally rewrites items (LLM). It is designed to be deterministic today, ML-upgradable tomorrow, and feedback-loop ready via Supabase.

---

## 1. High-Level Pipeline

Entry point: /api/v4/simulator -> index.ts

Pipeline phases:

1. Intake - assessment, prep docs, teacher inputs, CLASS profile  
2. Segmentation - items, sub-items, MC distractors  
3. Measurables - linguistic, cognitive, structural, conceptual  
4. Teacher Metadata - points, rubric, sample solutions, notes  
5. Difficulty Scoring - deterministic difficulty per item  
6. CLASS-Adjusted Predicted Correctness - 0-1 probability  
7. Partial Credit - rubric-based expectations  
8. Prep/Test Alignment - PREP vs TEST coverage  
9. Narratives (LLM) - assessment, item, alignment narratives  
10. Rewrites (LLM) - optional item/distractor/essay rewrites  
11. Feedback Loop (future) - Supabase-backed ML training

---

## 2. Folder Structure

```txt
/api/v4/simulator/
|
|-- index.ts
|
|-- intake/
|   |-- parseTeacherInputs.ts
|   |-- parseRubric.ts
|   |-- parseAnswerKey.ts
|   |-- parsePrepDocs.ts
|   `-- classProfile.ts
|
|-- segmentation/
|   |-- segmentAssessment.ts
|   |-- detectMultiPart.ts
|   |-- detectMultipleChoice.ts
|   |-- buildItemTree.ts
|   `-- writingModeDetector.ts
|
|-- measurables/
|   |-- computeLinguistic.ts
|   |-- computeCognitive.ts
|   |-- computeStructural.ts
|   |-- computeConceptual.ts
|   |-- computeAmbiguity.ts
|   |-- computePlanningLoad.ts
|   |-- computeBloomLevel.ts
|   |-- computeBranchingFactor.ts
|   |-- computeExpectedResponseLength.ts
|   `-- computeDistractorQuality.ts
|
|-- difficulty/
|   |-- computeDifficulty.ts
|   |-- computeParentDifficulty.ts
|   |-- computeMCDifficulty.ts
|   `-- bloomWeight.ts
|
|-- prediction/
|   |-- baseCorrectness.ts
|   |-- classAdjustments.ts
|   |-- bloomAdjustments.ts
|   |-- immeasurableAdjustments.ts
|   `-- predictedCorrectness.ts
|
|-- partialCredit/
|   |-- computePartialCredit.ts
|   |-- rubricHitHeuristic.ts
|   `-- mlPlaceholder.ts
|
|-- alignment/
|   |-- buildPrepProfile.ts
|   |-- buildTestProfile.ts
|   |-- computeAlignment.ts
|   `-- alignmentTypes.ts
|
|-- narrative/                       # LLM USED HERE
|   |-- generateAssessmentNarrative.ts
|   |-- generateItemNarrative.ts
|   |-- generateAlignmentNarrative.ts
|   `-- narrativePrompt.ts
|
|-- rewrite/                         # LLM USED HERE
|   |-- rewriteItem.ts
|   |-- rewriteDistractors.ts
|   |-- rewriteEssay.ts
|   `-- rewritePrompt.ts
|
|-- schema/
|   |-- SimulationItem.ts
|   |-- TeacherItemMetadata.ts
|   |-- ClassProfile.ts
|   |-- Measurables.ts
|   |-- Difficulty.ts
|   |-- Prediction.ts
|   |-- PartialCredit.ts
|   `-- AlignmentProfile.ts
|
`-- utils/
    |-- textNormalization.ts
    |-- sentenceSplitter.ts
    |-- conceptExtractor.ts
    |-- bloomVerbMap.ts
    |-- logistic.ts
    `-- safeLLM.ts
```

---

## 3. Core Types

### 3.1 ClassProfile

```ts
export interface ClassProfile {
  // Academic traits (0-1)
  readingLevel: number;
  vocabularyLevel: number;
  mathBackground: number;
  writingFluency: number;

  // Cognitive traits (0-1)
  processingSpeed: number;   // 0 = slow, 1 = fast
  anxietyLevel: number;      // 0 = low anxiety, 1 = high anxiety
  persistence: number;       // 0 = gives up easily, 1 = very persistent

  // Bloom proficiency (0-1)
  bloomsProficiency: {
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
    evaluate: number;
    create: number;
  };
}
```

UI can expose these as Low/Medium/High and map to numeric (e.g., 0.2 / 0.5 / 0.8).

---

### 3.2 TeacherItemMetadata

```ts
export interface RubricCriterion {
  description: string;
  points: number;
}

export interface TeacherItemMetadata {
  points?: number;
  sampleSolution?: string;
  rubric?: RubricCriterion[];
  teacherNotes?: string;
  expectedTimeMinutes?: number;
  intendedDifficulty?: "easy" | "medium" | "hard";
  openEndedByDesign?: boolean;

  allowPartialCredit?: boolean;
  gradingConsiderations?: string;
  answerKey?: string;
}
```

---

### 3.3 SimulationItem

```ts
export type WritingMode =
  | "Describe"
  | "Explain"
  | "Analyze"
  | "Evaluate"
  | "Compare"
  | "Argue"
  | "Narrate";

export interface SimulationItem {
  itemNumber: number;
  text: string;

  // Existing measurables
  linguisticLoad: number;
  avgVocabLevel: number;
  avgWordLength: number;
  vocabCounts: { level1: number; level2: number; level3: number };
  misconceptionRisk: number;
  distractorDensity: number;
  steps: number;
  wordCount: number;
  timeToProcessSeconds: number;
  confusionScore: number;
  bloomsLevel: number;
  bloomsLabel: string;
  sentenceCount: number;
  avgSentenceLength: number;
  symbolDensity: number;

  // New measurables
  branchingFactor: number;
  scaffoldLevel: number;
  ambiguityScore: number;
  planningLoad: number;
  writingMode: WritingMode;
  expectedResponseLength: number;
  conceptDensity: number;
  reasoningSteps: number;
  subQuestionCount: number;
  isMultiPartItem: boolean;
  isMultipleChoice: boolean;
  distractorCount: number;

  teacherMetadata?: TeacherItemMetadata;

  difficultyScore: number;       // 1-5
  predictedCorrectness: number;  // 0.0-1.0 (CLASS-adjusted)
}
```

---

### 3.4 SimulationItemTree and Response

```ts
export interface DistractorOption {
  label: string; // "A", "B", "C", ...
  text: string;
  isCorrect?: boolean;
}

export interface SimulationItemTree {
  item: SimulationItem;
  subItems?: SimulationItem[];
  distractors?: DistractorOption[];
}

export interface SimulationResponse {
  classProfile: ClassProfile;
  items: SimulationItemTree[];
  alignment?: AlignmentProfile;
  narratives: {
    assessment: string;   // LLM
    items: string[];      // LLM
    alignment?: string;   // LLM
  };
  rewrites?: {
    items: RewriteResult[]; // LLM
  };
}
```

---

## 4. Phase-by-Phase Logic

### 4.1 Intake (intake/)

- parseTeacherInputs.ts - parse teacher form (rubric, notes, partial credit, etc.)
- parseRubric.ts - convert rubric text -> RubricCriterion[]
- parseAnswerKey.ts - parse answer key into per-item answers
- parsePrepDocs.ts - ingest PREP docs for alignment
- classProfile.ts - map UI inputs -> ClassProfile

---

### 4.2 Segmentation (segmentation/)

- segmentAssessment.ts - split PDF text into items
- detectMultiPart.ts - detect A/B/C sub-items (multi-part)
- detectMultipleChoice.ts - detect MC options (A/B/C/D distractors)
- buildItemTree.ts - build SimulationItemTree[]
- writingModeDetector.ts - detect WritingMode from verbs and structure

---

Here is the exact rule your segmentation engine must use.

✅ Rule 1 — Multi‑part items (A/B/C)
These are sub‑items when:

Condition A — The parent item is open‑response
Parent stem contains verbs like:

describe

explain

analyze

evaluate

discuss

compare

write

justify

Condition B — The A/B/C lines are phrases, not answer choices
Examples:

Code
a) Traditions
b) Family celebrations
c) Foods
These are not distractors because:

They are not mutually exclusive

They are not answers to a question

They are prompts requiring elaboration

Condition C — No correct answer is indicated
No:

“Correct: B”

“Answer: C”

“Key: D”

Condition D — No MC formatting
No:

circles

checkboxes

radio‑style layout

“Choose the best answer”

❌ Rule 2 — Multiple‑choice items (A/B/C/D)
These are distractors when:

The stem is a question with a single correct answer

The A/B/C/D lines are short answer choices

The answer key references one of them

The teacher metadata marks it as MC

The formatting matches MC patterns

⭐ Coder‑ready implementation plan
File: segmentation/detectMultiPart.ts
ts
export function detectMultiPart(lines: string[]): boolean {
  // Condition A: parent is open-response
  const parent = lines[0].toLowerCase();
  const openVerbs = ["describe", "explain", "analyze", "evaluate", "discuss", "compare", "write", "justify"];
  const isOpenResponse = openVerbs.some(v => parent.includes(v));

  if (!isOpenResponse) return false;

  // Condition B: sub-items are prompts, not answers
  const subItemPattern = /^[a-d][\.\)]\s+/i;
  const allSubItems = lines.slice(1).every(line => subItemPattern.test(line));

  if (!allSubItems) return false;

  // Condition C: no correct answer indicated
  const hasAnswerKeyMarkers = lines.some(line =>
    /correct|answer|key|solution/i.test(line)
  );
  if (hasAnswerKeyMarkers) return false;

  // Condition D: no MC phrasing
  const mcPhrases = ["choose", "best answer", "select", "which of the following"];
  const isMC = mcPhrases.some(p => parent.includes(p));
  if (isMC) return false;

  return true;
}
File: segmentation/detectMultipleChoice.ts
ts
export function detectMultipleChoice(lines: string[]): boolean {
  const parent = lines[0].toLowerCase();

  // MC phrasing
  const mcPhrases = ["choose", "best answer", "select", "which of the following"];
  const isMCStem = mcPhrases.some(p => parent.includes(p));

  // A/B/C/D pattern
  const optionPattern = /^[a-d][\.\)]\s+/i;
  const allOptions = lines.slice(1).every(line => optionPattern.test(line));

  // If both conditions are true → MC
  return isMCStem && allOptions;
}
⭐ Where this fits in the Simulation v4 pipeline
Phase 2 — Segmentation
This is where the fix lives.

Code
segmentAssessment.ts
  → detectMultiPart.ts   <-- NEW LOGIC
  → detectMultipleChoice.ts
  → buildItemTree.ts
Once implemented:

Multi‑part items become sub‑items

MC items become distractors

Difficulty scoring works correctly

Predicted correctness works correctly

Partial credit works correctly

Narratives become accurate

This is a critical fix for essays and constructed‑response items.

⭐ Final answer
We have fully designed the fix in the Simulation v4 spec, but the codebase has NOT implemented it yet.

The segmentation logic must be updated using the rules and code above.

Once this is added, the Simulator will correctly distinguish:

Multi‑part items (A/B/C) → sub‑items

Multiple‑choice items (A/B/C/D) → distractors

And the entire downstream pipeline (difficulty, prediction, partial credit, narratives) will finally behave correctly.

### 4.3 Measurables (measurables/)

Each file computes a subset of measurables and merges into SimulationItem.

- computeLinguistic.ts - vocab, word length, sentence stats
- computeCognitive.ts - confusion, misconception risk
- computeStructural.ts - steps, subQuestionCount, multi-part flags
- computeConceptual.ts - concept density, branchingFactor
- computeAmbiguity.ts - ambiguityScore
- computePlanningLoad.ts - planningLoad
- computeBloomLevel.ts - bloomsLevel, bloomsLabel
- computeBranchingFactor.ts - branchingFactor
- computeExpectedResponseLength.ts - expectedResponseLength
- computeDistractorQuality.ts - distractorDensity, distractorCount

---

### 4.4 Difficulty (difficulty/)

Core formula (sub-item / single item):

```ts
// computeDifficulty.ts
export function computeDifficulty(item: SimulationItem): number {
  const intrinsicLoad = item.linguisticLoad;      // placeholder mapping
  const extraneousLoad = item.ambiguityScore;     // placeholder mapping
  const bloomWeight = getBloomWeight(item.bloomsLevel);

  const difficultyScore =
    0.25 * intrinsicLoad +
    0.15 * extraneousLoad +
    0.20 * item.ambiguityScore +
    0.15 * item.planningLoad +
    0.10 * (1 - item.scaffoldLevel) +
    0.10 * item.conceptDensity +
    0.05 * bloomWeight;

  return Math.min(Math.max(difficultyScore, 1), 5);
}
```

Parent difficulty and MC difficulty are computed in computeParentDifficulty.ts and computeMCDifficulty.ts.

---

### 4.5 Prediction (prediction/)

Base correctness from difficulty:

```ts
// baseCorrectness.ts
export function baseCorrectness(difficultyScore: number): number {
  // difficultyScore ~ 1-5
  return 1 / (1 + Math.exp(1.2 * (difficultyScore - 3)));
}
```

CLASS adjustments:

```ts
// classAdjustments.ts
export function classAdjustments(item: SimulationItem, classProfile: ClassProfile): number {
  const readingAdjustment = 0.8 + 0.4 * classProfile.readingLevel;       // 0.8-1.2
  const vocabAdjustment = 0.8 + 0.4 * classProfile.vocabularyLevel;
  const writingAdjustment = 0.8 + 0.4 * classProfile.writingFluency;
  const speedAdjustment = 0.85 + 0.3 * classProfile.processingSpeed;     // 0.85-1.15

  const anxietyPenalty = 0.2 * classProfile.anxietyLevel;                // 0-0.2
  const persistenceBoost = 1 + 0.2 * classProfile.persistence;           // 1-1.2

  return (
    readingAdjustment *
    vocabAdjustment *
    writingAdjustment *
    speedAdjustment *
    (1 - anxietyPenalty) *
    persistenceBoost
  );
}
```

Bloom adjustment:

```ts
// bloomAdjustments.ts
export function bloomAdjustment(item: SimulationItem, classProfile: ClassProfile): number {
  const label = item.bloomsLabel.toLowerCase() as keyof ClassProfile["bloomsProficiency"];
  const prof = classProfile.bloomsProficiency[label] ?? 0.5; // default mid
  // Map 0-1 proficiency to 0.8-1.2 multiplier
  return 0.8 + 0.4 * prof;
}
```

Final predicted correctness:

```ts
// predictedCorrectness.ts
export function predictedCorrectness(item: SimulationItem, classProfile: ClassProfile): number {
  const base = baseCorrectness(item.difficultyScore);
  const classAdj = classAdjustments(item, classProfile);
  const bloomAdj = bloomAdjustment(item, classProfile);
  const immeasurableAdj = immeasurableAdjustments(item, classProfile); // stubbed for now

  const raw = base * classAdj * bloomAdj * immeasurableAdj;
  return Math.min(Math.max(raw, 0), 1);
}
```

---

### 4.6 Partial Credit (partialCredit/)

- computePartialCredit.ts - uses rubric + heuristics
- rubricHitHeuristic.ts - simple probability per criterion
- mlPlaceholder.ts - stub for future ML model

---

### 4.7 Alignment (alignment/)

- buildPrepProfile.ts - aggregate PREP measurables
- buildTestProfile.ts - aggregate TEST measurables
- computeAlignment.ts - compare PREP vs TEST

---

### 4.8 Narratives (LLM) (narrative/)

LLM is used here.

- generateAssessmentNarrative.ts
- generateItemNarrative.ts
- generateAlignmentNarrative.ts
- narrativePrompt.ts

Example assessment narrative prompt:

```ts
// narrativePrompt.ts (excerpt)
export const assessmentNarrativePrompt = `
You are an experienced instructional coach.

You are given:
- A CLASS profile describing the class's strengths and weaknesses.
- A list of assessment items with:
  - difficultyScore (1-5)
  - predictedCorrectness (0-1)
  - Bloom levels
  - writing modes
  - key measurables (linguistic load, ambiguity, planning load, etc.).

Write a concise, teacher-friendly narrative that explains:
- Overall difficulty of the assessment for THIS class.
- Which items or sections are likely to be most challenging and why.
- How the class's reading, vocabulary, writing, and Bloom proficiency interact with the items.
- One or two practical suggestions for how the teacher might support students.
Use clear, non-technical language. Do not mention internal scores or formulas directly.
`;
```

---

### 4.9 Rewrites (LLM) (rewrite/)

LLM is used here.

- rewriteItem.ts
- rewriteDistractors.ts
- rewriteEssay.ts
- rewritePrompt.ts

Example rewrite prompt:

```ts
// rewritePrompt.ts (excerpt)
export const rewriteItemPrompt = `
You are an assessment designer.

Rewrite the following assessment item to reduce ambiguity and lower unnecessary linguistic load,
while preserving:
- the core concept being assessed,
- the Bloom level (cognitive demand),
- the scoring and correct answer,
- the teacher's original intent.

Original item:
{{ITEM_TEXT}}

Constraints:
- Keep the item appropriate for the same grade level.
- Do not change the correct answer.
- Do not introduce new concepts.
Return only the rewritten item text.
`;
```

All LLM calls should go through utils/safeLLM.ts for rate limiting, logging, and safety.

---

## 5. ML Feature Vector Spec (v5 Upgrade)

When we move from deterministic prediction -> ML model, we'll feed a feature vector per item.

### 5.1 Feature Vector Shape

```ts
export interface SimulationFeatureVector {
  // Item identity
  itemId: string;           // internal ID
  assessmentId: string;
  classId?: string;

  // Measurables
  linguisticLoad: number;
  avgVocabLevel: number;
  avgWordLength: number;
  misconceptionRisk: number;
  distractorDensity: number;
  steps: number;
  wordCount: number;
  timeToProcessSeconds: number;
  confusionScore: number;
  bloomsLevel: number;
  sentenceCount: number;
  avgSentenceLength: number;
  symbolDensity: number;

  branchingFactor: number;
  scaffoldLevel: number;
  ambiguityScore: number;
  planningLoad: number;
  expectedResponseLength: number;
  conceptDensity: number;
  reasoningSteps: number;
  subQuestionCount: number;
  isMultiPartItem: number;   // 0/1
  isMultipleChoice: number;  // 0/1
  distractorCount: number;

  // Teacher metadata (encoded)
  points?: number;
  intendedDifficulty?: number; // map easy/medium/hard -> 1/2/3
  allowPartialCredit?: number; // 0/1

  // CLASS profile (flattened)
  class_readingLevel: number;
  class_vocabularyLevel: number;
  class_mathBackground: number;
  class_writingFluency: number;
  class_processingSpeed: number;
  class_anxietyLevel: number;
  class_persistence: number;

  class_bloom_remember: number;
  class_bloom_understand: number;
  class_bloom_apply: number;
  class_bloom_analyze: number;
  class_bloom_evaluate: number;
  class_bloom_create: number;

  // Targets (for training)
  actualCorrectness?: number;      // 0-1 (from student data)
  actualPartialCredit?: number;    // 0-1
  predictedCorrectness_v4?: number; // deterministic baseline
}
```

This vector is what we'll store in Supabase and later use to train models (e.g., logistic regression, GBDT, small NN).

---

## 6. Supabase - Feedback Loop and Migration Plan

We don't need the full feedback loop on day one, but we must design for it.

### 6.1 Core Tables (proposed)

#### assessments

```sql
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  class_id uuid not null,
  title text,
  created_at timestamptz default now()
);
```

#### simulation_runs

```sql
create table if not exists simulation_runs (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id),
  class_id uuid,
  run_at timestamptz default now(),
  class_profile jsonb not null,
  engine_version text not null, -- e.g., "v4.0.0"
  raw_response jsonb not null   -- full SimulationResponse snapshot
);
```

#### simulation_items

```sql
create table if not exists simulation_items (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid references simulation_runs(id),
  item_number int not null,
  feature_vector jsonb not null,   -- SimulationFeatureVector (without targets)
  predicted_correctness float8,    -- v4 prediction
  difficulty_score float8
);
```

#### student_responses (future)

```sql
create table if not exists student_responses (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id),
  class_id uuid,
  student_id uuid,
  item_number int,
  is_correct boolean,
  partial_credit float8,          -- 0-1
  time_seconds int,
  submitted_at timestamptz default now()
);
```

#### item_prediction_residuals (future)

```sql
create table if not exists item_prediction_residuals (
  id uuid primary key default gen_random_uuid(),
  simulation_item_id uuid references simulation_items(id),
  actual_correctness float8,
  actual_partial_credit float8,
  predicted_correctness float8,
  residual float8,                -- actual_correctness - predicted_correctness
  created_at timestamptz default now()
);
```

These tables give us:

- A record of each simulation run  
- Feature vectors per item  
- Actual student performance per item  
- Residuals for ML training

---

### 6.2 Migration Notes

- Start by creating assessments, simulation_runs, and simulation_items.  
- student_responses and item_prediction_residuals can be added once we start capturing real student data.  
- feature_vector and raw_response are stored as jsonb to allow schema evolution without constant migrations.  
- When ML is introduced, we'll add:
  - ml_model_versions table
  - training_jobs table
  - feature_store views or materialized views

---

## 7. Integration Notes

- LLM usage is strictly limited to:
  - narrative/ (explanations)
  - rewrite/ (item rewrites)
- All core logic (segmentation, measurables, difficulty, prediction, alignment) is deterministic and testable.
- safeLLM.ts should:
  - handle retries
  - enforce token limits
  - log prompts/outputs (with PII-safe practices)
- The deterministic prediction (predictedCorrectness_v4) is stored and later compared to actual outcomes to train ML models.

---

## 8. What to Implement First

1. Segmentation + Measurables + Difficulty + PredictedCorrectness  
2. CLASS Profile intake (simple UI -> numeric mapping)  
3. SimulationResponse without LLM (no narratives/rewrites yet)  
4. Supabase: assessments, simulation_runs, simulation_items  
5. Then add LLM narratives  
6. Then add rewrites  
7. Later: student_responses + residuals + ML training

---

This README is the canonical reference for Simulation v4.  
If you keep this as the single source of truth, your team will always know:

- where to plug in code,  
- where LLMs are allowed,  
- how to log for ML,  
- and how to evolve toward a full feedback-driven engine.

---

## 9. Foundational Phase Specs (A, B1, B2, C)

Deterministic, implementation-ready phase specs aligned to the current v4 simulator architecture.

### 9.1 Scope

This section defines:

1. Phase A: Baseline freeze plus schema expansion defaults
2. Phase B1: Canonical schema layer (types only)
3. Phase B2: Segmentation plus item tree (multi-part vs MC)
4. Phase C: Intake expansion (CLASS profile plus teacher metadata)

Non-goals for these phases:

1. Difficulty formula implementation
2. Predicted correctness logic
3. Partial-credit model behavior
4. Narrative and rewrite behavior

---

### 9.2 Phase A: Baseline Freeze + Schema Expansion (Safe Defaults Only)

Goal: Lock in current measurable engine and introduce new measurable fields without behavior changes.

#### Purpose

Phase A is a non-functional freeze. It guarantees:

1. No regressions in existing measurable outputs
2. No segmentation behavior changes
3. No UI behavior changes
4. No difficulty or prediction behavior changes
5. No item-tree behavior changes

It adds the full Simulation v4 measurable surface with default values only.

#### Deliverables

1. Add new measurable fields to SimulationItem with default values:

```ts
branchingFactor: 0,
scaffoldLevel: 0,
ambiguityScore: 0,
planningLoad: 0,
writingMode: "Describe",
expectedResponseLength: 0,
conceptDensity: 0,
reasoningSteps: 0,
subQuestionCount: 0,
isMultiPartItem: false,
isMultipleChoice: false,
distractorCount: 0,
```

2. Add a default filler utility:

```ts
applyPhaseADefaults(item)
```

3. Wrap measurable output in shortcircuit path:

```ts
const enrichedItems = rawItems.map(applyPhaseADefaults);
```

4. Update snapshots:

```bash
npm test -u
```

5. Keep behavior frozen:

1. No new segmentation logic
2. No difficulty logic
3. No prediction logic
4. No item tree logic
5. No CLASS-profile-dependent logic

#### Verification Checklist

1. Existing graphs render identically
2. Existing measurable values are unchanged
3. New fields appear in API response
4. UI remains stable
5. TypeScript compiles cleanly

---

### 9.3 Phase B1: Canonical Schema Layer (Types Only)

Goal: Introduce canonical Simulation v4 types without changing runtime behavior.

#### Purpose

Phase B1 establishes the schema contracts used by all downstream phases. This phase is types-only.

#### Deliverables

1. Add schema files under src/prism-v4/schema/:

1. SimulationItem.ts
2. SimulationItemTree.ts
3. ClassProfile.ts
4. TeacherItemMetadata.ts
5. Measurables.ts
6. Difficulty.ts
7. Prediction.ts
8. PartialCredit.ts
9. AlignmentProfile.ts

2. Add central export surface:

1. src/prism-v4/schema/index.ts

3. Update simulator route typing to use canonical types, with no runtime changes.

4. Add type guards where useful (optional but recommended).

#### Verification Checklist

1. TypeScript compiles
2. No UI breakage
3. No runtime behavior changes
4. No measurable output changes
5. No segmentation behavior changes

---

### 9.4 Phase B2: Segmentation + Item Tree (Multi-Part vs MC)

Goal: Fix intake classification and establish canonical item tree.

#### Purpose

Phase B2 replaces compare-era segmentation assumptions with v4 segmentation behavior that distinguishes:

1. Multi-part open response (A/B/C prompts)
2. Multiple choice (A/B/C/D answer options)

This phase builds and returns canonical SimulationItemTree shapes and fixes A/B/C vs A/B/C/D classification errors.

#### Deliverables

1. Add segmentation modules:

1. segmentation/detectMultiPart.ts
2. segmentation/detectMultipleChoice.ts
3. segmentation/buildItemTree.ts
4. segmentation/writingModeDetector.ts

2. Implement multi-part detection rules:

1. Parent stem contains open-response verbs
2. A/B/C lines are prompts, not answer choices
3. No answer-key markers
4. No multiple-choice phrasing in stem

3. Implement MC detection rules:

1. Stem includes multiple-choice phrasing
2. A/B/C/D lines are short answer options

4. Build tree shape:

```ts
{
  item: SimulationItem,
  subItems?: SimulationItem[],
  distractors?: DistractorOption[]
}
```

5. Update segmentation flow:

```ts
if (detectMultiPart(lines)) return buildMultiPartItem(lines);
if (detectMultipleChoice(lines)) return buildMultipleChoiceItem(lines);
return buildOpenResponseItem(lines);
```

6. Reuse Phase A defaults for newly introduced measurable fields.

#### Verification Checklist

Multi-part test input:

```txt
1. Describe Christmas.
  a) Traditions
  b) Family celebrations
  c) Foods
```

Expected:

1. isMultiPartItem = true
2. subItems.length = 3
3. isMultipleChoice = false

MC test input:

```txt
1. What is 2+2?
  A. 3
  B. 4
  C. 5
  D. 22
```

Expected:

1. isMultipleChoice = true
2. distractors.length = 4
3. isMultiPartItem = false

UI checks:

1. Graphs unchanged
2. Item detail may optionally expose new fields

---

### 9.5 Phase C: Intake Expansion (CLASS Profile + Teacher Metadata)

Goal: Accept CLASS profile and teacher metadata and bind metadata onto items.

#### Purpose

Phase C enables deterministic intake and attachment of teacher and class context, preparing for later scoring phases.

This phase does not implement difficulty or predicted correctness logic.

#### Deliverables

1. Expand API request contract:

```ts
classProfile?: ClassProfile;
teacherMetadata?: Record<string, TeacherItemMetadata>;
```

2. Validate CLASS profile:

1. Numeric fields are 0-1
2. Bloom proficiency fields are 0-1
3. Reject malformed payloads with 400 responses

3. Validate teacher metadata:

1. points
2. rubric
3. sampleSolution
4. partial-credit flags
5. intendedDifficulty

4. Bind metadata to items in shortcircuit path:

```ts
item.teacherMetadata = teacherMetadata[item.itemNumber] ?? {};
```

5. Optional UI visibility:

1. Show class profile and teacher metadata in item details

#### Verification Checklist

API checks:

1. Valid classProfile is accepted
2. Invalid classProfile is rejected
3. Valid teacherMetadata is accepted
4. Invalid teacherMetadata is rejected
5. Legacy payload shape still works

UI checks:

1. No breakage
2. Metadata appears when provided

---

### 9.6 Summary Matrix

| Phase | Purpose | Functional Change | UI Change | Graph Change |
|---|---|---|---|---|
| A | Freeze plus schema expansion defaults | No | No | No |
| B1 | Canonical schema types | No | No | No |
| B2 | Segmentation plus item tree | Yes | Minimal | No |
| C | CLASS plus teacher metadata intake | Partial | Optional | No |

---

### 9.7 Suggested Gate Commands per Phase

```bash
npm test
npm run phase1:check
npm run phase3:check
```

Regression slice for ingestion and document pipeline changes:

```bash
npm test -- --run src/__tests__/pipelineRegression.test.ts
```
