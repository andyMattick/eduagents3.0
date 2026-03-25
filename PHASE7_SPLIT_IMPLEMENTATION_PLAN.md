# Phase 7 Split Implementation Plan

This plan keeps the architecture split that fits the current repo:

- Phase 7A: backend learning substrate only
- Phase 7B: runtime pipeline integration only
- UI Pass 1: evolve the existing V4 Semantic screen in place
- UI Pass 2: route consolidation later, after usage proves the workflow

It is written against the current repository structure, not the shorthand paths from the draft.

## Current Architecture Constraints

- The semantic runtime entry point is [src/prism-v4/semantic/pipeline/runSemanticPipeline.ts](src/prism-v4/semantic/pipeline/runSemanticPipeline.ts).
- Template matching lives under [src/prism-v4/semantic/cognitive/templates/index.ts](src/prism-v4/semantic/cognitive/templates/index.ts).
- Seeded template loading lives in [src/prism-v4/semantic/cognitive/templates/loadTemplates.ts](src/prism-v4/semantic/cognitive/templates/loadTemplates.ts).
- Teacher-derived template validation/loading lives in [src/prism-v4/semantic/cognitive/templates/loadTeacherTemplates.ts](src/prism-v4/semantic/cognitive/templates/loadTeacherTemplates.ts).
- Expected-step fusion lives in [src/prism-v4/semantic/cognitive/fuseCognition.ts](src/prism-v4/semantic/cognitive/fuseCognition.ts).
- Teacher feedback persistence currently lives in [src/prism-v4/teacherFeedback/store.ts](src/prism-v4/teacherFeedback/store.ts), with types in [src/prism-v4/teacherFeedback/TeacherFeedback.ts](src/prism-v4/teacherFeedback/TeacherFeedback.ts).
- The current V4 UI entry point is [src/components_new/v4/DocumentUpload.tsx](src/components_new/v4/DocumentUpload.tsx), mounted at `/v4/semantic` from [src/App.tsx](src/App.tsx).
- The broader teacher journey already has a route machine in [src/hooks/useUserFlow.tsx](src/hooks/useUserFlow.tsx). Do not change that in this phase.

## Non-Goals

- No public schema changes.
- No route changes in Phase 7A, Phase 7B, or UI Pass 1.
- No subject/domain mutation from learning signals.
- No override of hard structural evidence such as extracted multipart structure.

## Phase 7A: Backend Learning Substrate

Goal: extend the existing teacher-feedback and teacher-template path with learning records and drift control, without changing runtime behavior yet.

### New Files

- [src/prism-v4/semantic/learning/TeacherActionEvent.ts](src/prism-v4/semantic/learning/TeacherActionEvent.ts)
- [src/prism-v4/semantic/learning/TemplateLearningRecord.ts](src/prism-v4/semantic/learning/TemplateLearningRecord.ts)
- [src/prism-v4/semantic/learning/learningService.ts](src/prism-v4/semantic/learning/learningService.ts)

Suggested model surface:

```ts
export type TeacherActionType =
  | "template_override"
  | "expected_steps_correction"
  | "difficulty_correction"
  | "representation_correction"
  | "multipart_restructure";

export interface TeacherActionEvent {
  eventId: string;
  teacherId: string;
  problemId: string;
  timestamp: number;
  actionType: TeacherActionType;
  oldValue: unknown;
  newValue: unknown;
  context: {
    subject: string;
    gradeLevel?: string;
    templateIds?: string[];
    teacherTemplateIds?: string[];
  };
}

export interface TemplateLearningRecord {
  templateId: string;
  strongMatches: number;
  weakMatches: number;
  teacherOverrides: number;
  expectedStepsCorrections: number;
  driftScore: number;
  lastUpdated: number;
}
```

### Existing Files To Extend

- [src/prism-v4/teacherFeedback/TeacherFeedback.ts](src/prism-v4/teacherFeedback/TeacherFeedback.ts)
  - Add any new internal persistence types needed for teacher action records.
  - Keep public semantic output untouched.

- [src/prism-v4/teacherFeedback/store.ts](src/prism-v4/teacherFeedback/store.ts)
  - Add persistence helpers for teacher action events.
  - Wire `recordTeacherAction()` into existing teacher feedback save paths.
  - Reuse existing in-memory and Supabase-aware patterns instead of creating a second persistence system.

- [src/prism-v4/semantic/cognitive/templateLearning.ts](src/prism-v4/semantic/cognitive/templateLearning.ts)
  - Extend the existing teacher-template derivation logic to emit learning signals, not just derived templates.
  - Keep template promotion and learning aggregation separate.

- [src/prism-v4/semantic/cognitive/templates/loadTeacherTemplates.ts](src/prism-v4/semantic/cognitive/templates/loadTeacherTemplates.ts)
  - Add awareness of frozen templates and learning metadata.
  - Do not let learning mutate template subject/domain.

