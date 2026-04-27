# Simulation v4 Phase Specs (A, B1, B2, C)

Deterministic, implementation-ready phase specs aligned to the current v4 simulator architecture.

## Scope

This document defines:

1. Phase A: Baseline freeze plus schema expansion defaults
2. Phase B1: Canonical schema layer (types only)
3. Phase B2: Segmentation plus item tree (multi-part vs MC)
4. Phase C: Intake expansion (CLASS profile plus teacher metadata)

Non-goals for this document:

1. Difficulty formula implementation
2. Predicted correctness logic
3. Partial-credit model behavior
4. Narrative and rewrite behavior

---

## Phase A: Baseline Freeze + Schema Expansion (Safe Defaults Only)

Goal: Lock in current measurable engine and introduce new measurable fields without behavior changes.

### Purpose

Phase A is a non-functional freeze. It guarantees:

1. No regressions in existing measurable outputs
2. No segmentation behavior changes
3. No UI behavior changes
4. No difficulty or prediction behavior changes
5. No item-tree behavior changes

It adds the full Simulation v4 measurable surface with default values only.

### Deliverables

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

### Verification Checklist

1. Existing graphs render identically
2. Existing measurable values are unchanged
3. New fields appear in API response
4. UI remains stable
5. TypeScript compiles cleanly

---

## Phase B1: Canonical Schema Layer (Types Only)

Goal: Introduce canonical Simulation v4 types without changing runtime behavior.

### Purpose

Phase B1 establishes the schema contracts used by all downstream phases. This phase is types-only.

### Deliverables

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

### Verification Checklist

1. TypeScript compiles
2. No UI breakage
3. No runtime behavior changes
4. No measurable output changes
5. No segmentation behavior changes

---

## Phase B2: Segmentation + Item Tree (Multi-Part vs MC)

Goal: Fix intake classification and establish canonical item tree.

### Purpose

Phase B2 replaces compare-era segmentation assumptions with v4 segmentation behavior that distinguishes:

1. Multi-part open response (A/B/C prompts)
2. Multiple choice (A/B/C/D answer options)

This phase builds and returns canonical SimulationItemTree shapes and fixes A/B/C vs A/B/C/D classification errors.

### Deliverables

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

### Verification Checklist

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

## Phase C: Intake Expansion (CLASS Profile + Teacher Metadata)

Goal: Accept CLASS profile and teacher metadata and bind metadata onto items.

### Purpose

Phase C enables deterministic intake and attachment of teacher and class context, preparing for later scoring phases.

This phase does not implement difficulty or predicted correctness logic.

### Deliverables

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

### Verification Checklist

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

## Summary Matrix

| Phase | Purpose | Functional Change | UI Change | Graph Change |
|---|---|---|---|---|
| A | Freeze plus schema expansion defaults | No | No | No |
| B1 | Canonical schema types | No | No | No |
| B2 | Segmentation plus item tree | Yes | Minimal | No |
| C | CLASS plus teacher metadata intake | Partial | Optional | No |

---

## Suggested Gate Commands per Phase

```bash
npm test
npm run phase1:check
npm run phase3:check
```

Regression slice for ingestion and document pipeline changes:

```bash
npm test -- --run src/__tests__/pipelineRegression.test.ts
```

Use this document as the implementation contract for foundational v4 delivery before Phase D+ scoring and prediction logic.
