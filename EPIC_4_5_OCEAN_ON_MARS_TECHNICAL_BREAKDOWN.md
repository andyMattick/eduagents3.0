# EPIC 4.5: Ocean on Mars Pavilion

Full technical breakdown for exposing PRISM V4 as a coherent, multi-surface pavilion experience.

Related documents:

- [OCEAN_ON_MARS_BUILD_PLAN.md](OCEAN_ON_MARS_BUILD_PLAN.md)
- [OCEAN_ON_MARS_INTEGRATION_ARCHITECTURE.md](OCEAN_ON_MARS_INTEGRATION_ARCHITECTURE.md)

## 1. Objectives and Scope

Goal: turn the existing PRISM V4 intelligence into a coherent experience that:

1. Exposes document analysis in Act 1: see.
2. Externalizes planning in Act 2: think.
3. Personalizes for learners in Act 3: adapt.

Non-goals:

- no new inference engines
- no new domains
- no second builder pipeline

EPIC 4.5 is pure exposure and orchestration over the existing 4.1 to 4.4 substrate.

## 2. Core Architecture Spine: Instructional Intelligence Session

Introduce one typed object that all pavilion surfaces read and write.

Recommended backend type location:

- new [src/prism-v4/session/InstructionalIntelligenceSession.ts](src/prism-v4/session/InstructionalIntelligenceSession.ts)

Recommended frontend mirror:

- new [src/types/v4/InstructionalSession.ts](src/types/v4/InstructionalSession.ts)

This session object should extend, not replace, the existing `PrismSessionContext` in [src/prism-v4/documents/registryStore.ts](src/prism-v4/documents/registryStore.ts).

```ts
export interface InstructionalIntelligenceSession {
  sessionId: string;
  documentIds: string[];

  analysis: {
    concepts: ConceptSummary[];
    problems: ProblemSummary[];
    misconceptions: MisconceptionSummary[];
    bloomSummary: BloomSummary;
    modeSummary: ModeSummary;
    scenarioSummary: ScenarioSummary;
    difficultySummary: DifficultySummary;
    domain: string;
  };

  blueprint?: BlueprintModel;
  conceptMap?: ConceptMapModel;
  teacherFingerprint?: TeacherFingerprintModel;
  studentProfile?: StudentPerformanceProfile;
  builderPlan?: BuilderPlanModel;
  assessmentPreview?: AssessmentPreviewModel;
  classProfile?: ClassProfileModel;
}
```

Frontend mirror:

```ts
export type InstructionalSession = InstructionalIntelligenceSession;
```

Implementation rule:

- compose this object from existing route outputs first
- persist only the underlying primitives that already have stores
- avoid inventing a second session persistence layer unless orchestration pressure proves it necessary

## 3. Backend Changes

### 3.1 Session Analysis Enrichment: Act 1

Files:

- [api/v4/documents/session-analysis.ts](api/v4/documents/session-analysis.ts)
- [src/prism-v4/documents/analysis/classifyFragments.ts](src/prism-v4/documents/analysis/classifyFragments.ts)
- existing collection-analysis types under [src/prism-v4/schema/semantic](src/prism-v4/schema/semantic)

Required shape:

```ts
{
  sessionId: string;
  documentIds: string[];
  analysis: InstructionalIntelligenceSession["analysis"];
}
```

Normalize at the route boundary:

- `concepts[]`
- `problems[]`
- `misconceptions[]`
- `bloomSummary`
- `modeSummary`
- `scenarioSummary`
- `difficultySummary`
- `domain`

Rules:

- keep the raw `DocumentCollectionAnalysis` available for downstream surfaces
- do not recompute these summaries in the browser
- treat this as a view-model layer over the current analysis substrate

### 3.2 Blueprint and Concept Map Exposure: Act 2

Files:

