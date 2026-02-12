# 🚀 v1.2 Implementation Checklist
## Actionable Tasks for v1.2 Spec Alignment

**Status:** Ready to implement  
**Priority:** Critical → High → Medium  

---

# PHASE 1️⃣: ASTRONAUT DERIVATION (CRITICAL)
**Timeline:** 2-3 days | **Impact:** Foundation for all simulations

## Task 1.1: Create Context-Derived Astronaut Generator
- [ ] Create new function: `generateAstronautsFromContext(context: AstronautGenerationContext)`
- [ ] Define interface:
  ```typescript
  interface AstronautGenerationContext {
    gradeBand: string;           // "3-5", "6-8", "9-12"
    classLevel: string;          // "advanced" | "mixed" | "struggling"
    subject: string;             // "math" | "english" | "science" | ...
    timeTargetMinutes: number;
  }
  ```
- [ ] Logic:
  - [ ] Map subject → baseline reading level (english > math > science)
  - [ ] Map classLevel → trait distributions
  - [ ] Map gradeBand → age-appropriate complexity tolerance
  - [ ] Generate 11 core astronauts (no random overlays yet)
  - [ ] Return consistent set, not randomized

**File:** `src/agents/simulation/astronautGenerator.ts`  
**Acceptance Criteria:**
- ✓ Function exists and exports
- ✓ Always returns 11 astronauts for same context
- ✓ ReadingLevel reflects subject and grade
- ✓ No overlays in generated astronauts
- ✓ Test coverage for 3+ grade bands × 3 class levels

---

## Task 1.2: Wire Assessment Intent Through Pipeline
- [ ] Pass `AstronautGenerationContext` from **Launchpad** through pipeline
- [ ] Capture in `AssignmentInput` or `Phase3Selector`:
  ```typescript
  // When teacher selects grade, subject, class level
  const context: AstronautGenerationContext = {
    gradeBand: selectedGrade,      // From phase 3
    classLevel: classSelection,    // From phase 3 or launchpad
    subject: topic,                // From phase 3
    timeTargetMinutes: estTime,    // From metadata
  };
  ```
- [ ] Store in `PipelineState.astronautContext`
- [ ] Pass to `Space Camp` step

**Files:**
- [ ] `src/types/pipeline.ts` (add to PipelineState)
- [ ] `src/hooks/usePipeline.ts` (store in state)
- [ ] `src/components/Pipeline/PipelineShell.tsx` (capture input)

**Acceptance Criteria:**
- ✓ Context flows from Screen 1-2 → SPACE_CAMP_ANALYSIS
- ✓ Can retrieve context at SPACE_CAMP step
- ✓ Context logged for debugging

---

## Task 1.3: Update Space Camp to Use Derived Astronauts
- [ ] In SPACE_CAMP_ANALYSIS step:
  ```typescript
  // BEFORE: Random astronauts
  const astronauts = getAllAstronauts();  // ← WRONG
  
  // AFTER: Context-derived
  const astronauts = generateAstronautsFromContext(state.astronautContext);
  ```
- [ ] Pass derived astronauts to simulation engine
- [ ] Store results with astronauts used

**Files:**
- [ ] `src/agents/simulation/simulationEngine.ts` (update function signature if needed)
- [ ] `src/components/Pipeline/PipelineShell.tsx` (SPACE_CAMP_ANALYSIS handler)

**Acceptance Criteria:**
- ✓ Simulation uses context-derived astronauts
- ✓ Same context always produces same astronauts
- ✓ Results reproducible

---

## Task 1.4: Update Tests
- [ ] Rewrite `astronautGenerator.spec.ts`:
  ```typescript
  describe('generateAstronautsFromContext', () => {
    test('Math class grades 6-8 has lower reading levels', () => {
      const context = { gradeBand: '6-8', subject: 'math', ... };
      const astronauts = generateAstronautsFromContext(context);
      const avgReading = astronauts.reduce(...) / astronauts.length;
      expect(avgReading).toBeLessThan(0.7);
    });
    
    test('Advanced class all have high capability', () => {
      const context = { classLevel: 'advanced', ... };
      const astronauts = generateAstronautsFromContext(context);
      expect(astronauts.every(a => a.ProfileTraits.Confidence > 0.7)).toBe(true);
    });
  });
  ```
- [ ] Test reproducibility (same input → same output)
- [ ] Test 9+ context combinations

**File:** `src/agents/simulation/astronautGenerator.spec.ts`

---

