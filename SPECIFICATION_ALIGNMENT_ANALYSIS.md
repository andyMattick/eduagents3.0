# 🌌 Specification Alignment Analysis  
## v1.2 Spec vs Current Implementation

**Date:** February 12, 2026  
**Analysis State:** Comprehensive Gap Review  
**Current Build Status:** ✅ Pipeline restructured, Assessment analytics working

---

# 1. Executive Summary

The **current implementation** provides strong foundations in 3 major areas:
- ✅ **Asteroid/Astronaut models** (core types exist)
- ✅ **Simulation engine** (runs × correctly)
- ✅ **Assessment analytics** (post-analysis with stats)

However, the **v1.2 specification** introduces architectural and metaphorical requirements that require:
- 🔄 **Astronaut generation rules** (context-derived, not random)
- 🔄 **Teacher notes** (first-class entity, not metadata)
- 🔄 **Visual analytics** (Philosophers → VisualizationBundle)
- 🔄 **Problem evolution** (versioning and payload tracking)
- 🔄 **Mission vs assignment** (conceptual distinction)
- 🔄 **Overlays strategy** (Space Camp applies dynamically, not random)

**Current System Status:**
```
Astronaut Generation:          ❌ Random (should be context-derived)
Teacher Notes:                 ❌ Missing (should be first-class)
Visual Analytics:              ❌ Missing (should be from Philosophers)
Simulation Overlays:           ❌ Random (should be strategic)
Problem Similarity Index:       ❌ Missing
UniversalProblem Immutability: 🟡 Partial (schemas exist, enforcement missing)
Mission Tracking:              ❌ Implicit (not explicit entities)
Problem Evolution:             ❌ Missing (no version tracking for content)
```

---

# 2. Alignment by Spec Section

## 2.1 Core Principles (✅ ALIGNED)

**Spec:** "This application is a staged, deterministic assessment generation and refinement pipeline."

**Implementation Status:**
- ✅ Pipeline stages exist (INPUT → DOCUMENT_NOTES → ASTRONOMER → SPACE_CAMP → PHILOSOPHER → REWRITE → EXPORT)
- ✅ Determinism through fixed formulas (Bloom levels, time estimation, fatigue curves)
- ✅ Metaphor layer well-integrated (Launchpad, Foundry, Space Camp, Observatory, Philosophers, Dockyard)

**Notes:**
- Pipeline is correct; no changes needed here.

---

## 2.2 System Flow (🟡 PARTIALLY ALIGNED)

**Spec:** 7-screen UX flow with Launchpad → Dockyard → Foundry → Preview → Space Camp → Observatory → Philosophers → Rewrite → Export

**Implementation Status:**

| Screen | Spec Requirement | Current Implementation | Status |
|--------|------------------|----------------------|--------|
| 1-2 | Launchpad: Mission definition | Phase3Selector + AssignmentInput | ✅ Working |
| 3 | Dockyard Writer: RAW generation | PromptBuilder / AI generation | ✅ Working |
| 4 | Foundry Preview (document notes) | DOCUMENT_NOTES step exists | ✅ Working |
| 5 | Foundry Analysis (asteroids) | PROBLEM_ANALYSIS step, asteroids extracted | ✅ Working |
| 6a | Space Camp: Astronaut generation | Random generation (should be context-derived) | 🔄 NEEDS FIX |
| 6b | Space Camp: Simulation | Simulation engine running | ✅ Working |
| 6c | Observatory: Clusters & outliers | Missing (should be in simulation) | ❌ MISSING |
| 6d | Philosophers: Interpretation | PHILOSOPHER_REVIEW step stubbed | 🟡 STUBBED |
| 7 | Dockyard Rewrite: Content only | RewriteResults component exists | ✅ Working |

**Key Issues:**
- Astronaut generation should be **context-derived** from gradeBand/class level/subject, not random
- Observatory detection (clusters, outliers) not implemented
- Philosophers stage returns only accept/reject decision, not visual analytics

---

## 2.3 Astronaut Generation (❌ MAJOR GAP)

**Spec Rule:**
> "Astronauts are not random. They are built from gradeBand, class level, subject, reading/math level inferred from context. These form base stats."