- [api/v4/teacher-feedback/assessment-blueprint.ts](api/v4/teacher-feedback/assessment-blueprint.ts)
- [api/v4/teacher-feedback/concept-verification-preview.ts](api/v4/teacher-feedback/concept-verification-preview.ts)
- [api/v4/teacher-feedback/sharedPreview.ts](api/v4/teacher-feedback/sharedPreview.ts)
- [api/v4/teacher-feedback/regenerate-item.ts](api/v4/teacher-feedback/regenerate-item.ts)
- [api/v4/teacher-feedback/regenerate-section.ts](api/v4/teacher-feedback/regenerate-section.ts)
- existing concept-blueprint contract in [src/prism-v4/schema/integration/ConceptBlueprint.ts](src/prism-v4/schema/integration/ConceptBlueprint.ts)

Standardize a `BlueprintModel` response:

```ts
export interface BlueprintModel {
  concepts: {
    id: string;
    name: string;
    order: number;
    included: boolean;
    quota: number;
  }[];
  bloomLadder: BloomStep[];
  difficultyRamp: DifficultyStep[];
  modeMix: ModeMixEntry[];
  scenarioMix: ScenarioMixEntry[];
}
```

Recommended new route surface:

- `GET /api/v4/sessions/:sessionId/blueprint`
- `PATCH /api/v4/sessions/:sessionId/blueprint`

Those routes should:

- read and write the same assessment-blueprint and preview substrate already used by `ProductViewer`
- accept edits for concept order, inclusion, quota, Bloom ladder, difficulty ramp, and mode or scenario mix
- remain an orchestration facade over the existing teacher-feedback routes rather than a new planning engine

Implementation note:

The current `AssessmentConceptVerificationPanel` in [src/components_new/v4/ProductViewer.tsx](src/components_new/v4/ProductViewer.tsx) already covers concept order, inclusion, quotas, Bloom ceilings and distributions, scenario preferences, adds, merges, preview, save, and regeneration. EPIC 4.5 should promote and normalize that panel rather than replacing it.

### 3.3 Teacher Fingerprints: Act 2

Files:

- [src/prism-v4/teacherFeedback/fingerprints.ts](src/prism-v4/teacherFeedback/fingerprints.ts)
- [src/prism-v4/teacherFeedback/store.ts](src/prism-v4/teacherFeedback/store.ts)
- [api/v4/teacher-feedback](api/v4/teacher-feedback)

Expose a `TeacherFingerprintModel`:

```ts
export interface TeacherFingerprintModel {
  teacherId: string;
  modePreferences: ModePreference[];
  scenarioPreferences: ScenarioPreference[];
  bloomPreferences: BloomPreference[];
  difficultyPreferences: DifficultyPreference[];
}
```

Recommended routes:

```http
GET  /api/v4/teachers/:teacherId/fingerprint
PATCH /api/v4/teachers/:teacherId/fingerprint
```

Rules:

- use the existing fingerprint store and explanation logic already consumed by [src/prism-v4/documents/intents/buildIntentProduct.ts](src/prism-v4/documents/intents/buildIntentProduct.ts)
- do not add new builder logic
- allow UI overrides to flow back into the same fingerprint-conditioned build path

### 3.4 Student Performance: Act 3

Files:

- [src/prism-v4/studentPerformance/StudentPerformanceProfile.ts](src/prism-v4/studentPerformance/StudentPerformanceProfile.ts)
- [src/prism-v4/studentPerformance/store.ts](src/prism-v4/studentPerformance/store.ts)
- [supabase/student_performance_migration.sql](supabase/student_performance_migration.sql)

Recommended routes:

```http
GET /api/v4/students/:studentId/performance
```

Returning `StudentPerformanceProfile`.

Optional later route:

```http
GET /api/v4/classes/:classId/performance
```

Returning `ClassProfileModel` for differentiation.

Rules:

- reuse `getStudentPerformanceProfile` from [src/prism-v4/studentPerformance/store.ts](src/prism-v4/studentPerformance/store.ts)
- keep class-level aggregation out of Act 1 and Act 2

### 3.5 Builder Plan and Explanations: Act 3

Files:

- [src/prism-v4/documents/intents/buildIntentProduct.ts](src/prism-v4/documents/intents/buildIntentProduct.ts)
- [src/prism-v4/schema/integration/IntentProduct.ts](src/prism-v4/schema/integration/IntentProduct.ts)

Standardize a `BuilderPlanModel`:

```ts
export interface BuilderPlanModel {
  sections: {
    conceptId: string;
    conceptName: string;
    itemCount: number;
    bloomSequence: BloomLevel[];
    difficultySequence: DifficultyBand[];
    modeSequence: ModeType[];
    scenarioSequence: ScenarioType[];
  }[];
  adaptiveTargets?: AdaptiveTargetsSummary;
}
```

Target build-test shape:

```ts
{
  sessionId: string;
  builderPlan: BuilderPlanModel;
  assessmentPreview: AssessmentPreviewModel;
}
```

Where `AssessmentPreviewModel` includes per-item:

```ts
{
  id: string;
  stem: string;
  options?: string[];
  answer?: string;
  conceptId: string;
  bloom: BloomLevel;
  difficulty: DifficultyBand;
  misconceptionTag?: string;
  teacherReasons?: string[];
  studentReasons?: string[];
}
```

Repo-grounded note:

The current `TestItem.explanation` contract in [src/prism-v4/schema/integration/IntentProduct.ts](src/prism-v4/schema/integration/IntentProduct.ts) already carries concept, Bloom, scenario, item-mode, and student-reason metadata. The first step is to expose that more cleanly in the response model and UI, not to regenerate new explanation content.

## 4. Frontend Information Architecture

### 4.1 Routes and major screens

Recommended UI flow:

- `/v4/upload` -> `DocumentUpload` plus `AnalysisPanel`
- `/v4/session/:sessionId` -> workspace shell with tabs:
  - Analysis
  - Blueprint
  - Concept Map
  - Fingerprint
  - Student
  - Builder
  - Preview
  - Class later

All tabs should share one `InstructionalSession` state object.

Repo-grounded note:

The current V4 experience already centers [src/components_new/v4/DocumentUpload.tsx](src/components_new/v4/DocumentUpload.tsx) as the workspace shell. EPIC 4.5 can start by making that component the session host before promoting the experience to a dedicated `/v4/session/:sessionId` route.

## 5. Frontend Components

### 5.1 Shared session state

Recommended new file:

- [src/hooks/useInstructionalSession.ts](src/hooks/useInstructionalSession.ts)

Suggested contract:

```ts
export function useInstructionalSession(sessionId: string) {
  // fetch analysis, blueprint, fingerprint, studentProfile, builderPlan, preview
  // expose getters and setters that call the appropriate APIs
}
```

Responsibilities:

- hydrate analysis, blueprint, fingerprint, student profile, builder plan, preview, and class profile state
- centralize patch and refresh logic
- provide selectors for each pavilion surface

### 5.2 Act 1: AnalysisPanel

Files:

- [src/components_new/v4/DocumentUpload.tsx](src/components_new/v4/DocumentUpload.tsx)
- new [src/components_new/v4/AnalysisPanel.tsx](src/components_new/v4/AnalysisPanel.tsx)

Behavior:

- after upload, fetch session analysis and populate `InstructionalSession.analysis`
- render concepts, problems, misconceptions, Bloom distribution, mode and scenario distribution, difficulty bands, and domain

Definition:

- the user lands in a workspace that already feels like a cognitive X-ray without touching any controls

### 5.3 Act 2: Blueprint, Concept Map, Fingerprint

#### Blueprint

Files:

- [src/components_new/v4/ProductViewer.tsx](src/components_new/v4/ProductViewer.tsx)
- new [src/components_new/v4/BlueprintPanel.tsx](src/components_new/v4/BlueprintPanel.tsx)

Behavior:

- fetch `blueprint` through the session hook
- render concept quotas, Bloom ladder, difficulty ramp, and mode and scenario mix
- on change, patch blueprint state and trigger a constrained build refresh

Implementation note:

- begin by extracting the existing assessment concept-verification UI out of `ProductViewer.tsx`
- do not start from a blank panel

#### Concept Map

Files:

- new [src/components_new/v4/ConceptMap.tsx](src/components_new/v4/ConceptMap.tsx)
- existing graph foothold in [src/components_new/v4/ConceptGraph.tsx](src/components_new/v4/ConceptGraph.tsx)

Behavior:

