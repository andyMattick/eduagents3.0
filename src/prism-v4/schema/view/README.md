# View Schemas

Authoritative view schema files:

- `Insight.ts`
- `Recommendation.ts`
- `ReteachTarget.ts`
- `JourneySummary.ts`
- `AssignmentAggregate.ts`
- `UnitAggregate.ts`
- `ClassAggregate.ts`# View Schemas

Owns reporting-only display models derived from PRISM output.

Typical contents:

- insights
- recommendations
- reteach targets
- journey summaries
- assignment, unit, and class aggregates

Rules:

- Derived from `PRISMResponse` for rendering.
- May sort, group, filter, format, and roll up data for display.
- Must not add new pedagogical, predictive, or analytic meaning.
- Not persisted as business truth.