- [src/prism-v4/semantic/cognitive/templates/loadTemplates.ts](src/prism-v4/semantic/cognitive/templates/loadTemplates.ts)
  - Add optional learning metadata attachment to runtime template objects.
  - Do not change the seed file format unless absolutely necessary.

### Aggregation Hook

Use the existing jobs system rather than introducing a separate scheduler abstraction first.

- [api/jobs/process.ts](api/jobs/process.ts)
  - Add a new job type for template-learning aggregation.
  - Keep the first implementation callable through the existing job executor.

Optional follow-up if needed:

- [api/jobs/create.ts](api/jobs/create.ts)
  - Allow creation of a learning-aggregation job record.

### 7A Guardrails

- Never change `subject` or `domain` from learning records.
- Never let learning records override structural extraction facts.
- Require a minimum evidence count before a learning record influences any runtime decision.
- Freeze templates whose `driftScore` crosses the configured threshold.
- Keep all learning metadata internal to runtime/store layers unless an explicit internal API needs it.

### 7A Milestones

- M1: define models and `learningService` with no runtime usage.
- M2: wire `recordTeacherAction()` into existing teacher-feedback save flows.
- M3: add aggregation job support that produces `TemplateLearningRecord` entries.
- M4: expose learning records to template loaders without changing matcher behavior yet.
- M5: add tests proving substrate behavior while public PRISM output remains unchanged.

### 7A Tests

Extend existing tests first:

- [src/prism-v4/teacherFeedback/tests/store.browser.test.ts](src/prism-v4/teacherFeedback/tests/store.browser.test.ts)
  - event persistence
  - event reset behavior
  - minimum-evidence gating

- [src/prism-v4/semantic/tests/teacherFeedback.test.ts](src/prism-v4/semantic/tests/teacherFeedback.test.ts)
  - teacher feedback records both overrides and learning actions
  - public output shape remains unchanged

- [src/prism-v4/teacherFeedback/tests/teacherTemplateLoader.test.ts](src/prism-v4/teacherFeedback/tests/teacherTemplateLoader.test.ts)
  - frozen template exclusion
  - invalid learning metadata rejection

Add a focused new test file:

- [src/prism-v4/semantic/cognitive/tests/templateLearningAdjustments.test.ts](src/prism-v4/semantic/cognitive/tests/templateLearningAdjustments.test.ts)
  - repeated override events aggregate correctly
  - repeated expected-step corrections update only internal learning state
  - high `driftScore` freezes template participation

## Phase 7B: Pipeline Integration

Goal: make the semantic runtime respond to learning signals, still without UI changes.

### Files To Change

- [src/prism-v4/semantic/pipeline/runSemanticPipeline.ts](src/prism-v4/semantic/pipeline/runSemanticPipeline.ts)
- [src/prism-v4/semantic/cognitive/templates/index.ts](src/prism-v4/semantic/cognitive/templates/index.ts)
- [src/prism-v4/semantic/cognitive/fuseCognition.ts](src/prism-v4/semantic/cognitive/fuseCognition.ts)
- [src/prism-v4/semantic/cognitive/index.ts](src/prism-v4/semantic/cognitive/index.ts)

### Runtime Changes

- In [src/prism-v4/semantic/pipeline/runSemanticPipeline.ts](src/prism-v4/semantic/pipeline/runSemanticPipeline.ts)
  - add a single explicit `applyLearningAdjustments()` stage or equivalent data-prep step
  - load learning records once per pipeline run, not once per problem
  - thread the learning data into template matching and cognition fusion

- In [src/prism-v4/semantic/cognitive/templates/index.ts](src/prism-v4/semantic/cognitive/templates/index.ts)
  - incorporate learning-adjusted confidence when ranking templates
  - ignore frozen templates
  - preserve current teacher-over-system precedence rules
  - keep best-guess fallback behavior deterministic

- In [src/prism-v4/semantic/cognitive/fuseCognition.ts](src/prism-v4/semantic/cognitive/fuseCognition.ts)
  - let learned step hints affect internal expected-step fusion only
  - do not leak expected-step internals into public tags or schema
  - clamp any learned weight adjustments to narrow, testable ranges

### 7B Milestones

- M6: matcher uses learning-adjusted confidence.
- M7: fusion uses learned step-hint adjustments for internal reasoning only.
- M8: regression coverage proves no schema drift and no behavior change without learning data.

### 7B Tests

- [src/prism-v4/semantic/cognitive/tests/templateMatching.test.ts](src/prism-v4/semantic/cognitive/tests/templateMatching.test.ts)
  - template override causes rank shift only when learning data is present
  - frozen templates are excluded

