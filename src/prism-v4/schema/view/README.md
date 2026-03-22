# View Schemas

## Owns

View owns reporting-only display models derived from PRISM output.

## May Consume

View may consume integration responses and stable identifiers needed to render dashboards and reports.

## Must Never Contain

- persisted business truth
- new pedagogical inference
- local simulation logic
- source-of-truth domain ownership

## Must Never Do

- compute fallback analytics
- invent learner-performance signals locally
- become a persistence contract

## Source Of Truth

View is a render projection only. It is not persisted as business truth.

## Canonical Files

- `Insight.ts`
- `Recommendation.ts`
- `ReteachTarget.ts`
- `JourneySummary.ts`
- `AssignmentAggregate.ts`
- `UnitAggregate.ts`
- `ClassAggregate.ts`
