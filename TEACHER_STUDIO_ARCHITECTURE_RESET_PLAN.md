# Teacher Studio Architecture Reset Plan

## Purpose

This plan moves the teacher-facing product away from the current session-centric, Pavilion-heavy runtime and toward a Blueprint-centric runtime with stateless execution and durable artifacts.

The goal is not to remove persistence. The goal is to remove hidden mutable working state.

We will persist:

- Documents
- Act 1 analysis artifacts
- Versioned Blueprints
- Output artifacts
- Fingerprints

We will stop treating sessions, preview payloads, and generated product payloads as the system's source of truth.

## Why This Reset Is Necessary

The current teacher path still routes through a merged session workspace that mixes raw and derived state in one object.

Relevant files:

- [src/hooks/useInstructionalSession.ts](src/hooks/useInstructionalSession.ts)
- [src/components_new/v4/PavilionSessionView.tsx](src/components_new/v4/PavilionSessionView.tsx)
- [src/components_new/v4/DocumentUpload.tsx](src/components_new/v4/DocumentUpload.tsx)
- [api/v4/sessions/shared.ts](api/v4/sessions/shared.ts)
- [src/prism-v4/session/resolveInstructionalAssessmentRuntime.ts](src/prism-v4/session/resolveInstructionalAssessmentRuntime.ts)
- [src/prism-v4/session/buildInstructionalBlueprint.ts](src/prism-v4/session/buildInstructionalBlueprint.ts)

Today the system behaves like this:

1. Session collects documents, analysis, products, blueprint, concept map, preview, class artifacts.
2. Pavilion hydrates teacher-facing tabs from that mutable session workspace.
3. Session APIs resolve the active assessment by finding the latest stored test product.
4. Blueprint, concept map, builder plan, and preview are then derived from that product.

This is the wrong dependency direction.

Even when Blueprint is correct, downstream teacher experience can still drift because product records and session-owned derived state remain upstream of runtime resolution.

## Current Failure Mode

### Frontend

[src/hooks/useInstructionalSession.ts](src/hooks/useInstructionalSession.ts) currently merges:

- session metadata
- analysis payloads
- products
- blueprint
- concept map
- assessment preview
- builder plan
- student and class artifacts

Why this is a problem:

- The workspace object becomes a mutable working-memory dump.
- Teacher-facing surfaces are contaminated by stale or contradictory fields.
- A UI cleanup alone will not fix the underlying unpredictability.

[src/components_new/v4/PavilionSessionView.tsx](src/components_new/v4/PavilionSessionView.tsx) then hydrates Blueprint, Concept Map, Builder Plan, Living Assessment, Fingerprint, Student, and Class views from that session object.

Why this is a problem:

- Pavilion is acting as the teacher runtime shell.
- Teacher output generation is still coupled to debug and inspection surfaces.
- The UI reinforces the wrong runtime model: session-first, product-first, artifact-last.

### Backend

[api/v4/sessions/shared.ts](api/v4/sessions/shared.ts) and [src/prism-v4/session/resolveInstructionalAssessmentRuntime.ts](src/prism-v4/session/resolveInstructionalAssessmentRuntime.ts) still resolve teacher runtime by locating the latest stored `build-test` product for the session.

Why this is a problem:

- Product payload is treated as upstream truth.
- Blueprint is reconstructed from product plus analysis instead of being loaded as a first-class artifact.
- Builder plan and assessment preview are not derived from a canonical Blueprint record.

[src/prism-v4/session/buildInstructionalBlueprint.ts](src/prism-v4/session/buildInstructionalBlueprint.ts) already contains the right seed of the future architecture: it can construct a Blueprint model from analysis and fingerprint-derived information. But it is not yet being used as the canonical orchestration artifact.

## Target Architecture

### Core Principle

Blueprint becomes the canonical orchestration artifact for all teacher-facing outputs.

Every teacher-facing builder consumes:

- Blueprint
- explicit teacher choices
- relevant fingerprints or targets

No teacher-facing builder should consume as source-of-truth input:

- `session.assessmentPreview`
- `session.builderPlan`
- `session.conceptMap`
- `product.payload`
- Pavilion-local state

### Durable Artifacts

We will keep durable artifacts for:

- Documents
- Analysis
- Blueprint versions
- Outputs
- Fingerprints

We will treat sessions as thin envelopes that point to those artifacts.

### Thin Session Model

Sessions should store only routing and selection context, for example:

- `documentIds`
- `activeBlueprintId`
- `activeTarget`
- `outputIds`

Sessions should no longer own derived runtime artifacts such as:

- `assessmentPreview`
- `builderPlan`
- `conceptMap`
- `products` as working truth

## New Teacher Studio Runtime

