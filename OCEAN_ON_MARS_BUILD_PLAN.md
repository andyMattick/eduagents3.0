# Ocean on Mars Build Plan

This document turns the pavilion vision into a repo-grounded build order.

The goal is not to invent new intelligence layers. The goal is to expose the intelligence that already exists in the PRISM V4 stack in the right experiential order.

Companion architecture: [OCEAN_ON_MARS_INTEGRATION_ARCHITECTURE.md](OCEAN_ON_MARS_INTEGRATION_ARCHITECTURE.md)

Companion technical breakdown: [EPIC_4_5_OCEAN_ON_MARS_TECHNICAL_BREAKDOWN.md](EPIC_4_5_OCEAN_ON_MARS_TECHNICAL_BREAKDOWN.md)

## Build Rule

Each act must reveal a deeper layer of system intelligence:

1. Act 1 proves the system can see.
2. Act 2 proves the system can plan like a teacher.
3. Act 3 proves the system can adapt for real learners.

Each act must be shippable on its own.

## Pavilion Surface Map

| Surface | Pavilion name | Act | Existing substrate | New work |
| --- | --- | --- | --- | --- |
| 1 | Document as a Portal (X-ray) | 1 | [src/prism-v4/documents/analysis/classifyFragments.ts](src/prism-v4/documents/analysis/classifyFragments.ts), document analysis pipeline, session analysis routes | Analysis panel on upload/workspace screen |
| 3 | Blueprint Engine | 2 | concept blueprint model, [api/v4/teacher-feedback/concept-verification-preview.ts](api/v4/teacher-feedback/concept-verification-preview.ts), [api/v4/teacher-feedback/sharedPreview.ts](api/v4/teacher-feedback/sharedPreview.ts), [api/v4/teacher-feedback/regenerate-item.ts](api/v4/teacher-feedback/regenerate-item.ts), [api/v4/teacher-feedback/regenerate-section.ts](api/v4/teacher-feedback/regenerate-section.ts), [api/v4/teacher-feedback/assessment-blueprint.ts](api/v4/teacher-feedback/assessment-blueprint.ts) | Blueprint editor UI and request wiring |
| 6/7 | Adaptive Builder + Living Assessment | 3 | [src/prism-v4/documents/intents/buildIntentProduct.ts](src/prism-v4/documents/intents/buildIntentProduct.ts), explanation plumbing, preview/regeneration stack | Plan view, explanation panels, richer assessment preview |
| 5 | Student Brain | 3 | [src/prism-v4/studentPerformance/StudentPerformanceProfile.ts](src/prism-v4/studentPerformance/StudentPerformanceProfile.ts), [supabase/student_performance_migration.sql](supabase/student_performance_migration.sql) | Student profile visualizations and selector wiring |
| 2 | Concept Map | 2 | concepts, grouped units, blueprint ordering, analysis outputs | Graph UI over concepts and relationships |
| 4 | Teacher Fingerprints | 2 | [src/prism-v4/teacherFeedback/fingerprints.ts](src/prism-v4/teacherFeedback/fingerprints.ts), teacher feedback routes | Fingerprint panel and teacher controls |
| 8 | Class Differentiator | 3 | differentiated workflow notes, builder substrate, grouped adaptive generation path | Class view, grouped builds, differentiated explanations |

## EPIC Build Order

### Act 1: X-ray the Document

#### EPIC 1.1: Expose analysis summaries

Goal: make upload completion return teacher-facing cognitive analysis, not just session metadata.

Existing substrate:

- [src/components_new/v4/DocumentUpload.tsx](src/components_new/v4/DocumentUpload.tsx)
- session analysis route usage already flows through `/api/v4/documents/session-analysis`
- document semantics and concept extraction already power V4 builder paths

Implementation:

1. Ensure the session analysis payload surfaces teacher-facing summary fields:
   - `concepts`
   - `problems`
   - `misconceptions`
   - `bloomSummary`
   - `modeSummary`
   - `scenarioSummary`
   - `difficultySummary`
   - `domain`
