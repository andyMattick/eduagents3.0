# Downstream Alignment Completion Directive

**Status**: Writer, Gatekeeper, Builder, Scribe are aligned with new Architect V3 slot metadata flow. Complete the final 4 tasks without modifying existing code paths.

## Task 1: Finalize the Writer Contract

**What**: Extend `GeneratedItem.metadata` into a typed `WriterItemMetadata` object.

**Where**: 
- `src/pipeline/agents/writer/types.ts` or `src/pipeline/agents/writer/types/WriterItemMetadata.ts`

**What to add**:
```typescript
export interface WriterItemMetadata {
  // Routing + provenance
  generationMethod: "template" | "diagram" | "image" | "llm";
  templateId: string | null;
  diagramType: string | null;
  imageReferenceId: string | null;

  // Cognitive + difficulty
  difficulty: "easy" | "medium" | "hard";
  cognitiveDemand: string | null;

  // Style + structure
  topicAngle: string | null;
  pacingSeconds: number | null;

  // Blueprint alignment
  slotId: string;
  questionType: string;

  // Optional future fields
  sectionId?: string | null;
  passageId?: string | null;
}
```

**Update GeneratedItem**:
```typescript
export interface GeneratedItem {
  slotId: string;
  questionType: string;
  prompt: string;

  options?: string[];
  answer?: string;
  passage?: string;
  questions?: Array<{ prompt: string; answer: string }>;

  metadata: WriterItemMetadata;  // <-- typed, not Record<string, any>
}
```

**Acceptance criteria**:
- Writer always populates all WriterItemMetadata fields
- Gatekeeper reads from `item.metadata`, not blueprint
- Scribe reads from `item.metadata`, not blueprint

---

## Task 2: Implement Diagram & Image Rendering in Builder

**What**: Builder already receives `diagramType`, `imageReferenceId`, `media`, `constraints`. Now render them.

**Where**: `src/pipeline/agents/builder/index.ts`

**What to add**:
- For `generationMethod === "diagram"`: call diagram renderer, attach rendered asset
- For `generationMethod === "image"`: resolve asset from `imageReferenceId`, attach to output
- Do NOT change section grouping or metadata plumbing

**Acceptance criteria**:
- FinalAssessmentItem includes `diagram` or `imageUrl` field when applicable
- Diagram/image metadata flows into final assessment without breaking rendering
- No changes to existing item structure

---

## Task 3: Expand Gatekeeper to Enforce Blueprint Policy Fields

**What**: Gatekeeper currently validates template/diagram/image IDs. Add enforcement for depth, distribution, pacing, ordering.

**Where**: `src/pipeline/agents/gatekeeper/Gatekeeper.ts`

**What to add**:
- Validate `depthFloor` / `depthCeiling` from blueprint
- Validate `distribution` (question type, difficulty, cognitive demand)
- Validate `pacingSeconds` per item and aggregate
- Validate `ordering` constraints if present

**New violation types**:
```
violates_depth_floor
violates_depth_ceiling
violates_distribution
violates_pacing
violates_ordering
```

**Acceptance criteria**:
- Gatekeeper emits structured policy violations
- Philosopher rewrite instructions consume these violations directly
- No changes to existing template/diagram/image validation

---

## Task 4: Persist Scribe Journal Rows into Governed Supabase Tables

**What**: Write per-run and per-slot journal rows for auditability and learning.

**Where**: 
- `src/pipeline/agents/scribe/SCRIBE.ts` 
- `src/system/dossier/updateWriterAgentDossier.ts`

**Supabase schema**:
See `SUPABASE_JOURNAL_SCHEMA.sql` in this directory.

**What to add**:
- Insert to `writer_runs` after each Writer execution
- Insert to `writer_run_slots` for each slot
- Add governed APIs for teacher/course profile mutation
- Ensure updates are additive and never overwrite teacher intent

**Acceptance criteria**:
- Per-run journal rows with aggregate stats
- Per-slot journal rows with full Writer output + Gatekeeper status
- Scribe safely mutates teacher/course profiles using journal data
- All updates are auditable and traceable

---

## Constraints
- Do not modify Writer prompt logic or slot normalization
- Do not change Builder's section grouping or orchestrator plumbing
- Do not remove or refactor any alignment work already completed
- All changes must be additive, type-safe, and governed

## Success Criteria
1. TypeScript build passes with no errors
2. All 4 tasks complete without breaking existing pipelines
3. Metadata flows cleanly from Writer → Gatekeeper → Builder → Scribe
4. Journal schema is deployed and Scribe writes to it successfully