- nodes from `session.analysis.concepts` and `blueprint.concepts`
- edges from inferred relationships and co-occurrence
- edits for reorder, merge, rename, include, and exclude

State effect:

- write concept edits back into blueprint state

#### Teacher Fingerprint

Files:

- new [src/components_new/v4/TeacherFingerprintPanel.tsx](src/components_new/v4/TeacherFingerprintPanel.tsx)

Behavior:

- fetch fingerprint by `teacherId`
- expose controls for mode, scenario, Bloom, and difficulty preferences
- patch back to the fingerprint route

### 5.4 Act 3: Student Brain, Builder, Preview, Class

#### StudentProfilePanel

Files:

- new [src/components_new/v4/StudentProfilePanel.tsx](src/components_new/v4/StudentProfilePanel.tsx)

Behavior:

- student selector
- fetch `StudentPerformanceProfile`
- render concept mastery heatmap, Bloom mastery, mode and scenario mastery, misconceptions, and exposure or response-time patterns
- overlay learner state into the concept map through shared session state

#### BuilderPlanView

Files:

- new [src/components_new/v4/BuilderPlanView.tsx](src/components_new/v4/BuilderPlanView.tsx)

Behavior:

- render per-section concept, item count, Bloom sequence, difficulty sequence, and mode and scenario sequence
- show adaptive-target summary
- show global teacher-reason and student-reason summaries

#### AssessmentPreview

Files:

- new [src/components_new/v4/AssessmentPreview.tsx](src/components_new/v4/AssessmentPreview.tsx)

Behavior:

- render items from `assessmentPreview`
- show concept, Bloom, difficulty, and misconception tags
- show per-item reasons
- regenerate item or section using existing constrained routes while preserving the plan

Repo-grounded note:

This should likely begin as an extracted assessment view from [src/components_new/v4/ProductViewer.tsx](src/components_new/v4/ProductViewer.tsx), not as a greenfield component.

#### ClassDifferentiator

Files:

- new [src/components_new/v4/ClassDifferentiator.tsx](src/components_new/v4/ClassDifferentiator.tsx)

Behavior:

- fetch `ClassProfileModel`
- cluster students
- trigger multiple build-test calls with grouped context
- render version A, B, and C plus explanation per version

## 6. EPIC 4.5 Sub-EPICs

### 4.5.1 InstructionalSession spine

- define shared types
- implement `useInstructionalSession`
- wire session creation on upload

### 4.5.2 Act 1: AnalysisPanel

- enrich the analysis route
- build `AnalysisPanel`
- integrate it into `DocumentUpload`
- add tests in [src/components_new/v4/tests/DocumentUpload.test.tsx](src/components_new/v4/tests/DocumentUpload.test.tsx)

### 4.5.3 Act 2: Blueprint, ConceptMap, Fingerprint

- expose blueprint APIs
- build `BlueprintPanel`
- build `ConceptMap`
- expose fingerprint APIs
- build `TeacherFingerprintPanel`
- expand tests in [src/components_new/v4/tests/ProductViewer.test.tsx](src/components_new/v4/tests/ProductViewer.test.tsx)

### 4.5.4 Act 3: StudentProfile, BuilderPlan, Preview

- expose student performance API
- build `StudentProfilePanel`
- standardize builder-plan and preview response shape
- build `BuilderPlanView`
- upgrade assessment preview

### 4.5.5 Act 3b: ClassDifferentiator

- expose class performance API
- build `ClassDifferentiator`

## 7. What 4.5 Delivers

When EPIC 4.5 is complete:

- every upload becomes a cognitive X-ray
- every build-test has a visible, editable plan
- every teacher has a visible, tunable fingerprint
- every student has a visible cognitive profile
- every assessment has reasons
- every class can be differentiated at the cognitive level

That is the Ocean on Mars moment.

## 8. Shipping Guidance

The build order still matters.

1. Ship the InstructionalSession spine and Act 1 first.
2. Promote the existing blueprint substrate before building new adaptive surfaces.
3. Expose student reasoning only after the teacher planning loop is legible.
4. Leave class differentiation for the end so the single-student loop is coherent first.

This EPIC succeeds only if each new surface feels like a consequence of the previous one rather than a disconnected feature drop.