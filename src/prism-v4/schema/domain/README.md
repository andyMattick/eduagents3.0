# Domain Schemas

## Owns

Domain owns persisted, teacher-facing, and system-managed business objects.

## May Consume

Domain may consume stable primitives and internal utility types. It must not depend on view models and must not depend on PRISM response projections.

## Must Never Contain

- PRISM transport contracts
- render-only projections
- local simulation outputs
- inferred learner-performance analytics

## Must Never Do

- approximate PRISM
- persist view-only data as business truth
- redefine integration payloads

## Source Of Truth

Domain is the source of truth for teacher-authored and system-managed business data.

## Canonical Files

- `Problem.ts`
- `Unit.ts`
- `Assignment.ts`
- `Assessment.ts`
- `ProblemGroup.ts`
- `ProblemScore.ts`