**Current Implementation:**
```typescript
// astronautGenerator.ts: RANDOM SELECTION
function selectRandomOverlays(): AccessibilityOverlay[] {
  const availableOverlays = ['adhd', 'dyslexic', ...];
  const numOverlays = Math.floor(Math.random() * 3);  // 0-2 random
  return shuffle(availableOverlays).slice(0, numOverlays);
}

function generateStudentProfile(studentId: string, bloomLevel: number) {
  return {
    StudentId: studentId,
    BloomComfortProfile: generateBloomComfortProfile(bloomLevel),  // Random Bloom
    Traits: generateStudentTraits(),  // Random traits
    Overlays: selectRandomOverlays(),  // Random overlays
    NarrativeTags: selectRandomNarrativeTags(),  // Random tags
  };
}
```

**What Spec Requires:**
```typescript
// astronautGenerator.ts: CONTEXT-DERIVED
interface AstronautGenerationContext {
  gradeBand: string;      // "6-8", "9-12", etc.
  classLevel: string;     // "advanced", "mixed", "struggling"
  subject: string;        // "math", "english", "science", etc.
  timeTargetMinutes: number;
}

function generateAstronautsFromContext(context: AstronautGenerationContext): Astronaut[] {
  // - Infer reading level from subject + gradeBand
  // - Infer math fluency from subject
  // - Base stamina on timeTargetMinutes
  // - DO NOT randomly apply overlays
  // - RETURN core Astronauts representing the class
}
```

**Impact:**
- 🔴 **CRITICAL**: This breaks the entire Space Camp simulation contract
- Astronauts should represent the actual student population, not random personas
- Overlays should be added by Space Camp *strategically*, not at generation time

**Fix Required:**
1. Create `generateAstronautsFromContext()` in `src/agents/simulation/astronautGenerator.ts`
2. Wire assessment intent (gradeBand, subject) into `SPACE_CAMP_ANALYSIS` step
3. Remove random overlay selection from base generation
4. Add Space Camp overlay injection step

---

## 2.4 Teacher Notes (❌ MISSING)

**Spec Requirement:**
```typescript
interface TeacherNote {
  noteId: string;
  documentId: string;
  problemId?: string;        // Document-level or problem-level
  sectionId?: string;
  authorId: string;
  note: string;
  createdAt: string;
  category?: "clarity" | "difficulty" | "alignment" | "typo" | "other";
}
```

**Current Implementation:**
- Student feedback notes exist in pipeline (for AI feedback)
- No teacher-authored notes system
- No distinction between document-level and problem-level notes

**What's Missing:**
- 🔄 `DOCUMENT_NOTES` step has UI for notes, but doesn't persist to database
- 🔄 No problem-level note UI (for Foundry stage)
- 🔄 No notes table in Supabase schema
- 🔄 No notes service functions

**Fix Required:**
1. Create `teacher_notes` table in Supabase with schema above
2. Add service functions in `teacherSystemService.ts`:
   - `saveTeacherNote(teacherId, note: TeacherNote)`
   - `getTeacherNotes(documentId: string)`
   - `updateTeacherNote(noteId, updates)`
3. Persist notes from `DOCUMENT_NOTES` step
4. Add note UI to `PROBLEM_ANALYSIS` step (problem-level)
5. Display notes on Philosopher review

---

## 2.5 Visual Analytics (❌ MISSING)

**Spec Requirement:**
> "Philosophers stage returns visual artifacts: heat maps, scatterplots, confusion-density maps, fatigue curves, topic radar charts, section-risk matrices."

**Current Implementation:**
- Assessment results show basic score/time metrics
- No visual artifacts generated
- No `VisualizationBundle` interface

**What's Missing:**
```typescript
interface VisualizationBundle {
  clusterHeatMap?: string;           // base64 or URL
  bloomComplexityScatter?: string;   // Bloom vs Complexity
  confusionDensityMap?: string;      // Which problems cause confusion
  fatigueCurve?: string;             // Time vs fatigue by problem
  topicRadarChart?: string;          // Topic coverage
  sectionRiskMatrix?: string;        // Risk by section
}

interface TeacherFeedbackOptions {
  rankedFeedback: FeedbackItem[];
  visualizations?: VisualizationBundle;  // ← MISSING
}
```

