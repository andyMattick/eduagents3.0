# Teacher Studio Schema And Route Spec

## Purpose

This document translates the architecture reset into an implementation-level spec for persistence, TypeScript contracts, store boundaries, and API routes.

It is designed to fit the current repo shape instead of replacing it.

Current persistence patterns already exist in:

- `prism_v4_sessions`
- `prism_v4_documents`
- `prism_v4_analyzed_documents`
- `prism_v4_collection_analyses`
- `prism_v4_intent_products`

Current store boundary already exists in:

- `src/prism-v4/documents/registryStore.ts`

The recommendation is to extend that artifact-store pattern rather than introduce an unrelated persistence system.

## Design Principle

Reuse the current `prism_v4_*` artifact model, but change the ownership chain.

Current ownership chain:

`session -> latest product -> reconstructed blueprint -> derived views`

Target ownership chain:

`session -> active blueprint id -> blueprint version -> output artifacts`

Sessions remain navigational envelopes.

Blueprints and outputs become first-class artifacts.

## Current State To Preserve

These current tables are already aligned with the target design and should stay:

### Keep

- `public.prism_v4_sessions`
- `public.prism_v4_documents`
- `public.prism_v4_analyzed_documents`
- `public.prism_v4_collection_analyses`
- `public.assessment_fingerprints`
- `public.unit_fingerprints`

### Reposition

- `public.prism_v4_intent_products`

Why:

- It should remain as a legacy output store during migration.
- It should stop acting as upstream truth for the new teacher path.

## Proposed Persistence Model

## 1. Extend `prism_v4_sessions`

Do not delete the current columns immediately. Add new ones and migrate usage.

### New columns

```sql
alter table public.prism_v4_sessions
  add column if not exists active_blueprint_id text,
  add column if not exists active_target jsonb not null default '{}'::jsonb,
  add column if not exists output_ids jsonb not null default '[]'::jsonb,
  add column if not exists studio_state_version integer not null default 1;
```

### Intended meaning

- `active_blueprint_id`: pointer to the blueprint the teacher is currently editing or generating from
- `active_target`: selected student, class, unit, or teacher scope for the Studio run
- `output_ids`: list of generated Studio outputs associated with this session
- `studio_state_version`: migration guard for the thin-envelope model

### Important note

The existing `document_ids`, `document_roles`, and `session_roles` stay.

The session record remains useful, but it no longer owns preview, builder plan, concept map, or product-derived runtime truth.

## 2. Add `prism_v4_blueprints`

This table owns the stable identity of a blueprint family.

```sql
create table if not exists public.prism_v4_blueprints (
  blueprint_id text primary key,
  session_id text not null,
  analysis_session_id text not null,
  teacher_id text,
  unit_id text,
  active_version integer not null default 1,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id) references public.prism_v4_sessions(session_id) on delete cascade,
  foreign key (analysis_session_id) references public.prism_v4_collection_analyses(session_id) on delete cascade
);

create index if not exists idx_prism_v4_blueprints_session_id
  on public.prism_v4_blueprints(session_id, updated_at desc);

create index if not exists idx_prism_v4_blueprints_teacher_unit
  on public.prism_v4_blueprints(teacher_id, unit_id, updated_at desc);
```

### Why separate blueprint identity from blueprint version

- A teacher needs a stable blueprint id to edit over time.
- Individual versions need immutable snapshots.
- Outputs need lineage to a specific version, not just a mutable blueprint id.

## 3. Add `prism_v4_blueprint_versions`

This table stores immutable blueprint snapshots.

```sql
create table if not exists public.prism_v4_blueprint_versions (
  blueprint_id text not null,
  version integer not null,
  analysis_snapshot jsonb not null default '{}'::jsonb,
  blueprint_json jsonb not null default '{}'::jsonb,
  editor_context jsonb not null default '{}'::jsonb,
  lineage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (blueprint_id, version),
  foreign key (blueprint_id) references public.prism_v4_blueprints(blueprint_id) on delete cascade
);

create index if not exists idx_prism_v4_blueprint_versions_created_at
  on public.prism_v4_blueprint_versions(created_at desc);
```