2. Normalize those summaries near the route boundary instead of recomputing them in the browser.
3. Preserve the existing detailed analysis object for downstream features.

Definition of done:

- Uploading a document yields enough summary data to render a complete analysis panel without extra user configuration.

#### EPIC 1.2: Build the Analysis panel

Goal: create the first reveal moment on the workspace screen.

Primary UI files:

- [src/components_new/v4/DocumentUpload.tsx](src/components_new/v4/DocumentUpload.tsx)
- new `AnalysisPanel` component under `src/components_new/v4/`

Implementation:

1. Add a right-side panel or dedicated workspace card for analysis.
2. Render sections for:
   - Concepts
   - Problems extracted
   - Misconceptions
   - Bloom levels
   - Modes and scenarios
   - Difficulty / cognitive load
   - Domain
3. Use chips, bars, and compact cards instead of raw JSON or debug blocks.
4. Add a light reveal state such as “Document analyzed” or staged panel entrance.

Definition of done:

- Upload a doc, land in the workspace, and immediately see the document’s cognitive structure without touching any controls.

### Act 2: Externalize the Teacher’s Planning Mind

#### EPIC 2.1: Blueprint Engine UI

Goal: expose the existing planning layer before item preview becomes the main focus.

Existing substrate:

- [src/components_new/v4/ProductViewer.tsx](src/components_new/v4/ProductViewer.tsx)
- [api/v4/teacher-feedback/concept-verification-preview.ts](api/v4/teacher-feedback/concept-verification-preview.ts)
- [api/v4/teacher-feedback/sharedPreview.ts](api/v4/teacher-feedback/sharedPreview.ts)
- [api/v4/teacher-feedback/assessment-blueprint.ts](api/v4/teacher-feedback/assessment-blueprint.ts)
- [api/v4/teacher-feedback/regenerate-item.ts](api/v4/teacher-feedback/regenerate-item.ts)
- [api/v4/teacher-feedback/regenerate-section.ts](api/v4/teacher-feedback/regenerate-section.ts)

Implementation:

1. Add a Blueprint tab or panel inside the existing product viewer for `build-test` products.
2. Show planning structures as explicit teacher-facing controls:
   - concept quotas
   - Bloom ladder
   - difficulty ramp
   - mode mix
   - scenario mix
3. Use the existing preview and regeneration routes instead of adding a second planning API.
4. Rebuild the assessment with preserved constraints when edits are made.

Definition of done:

- A teacher can see and edit the plan before focusing on individual items.

#### EPIC 2.2: Concept Map

Goal: spatialize the blueprint so concepts become a manipulable structure.

Existing substrate:

- concept lists in analysis outputs
- grouped-unit and section ordering data in V4 builder results
- concept blueprint editing model described in [memories/repo/epic4.3-concept-blueprint.md](/memories/repo/epic4.3-concept-blueprint.md)

Implementation:

1. Build a `ConceptMap` component.
2. Use concepts as nodes and inferred relationships as edges:
   - prerequisite relation when available
   - co-occurrence within documents or sections
   - same-section clustering from blueprint/test outputs
3. Add edit interactions:
   - reorder
   - merge
   - rename
   - include/exclude
4. Sync graph edits back into the blueprint model.

Definition of done:

- A teacher can rearrange concepts visually and see blueprint order and inclusion change with it.

#### EPIC 2.3: Teacher Fingerprint Panel

Goal: reveal that the system is learning a teacher’s authorship pattern, not just rendering static controls.

Existing substrate:

- [src/prism-v4/teacherFeedback/fingerprints.ts](src/prism-v4/teacherFeedback/fingerprints.ts)
- teacher feedback routes under [api/v4/teacher-feedback](api/v4/teacher-feedback)
- build-test request plumbing now includes `teacherId` from [src/components_new/v4/DocumentUpload.tsx](src/components_new/v4/DocumentUpload.tsx)

Implementation:

1. Add a `TeacherFingerprintPanel` in the test-building flow.
2. Show inferred preferences:
   - preferred item modes
   - preferred scenario types
   - Bloom preferences
   - difficulty preferences
