# Phase C Spec: Class Builder + Synthetic Students + Simulation

Status: Approved implementation spec
Scope: PRISM v4 additive feature set
Version: 1.0 (drift-free baseline)

Operational guardrails for implementers: see PHASE_C_CODER_ADMONITIONS.md.

## 1. Purpose

Phase C introduces class-aware simulation using synthetic students while preserving existing Phase B behavior.

Phase C responsibilities:
- Define static cognitive traits (priors)
- Define learning profiles (ELL, SPED, Gifted, etc.)
- Define positive traits (fast_worker, detail_oriented, etc.)
- Generate about 20 synthetic students per class
- Apply profile-adjusted measurables to each item
- Apply confusionBias and timeBias
- Expose class, profile, and student simulation views

Out of scope for Phase C:
- Any trait updates from observed performance
- Adaptive feedback loops that change student state over time

Those behaviors belong to Phase D.

## 2. Product UX: Class Builder

### 2.1 Entry point

Location:
- Classes tab in left navigation
- Primary action button: Create Class

### 2.2 Step 1: Basic class info

Fields:
- Class name
  - Placeholder: e.g., Period 3 - AP Statistics
  - Required: yes
- Class level
  - Type: dropdown
  - Values: AP, Honors, Standard, Remedial
  - Required: yes
- Grade band
  - Type: dropdown
  - Values: 9-10, 11-12, Mixed
  - Required: no
- School year
  - Type: dropdown or free text
  - Default: current school year (example: 2026-2027)

Actions:
- Next (primary)
- Cancel (secondary)

### 2.3 Step 2: Class composition and learning profiles

Section title: Class composition

Description:
Tell us a bit about the mix of learners in this class. We use this to generate a realistic set of 20 representative students.

Controls (each can be slider or dropdown):
- English learners (ELL): None, A few, Some, Many
- Students with IEP/504 (SPED): None, A few, Some, Many
- Gifted / advanced learners: None, A few, Some, Many
- Attention / focus challenges: None, A few, Some, Many
- Reading challenges: None, A few, Some, Many

Internal mapping target percentages:
- None => 0%
- A few => 10%
- Some => 20%
- Many => 30%

Actions:
- Next
- Back

### 2.4 Step 3: Class tendencies and positive traits

Section title: Class tendencies

Description:
These tendencies influence how strengths and risk patterns are distributed across synthetic students.

Toggles:
- Many students work quickly => fast_worker
- Many students are careful but slow => slow_and_careful
- Many students are detail-oriented => detail_oriented
- Many students get anxious on tests => test_anxious
- Many students are confident in math => math_confident
- Many students struggle with reading => struggles_with_reading
- Many students are easily distracted => easily_distracted

Behavior:
- Each toggle raises assignment probability for related positive traits during generation

Actions:
- Generate class (primary)
- Back

### 2.5 Step 4: Generated class summary

Title example: Your class: Period 3 - AP Statistics

Sections:
- Overview
  - 20 representative students generated
  - Level and grade band summary
- Trait distributions
  - readingLevel, mathLevel, writingLevel mini histograms
- Profile breakdown counts
  - ELL, SPED, Gifted, Attention challenges, Reading challenges
- Positive trait breakdown counts
  - fast_worker, detail_oriented, test_anxious, etc.

Actions:
- Save class (primary)
- Regenerate students (secondary)
- Edit settings (returns to Steps 2-3)

### 2.6 Class detail page

Header:
- Class name, level, school year
- Button: Run simulation on a document

Tabs:
- Overview
  - Trait and profile distributions
- Students
  - 20 synthetic students table:
    - display name
    - profiles
    - positive traits
    - trait summary (reading/math/writing)
- Simulations
  - List of prior simulation runs for this class

## 3. Data Model

## 3.1 Core trait dimensions (1-5 scale)

Per synthetic student:
- readingLevel
- vocabularyLevel
- backgroundKnowledge
- processingSpeed
- bloomMastery
- mathLevel
- writingLevel

Trait values derive from:
- class level priors
- learning profile deltas
- positive trait deltas
- random jitter

## 3.2 Class-level priors

Base priors:

```ts
const base = {
  readingLevel: 3,
  vocabularyLevel: 3,
  backgroundKnowledge: 3,
  processingSpeed: 3,
  bloomMastery: 3,
  mathLevel: 3,
  writingLevel: 3,
};
```

Class-level overlays:
- AP:
  - readingLevel +1
  - vocabularyLevel +1
  - backgroundKnowledge +1
  - bloomMastery +1
  - mathLevel +1