## Task 1.5: Update Mock Data
- [ ] Remove `generateClassroom()` random approach
- [ ] Update `generateMockSimulationResults()` to use context:
  ```typescript
  const context: AstronautGenerationContext = {
    gradeBand: '6-8',
    classLevel: 'mixed',
    subject: 'math',
    timeTargetMinutes: 45,
  };
  const astronauts = generateAstronautsFromContext(context);
  const results = runAssignmentSimulation(asteroids, astronauts);
  ```

**File:** `src/agents/simulation/mockData.ts`

---

## ✅ Phase 1 Verification
```
When complete:
✓ astronautGenerator has generateAstronautsFromContext()
✓ Space Camp calls new function with context
✓ Same context always produces same astronauts
✓ All tests passing
✓ No more random overlay application at generation
✓ Build succeeds
```

---

---

# PHASE 2️⃣: TEACHER NOTES (CRITICAL)
**Timeline:** 3 days | **Impact:** Persistent teacher feedback

## Task 2.1: Create Database Schema
- [ ] Create migration: `supabase/migrations/003_teacher_notes_table.sql`
- [ ] Table schema:
  ```sql
  CREATE TABLE teacher_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL,
    problem_id TEXT,                -- NULL = document-level note
    note TEXT NOT NULL,
    category TEXT CHECK (category IN ('clarity', 'difficulty', 'alignment', 'typo', 'other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT note_level CHECK (
      (problem_id IS NULL) OR (problem_id IS NOT NULL)
    )
  );
  
  CREATE INDEX idx_teacher_notes_document_id ON teacher_notes(document_id);
  CREATE INDEX idx_teacher_notes_problem_id ON teacher_notes(problem_id);
  CREATE INDEX idx_teacher_notes_teacher_id ON teacher_notes(teacher_id);
  
  -- RLS: Teachers can only see their own notes
  ALTER TABLE teacher_notes ENABLE ROW LEVEL SECURITY;
  CREATE POLICY teacher_notes_policy ON teacher_notes
    FOR ALL USING (teacher_id = auth.uid());
  ```
- [ ] Run migration in local/staging environment

**File:** `supabase/migrations/003_teacher_notes_table.sql`

---

## Task 2.2: Add Service Functions
- [ ] In `teacherSystemService.ts`, add:
  ```typescript
  export async function saveTeacherNote(
    teacherId: string,
    note: {
      documentId: string;
      problemId?: string;
      note: string;
      category?: 'clarity' | 'difficulty' | 'alignment' | 'typo' | 'other';
    }
  ): Promise<string> {
    // Returns noteId
  }
  
  export async function getTeacherNotes(
    documentId: string,
    teacherId: string,
    problemId?: string
  ): Promise<TeacherNote[]> {
    // Get document-level or problem-level notes
  }
  
  export async function updateTeacherNote(
    noteId: string,
    teacherId: string,
    updates: { note?: string; category?: string }
  ): Promise<void> {}
  
  export async function deleteTeacherNote(
    noteId: string,
    teacherId: string
  ): Promise<void> {}
  ```
- [ ] Add `TeacherNote` interface to `src/types/teacherSystem.ts`
- [ ] Write tests for each function

**Files:**
- [ ] `src/services/teacherSystemService.ts` (add functions)
- [ ] `src/types/teacherSystem.ts` (add interface)
- [ ] `src/services/teacherSystemService.test.ts` (add tests)

---

## Task 2.3: Integrate DOCUMENT_NOTES UI
- [ ] Modify `DOCUMENT_NOTES` step in `PipelineShell.tsx`:
  ```typescript
  // Capture and save notes
  const handleSendToAstronomer = async () => {
    if (teacherNotes) {
      try {
        await saveTeacherNote(user.id, {
          documentId: documentId,
          note: teacherNotes,
          category: 'general',
        });
      } catch (err) {
        setError('Failed to save notes');
      }
    }
    nextStep();
  };
  ```
- [ ] On re-entering step, load existing notes:
  ```typescript
  useEffect(() => {
    if (step === PipelineStep.DOCUMENT_NOTES) {
      loadDocumentNotes();
    }
  }, [step]);
  ```

**File:** `src/components/Pipeline/PipelineShell.tsx`

---

## Task 2.4: Add Problem-Level Note UI
- [ ] Create new component: `src/components/Pipeline/ProblemNotes.tsx`
  ```typescript
  export function ProblemNotes({
    problemId: string,
    documentId: string,
    existingNotes: TeacherNote[];
    onNoteSaved: () => void;
  }) {
    // Show notes textbox
    // Save button
    // Display existing notes
  }
  ```