3. Add controls that map back into the fingerprint-conditioned build path.
4. Show when the current build is fingerprint-shaped.

Definition of done:

- A teacher can inspect and tune how the system models their teaching style.

### Act 3: Personalize for Real Learners

#### EPIC 3.1: Student Brain

Goal: turn the student performance substrate into a visible cognitive profile.

Existing substrate:

- [src/prism-v4/studentPerformance/StudentPerformanceProfile.ts](src/prism-v4/studentPerformance/StudentPerformanceProfile.ts)
- [supabase/student_performance_migration.sql](supabase/student_performance_migration.sql)
- build-test request plumbing for `studentId` and adaptive toggling in [src/components_new/v4/DocumentUpload.tsx](src/components_new/v4/DocumentUpload.tsx)

Implementation:

1. Add a student selector to the build-test flow.
2. Create a `StudentProfilePanel` that shows:
   - concept mastery
   - Bloom mastery
   - mode mastery
   - scenario mastery
   - misconceptions
   - exposure / response-time patterns
3. Overlay mastery and misconceptions onto the concept map.

Definition of done:

- Selecting a student changes both the visible learner profile and the planning context for builds.

#### EPIC 3.2: Adaptive Builder and Living Assessment

Goal: make the plan and artifact readable as one adaptive system.

Existing substrate:

- [src/prism-v4/documents/intents/buildIntentProduct.ts](src/prism-v4/documents/intents/buildIntentProduct.ts)
- teacherReasons and studentReasons in [src/prism-v4/teacherFeedback/fingerprints.ts](src/prism-v4/teacherFeedback/fingerprints.ts)
- preview/regeneration endpoints already used for blueprint conditioning

Implementation:

1. Add a `BuilderPlanView` that shows:
   - concept quotas
   - Bloom ladder
   - difficulty ramp
   - mode and scenario rotation
   - adaptive target summary
2. Add explanation panels for:
   - teacherReasons
   - studentReasons
3. Upgrade the test preview so each item shows:
   - concept
   - Bloom level
   - difficulty
   - misconception targeting
   - reason metadata
4. Keep item and section regeneration constrained to the current plan.

Definition of done:

- A teacher can see why each item exists and how teacher and student context shaped it.

#### EPIC 3.3: Class Differentiator

Goal: lift personalization from one learner to grouped classroom orchestration.

Existing substrate:

- differentiated workflow notes in [memories/repo/differentiated-workflow-paths.md](/memories/repo/differentiated-workflow-paths.md)
- builder substrate can already be invoked repeatedly with different context

Implementation:

1. Add a class-level mastery and misconception view.
2. Cluster students into 2-3 groups by mastery and misconception patterns.
3. Run grouped builds to produce differentiated versions.
4. Show explanation per version so the teacher understands why each variant exists.

Definition of done:

- A teacher can generate multiple cognitively justified versions for different learner groups.

## Act-by-Act Implementation Checklist

### Act 1

1. Expand session analysis payload with teacher-facing summary fields.
2. Build `AnalysisPanel` and add it to the workspace screen.
3. Add tests proving upload plus refresh renders visible analysis summaries.

### Act 2

1. Add Blueprint panel in [src/components_new/v4/ProductViewer.tsx](src/components_new/v4/ProductViewer.tsx).
2. Wire blueprint controls to preview and regeneration routes.
3. Add concept map synced to blueprint order and inclusion.
4. Add fingerprint panel fed by teacher feedback and fingerprint data.

### Act 3

1. Add student selector and profile panel.
2. Add adaptive plan view and reason panels.
3. Enrich the assessment preview with explanation metadata.
4. Add class-level grouped differentiation view.

## Recommended Immediate Next Step

Start with Act 1.

It is the lowest-risk, highest-clarity reveal because the analysis substrate already exists, the current upload/workspace flow already fetches analysis, and it gives the platform an immediate “this should not exist yet” moment without waiting on additional planning or adaptation layers.