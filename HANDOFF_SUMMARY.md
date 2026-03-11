# Downstream Alignment Completion — Handoff Summary

## Current State

You've completed the hardest part: aligning Writer → Gatekeeper → Builder → Scribe with the new Architect V3 slot-driven pipeline.

**What's already working**:
- ✅ Orchestrator forwards full slot metadata to Builder
- ✅ Builder merges slot metadata into item.metadata and exposes section structure
- ✅ Gatekeeper validates template/diagram/image slot compliance
- ✅ Philosopher detects Bloom drift and triggers rewrites
- ✅ Scribe dossier tracks templateSlotsUsed, diagramSlotsUsed, imageSlotsUsed, sectionCount

**What's still pending** (final 4 tasks):
1. Formalize `GeneratedItem.metadata` into a typed `WriterItemMetadata` interface
2. Implement diagram/image rendering in Builder
3. Expand Gatekeeper to enforce blueprint policy fields (depth, distribution, pacing)
4. Persist journal rows to Supabase for auditable, safe learning

---

## Artifacts Provided to AI Coder

### 1. AI_CODER_DIRECTIVE.md
**Location**: `/workspaces/eduagents3.0/AI_CODER_DIRECTIVE.md`

**Contains**:
- Clear 4-task breakdown
- Exact file paths for each change
- Code snippets for Task 1 (WriterItemMetadata)
- Acceptance criteria for each task
- Constraints (no existing code modifications unless required)

### 2. WriterItemMetadata.ts
**Location**: `/workspaces/eduagents3.0/WriterItemMetadata.ts`

**Contains**:
- TypeScript interface for `WriterItemMetadata`
- Fields: generationMethod, templateId, diagramType, imageReferenceId, difficulty, cognitiveDemand, topicAngle, pacingSeconds, slotId, questionType, sectionId, passageId
- Helper function: `ensureMetadata()` for safe defaulting

**How to use it**:
1. Import into `src/pipeline/agents/writer/types.ts` (or create new file in writer/types/)
2. Update `GeneratedItem.metadata: WriterItemMetadata` (not Record<string, any>)
3. Writer, Gatekeeper, Builder, Scribe all read from this typed shape

### 3. SUPABASE_JOURNAL_SCHEMA.sql
**Location**: `/workspaces/eduagents3.0/SUPABASE_JOURNAL_SCHEMA.sql`

**Contains**:
- `writer_runs` table (per-run aggregate stats)
- `writer_run_slots` table (per-slot audit trail)
- `teacher_style_patterns` table (learned patterns)
- `course_concept_clusters` table (concept graph)
- Indexes and optional RLS policies

**How to use it**:
1. Run this SQL against your Supabase database
2. Update Scribe to insert rows after each Writer run
3. Update teacher/course profile mutation to read from journal tables

---

## Task Sequence for AI Coder

**Do them in this order**:

1. **WriterItemMetadata** (Task 1)
   - Creates the typed contract
   - Unblocks Tasks 2, 3, 4
   - Fastest to implement (1-2 files, 50 lines)

2. **Diagram/Image Rendering** (Task 2)
   - Uses metadata already plumbed
   - Makes template/diagram/image flow visible in UI
   - Medium complexity (50-100 lines)

3. **Gatekeeper Policy Enforcement** (Task 3)
   - Adds depth/distribution/pacing/ordering checks
   - Uses existing validation infrastructure
   - Medium complexity (50-100 lines)

4. **Supabase Journal Persistence** (Task 4)
   - Uses SQL schema already provided
   - Wires Scribe output to database
   - Medium complexity (100-150 lines)

---

## Success Criteria

**All 4 tasks complete when**:
1. ✅ `npm run build` succeeds with zero TypeScript errors
2. ✅ `npm test` passes (if tests exist)
3. ✅ `GeneratedItem.metadata` is typed as `WriterItemMetadata` everywhere
4. ✅ Gatekeeper reads `item.metadata` instead of re-deriving from blueprint
5. ✅ Builder renders diagrams/images using `diagramType`/`imageReferenceId`
6. ✅ Builder attaches rendered assets to `FinalAssessmentItem`
7. ✅ Gatekeeper emits policy violations (depth, distribution, pacing, ordering)
8. ✅ Scribe inserts to `writer_runs` and `writer_run_slots` after each run
9. ✅ Journal tables are populated correctly in Supabase
10. ✅ All changes are additive (no existing code removed/refactored)

---

## Key Context for AI Coder

**Why this matters**:
- WriterItemMetadata = single source of truth for all downstream agents
- Supabase journal = deterministic, auditable learning substrate
- Together = governable, safe teacher profile evolution

**What NOT to do**:
- Do not modify Writer prompt logic or slot normalization
- Do not change Builder's section grouping or orchestrator plumbing
- Do not remove/refactor alignment work already completed
- Do not create new agent paths; use existing ones

**Where the types live**:
```
src/pipeline/agents/writer/types.ts           ← GeneratedItem
src/pipeline/agents/writer/types/             ← WriterItemMetadata (new)
src/pipeline/agents/builder/                  ← diagram/image rendering
src/pipeline/agents/gatekeeper/               ← policy enforcement
src/pipeline/agents/scribe/                   ← journal persistence
src/system/dossier/                           ← dossier updates
```

**Useful existing patterns**:
- Builder already calls `groupItemsBySection()` → use same pattern for diagram/image
- Gatekeeper already validates `templateId` → extend pattern for policy fields
- Scribe already updates `dossier.generationStats` → extend to journal inserts

---

## Questions for AI Coder

If stuck, check:
1. Are imports using the correct relative paths?
2. Is metadata always populated from Writer output?
3. Is Gatekeeper reading `item.metadata`, not deriving anything?
4. Is Supabase schema deployed before Scribe tries to insert?
5. Are all new fields nullable to avoid breaking existing runs?

**Ready to roll.**