### Column meanings

- `analysis_snapshot`: optional frozen analysis projection used to make the version self-describing
- `blueprint_json`: canonical `BlueprintModel` plus Studio metadata
- `editor_context`: teacher choices or UI edit metadata that produced the version
- `lineage`: pointers such as parent version, creation mode, seed source

### Why store `analysis_snapshot`

For the first implementation slice, it reduces lookup complexity and makes debugging easier.

Longer term, this could be slimmed if analysis lookup by `analysis_session_id` is sufficient.

## 4. Add `prism_v4_outputs`

This table stores teacher-facing generated outputs from a specific blueprint version.

```sql
create table if not exists public.prism_v4_outputs (
  output_id text primary key,
  session_id text not null,
  blueprint_id text not null,
  blueprint_version integer not null,
  output_type text not null,
  target_type text,
  target_id text,
  teacher_id text,
  unit_id text,
  options jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  render_model jsonb not null default '{}'::jsonb,
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id) references public.prism_v4_sessions(session_id) on delete cascade,
  foreign key (blueprint_id) references public.prism_v4_blueprints(blueprint_id) on delete cascade,
  foreign key (blueprint_id, blueprint_version) references public.prism_v4_blueprint_versions(blueprint_id, version) on delete cascade
);

create index if not exists idx_prism_v4_outputs_session_id
  on public.prism_v4_outputs(session_id, created_at desc);

create index if not exists idx_prism_v4_outputs_blueprint
  on public.prism_v4_outputs(blueprint_id, blueprint_version, created_at desc);

create index if not exists idx_prism_v4_outputs_target
  on public.prism_v4_outputs(target_type, target_id, created_at desc);
```

### Why both `payload` and `render_model`

- `payload` is the canonical generated output artifact.
- `render_model` gives the frontend a stable, normalized view model without forcing UI code to parse raw output payloads.

For the first slice, these may temporarily be identical.

## 5. Optional Later Table: `prism_v4_output_edits`

This is not required for the first slice.

Add only when teacher-authored output revision history matters.

## Proposed TypeScript Contracts

These contracts should live close to the current session and integration contracts, for example under a new Studio or artifact folder.

## 1. Session Envelope