- [ ] Add to `PROBLEM_ANALYSIS` step:
  ```tsx
  {asteroids.map((asteroid, i) => (
    <div key={i}>
      <ProblemAnalysisCard asteroid={asteroid} />
      <ProblemNotes
        problemId={asteroid.ProblemId}
        documentId={documentId}
        onNoteSaved={reloadNotes}
      />
    </div>
  ))}
  ```

**Files:**
- [ ] `src/components/Pipeline/ProblemNotes.tsx` (new)
- [ ] `src/components/Pipeline/PipelineShell.tsx` (integrate)

---

## Task 2.5: Display Notes in Philosopher Review
- [ ] In PHILOSOPHER_REVIEW step, load and display notes:
  ```tsx
  const [documentNotes, setDocumentNotes] = useState<TeacherNote[]>([]);
  
  useEffect(() => {
    getTeacherNotes(documentId, user.id).then(setDocumentNotes);
  }, [documentId]);
  
  // Display in review panel
  {documentNotes.length > 0 && (
    <div className="teacher-notes-summary">
      <h4>📝 Your Notes:</h4>
      {documentNotes.map(note => (
        <div key={note.id} className="note-item">
          {note.problemId && <span className="problem-ref">Problem {note.problemId}</span>}
          <p>{note.note}</p>
        </div>
      ))}
    </div>
  )}
  ```

**File:** `src/components/Pipeline/PhilosopherReview.tsx`

---

## ✅ Phase 2 Verification
```
When complete:
✓ teacher_notes table created
✓ All service functions working
✓ DOCUMENT_NOTES persists notes to DB
✓ PROBLEM_ANALYSIS allows per-problem notes
✓ PHILOSOPHER_REVIEW displays notes
✓ Notes survive session restarts
✓ RLS enforced (teachers see only their notes)
✓ All tests passing
```

---

---

# PHASE 3️⃣: VISUAL ANALYTICS (HIGH PRIORITY)
**Timeline:** 5 days | **Impact:** Teacher decision-making confidence

## Task 3.1: Define Analytics Interfaces
- [ ] In `src/types/pipeline.ts`, add:
  ```typescript
  interface VisualizationBundle {
    clusterHeatMap?: string;          // Base64 or SVG string
    bloomComplexityScatter?: string;  // Bloom vs Complexity
    confusionDensityMap?: string;     // Which problems confuse
    fatigueCurve?: string;            // Fatigue accumulation
    topicRadarChart?: string;         // Topic coverage
    sectionRiskMatrix?: string;       // Risk by section
  }
  
  interface TeacherFeedbackOptions {
    rankedFeedback: FeedbackItem[];
    visualizations?: VisualizationBundle;  // ← NEW
  }
  ```

**File:** `src/types/pipeline.ts`

---

## Task 3.2: Create Visualization Generators
- [ ] New file: `src/agents/analytics/visualizations.ts`
- [ ] Implement generators:
  ```typescript
  import { Chart } from 'chart.js';
  
  export function generateClusterHeatMap(
    simulationResults: StudentAssignmentSimulation[],
    asteroids: Asteroid[]
  ): string {
    // Generate heatmap: problems × confusion levels
    // Return SVG or base64 PNG
  }
  
  export function generateBloomComplexityScatter(
    asteroids: Asteroid[]
  ): string {
    // Scatter: X=Bloom, Y=Complexity
    // Points colored by problem type
  }
  
  export function generateConfusionDensityMap(
    simulationResults: StudentAssignmentSimulation[]
  ): string {
    // Stacked bar: problems × confusion level
  }
  
  export function generateFatigueCurve(
    simulationResults: StudentAssignmentSimulation[]
  ): string {
    // Line graph: problem index × avg fatigue
  }
  
  export function generateTopicRadarChart(
    asteroids: Asteroid[],
    bloomDistribution: Record<string, number>
  ): string {
    // Radar: coverage of topics × bloom levels
  }
  
  export function generateSectionRiskMatrix(
    simulationResults: StudentAssignmentSimulation[],
    asteroids: Asteroid[]
  ): string {
    // Risk matrix: sections × risk levels
  }
  ```
- [ ] Use Chart.js or Recharts (React-friendly)
- [ ] Return SVG strings for embedding

**Files:**
- [ ] `src/agents/analytics/visualizations.ts` (new)
- [ ] `package.json` (add chart library: `npm install chart.js` or `recharts`)