- Honors:
  - readingLevel +0.5
  - vocabularyLevel +0.5
  - backgroundKnowledge +0.5
  - mathLevel +0.5
- Standard:
  - no change
- Remedial:
  - readingLevel -1
  - vocabularyLevel -1
  - backgroundKnowledge -1
  - processingSpeed -1
  - mathLevel -1

All trait values must be clamped to [1, 5].

## 3.3 Learning profile overlays

Required profile catalog:
- ELL
- SPED
- Gifted
- ADHD
- Dyslexic
- MathAnxious
- TestCalm

Reference effects:
- ELL:
  - readingLevel -1
  - vocabularyLevel -1
  - confusionBias +0.05
- SPED:
  - processingSpeed -1
  - bloomMastery -0.5
  - timeBias +0.10
- Gifted:
  - bloomMastery +1
  - processingSpeed +0.5
- ADHD:
  - processingSpeed -0.5
  - confusionBias +0.10
  - timeBias -0.05
- Dyslexic:
  - readingLevel -1
  - processingSpeed -0.5
- MathAnxious:
  - bloomMastery -0.5
  - confusionBias +0.10
  - timeBias +0.05
- TestCalm:
  - confusionBias -0.05

UI labels remain teacher-friendly while internal IDs can stay canonical.

## 3.4 Positive trait catalog

Minimum catalog: 20 or more trait definitions.
Each definition includes:
- id
- label
- description
- effects (trait deltas and/or bias deltas)

Required subset:
- fast_worker: timeBias -0.10
- slow_and_careful: timeBias +0.10, confusionBias -0.05
- detail_oriented: confusionBias -0.10
- impulsive: timeBias -0.10, confusionBias +0.10
- test_anxious: confusionBias +0.10, timeBias +0.05
- test_calm: confusionBias -0.05
- strong_reader: readingLevel +0.5
- struggles_with_reading: readingLevel -0.5
- math_confident: bloomMastery +0.5
- math_avoidant: bloomMastery -0.5
- high_background_knowledge: backgroundKnowledge +0.5
- low_background_knowledge: backgroundKnowledge -0.5
- organized: confusionBias -0.05
- easily_distracted: confusionBias +0.05
- persistent: timeBias +0.05
- gives_up_quickly: timeBias -0.05
- creative_thinker: no direct Phase C effect (reserved for Phase D)

## 4. Synthetic Student Generation

Per class, generate exactly 20 students by default.

Algorithm:
1. Build class priors from base + class-level overlay.
2. Convert composition controls (None/A few/Some/Many) to target counts.
3. For each synthetic student:
   - copy base traits
   - assign 0-2 learning profiles while respecting target counts
   - apply profile trait deltas
   - apply random jitter per trait: randomNormal(0, 0.3)
   - clamp traits to [1, 5]
   - assign 0-2 positive traits based on toggle-weighted probabilities
   - apply positive trait deltas
   - compute and clamp biases
   - build profileSummaryLabel

Determinism requirement:
- Use seeded randomness per generation request so regenerate is reproducible when needed.

## 5. Bias Aggregation

Bias type:

```ts
type Bias = { confusionBias?: number; timeBias?: number };
```

Aggregation:

```ts
function computeStudentBiases(student: SyntheticStudent): { confusionBias: number; timeBias: number } {
  let confusionBias = 0;
  let timeBias = 0;

  for (const profile of student.profiles) {
    const b = PROFILE_BIASES[profile];
    if (!b) continue;
    if (b.confusionBias) confusionBias += b.confusionBias;
    if (b.timeBias) timeBias += b.timeBias;
  }

  for (const trait of student.positiveTraits) {
    const b = POSITIVE_TRAIT_BIASES[trait];
    if (!b) continue;
    if (b.confusionBias) confusionBias += b.confusionBias;
    if (b.timeBias) timeBias += b.timeBias;
  }

  confusionBias = clamp(confusionBias, -0.25, +0.25);
  timeBias = clamp(timeBias, -0.25, +0.25);

  return { confusionBias, timeBias };
}
```

## 6. Phase C Item Simulation Formulas

For student s and item i:

1. Start from Phase B item measurables:
- linguisticLoad_i
- confusionScore_i
- time_i
- bloomsLevel_i

2. Apply Phase C core trait formulas to compute profile-adjusted values:
- confusionScore_profile(s, i)
- time_profile(s, i)

3. Compute student bias terms:

```ts
const { confusionBias, timeBias } = computeStudentBiases(student);
```

4. Apply multiplicative biases:

```ts
const confusionScore_biased = confusionScore_profile * (1 + confusionBias);
const time_biased = time_profile * (1 + timeBias);
```