**Fix Required:**
1. Define `VisualizationBundle` in `src/types/pipeline.ts`
2. Create analytics module `src/agents/analytics/visualizations.ts`:
   - `generateClusterHeatMap(simulationResults): string`
   - `generateBloomComplexityScatter(asteroids, simulationResults): string`
   - `generateConfusionDensityMap(simulationResults): string`
   - `generateFatigueCurve(simulationResults): string`
   - `generateTopicRadarChart(asteroids): string`
   - `generateSectionRiskMatrix(simulationResults): string`
3. Integrate into `PHILOSOPHER_REVIEW` step to display visuals
4. Use Chart.js or D3.js for rendering

---

## 2.6 Simulation Overlays (🔄 PARTIAL IMPLEMENTATION)

**Spec Rule:**
> "Space Camp chooses overlays dynamically based on environmentConfig, overlayRegistry, and internal logic. Teacher does NOT see astronaut generation."

**Current Implementation:**
- Overlays exist in database (`simulation_overlays` table)
- But they're applied during astronaut generation (incorrectly)
- Random selection, not strategic

**What Needs to Change:**
1. Remove overlay application from `generateStudentProfile()`
2. Create `applyOverlaysStrategically()` in Space Camp
3. Base decision on:
   - Simulation context (time pressure, fatigue level)
   - Problem difficulty distribution
   - Environmental factors

**Example Logic (Spec-Compliant):**
```typescript
function applyOverlaysStrategically(
  baseAstronauts: Astronaut[],
  asteroids: Asteroid[],
  classLevel: string
): Astronaut[] {
  const withOverlays = baseAstronauts.map(astronaut => {
    const overlays: string[] = [];
    
    // Apply overlays based on problematic patterns
    const avgComplexity = asteroids.reduce((sum, a) => sum + a.LinguisticComplexity, 0) / asteroids.length;
    
    if (avgComplexity > 0.7 && astronaut.ProfileTraits.ReadingLevel < 0.5) {
      overlays.push('dyslexic');  // High text load + weak reader
    }
    
    if (asteroids.length * 5 > 60) {
      overlays.push('fatigue_sensitive');  // Long test
    }
    
    if (hasHighBloomJump(asteroids)) {
      overlays.push('anxiety_prone');  // Sudden difficulty jump
    }
    
    return { ...astronaut, Overlays: overlays };
  });
  
  return withOverlays;
}
```

---

## 2.7 Problem Similarity Index (❌ MISSING)

**Spec Requirement:**
```typescript
interface ProblemSimilarityIndex {
  bankId: string;
  vector: number[];
  embeddingModel: string;
  createdAt: string;
}
```

**Current Implementation:**
- Asteroids have `SimilarityToPrevious` and `NoveltyScore` fields
- But no embedding vectors stored
- No similarity retrieval for future writing

**Fix Required:**
1. Create `problem_similarity_index` table in Supabase
2. Add embedding generation when saving to problem bank:
   - Use OpenAI embeddings or similar
   - Store vector + metadata
3. Create similarity search in problem bank:
   - `findSimilarProblems(query: string, limit: number)`
   - Use cosine similarity on vectors

---

## 2.8 Problem Evolution (❌ MISSING)

**Spec Requirement:**
```typescript
interface ProblemEvolution {
  problemId: string;
  versions: {
    version: number;
    contentHash: string;
    teacherNotes?: TeacherNote[];
    feedbackApplied?: string[];
  }[];
}
```

**Current Implementation:**
- Rewrite history stored in pipeline state
- But not persisted to database
- No version tracking at problem bank level

**Fix Required:**
1. Create `problem_evolution` table in Supabase
2. Store versions when problems are rewritten
3. Link teacher notes to specific versions
4. Track which feedback was applied

---

## 2.9 UniversalProblem Immutability (🟡 PARTIAL)

**Spec Rule:**
> "No stage may mutate canonical metadata after Foundry. Allowed: content, ordering. Prohibited: Changing cognitive.*, classification.*, structure.*"

**Current Implementation:**
- Schema supports immutable fields (Bloom, complexity, novelty are separate)
- But no enforcement at service layer
- Rewriter can theoretically modify anything

**Fix Required:**
1. Create `validateUniversalProblemInvariants()` function
2. Call before any persistence:
   ```typescript
   const invariantFields = ['ProblemId', 'BloomLevel', 'LinguisticComplexity', 'SimilarityToPrevious'];
   
   function validateInvariants(original: Asteroid, modified: Asteroid) {
     for (const field of invariantFields) {
       if (original[field] !== modified[field]) {
         throw new Error(`Cannot mutate immutable field: ${field}`);
       }
     }
   }
   ```