---

## Task 3.3: Update Philosophers Interpreter
- [ ] Modify analysis function to return VisualizationBundle:
  ```typescript
  export async function interpretPhilosophersAnalysis(
    simulationResults: AssignmentSimulationResults,
    asteroids: Asteroid[]
  ): Promise<TeacherFeedbackOptions> {
    const rankedFeedback = [...];  // Existing logic
    
    const visualizations: VisualizationBundle = {
      clusterHeatMap: generateClusterHeatMap(...),
      bloomComplexityScatter: generateBloomComplexityScatter(asteroids),
      confusionDensityMap: generateConfusionDensityMap(...),
      fatigueCurve: generateFatigueCurve(...),
      topicRadarChart: generateTopicRadarChart(...),
      sectionRiskMatrix: generateSectionRiskMatrix(...),
    };
    
    return {
      rankedFeedback,
      visualizations,
    };
  }
  ```

**Files:**
- [ ] `src/agents/analysis/philosophers.ts` (update)
- [ ] `src/agents/analytics/visualizations.ts` (integrate)

---

## Task 3.4: Display Visualizations in Review
- [ ] Update `PHILOSOPHER_REVIEW` step:
  ```tsx
  {philosopherAnalysis?.visualizations && (
    <div className="visualizations-panel">
      <h3>📊 Visual Analytics</h3>
      
      {visualizations.bloomComplexityScatter && (
        <div className="chart-container">
          <h4>Bloom Level vs Complexity</h4>
          <img 
            src={visualizations.bloomComplexityScatter} 
            alt="Scatter plot"
          />
        </div>
      )}
      
      {visualizations.confusionDensityMap && (
        <div className="chart-container">
          <h4>Confusion Hotspots</h4>
          <img 
            src={visualizations.confusionDensityMap} 
            alt="Confusion map"
          />
        </div>
      )}
      
      {/* Repeat for all visualizations */}
    </div>
  )}
  ```

**File:** Update or create `src/components/Pipeline/PhilosopherReview.tsx`

---

## Task 3.5: Style & Polish
- [ ] Create CSS for visualization panels
- [ ] Responsive layout for charts
- [ ] Print-friendly styling
- [ ] Dark mode support

**Files:**
- [ ] `src/components/Pipeline/PhilosopherReview.tsx` (update CSS)
- [ ] Component-level CSS module

---

## ✅ Phase 3 Verification
```
When complete:
✓ VisualizationBundle interface defined
✓ All 6 visualization generators implemented
✓ Philosophers interpreter returns visualizations
✓ PHILOSOPHER_REVIEW displays all charts
✓ Charts are interactive and downloadable
✓ Responsive on mobile/tablet
✓ Print functionality works
✓ All tests passing with expected chart outputs
```

---

---

# PHASE 4️⃣: OVERLAY STRATEGY (MEDIUM PRIORITY)
**Timeline:** 2 days | **Impact:** More accurate simulation

## Task 4.1: Remove Random Overlays from Generation
- [ ] In `astronautGenerator.ts`, remove `selectRandomOverlays()` call:
  ```typescript
  // BEFORE
  Overlays: selectRandomOverlays(),  // ← REMOVE
  
  // AFTER
  Overlays: [],  // Empty; to be added by Space Camp
  ```
- [ ] Update all generated astronauts to have empty overlays array

**File:** `src/agents/simulation/astronautGenerator.ts`

---

## Task 4.2: Implement Strategic Overlay Injection
- [ ] New function in `simulationEngine.ts`:
  ```typescript
  export function applyOverlaysStrategically(
    baseAstronauts: Astronaut[],
    asteroids: Asteroid[]
  ): Astronaut[] {
    const avgComplexity = asteroids.reduce((sum, a) => sum + a.LinguisticComplexity, 0) / asteroids.length;
    const avgBloom = asteroids.reduce((sum, a) => bloomToNumber(a.BloomLevel), 0) / asteroids.length;
    const totalTime = asteroids.reduce((sum, a) => a.EstimatedTimeSeconds || 0, 0);
    
    return baseAstronauts.map(astronaut => {
      const overlays: string[] = [];
      
      // Rule 1: High text load + weak reader
      if (avgComplexity > 0.7 && astronaut.ProfileTraits.ReadingLevel < 0.5) {
        overlays.push('dyslexic');
      }
      
      // Rule 2: Prolonged test → fatigue risk
      if (totalTime > 3600) {  // > 60 minutes
        overlays.push('fatigue_sensitive');
      }
      
      // Rule 3: Sudden difficulty jump
      if (hasHighBloomJump(asteroids)) {
        overlays.push('anxiety_prone');
      }
      
      // Rule 4: ESL class with vocabulary-heavy
      if (avgComplexity > 0.8) {
        overlays.push('esl');
      }
      
      return { ...astronaut, Overlays: overlays };
    });
  }
  
  function hasHighBloomJump(asteroids: Asteroid[]): boolean {
    // Check if Bloom levels jump more than 2 levels consecutively
    for (let i = 0; i < asteroids.length - 1; i++) {
      const diff = Math.abs(
        bloomToNumber(asteroids[i].BloomLevel) - 
        bloomToNumber(asteroids[i + 1].BloomLevel)
      );
      if (diff >= 2) return true;
    }
    return false;
  }
  ```