- [src/prism-v4/semantic/cognitive/tests/fuseCognition.test.ts](src/prism-v4/semantic/cognitive/tests/fuseCognition.test.ts)
  - learned expected-step adjustments influence internal fusion only

- [src/prism-v4/semantic/cognitive/tests/expectedStepsFusion.test.ts](src/prism-v4/semantic/cognitive/tests/expectedStepsFusion.test.ts)
  - learned corrections influence internal expected-step reasoning
  - public schema remains unchanged

- [src/prism-v4/semantic/tests/semanticPipeline.test.ts](src/prism-v4/semantic/tests/semanticPipeline.test.ts)
  - no learning data: output remains baseline-stable
  - learning data present: output changes only in intended internal/runtime-informed ways

- [src/prism-v4/ingestion/tests/v4IngestRoute.test.ts](src/prism-v4/ingestion/tests/v4IngestRoute.test.ts)
  - ingest route response contract remains unchanged

## UI Pass 1: Evolve Existing V4 Screen In Place

Goal: keep `/v4/semantic` and make the current screen feel like inspection and refinement, not a debug-only surface.

### Files To Change

- [src/components_new/v4/DocumentUpload.tsx](src/components_new/v4/DocumentUpload.tsx)
- [src/components_new/v4/SemanticViewer.tsx](src/components_new/v4/SemanticViewer.tsx)
- [src/components_new/v4/v4.css](src/components_new/v4/v4.css)

Secondary support files, only if needed:

- [src/components_new/v4/ProblemList.tsx](src/components_new/v4/ProblemList.tsx)
- [src/components_new/v4/ProblemCard.tsx](src/components_new/v4/ProblemCard.tsx)
- [src/components_new/v4/DocumentOverview.tsx](src/components_new/v4/DocumentOverview.tsx)

### UI Changes

- In [src/components_new/v4/DocumentUpload.tsx](src/components_new/v4/DocumentUpload.tsx)
  - keep the current upload flow intact
  - add a mode selector after upload or after successful ingestion:
    - inspect
    - semantic
    - correct
  - pass the selected mode into the viewer

- In [src/components_new/v4/SemanticViewer.tsx](src/components_new/v4/SemanticViewer.tsx)
  - support `inspect`, `semantic`, and `correct` modes
  - reorder presentation so overview and problem list lead
  - relabel interpretation panels for teacher-facing language
  - add guarded correction controls that can call `recordTeacherAction()`
  - keep debug affordances available, but not dominant

- In [src/components_new/v4/v4.css](src/components_new/v4/v4.css)
  - keep the existing visual language
  - improve layout hierarchy for teacher workflows
  - add a two-column composition where appropriate
  - make the problem pane scrollable without collapsing the summary cards

### UI Pass 1 Milestones

- U1: mode selector added to the existing upload flow.
- U2: viewer supports `inspect`, `semantic`, and `correct` modes.
- U3: teacher actions call `recordTeacherAction()` behind a safe feature flag or guarded affordance.
- U4: CSS improves readability and task flow with no route changes.

### UI Pass 1 Tests

- Extend [src/prism-v4/ingestion/tests/v4IngestRoute.test.ts](src/prism-v4/ingestion/tests/v4IngestRoute.test.ts) only if request/response behavior changes.
- Add or extend component tests under [src/__tests__](src/__tests__) if the v4 screen already has a nearby test pattern to reuse.
- At minimum, manually verify:
  - upload still works for PDF and DOCX
  - semantic viewer still runs end to end
  - correction actions do not break rendering when learning services are unavailable

## UI Pass 2: Route Consolidation Later

Goal: decide where V4 lives in the broader teacher journey only after the upgraded screen proves useful.

### Files To Evaluate Later

- [src/App.tsx](src/App.tsx)
- [src/hooks/useUserFlow.tsx](src/hooks/useUserFlow.tsx)

### Options

- Keep `/v4/semantic` as a power-user tab.
- Embed semantic inspection into the existing launchpad and intent flow.
- Rename the route only after the current split is retired.

### Route Milestones

- R1: observe usage of the upgraded v4 screen.
- R2: decide whether semantic inspection belongs earlier in `useUserFlow`.
- R3: make route changes only after that decision.

## Recommended Implementation Order

1. Add Phase 7A models and service layer.
2. Wire learning-event recording into the existing teacher-feedback store.
3. Add aggregation and freezing logic.
4. Thread learning records through template loading without behavior changes.
5. Turn on Phase 7B matcher and fusion adjustments.
6. Add UI Pass 1 once backend behavior is stable.
7. Leave route consolidation for later.

## Definition of Done

- Public semantic output shape is unchanged.
- Existing teacher template precedence still works.
- Frozen templates never influence matching.
- Learned expected-step changes affect internal reasoning only.
- No route changes are required to ship value.
- The upgraded V4 screen supports inspection and correction without duplicating the main launchpad flow.