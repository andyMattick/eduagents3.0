## PRISM v4

PRISM v4 exists to prevent simulation-era architecture from leaking back into the product.

The app's job is to prepare canonical data, persist domain truth, assemble integration payloads, and render PRISM results.
PRISM's job is to perform learner-performance inference.

### Phase 1 Completion Standard

Phase 1 is complete only when a new engineer can determine, within minutes, all of the following without contradiction:

- what the app does
- what PRISM does
- where every schema lives
- which layer owns each schema
- what each layer may consume
- what each layer must never contain
- why local simulation logic cannot leak back in

If any of those answers are fuzzy, Phase 1 is not complete.

### Source Of Truth

- Domain schemas are the source of truth for teacher-authored and system-managed business data.
- Semantic schemas are the source of truth for content-derived annotations.
- Integration schemas are the source of truth for PRISM request and response contracts.
- View schemas are rendering projections only and are not persisted as business truth.
- `ClassInput` is not a domain object.
- ClassInput is not a domain object.

### Naming Guardrails

- `content_complexity` is the only allowed local difficulty-like concept for content-derived complexity.
- `predicted_difficulty` belongs only at the PRISM response boundary.
- Bare `difficulty` must not be introduced in PRISM v4 local schemas.
- Simulation-era names such as `astronaut`, `playtest`, and local `simulateStudents` behavior must not appear in PRISM v4 contracts.

### Immutable Contract Exceptions

Some canonical PRISM schema placeholders intentionally retain historical contract names until the external contract is formally revised. These exceptions are allowed only in their owning PRISM schema files and must not spread into application-local models, UI copy, or new schema surfaces.

This repository treats immutable PRISM schema placeholders as explicit contract exceptions, not as a license to reintroduce those names elsewhere.

Examples include:

- `difficultyProfile`, `averageDifficulty`, and related difficulty rollups inside canonical PRISM schema placeholders
- `simulationTask` inside the canonical semantic tag-vector placeholder
- response-boundary difficulty inference collections such as `difficultyInferences`

### No-Simulation Rules

- The application must not perform local learner-performance inference.
- The application must not approximate PRISM.
- The application must not compute fallback analytics that mimic PRISM output.
- PRISM is the only inference engine.

### Validation

- `npm run phase1:check` validates PRISM Phase 1 structure, ownership docs, and forbidden schema drift.
- `npm run phase3:check` runs the Phase 3 semantic test suite and validates semantic-only boundaries.
- `npm run v4:heatmap` reports repo-wide v3-era drift signals outside canonical allowlists.
- `npm run legacy:report:strict` reports legacy pipeline drift outside PRISM v4.

## Phase 2 → Phase 3 Handoff Contract

Phase 2 produces the following canonical structure:

### AzureExtractResult
{
  fileName: string;
  content: string;
  pages: { pageNumber: number; text: string }[];
  paragraphs: { text: string; pageNumber: number }[];
  tables: any[];
}

### Segmented Sections
[
  {
    sectionId: string;
    title?: string;
    text: string;
  }
]

### Phase 3 Input
Phase 3 receives:

{
  documentId: string;
  fileName: string;
  azureExtract: AzureExtractResult;
  sections: Section[];
}

Phase 3 must not call Azure or modify ingestion logic.
Phase 2 must not perform semantic tagging or problem extraction.