The new teacher path should be:

1. Document upload
2. Act 1 analysis
3. Blueprint generation or selection
4. Output generation from Blueprint

For the new Studio path, the runtime should be:

`Documents -> Analysis -> Blueprint -> Output`

Not:

`Documents -> Session -> Product -> Reconstructed Blueprint -> Preview`

## Required Technical Changes

### 1. Persist Blueprint As A First-Class Versioned Artifact

Why:

- Teacher edits to quotas, ordering, mix, and shape must be canonical.
- Blueprint cannot remain an inferred byproduct of the latest generated product.
- A versioned Blueprint gives the team reproducibility and a clear audit trail.

What to build:

- A Blueprint record or table with fields such as:
  - `blueprint_id`
  - `session_id` or equivalent owner reference
  - `analysis_id`
  - `version`
  - `concepts`
  - `bloom_ladder`
  - `difficulty_ramp`
  - `mode_mix`
  - `scenario_mix`
  - `metadata`

Implementation direction:

- Build Blueprint once from Analysis plus optional fingerprint inputs.
- Persist every edit as a new Blueprint version.
- Store only the active Blueprint pointer on the session.

### 2. Shrink The Session Contract

Why:

- The current `InstructionalSession` shape carries too much derived state.
- Derived state becomes stale, contradictory, and hard to reason about.
- Session should be navigation context, not runtime truth.

What to change:

- Deprecate session-owned fields for:
  - assessment preview
  - builder plan
  - concept map
  - product payloads as teacher-facing truth
- Keep only:
  - document IDs
  - active Blueprint ID
  - active target selection
  - output IDs

Impact area:

- [src/hooks/useInstructionalSession.ts](src/hooks/useInstructionalSession.ts)
- [src/types/v4/InstructionalSession.ts](src/types/v4/InstructionalSession.ts)
- [src/prism-v4/session/InstructionalIntelligenceSession.ts](src/prism-v4/session/InstructionalIntelligenceSession.ts)

### 3. Replace Product-First Runtime Resolution

Why:

- The current runtime starts from latest test product.
- That preserves the exact dependency inversion we need to eliminate.

What to change:

- Replace the current resolution flow in [api/v4/sessions/shared.ts](api/v4/sessions/shared.ts) and [src/prism-v4/session/resolveInstructionalAssessmentRuntime.ts](src/prism-v4/session/resolveInstructionalAssessmentRuntime.ts).

Target runtime resolver:

1. Load active Blueprint by ID.
2. Load Analysis by `analysisId` on the Blueprint.
3. Load fingerprints or target models as required.
4. Build derived runtime views directly from Blueprint plus explicit inputs.

Derived views can still exist, but they must be recomputed views, not stored truth:

- Concept Map
- Builder Plan
- Assessment renderer input
- Differentiation plans
- Simulation plans

Product output becomes a rendered artifact, not runtime truth.

### 4. Build A Parallel Teacher Studio UI

Why:

- A new UI on top of `useInstructionalSession` and Pavilion will preserve the same underlying bugs.
- The new teacher path must bypass the current session workspace pattern entirely.

What to build:

- New route such as `/studio`
- New hook such as `useTeacherStudioRun`
- New top-level view such as `TeacherStudioView.tsx`

Studio hook responsibilities:

- Upload documents or select existing document set
- Resolve Analysis artifact
- Resolve or edit active Blueprint
- Request outputs from Blueprint-based builders

Studio hook must not hydrate:

- Pavilion-local state
- assessment preview payloads
- product galleries as runtime truth
- legacy merged session workspaces

Initial teacher surfaces:

- Assessment
- Practice
- Explanations
- Plans
- Differentiation
- Simulation or Insights

Relevant current files to leave out of the new path:

- [src/hooks/useInstructionalSession.ts](src/hooks/useInstructionalSession.ts)
- [src/components_new/v4/PavilionSessionView.tsx](src/components_new/v4/PavilionSessionView.tsx)

### 5. Replace Preview With Output Renderers

Why:

- Teachers need to see outputs.
- They do not need preview-oriented pre-normalized inspection payloads.
- Preview is currently a debugging surface masquerading as a teacher surface.

What to change:

- Remove `buildInstructionalPreview` from the new teacher path.
- Introduce explicit output renderers backed by explicit output records.

Examples:

- `AssessmentOutput`
- `PracticeOutput`
- `ExplanationSetOutput`
- `LessonPlanOutput`
- `DifferentiatedOutput`
- `SimulationOutput`

Each renderer should consume a concrete output artifact, not a preview payload reconstructed from session state.

## Build Order

This order is critical. If the team builds Studio before changing the contract, it will create another shell over the same scaffolding.