3. Document in rewriter that only `ProblemText` and `ProblemLength` can change

---

## 2.10 Teacher Dashboard Rules (🟡 PARTIAL)

**Spec Rule:**
> "Dashboard tracks missions, not asteroids or students. Should NOT show: individual asteroids, simulated students, overlays, astronaut stats."

**Current Implementation:**
```tsx
// Dashboard shows assignments (which contain asteroids)
<AssignmentSummary>
  - problemCount: number         // ← Shows asteroid count (VIOLATES SPEC)
  - asteroids: Asteroid[]        // ← Shows asteroids (VIOLATES SPEC)
</AssignmentSummary>

// Assessment results show per-student feedback
<StudentSimulation>
  - studentId, personaName       // ← Shows astronaut profiles (VIOLATES SPEC)
  - overlays                     // ← Shows overlays (VIOLATES SPEC)
</StudentSimulation>
```

**What Needs to Change:**
1. Rename mental model:
   - "Assignment" → "Mission" (user-facing terminology)
   - "Asteroids" → Not exposed to teacher
   - "Astronauts" → Not exposed to teacher
2. Dashboard should show:
   - Mission name, description, subject, grade level
   - Status (draft, finalized, analyzed)
   - Teacher notes count
   - Version history
   - Result summary (% completed, avg score, risk clusters only)
3. Dashboard should NOT show:
   - Individual problem count
   - Student-by-student results
   - Astronaut overlays or traits
   - Simulation internals

**Fix Required:**
1. Create `Mission` type in `teacherSystem.ts` (vs Assignment)
2. Update `TeacherDashboard.tsx` to hide asteroid details
3. Hide astronaut profiling in `AssessmentResults.tsx`
4. Show only clustered insights (not per-student)

---

## 2.11 Database Schema (🟡 NEEDS ADDITIONS)

**Current Tables:**
- ✅ `assignments`
- ✅ `teacher_accounts`
- ✅ `problem_bank`
- ✅ `api_usage_log`
- ✅ `subscription_changes`

**Missing Tables (v1.2):**
- ❌ `teacher_notes`
- ❌ `problem_similarity_index`
- ❌ `problem_evolution`
- ❌ `simulation_overlays` (exists but not integrated)

**Migration Plan:**
1. Create migration file: `003_vision_12_additions.sql`
2. Add 3 tables above
3. Index frequently-queried fields
4. Update RLS policies

---

# 3. Implementation Roadmap (Phased)

## Phase 1: Astronaut Derivation (CRITICAL)
**Impact:** Breaks existing simulation contract; must fix before releasing  
**Effort:** 2-3 dev days

### Tasks:
1. [ ] Create `generateAstronautsFromContext(context: AstronautGenerationContext)`
2. [ ] Update `SPACE_CAMP_ANALYSIS` step to call new function
3. [ ] Pass assessment intent from Launchpad through pipeline
4. [ ] Test with multiple grade bands and subjects
5. [ ] Update mock data to use context-derived astronauts

### Files Modified:
- `src/agents/simulation/astronautGenerator.ts` (major rewrite)
- `src/hooks/usePipeline.ts` (pass context to space camp)
- `src/components/Pipeline/PipelineShell.tsx` (capture intent)

---

## Phase 2: Teacher Notes (HIGH PRIORITY)
**Impact:** Core feature for teacher workflow  
**Effort:** 3 dev days

### Tasks:
1. [ ] Create `teacher_notes` Supabase table
2. [ ] Add service functions to `teacherSystemService.ts`
3. [ ] Persist notes from `DOCUMENT_NOTES` step
4. [ ] Add note UI to `PROBLEM_ANALYSIS` step
5. [ ] Display notes in `PHILOSOPHER_REVIEW` step
6. [ ] Test CRUD operations

### Files Created:
- `src/components/Pipeline/ProblemNotes.tsx` (new component)

### Files Modified:
- `supabase/migrations/003_*.sql` (new migration)
- `src/services/teacherSystemService.ts` (add functions)
- `src/components/Pipeline/PipelineShell.tsx` (integrate)

---

## Phase 3: Visual Analytics (MEDIUM PRIORITY)
**Impact:** Teacher understanding and decision-making  
**Effort:** 5 dev days

