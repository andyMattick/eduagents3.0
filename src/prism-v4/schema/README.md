# PRISM v4 Schema

This folder contains the canonical schema categories for the greenfield PRISM v4 architecture.

Structure:

- `domain/` - `Problem`, `Unit`, `Assignment`, `Assessment`, `ProblemGroup`, `ProblemScore`
- `semantic/` - `ProblemTagVector`, `DocumentSemanticInsights`, `AzureExtractResult`, `TaggingPipelineInput`, `TaggingPipelineOutput`
- `integration/` - `StudentPersona`, `ClassProfile`, `ClassInput`, `PRISMRequest`, `PRISMResponse`, `DifficultyInference`, `MisconceptionDefinition`
- `view/` - `Insight`, `Recommendation`, `ReteachTarget`, `JourneySummary`, `AssignmentAggregate`, `UnitAggregate`, `ClassAggregate`

Rules:

- Every schema has one owning category.
- Schemas may be consumed across layers through explicit boundaries.
- Domain and semantic models are the source of truth for local state.
- Integration models are used to assemble and exchange PRISM payloads.
- View models are ephemeral render projections and are not persisted as business truth.

These files are placeholders until the schema definitions are provided. The folder structure is authoritative.