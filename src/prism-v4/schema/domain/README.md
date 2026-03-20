# Domain Schemas

Authoritative domain schema files:

- `Problem.ts`
- `Unit.ts`
- `Assignment.ts`
- `Assessment.ts`
- `ProblemGroup.ts`
- `ProblemScore.ts`# Domain Schemas

Owns system-managed, teacher-facing business data.

Typical contents:

- students
- classes
- problems
- assignments
- units
- assessments
- scores

Rules:

- Persisted and editable.
- Source of truth for teacher-authored and roster data.
- May be consumed by Integration and Reporting, but ownership stays here.
