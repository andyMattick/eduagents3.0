# Universal Payloads Implementation - Complete

## Summary

I have successfully implemented all new payload structures for the eduagents3.0 platform (sections 1-5, 7-8 from PAYLOAD_REFERENCE.md). This includes:

1. **UniversalProblem with cognitive and classification metadata**
2. **Astronaut (student profile) payload format**
3. **StudentProblemInput and StudentProblemOutput interaction models**
4. **StudentAssignmentSimulation aggregated results**
5. **Invariant enforcement for immutable fields**
6. **Database schema to support all new structures**
7. **TypeScript-level type definitions and validation**
8. **Service layer integration**

---

## Files Created/Modified

### 1. Type Definitions
**File:** `src/types/universalPayloads.ts` ✅ **NEW**

Complete TypeScript definitions for:
- `UniversalProblem` - Complete problem structure with cognitive/classification layers
- `CognitiveMetadata` - Locked cognitive analysis (Bloom's, complexity, time breakdown)
- `ClassificationMetadata` - Subject-specific classification 
- `Astronaut` - Student profile with traits and overlays
- `StudentProblemInput` - Single interaction payload
- `StudentProblemOutput` - Interaction results
- `StudentAssignmentSimulation` - Aggregated student performance
- `AssignmentSimulationBatch` - Batch results with class summary
- Validation functions: `validateProblemInvariants()`

**Key Exports:**
- All payload interfaces
- Type aliases (BloomsLevel, ComplexityLevel, TestType, etc.)
- Batch operation types

---

### 2. Teacher System Types
**File:** `src/types/teacherSystem.ts` ✅ **UPDATED**

Added new imports and types:
- `ProblemVersion` - Version tracking for problems
- `AssignmentProblemVersioned` - Versioning support with immutable field protection
- `TeacherAstronautLibrary` - Collection of student profiles
- `SavedAstronautProfile` - Database-backed student profile
- `AstronautFilter` - Query filters for astronauts
- `AssignmentSimulationResult` - Stored simulation results
- `SimulationHistory` - History of simulations for an assignment

Updated `Section` interface to support both legacy and new UniversalProblems:
```typescript
export interface Section {
  // ... existing fields
  universalProblems?: UniversalProblem[];
}
```

---

### 3. Database Migrations
**File:** `supabase/migrations/003_universal_payloads.sql` ✅ **NEW**

Complete database schema with:

#### Tables Created:
1. **`universal_problems`** - Stores complete UniversalProblems
   - Immutable fields: `problem_id`, `cognitive`, `classification`
   - Mutable fields: `content`, `version`
   - Indexed by: assignment_id, teacher_id, subject, problem_id

2. **`problem_versions`** - Version history for audit trail
   - Tracks all changes to problems
   - Stores complete problem snapshot
   - Immutable field lock status

3. **`astronauts`** - Student profiles/personas
   - Stores Astronaut objects with all traits
   - Support for templates and accessibility profiles
   - Indexed by: teacher_id, overlays, is_template

4. **`student_problem_interactions`** - Individual interactions
   - Stores StudentProblemInput and StudentProblemOutput
   - Links Astronaut to UniversalProblem
   - Indexed by: astronaut_id, universal_problem_id, simulation_batch_id

5. **`simulation_batches`** - Batch simulation runs
   - Groups simulations for an assignment
   - Stores aggregated results
   - Indexed by: assignment_id, teacher_id, created_at

6. **`student_assignment_simulations`** - Aggregated results
   - Complete StudentAssignmentSimulation objects
   - Key metrics indexed for querying
   - References: simulation_batch_id, astronaut_id, assignment_id

7. **`invariant_violations`** - Audit trail for invariant enforcement
   - Logs all attempts to modify immutable fields
   - Stores before/after values
   - Status tracking (resolved/unresolved)

#### Views Created:
1. **`recent_simulations`** - Recent simulation results with assignment/student details
2. **`problem_cognitive_profiles`** - Problem cognitive data for analytics

#### Alterations:
- Added `universal_problems_enabled` to `assignments`
- Added `last_simulation_batch_id` to `assignments`
- Added `universal_problem_id` to `question_bank` for compatibility

---

### 4. Teacher System Service
**File:** `src/services/teacherSystemService.ts` ✅ **UPDATED**

Added 20+ new service functions:

#### Universal Problem Operations:
```typescript
// Save a new UniversalProblem to database
saveUniversalProblem(teacherId, problem, assignmentId?)

// Retrieve a problem by ID
getUniversalProblem(problemId)

// Update problem content (with invariant checking)
updateUniversalProblemContent(problemId, newContent, newVersion, teacherId)
```

#### Astronaut Operations:
```typescript
// Save a student profile
saveAstronautProfile(teacherId, astronaut, isTemplate?)

// Get a saved profile
getAstronautProfile(id)

// List profiles with filtering
listAstronauts(teacherId, filters?)

// Delete a profile
deleteAstronautProfile(id)
```

#### Simulation Operations:
```typescript
// Save batch simulation results
saveSimulationBatch(assignmentId, teacherId, batch)

// Get simulation history for an assignment
getSimulationHistory(assignmentId, teacherId)

// Get latest simulation batch
getLatestSimulation(assignmentId)
```

#### Invariant Enforcement:
```typescript
// Validate and log any invariant violations
validateAndEnforceInvariants(original, updated)
```

#### Helper Mapping Functions:
```typescript
// Map database records to TypeScript types
mapUniversalProblem(data)
mapSavedAstronautProfile(data)
```

---

## Implementation Details

### 1. Universal Problem Structure

**Schema with Layers:**
```
UniversalProblem {
  // Identity (locked)
  problemId: "S1_P3_a"
  documentId: "doc_1707609600000"
  
  // Content (mutable)
  content: "Problem text..."
  
  // Cognitive Layer (locked after analyzer)
  cognitive: {
    bloomsLevel: "Understand"
    bloomsConfidence: 0.88
    complexityLevel: 2
    estimatedTimeMinutes: 1.8
    timeBreakdown: {
      reading: 0.3
      comprehension: 0.6
      computation: 0
      reasoning: 0.7
      writing: 0.2
    }
    linguisticComplexity: 0.52
    reasoningStepsRequired: 2
    proceduralWeight: 0.2
  }
  
  // Classification Layer (locked after analyzer)
  classification: {
    problemType: "conceptual_identification"
    topics: ["sampling_distributions"]
    requiresCalculator: false
    requiresInterpretation: true
  }
  
  // Structure (locked)
  structure: {
    isSubpart: true
    numberingStyle: "a."
    multiPartCount: 0
    sourceLineStart: 8
    sourceLineEnd: 8
  }
  
  // Versioning
  version: "1.0"
}
```

### 2. Astronaut (Student Profile)

**Schema:**
```
Astronaut {
  studentId: "student_adhd_001"
  personaName: "Chris - ADHD Profile"
  
  overlays: ["adhd", "fatigue_sensitive"]
  narrativeTags: ["energetic", "gets_bored", "visual-learner"]
  
  profileTraits: {
    readingLevel: 0.68
    mathFluency: 0.71
    attentionSpan: 0.45
    confidence: 0.65
  }
  
  gradeLevel: "11-12"
  isAccessibilityProfile: true
}
```

### 3. Interaction Payload

**StudentProblemInput:**
- Student: ID + overlays + narrativeTags
- Problem: length, bloomLevel, linguisticComplexity, noveltyScore
- Simulation: perceivedSuccess, timeOnTask, fatigueIndex, confusionSignals

**StudentProblemOutput:**
- Scores: timeToCompleteSeconds, percentageSuccessful
- Levels: confusionLevel, engagementLevel
- Analysis: feedback, suggestions, bloomMismatch

### 4. Aggregated Results

**StudentAssignmentSimulation:**
- Per-student totals: totalTimeMinutes, estimatedScore, estimatedGrade
- Problem-by-problem results: StudentProblemOutput[]
- Trajectories: engagement (initial/midpoint/final with trend), fatigue
- Risk analysis: atRisk boolean, riskFactors[], confusionPoints

### 5. Invariant Enforcement

**Locked Fields** (cannot change after analysis):
- ✗ `problemId` - Unique identifier
- ✗ `cognitive.*` - Objective cognitive demands
- ✗ `classification.*` - Subject-specific alignment
- ✗ `structure.*` - Hierarchical relationships

**Mutable Fields** (can change):
- ✓ `content` - Problem text (rewriter can improve)
- ✓ `version` - Semantic version tracking

**Enforcement:**
- `validateProblemInvariants()` checks before any update
- Violations logged to `invariant_violations` table
- Updates rejected if invariants violated

---

## Database Schema Diagram

```
UNIVERSAL PROBLEMS
├── problem_id (PK)
├── content (mutable)
├── cognitive (immutable, JSONB)
├── classification (immutable, JSONB)
├── structure (immutable, JSONB)
└── version

PROBLEM_VERSIONS (audit trail)
├── universal_problem_id (FK)
├── version_number
├── problem_snapshot
├── immutable_fields_locked
└── created_by

ASTRONAUTS
├── id (PK)
├── student_id
├── persona_name
├── overlays (array)
├── profile_traits (JSONB)
└── is_accessibility_profile

SIMULATION_BATCHES
├── id (PK)
├── assignment_id (FK)
├── astronaut_ids (UUID[])
└── results_summary (JSONB)

STUDENT_ASSIGNMENT_SIMULATIONS
├── id (PK)
├── simulation_batch_id (FK)
├── astronaut_id (FK)
└── simulation_results (JSONB)

STUDENT_PROBLEM_INTERACTIONS
├── id (PK)
├── astronaut_id (FK)
├── universal_problem_id (FK)
├── interaction_input (JSONB)
└── interaction_output (JSONB)

INVARIANT_VIOLATIONS (audit)
├── id (PK)
├── problem_id (FK)
├── violation_type
├── original_value (JSONB)
└── attempted_value (JSONB)
```

---

## Integration Points

### How the Pipeline Uses These Payloads

**Phase 1: Document Ingestion**
- Parse document → extract problems
- Create UniversalProblems with complete cognitive/classification metadata
- Store in `universal_problems` table

**Phase 2: Student Profiles**
- Define or select Astronauts
- Save to `astronauts` table (template or custom)
- Link to assignment

**Phase 3: Simulation**
- For each (Astronaut, UniversalProblem) pair:
  - Create StudentProblemInput using both payloads
  - Run simulation logic
  - Generate StudentProblemOutput
  - Store in `student_problem_interactions`

**Phase 4: Aggregation**
- Collect all StudentProblemOutputs for a student
- Aggregate into StudentAssignmentSimulation
- Store in `student_assignment_simulations`
- Calculate ClassCompletionSummary

**Phase 5: Rewriting**
- Modify UniversalProblem.content (not cognitive/classification)
- Bump version (1.0 → 1.1)
- Re-simulate to verify improvements
- Log version history

---

## API Examples

### Save a UniversalProblem
```typescript
const problem = await saveUniversalProblem(
  teacherId,
  {
    problemId: "S1_P2_a",
    documentId: "doc_123",
    subject: "AP_Statistics",
    sectionId: "S1",
    content: "Problem text...",
    cognitive: { /* CognitiveMetadata */ },
    classification: { /* ClassificationMetadata */ },
    structure: { /* StructureMetadata */ },
    analysis: { /* AnalysisMetadata */ }
  },
  assignmentId
);
```

### List Astronauts by Overlay
```typescript
const astronauts = await listAstronauts(teacherId, {
  overlays: ["adhd", "fatigue_sensitive"]
});
```

### Save Simulation Batch
```typescript
const result = await saveSimulationBatch(
  assignmentId,
  teacherId,
  {
    assignmentId,
    timestamp: new Date().toISOString(),
    studentSimulations: [/*...*/],
    classSummary: {
      avgTimeMinutes: 45.5,
      avgScore: 78,
      completionRatePercent: 92,
      atRiskCount: 2,
      topConfusionPoints: ["S1_P5"]
    }
  }
);
```

### Validate Invariants
```typescript
const validation = await validateAndEnforceInvariants(
  originalProblem,
  modifiedProblem
);

if (!validation.valid) {
  console.error("Invariant violations:", validation.violations);
  // Violation logged to database automatically
}
```

---

## Migration Path

### For Existing Assignments

The new schema is **backward compatible**:
- Old `AssignmentProblem` records remain unchanged
- New `universal_problems` table is separate
- Teachers can migrate gradually

### Migration Steps:
1. Run migration: `003_universal_payloads.sql`
2. Update UI components to use UniversalProblem types
3. Analyzer populates new `universal_problems` table
4. Question bank links to both old and new formats
5. Services layer abstracts away the difference

---

## Validation & Error Handling

### Type Safety
- All payloads fully typed in TypeScript
- No `any` types used in core structures
- Strict mode enforced

### Runtime Validation
- `validateProblemInvariants()` runs before updates
- Violations rejected with clear error messages
- Audit trail maintained in database

### Database Constraints
- Foreign keys enforce referential integrity
- UNIQUE constraints prevent duplicates
- JSONB validation (checked at insert/update)

---

## Testing Recommendations

### Unit Tests
- `validateProblemInvariants()` with valid/invalid cases
- Payload mapping functions (DB → TypeScript)
- Time breakdown calculations

### Integration Tests
- Save UniversalProblem → verify database → retrieve
- Save Astronaut → list with filters → update
- Save simulation batch → query history
- Invariant violation detection and logging

### End-to-End Tests
- Full pipeline: upload document → create problems → run simulation → save results
- Verify immutable fields persist across versions
- Verify mutable fields update correctly

---

## Performance Considerations

### Indexes Created
- `idx_universal_problems_assignment_id` - Fast assignment lookup
- `idx_universal_problems_teacher_id` - Fast teacher lookup
- `idx_universal_problems_subject` - Subject filtering
- `idx_astronauts_overlays` - Fast overlay filtering (GIN index)
- `idx_simulation_batches_created_at` - Recent simulations first
- `idx_student_assignment_simulations_at_risk` - Risk filtering

### JSONB Performance
- Fully indexed JSONB columns for fast querying
- Can filter on nested fields: `WHERE cognitive ->> 'bloomsLevel' = 'Understand'`

---

## What's NOT Implemented (Section 6 - Skipped)

Section 6 of PAYLOAD_REFERENCE.md ("KEY DIFFERENCES FROM ORIGINAL") was intentionally skipped as it's a comparison table (documentation only, not code implementation).

---

## Next Steps

1. **Update Pipeline Components** to use UniversalProblem types
2. **Run Database Migration** on dev environment
3. **Update Analyzer** to generate UniversalProblems
4. **Update Rewriter** to respect invariants
5. **Test Simulation Flow** end-to-end
6. **Document API** for frontend developers

---

## Files Summary

| File | Type | Status | Purpose |
|------|------|--------|---------|
| `src/types/universalPayloads.ts` | TypeScript | ✅ Created | Core type definitions |
| `src/types/teacherSystem.ts` | TypeScript | ✅ Updated | Extended with versioning & simulation types |
| `supabase/migrations/003_universal_payloads.sql` | SQL | ✅ Created | Complete database schema |
| `src/services/teacherSystemService.ts` | TypeScript | ✅ Updated | Service layer functions |
| `INVARIANT_ENFORCEMENT_COMPREHENSIVE.md` | Markdown | ✅ Created | Detailed enforcement documentation |

---

## Questions?

Refer to:
- `PAYLOAD_REFERENCE.md` - Original specification (sections 1-5, 7-8)
- `INVARIANT_ENFORCEMENT_COMPREHENSIVE.md` - Immutability strategy
- Type definitions: `src/types/universalPayloads.ts`
- Service functions: `src/services/teacherSystemService.ts`