### Phase 1. Define New Contracts

Define and document:

- Analysis artifact
- Blueprint artifact
- Assessment output artifact
- Slim session envelope

Why first:

- Without contract work, the new path will quietly depend on old session state.

### Phase 2. Implement One Vertical Slice

Build exactly one end-to-end path first:

- Document -> Analysis -> Blueprint -> AssessmentOutput

Why first:

- Assessment is the closest existing teacher surface.
- It exercises the full architecture reset without forcing all output types at once.

Deliverables:

- One new Studio route
- One new Blueprint-backed runtime resolver
- One assessment output renderer
- One persisted Blueprint version flow

### Phase 3. Move Other Teacher Outputs Onto The Same Runtime

Add:

- Practice
- Explanations
- Plans
- Differentiation
- Simulation or class insights

Why in this order:

- All of these should prove that the Blueprint runtime is general, not test-specific.
- This prevents the system from remaining test-shaped forever.

### Phase 4. Hide Pavilion And Preview Behind Advanced Mode

Why:

- They still have debugging value.
- They should stop being the default teacher experience.

What to do:

- Move Pavilion surfaces behind an explicit advanced toggle.
- Keep them available for engineering verification and support.

### Phase 5. Retire Product-First Runtime Resolution

Why:

- Product-first runtime resolution is the core technical debt.
- As long as it exists in the teacher path, stale behavior will keep resurfacing.

What to remove or deprecate:

- Runtime paths that infer active teacher state from latest stored test product.
- Session-owned preview and plan facades in the teacher path.

## Backend Design Notes

### Recommended Runtime Inputs

All new teacher-facing builders should accept explicit inputs such as:

- `blueprintId`
- `teacherId`
- `unitId`
- `studentId`
- `classId`
- output options

Why:

- Runtime inputs become visible and testable.
- Builder behavior stops depending on hidden session state.

### Recommended Output Semantics

Outputs should be persisted as artifacts with lineage:

- output ID
- blueprint ID
- output type
- input options
- generated payload
- created timestamp
- optional teacher edits

Why:

- This preserves reproducibility.
- It makes comparison and regeneration straightforward.

### Fingerprints Remain Durable Cross-Session Memory

Teacher, unit, student, and class fingerprints should remain durable and queryable artifacts. They are not session clutter.

Relevant persistence direction already exists in:

- [supabase/teacher_feedback_fingerprints_migration.sql](supabase/teacher_feedback_fingerprints_migration.sql)

Why this matters:

- Fingerprints are legitimate memory.
- They are explicit inputs to runtime, not hidden working state.

## Frontend Design Notes

### New Hook Boundary

Create a new hook for Studio rather than extending `useInstructionalSession`.

Why:

- Extending the current hook will drag forward the old workspace model.
- The new teacher path needs a clean dependency boundary.

Suggested responsibilities:

- load documents
- start or retrieve analysis
- load or create active Blueprint
- save Blueprint edits as versions
- request concrete outputs
- load concrete outputs for rendering

### Teacher-Facing Surface Design

The default teacher UI should answer:

- What can I generate?
- What did the system build?
- What should I adjust?

It should not default to:

- analysis dashboards
- concept graph inspection
- raw preview payloads
- Pavilion draft orchestration

## Acceptance Criteria

The reset is complete when the following are true:

1. The primary teacher path no longer depends on Pavilion.
2. The primary teacher path no longer depends on `assessmentPreview` as runtime truth.
3. The primary teacher path no longer resolves active state from latest stored product.
4. Blueprint is stored and versioned as a first-class artifact.
5. Sessions are thin envelopes with pointers, not working-memory containers.
6. Assessment, practice, plans, explanations, differentiation, and simulation all run from Blueprint plus explicit inputs.

## Risks To Avoid

### Risk 1. Building Studio On Top Of Existing Session Workspace

Why dangerous:

- It will look new while preserving the same runtime instability.

### Risk 2. Persisting More Derived State To Make The Old Model Feel Faster

Why dangerous:

- It deepens the stale-state problem instead of solving it.

### Risk 3. Keeping Product Payload As Hidden Fallback Truth

Why dangerous:

- The architecture reset fails if product remains the real upstream dependency.

### Risk 4. Making Every New Output Test-Shaped

Why dangerous:

- Explanations, lesson plans, differentiation, and simulation are not assessment preview variants.

## One-Sentence Handoff

We are moving from a session- and product-centric Pavilion runtime to a Blueprint-centric runtime with stateless execution and durable artifacts: Blueprint becomes the canonical orchestration artifact, sessions become thin envelopes, and every teacher-facing output is generated from Blueprint plus explicit inputs rather than preview payloads, session-owned working state, or latest-product inference.