**File:** `src/agents/simulation/simulationEngine.ts`

---

## Task 4.3: Call Overlay Injection in Space Camp
- [ ] In `SPACE_CAMP_ANALYSIS` step:
  ```typescript
  // 1. Generate core astronauts from context
  let astronauts = generateAstronautsFromContext(context);
  
  // 2. Apply strategic overlays based on asteroids
  astronauts = applyOverlaysStrategically(astronauts, asteroids);
  
  // 3. Run simulation
  const results = runAssignmentSimulation(asteroids, astronauts);
  ```

**File:** `src/components/Pipeline/PipelineShell.tsx` (SPACE_CAMP_ANALYSIS handler)

---

## Task 4.4: Test Overlay Logic
- [ ] Test each rule independently:
  ```typescript
  test('dyslexic overlay applied to weak reader with high text', () => {
    const asteroids = [/* high complexity problems */];
    const weakReader = createCustomAstronaut(..., { readingLevel: 0.3 });
    const [result] = applyOverlaysStrategically([weakReader], asteroids);
    expect(result.Overlays).toContain('dyslexic');
  });
  ```

**File:** Create tests in `src/agents/simulation/simulationEngine.test.ts`

---

## ✅ Phase 4 Verification
```
When complete:
✓ No random overlays at generation time
✓ All generated astronauts have empty Overlays array
✓ Space Camp injects overlays strategically
✓ Same asteroids + astronauts = same overlays (deterministic)
✓ Overlay rules tested and documented
✓ Simulation results more realistic
```

---

---

# FINAL VERIFICATION CHECKLIST ✅

## Phase 1-4 Complete Verification
- [ ] **Build passes:** `npm run build` succeeds
- [ ] **Dev server runs:** `npm run dev` no errors
- [ ] **All tests pass:** `npm test`
- [ ] **No linting errors:** `npm run lint`
- [ ] **Documentation updated:**
  - [ ] Update `README.md` with new context-derivation
  - [ ] Update `SIMULATION_CONTRACT_GUIDE.md` with examples
  - [ ] Add comments to new functions

---

## Dependent Systems Verification
- [ ] Astronaut derivation feeds into simulation correctly
- [ ] Teacher notes integration doesn't break existing flows
- [ ] Visual analytics render without errors
- [ ] Overlay strategy produces valid results

---

## User-Facing Testing
- [ ] Create test mission (grades 6-8, mixed, math)
- [ ] Verify astronauts are appropriate for context
- [ ] Add document and problem-level notes
- [ ] Verify notes persist and display
- [ ] Check philosopher visualizations render
- [ ] Verify overlays applied strategically

---

# 📋 Tracking Template

Use this to track progress:

```markdown
## Implementation Progress

### Phase 1: Astronaut Derivation
- [ ] 1.1 Context-derived generator
- [ ] 1.2 Wire through pipeline
- [ ] 1.3 Update Space Camp step
- [ ] 1.4 Update tests
- [ ] 1.5 Update mock data
**ETA:** [Date] | **Status:** [In Progress/Complete]

### Phase 2: Teacher Notes
- [ ] 2.1 Database schema
- [ ] 2.2 Service functions
- [ ] 2.3 DOCUMENT_NOTES integration
- [ ] 2.4 Problem-level UI
- [ ] 2.5 Philosopher display
**ETA:** [Date] | **Status:** [Not Started]

...
```

---

## 🎉 When All Tasks Complete

You will have:
✅ Context-derived astronaut generation
✅ Persistent teacher notes
✅ Visual analytics for teacher insight
✅ Strategic overlay application
✅ Full v1.2 specification alignment

**System fully aligned with v1.2. Ready for production release.**
