# Boundary Guardrails

Any change to PRISM extraction, ingestion, v4_items metadata, or Phase C loader must keep boundary tests passing.

If a change alters the A->B, B->C, or C->D contract shape, update boundary tests and downstream phase consumers in the same change.

## Active boundary suite

- tests/phase-a/segmentation.boundary.test.ts
- tests/phase-b/analysis.boundary.test.ts
- tests/phase-c/engine.boundary.test.ts
- tests/phase-d/alignment.boundary.test.ts
- tests/e2e/simulate-assessment.e2e.test.ts