```ts
export interface TeacherStudioSessionEnvelope {
  sessionId: string;
  documentIds: string[];
  activeBlueprintId?: string;
  activeTarget?: {
    targetType?: "student" | "class" | "unit" | "teacher";
    targetId?: string;
    teacherId?: string;
    unitId?: string;
  };
  outputIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

## 2. Blueprint Artifacts

```ts
export interface BlueprintArtifact {
  blueprintId: string;
  sessionId: string;
  analysisSessionId: string;
  teacherId?: string;
  unitId?: string;
  activeVersion: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface BlueprintVersionArtifact {
  blueprintId: string;
  version: number;
  blueprint: BlueprintModel;
  analysisSnapshot?: InstructionalAnalysis;
  editorContext?: {
    source: "seed" | "teacher-edit" | "regeneration";
    note?: string;
    changedFields?: string[];
  };
  lineage?: {
    parentVersion?: number;
    createdFrom?: "analysis" | "assessment-output" | "teacher-edit";
  };
  createdAt: string;
}
```

## 3. Output Artifacts

```ts
export type TeacherStudioOutputType =
  | "assessment"
  | "practice"
  | "explanations"
  | "lesson-plan"
  | "differentiation"
  | "simulation"
  | "class-insights";

export interface TeacherStudioOutputArtifact<TPayload = unknown, TRenderModel = unknown> {
  outputId: string;
  sessionId: string;
  blueprintId: string;
  blueprintVersion: number;
  outputType: TeacherStudioOutputType;
  targetType?: "student" | "class" | "unit" | "teacher";
  targetId?: string;
  teacherId?: string;
  unitId?: string;
  options: Record<string, unknown>;
  payload: TPayload;
  renderModel: TRenderModel;
  status: "ready" | "failed" | "stale";
  createdAt: string;
  updatedAt: string;
}
```

## 4. First-Slice Assessment Contracts

```ts
export interface AssessmentOutputPayload {
  kind: "assessment-output";
  title: string;
  overview?: string;
  sections: Array<{
    conceptId: string;
    conceptName: string;
    items: Array<{
      itemId: string;
      stem: string;
      options?: string[];
      answer?: string;
      bloom: string;
      difficulty: string;
      mode: string;
      scenario: string;
      sourceDocumentId?: string;
      primaryConcepts?: string[];
    }>;
  }>;
}

export interface AssessmentRenderModel {
  title: string;
  overview?: string;
  itemCount: number;
  sections: Array<{
    title: string;
    itemCount: number;
    items: Array<{
      itemId: string;
      stem: string;
      metadata: {
        bloom: string;
        difficulty: string;
        mode: string;
        scenario: string;
      };
    }>;
  }>;
}
```

## Proposed Store Layer Additions

Implement these as additions to `src/prism-v4/documents/registryStore.ts` or as a sibling `studioStore.ts` if separation is preferred.

## Blueprint store functions

```ts
getBlueprintStore(blueprintId: string)
getBlueprintVersionStore(blueprintId: string, version?: number)
listBlueprintsForSessionStore(sessionId: string)
createBlueprintStore(args)
saveBlueprintVersionStore(args)
setActiveBlueprintForSessionStore(sessionId: string, blueprintId: string)
```

## Output store functions

```ts
getStudioOutputStore(outputId: string)
listStudioOutputsForSessionStore(sessionId: string)
listStudioOutputsForBlueprintStore(blueprintId: string)
saveStudioOutputStore(args)
markStudioOutputStaleStore(outputId: string)
```

## Session envelope helpers

```ts
updateStudioSessionEnvelopeStore(sessionId: string, patch)
appendOutputToSessionStore(sessionId: string, outputId: string)
setActiveTargetForSessionStore(sessionId: string, target)
```

## Proposed Route Family

Use a new `api/v4/studio/*` family so the new runtime is explicit and does not quietly inherit old session semantics.

## 1. Session envelope

### `GET /api/v4/studio/sessions/:sessionId`

Returns the thin Studio session envelope.

Response:

```json
{
  "sessionId": "session-123",
  "documentIds": ["doc-1", "doc-2"],
  "activeBlueprintId": "blueprint-123",
  "activeTarget": {
    "targetType": "class",
    "targetId": "class-7A",
    "teacherId": "teacher-1",
    "unitId": "unit-3"
  },
  "outputIds": ["output-1", "output-2"],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### `PATCH /api/v4/studio/sessions/:sessionId`

Accepts only thin-envelope fields:

- `activeBlueprintId`
- `activeTarget`
- `outputIds`

Why:

- This prevents the session endpoint from turning back into a working-state dump.

## 2. Analysis access

### `GET /api/v4/studio/sessions/:sessionId/analysis`

Returns the existing persisted collection analysis artifact from `prism_v4_collection_analyses`.

This is mostly a pass-through route for Studio and should not create additional derived state.

## 3. Blueprint routes

### `POST /api/v4/studio/sessions/:sessionId/blueprints`

Creates a new blueprint family and version `1`.

Request body:

```json
{
  "teacherId": "teacher-1",
  "unitId": "unit-3",
  "seedMode": "analysis",
  "options": {
    "itemCount": 12
  }
}
```

Server flow:

1. Load collection analysis.
2. Load teacher or unit fingerprint if supplied.
3. Build `BlueprintModel`.
4. Persist blueprint identity.
5. Persist blueprint version `1`.
6. Set session `active_blueprint_id`.

Response:

```json
{
  "blueprint": { "blueprintId": "blueprint-123", "activeVersion": 1 },
  "version": { "version": 1, "blueprint": {} }
}
```

### `GET /api/v4/studio/blueprints/:blueprintId`

Returns blueprint identity plus active version.

### `GET /api/v4/studio/blueprints/:blueprintId/versions/:version`

Returns one immutable blueprint version.

### `POST /api/v4/studio/blueprints/:blueprintId/versions`

Creates a new blueprint version from a patch.

Request body:

```json
{
  "patch": {
    "concepts": [],
    "bloomLadder": [],
    "modeMix": [],
    "scenarioMix": []
  },
  "editorContext": {
    "source": "teacher-edit",
    "note": "Increased fractions emphasis"
  }
}
```

Server flow:

1. Load active version.
2. Merge patch via existing blueprint merge semantics.
3. Persist next immutable version.
4. Update `active_version` on blueprint identity.
5. Update session `active_blueprint_id` if needed.

### `POST /api/v4/studio/sessions/:sessionId/active-blueprint`

Switches the active blueprint pointer for the session.

## 4. Output routes

### `POST /api/v4/studio/blueprints/:blueprintId/outputs/assessment`

First vertical-slice route.

Request body:

```json
{
  "version": 3,
  "teacherId": "teacher-1",
  "unitId": "unit-3",
  "studentId": "student-8",
  "options": {
    "itemCount": 10,
    "adaptiveConditioning": true
  }
}
```

Server flow:

1. Load blueprint version.
2. Load analysis.
3. Load fingerprints or target profile.
4. Build assessment output directly from blueprint plus explicit inputs.
5. Persist output artifact.
6. Append `output_id` to session.

Response:

```json
{
  "output": {
    "outputId": "output-1",
    "outputType": "assessment",
    "blueprintId": "blueprint-123",
    "blueprintVersion": 3,
    "payload": {},
    "renderModel": {}
  }
}
```

### `GET /api/v4/studio/outputs/:outputId`

Returns a concrete output artifact.

### `GET /api/v4/studio/sessions/:sessionId/outputs`

Lists outputs for the session.

### Future routes

These follow the same shape:

- `POST /api/v4/studio/blueprints/:blueprintId/outputs/practice`
- `POST /api/v4/studio/blueprints/:blueprintId/outputs/explanations`
- `POST /api/v4/studio/blueprints/:blueprintId/outputs/lesson-plan`
- `POST /api/v4/studio/blueprints/:blueprintId/outputs/differentiation`
- `POST /api/v4/studio/blueprints/:blueprintId/outputs/simulation`
- `POST /api/v4/studio/blueprints/:blueprintId/outputs/class-insights`

## Resolver Refactor Plan

Current resolver to retire from the teacher path:

- `src/prism-v4/session/resolveInstructionalAssessmentRuntime.ts`

Reason:

- It resolves runtime by scanning session products and creating a product if one does not exist.

New resolver family to introduce:

```ts
resolveStudioBlueprintRuntime(args: {
  blueprintId: string;
  version?: number;
  teacherId?: string;
  unitId?: string;
  studentId?: string;
  classId?: string;
})
```

Return shape:

```ts
interface ResolvedStudioBlueprintRuntime {
  session: TeacherStudioSessionEnvelope;
  blueprint: BlueprintArtifact;
  blueprintVersion: BlueprintVersionArtifact;
  analysis: InstructionalAnalysis;
  teacherFingerprint: TeacherFingerprint | null;
  unitFingerprint: UnitFingerprint | null;
  studentPerformanceProfile: StudentPerformanceProfile | null;
  classProfile: ClassProfileModel | null;
}
```

### Derived-view builders that can remain pure

These should be recomputed from the runtime above:

- concept map builder
- builder plan builder
- assessment builder
- practice builder
- explanation builder
- simulation builder

The key rule is that none of them are allowed to begin from `IntentProduct` as source-of-truth input.

## Frontend Contract Plan

## New hook

Add a new Studio hook instead of extending `useInstructionalSession`.

Suggested shape:

```ts
interface TeacherStudioState {
  session: TeacherStudioSessionEnvelope | null;
  analysis: InstructionalAnalysis | null;
  activeBlueprint: BlueprintVersionArtifact | null;
  outputs: TeacherStudioOutputArtifact[];
  isLoading: boolean;
  error: string | null;
}
```

Suggested actions:

```ts
createOrLoadStudioSession()
loadStudioSession(sessionId)
loadAnalysis(sessionId)
createBlueprint(sessionId, args)
saveBlueprintVersion(blueprintId, patch)
setActiveBlueprint(sessionId, blueprintId)
generateAssessmentOutput(blueprintId, args)
listOutputs(sessionId)
loadOutput(outputId)
```

## What the frontend must stop loading by default

- session-scoped `assessmentPreview`
- session-scoped `builderPlan`
- session-scoped `conceptMap`
- Pavilion draft gallery
- session `products` as runtime truth

## File-Level Implementation Map

### Database

- add a new migration file under `supabase/`
- update `supabase/schema.sql` after the migration is settled

### Store layer

- extend `src/prism-v4/documents/registryStore.ts`
- optionally split Studio-specific persistence into `src/prism-v4/studio/studioStore.ts`

### Contracts

- add Studio artifact contracts under `src/prism-v4/studio/`
- keep `BlueprintModel` reusable from `src/prism-v4/session/InstructionalIntelligenceSession.ts`

### API routes

- add `api/v4/studio/sessions/[sessionId].ts`
- add `api/v4/studio/sessions/[sessionId]/analysis.ts`
- add `api/v4/studio/sessions/[sessionId]/blueprints.ts`
- add `api/v4/studio/sessions/[sessionId]/outputs.ts`
- add `api/v4/studio/blueprints/[blueprintId].ts`
- add `api/v4/studio/blueprints/[blueprintId]/versions/[version].ts`
- add `api/v4/studio/blueprints/[blueprintId]/versions.ts`
- add `api/v4/studio/blueprints/[blueprintId]/outputs/assessment.ts`
- add `api/v4/studio/outputs/[outputId].ts`

### Runtime

- add `src/prism-v4/studio/resolveStudioBlueprintRuntime.ts`
- add `src/prism-v4/studio/buildAssessmentOutput.ts`
- later add other output builders alongside it

### Frontend

- add `src/hooks/useTeacherStudioRun.ts`
- add `src/components_new/v4/TeacherStudioView.tsx` or equivalent new route surface

## Migration Strategy

## Step 1. Add artifacts without deleting old behavior

Ship:

- `prism_v4_blueprints`
- `prism_v4_blueprint_versions`
- `prism_v4_outputs`
- new session envelope columns

Do not remove:

- `prism_v4_intent_products`
- old session routes
- Pavilion routes

## Step 2. Build the first Studio assessment slice

Ship:

- create blueprint route
- save blueprint version route
- assessment output route
- new frontend hook and route

## Step 3. Flip the default teacher entry point

Point the teacher-facing flow to Studio, not Pavilion.

## Step 4. Deprecate product-first session routes for teacher use

Keep them available only for advanced or legacy flows until migration is complete.

## Acceptance Criteria For This Spec

The schema-and-route implementation is correct when:

1. A session can point to an active blueprint without storing preview or builder plan state.
2. A blueprint can be versioned independently of any generated product.
3. An assessment output can be generated from a blueprint version without scanning session products.
4. An output artifact records lineage to blueprint id and blueprint version.
5. Frontend Studio state can be reconstructed entirely from session envelope, blueprint artifacts, analysis, and output artifacts.

## Recommended First PR Scope

Keep the first PR narrow.

### Include

- migration for the three new artifact tables and session columns
- store functions for blueprint and output persistence
- one runtime resolver for blueprint-based assessment generation
- one assessment output route
- one thin Studio session route
- one basic Studio frontend surface that can:
  - load analysis
  - create blueprint
  - edit blueprint
  - generate assessment output
  - render assessment output

### Exclude

- practice
- explanations
- lesson plans
- differentiation
- simulation
- Pavilion deletion
- preview deletion

Why:

- The first PR should prove the runtime inversion cleanly.
- It should not try to finish the whole product reset in one pass.