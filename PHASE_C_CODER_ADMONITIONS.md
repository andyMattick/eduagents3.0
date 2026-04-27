# Phase C Coder Admonitions

Read this before editing any Phase C code.

## 1) Do not call old pipelines

Phase C must not import or call legacy simulation, class-profile, preparedness/compare, or student performance inference code.

Do not reuse:
- v3/v2 simulation logic
- prism-v4 studentPerformance logic for inference
- old single-profile class adjustment helpers
- preparedness/compare response models

Phase C is additive and standalone.

## 2) No floating modules

Every Phase C module must be wired end-to-end:
- types -> generator -> store -> engine -> API
- schema names must match DB columns
- API and store types must remain aligned

No dead exports or orphaned files.

## 3) Keep Phase C separate from Phase D

Phase C does not compute:
- mastery
- misconceptions
- exposure
- correctness rollups
- score prediction loops

Phase C is cognitive-load simulation output only.

## 4) Do not modify Phase B

Phase C consumes Phase B measurables. It does not alter segmentation or measurable generation behavior.

## 5) Always simulate synthetic students

Never run Phase C as a single class profile. All simulation paths use synthetic students.

## 6) Preserve generation order

Required order:
1. class-level priors
2. learning profile deltas
3. positive trait deltas
4. jitter
5. clamp traits
6. compute biases
7. apply core formulas
8. apply biases
9. persist results

Changing order changes model behavior.

## 7) Persist only in Phase C tables

Write results to:
- simulation_runs
- simulation_results

Do not write simulation outputs into student performance or legacy tables.

## 8) Use Phase C types only

Use Phase C model types for this pipeline. Do not reuse unrelated pipeline payload types.

## 9) Keep knobs configurable

Do not inline constants in business logic for:
- synthetic student count
- jitter params
- profile percentages
- trait assignment probabilities
- bias caps
- class-level priors

Store these as constants in the Phase C module.

## 10) Keep Phase C tables Phase-D clean

Do not add Phase D fields to Phase C tables. Phase D reads Phase C outputs as input state.