### Tasks:
1. [ ] Define `VisualizationBundle` interface
2. [ ] Create visualization generation functions
3. [ ] Integrate into `PHILOSOPHER_REVIEW` step
4. [ ] Add Chart.js or D3 rendering
5. [ ] Test with sample data

### Files Created:
- `src/agents/analytics/visualizations.ts` (new module)

### Files Modified:
- `src/types/pipeline.ts` (add VisualizationBundle)
- `src/components/Pipeline/PhilosopherReview.tsx` (display visuals)

---

## Phase 4: Overlay Strategy (MEDIUM PRIORITY)
**Impact:** More realistic student modeling  
**Effort:** 2 dev days

### Tasks:
1. [ ] Create `applyOverlaysStrategically()` function
2. [ ] Remove overlays from base astronaut generation
3. [ ] Integrate into Space Camp simulation
4. [ ] Test overlay application logic

### Files Modified:
- `src/agents/simulation/astronautGenerator.ts` (remove random overlays)
- `src/agents/simulation/simulationEngine.ts` (add overlay injection)

---

## Phase 5: Problem Similarity & Evolution (LOW PRIORITY)
**Impact:** Foundational for future iterations  
**Effort:** 4 dev days

### Tasks:
1. [ ] Create `problem_similarity_index` table
2. [ ] Create `problem_evolution` table
3. [ ] Add embedding generation on problem save
4. [ ] Add similarity search service
5. [ ] Track versions on problem rewrite

### Files Created:
- `supabase/migrations/004_*.sql` (new migration)

### Files Modified:
- `src/services/teacherSystemService.ts` (add functions)

---

## Phase 6: Dashboard Conceptual Alignment (LOW PRIORITY)
**Impact:** Teacher privacy & abstraction  
**Effort:** 2 dev days

### Tasks:
1. [ ] Hide asteroid details from dashboard
2. [ ] Hide astronaut profiling from results
3. [ ] Rename to "Mission" in UI
4. [ ] Show only clustered insights

### Files Modified:
- `src/components/TeacherSystem/TeacherDashboard.tsx`
- `src/components/Pipeline/AssessmentResults.tsx`

---

# 4. Risk & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Astronaut derivation breaks existing tests | **HIGH** | Rewrite test suite for context-derived generation |
| Overlays now stateful instead of random | **MED** | Update simulation tests; verify cluster detection |
| Teacher notes change database schema | **LOW** | Migration script; backward compatibility not needed |
| Visual analytics adds complexity | **MED** | Start with simple charts; iterate UI design |

---

# 5. Success Criteria

- [ ] Astronauts are generated from assessment context (not random)
- [ ] Teacher can add notes at document and problem levels
- [ ] Philosophers stage displays visual analytics bundle
- [ ] Dashboard hides asteroid/astronaut details from teachers
- [ ] Problem bank tracks similarity index and evolution
- [ ] All invariants enforced at service layer
- [ ] All 7 screens operational and aligned with metaphor
- [ ] Zero data exposure of simulated students to teachers
- [ ] 100% test coverage for new functions

---

# 6. Current Build Status

| Component | Status | Notes |
|-----------|--------|-------|
| Pipeline structure | ✅ | 10 steps, restructured, all rendering |
| Asteroid models | ✅ | Rich schema with optional fields |
| Astronaut generation | 🔴 | Random; needs context-derivation |
| Simulation engine | ✅ | Running correctly |
| Assessment analytics | ✅ | Basic stats working |
| Teacher dashboard | 🟡 | Functional but exposes too much |
| Teacher notes | ❌ | UI exists; not persisted |
| Visual analytics | ❌ | Not implemented |
| Overlay strategy | ❌ | Randomly applied |
| Problem bank | ✅ | Basic functionality working |

---

# 7. Conclusion

The current codebase is a **strong foundation** for v1.2, but requires **focused work** in 6 key areas:

1. **Astronaut derivation** (CRITICAL)
2. **Teacher notes** (HIGH)
3. **Visual analytics** (MEDIUM)
4. **Overlay strategy** (MEDIUM)
5. **Problem evolution** (LOW)
6. **Dashboard alignment** (LOW)

Recommended approach: **Implement in phases 1-3, test thoroughly before releasing v1.2.**

The metaphor and architecture are sound; execution is the next focus.