5. Clamp outputs:

```ts
const confusionScore_final = clamp(confusionScore_biased, 0, 1);
const time_final = Math.max(time_biased, 0);
```

These are the canonical Phase C student-item outputs.

## 7. API Contract

Required endpoints:
- POST /api/v4/classes
  - Creates class and synthetic students
- GET /api/v4/classes
- GET /api/v4/classes/{classId}
- POST /api/v4/classes/{classId}/regenerate
  - Regenerates students for existing class settings
- POST /api/v4/simulations
  - Body: { classId, documentId }
  - Runs Phase C simulation for class x document
- GET /api/v4/simulations/{simulationId}
  - Query: view=class|profile|student
  - Optional query: profile=ELL, studentId=syn_1

Non-breaking rule:
- Existing Phase B endpoints remain unchanged.

## 8. Database Schema (Summary)

classes:
- id
- teacher_id
- name
- level
- grade_band
- overlays
- school_year
- created_at

synthetic_students:
- id
- class_id
- display_name
- reading_level
- vocabulary_level
- background_knowledge
- processing_speed
- bloom_mastery
- math_level
- writing_level
- profiles (JSONB)
- positive_traits (JSONB)
- profile_summary_label

simulation_runs:
- id
- class_id
- document_id
- created_at

simulation_results:
- id
- simulation_id
- synthetic_student_id
- item_id
- item_label
- linguistic_load
- confusion_score
- time_seconds
- bloom_gap
- traits_snapshot (optional JSONB)

## 9. Views and Analytics

Class view:
- Aggregate metrics over all 20 students.

Profile view:
- Aggregate metrics over filtered subset by profile or trait.

Student view:
- Per-item metrics and cumulative curves for one synthetic student.

## 10. Migration Plan (Current System to Final Phase C)

Goal: Add Phase C incrementally with zero regressions to existing Phase B behavior.

### Phase 1: Data model migration
- Add new tables:
  - classes
  - synthetic_students
  - simulation_runs
  - simulation_results
- Add new TypeScript interfaces for these entities.
- Add trait catalogs and bias maps in a dedicated simulation module.

### Phase 2: Synthetic student generator
- Add pure module for generation.
- Inputs: class level, composition overlays, tendency toggles, seed.
- Outputs: 20 synthetic students with traits, profiles, positive traits, biases.

### Phase 3: Class Builder UI
- Add create flow with 4 steps.
- Add class detail page with Overview, Students, Simulations tabs.

### Phase 4: Phase C engine
- Add simulation engine module.
- Inputs: classId, documentId.
- Loads students and Phase B item measurables.
- Computes student x item outputs and persists results.

### Phase 5: Simulation API
- Add class and simulation endpoints.
- Keep all existing v4 routes intact.

### Phase 6: Simulation UI
- Add simulation results route with Class/Profile/Student views.

### Phase 7: Existing pipeline integration
- Keep Phase B immutable.
- Add Run Simulation -> Choose Class entry in document workflow.
- Add Run simulation on a document action in class detail header.

### Phase 8: Testing plan
- Unit tests:
  - generator
  - trait and bias mappings
  - bias aggregation
  - Phase C formulas
  - simulation engine
- Integration tests:
  - create class -> generate students
  - run simulation -> persisted results
  - class/profile/student retrieval and rendering
- Regression tests:
  - verify Phase B outputs unchanged
  - verify existing document analysis UI unchanged

### Phase 9: Cutover sequence
1. Deploy DB migrations.
2. Deploy generator (unused by UI).
3. Deploy Class Builder UI.
4. Deploy engine and API.
5. Add Run Simulation integration action in document UI.
6. Enable simulation result views.
7. Announce availability.

## 11. Non-Functional Requirements

- Additive only: no breaking behavior in existing Phase B flow.
- Reversible rollout by feature flag around new UI and endpoints.
- Deterministic generation support via seed.
- Strict clamping guarantees:
  - traits in [1, 5]
  - confusionScore in [0, 1]
  - time >= 0

## 12. Acceptance Criteria

Phase C is complete when:
- Teachers can create and save classes with the 4-step builder.
- Exactly 20 synthetic students are generated per class by default.
- Students include trait vectors, profile arrays, and positive trait arrays.
- A simulation can run for class x document and persist run + result rows.
- Results are queryable in class, profile, and student views.
- Existing Phase B routes and outputs remain unchanged.
- Unit, integration, and regression test suites pass.

## 13. Future Compatibility

Phase C is intentionally static and feed-forward.
Phase D can extend this model by adding mastery, exposure, misconceptions, and feedback-loop state updates without replacing Phase C artifacts.
