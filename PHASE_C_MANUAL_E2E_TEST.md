# Phase C Manual End-to-End Test Script

Use this script after deploying the Phase C migration and API routes.

## Preconditions

- `supabase/phase_c_simulation_migration.sql` has been applied.
- A document has already been uploaded and analyzed into `v4_items`.
- API server is running with Phase C routes enabled.

## Step 1: Create Class

Request:

```http
POST /api/v4/classes
Content-Type: application/json

{
  "name": "Period 3 - AP Statistics",
  "level": "AP",
  "gradeBand": "11-12",
  "schoolYear": "2026-2027",
  "overlays": {
    "composition": {
      "ell": "Some",
      "sped": "A few",
      "gifted": "Some",
      "attentionChallenges": "A few",
      "readingChallenges": "A few"
    },
    "tendencies": {
      "manyFastWorkers": true,
      "manyDetailOriented": true,
      "manyMathConfident": true
    }
  }
}
```

Expect:
- `201`
- `class` object present
- `students.length === 20`

## Step 2: List Classes

Request:

```http
GET /api/v4/classes
```

Expect:
- `200`
- newly created class in list

## Step 3: Class Detail

Request:

```http
GET /api/v4/classes/{classId}
```

Expect:
- `200`
- class summary and student list present

## Step 4: Run Simulation

Request:

```http
POST /api/v4/simulations
Content-Type: application/json

{
  "classId": "{classId}",
  "documentId": "{documentId}"
}
```

Expect:
- `201`
- `simulationId` returned
- `resultCount > 0`

## Step 5: Class View

Request:

```http
GET /api/v4/simulations/{simulationId}?view=class
```

Expect:
- `200`
- aggregate summary fields present

## Step 6: Profile View

Request:

```http
GET /api/v4/simulations/{simulationId}?view=profile&profile=ELL
```

Expect:
- `200`
- aggregate summary fields present for profile subset

## Step 7: Student View

Request:

```http
GET /api/v4/simulations/{simulationId}?view=student&studentId={syntheticStudentId}
```

Expect:
- `200`
- per-item metrics returned

## Guardrail Checks

- No responses include Phase D fields like `mastery`, `misconceptions`, or `exposure`.
- `simulation_runs` and `simulation_results` contain new rows.
- No writes appear in legacy tables.
