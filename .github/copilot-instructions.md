# Project Guidelines

## Build And Test
- Install dependencies: `npm install`
- Local development: `npm run dev`
- Production build: `npm run build`
- Run tests: `npm test`
- Required v4 validation before merge: `npm run phase1:check`
- Legacy isolation gate (when touching shared areas): `npm run legacy:report:strict`

## Architecture
- This repository is PRISM v4-first. Use PRISM as the learner-performance inference engine; application code prepares content, persistence, and integration payloads.
- Keep boundaries clear between app code and v4 schema layers. See `src/prism-v4/schema/README.md`.
- Teacher workflow and API spine are documented in `src/prism-v4/documents/README.md`.
- Canonical v4 subsystem overview is in `src/prism-v4/README.md`.

## Conventions
- Do not reintroduce simulation-era terms into v4 paths (`astronaut`, `playtest`, `simulateStudents`).
- Use `content_complexity` for local app concepts; reserve `predicted_difficulty` for PRISM response boundaries only.
- Treat schema ownership as strict:
  - `schema/domain`: application-owned business objects
  - `schema/semantic`: analysis-derived annotations
  - `schema/integration`: transport and PRISM assembly contracts
  - `schema/view`: reporting projections only
- Follow accessor-based item reads and immutable slot-model guidance in `ARCHITECTURE_ALIGNMENT_COMPLETE.md`.

## Where To Start
- High-level project onboarding: `README.md`
- v4 architecture and constraints: `src/prism-v4/README.md`
- Schema layer definitions: `src/prism-v4/schema/README.md`
- Documents pipeline and route flow: `src/prism-v4/documents/README.md`
- Build roadmap and EPIC sequencing: `OCEAN_ON_MARS_BUILD_PLAN.md`
- Surface integration map: `OCEAN_ON_MARS_INTEGRATION_ARCHITECTURE.md`

## Pitfalls
- Avoid mixing legacy v3 types into new v4 features (`legacy/v3/` is isolated by design).
- Do not perform learner-performance inference in application layers.
- Keep pdf worker deployment intact for ingestion flows (`public/pdf.worker.min.js`).
