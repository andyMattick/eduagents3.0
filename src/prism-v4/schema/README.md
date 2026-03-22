# PRISM v4 Schema

This folder contains the canonical schema categories for PRISM v4.

## Structure

- `domain/` owns teacher-authored and system-managed business objects.
- `semantic/` owns content-derived annotations and semantic normalization.
- `integration/` owns PRISM assembly and transport contracts.
- `view/` owns reporting-only render projections.

## Authoritative Rules

- Every schema has one home.
- Every schema has one owner.
- Cross-layer consumption is explicit, never implied.
- View models are not persisted.
- `ClassInput` is an integration model, not a domain model.
- PRISM is the only learner-performance inference engine.

## Naming Rules

- Use `content_complexity` for local content-derived difficulty-like meaning.
- Reserve `predicted_difficulty` for the PRISM response boundary.
- Do not introduce bare `difficulty` in PRISM v4 local schemas.
- Do not introduce simulation-era names into PRISM v4 contracts.

## Immutable Exceptions

Canonical PRISM placeholder contracts may retain legacy field names when those names are part of the external PRISM contract surface. Those exceptions must be explicitly allowlisted in the Phase 1 checker and must never be copied into new local models.

## Completion Test

Phase 1 is complete only when engineers can answer, without hesitation, where a schema lives, who owns it, what may consume it, and what it must never do.