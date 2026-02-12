# 🎯 PHASE 1 IMPLEMENTATION CHECKLIST (REVISED)
## Context-Derived Scoring Rules + AI-Inferred Metadata

**Phase:** 1 of 6  
**Status:** Ready to Start  
**Architecture:** AI infers metadata → teacher validates/overrides → Space Camp uses scoring rules  
**Estimated Duration:** 2-3 days  
**UI Changes:** Minimal (add 3 dropdown fields in DOCUMENT_NOTES)

---

# 🎬 PHASE 1 OVERVIEW

**Goal:** 
1. Create `getAstronautScoringRules()` function (returns rubric)
2. AI infers grade/subject/class level from document
3. Teacher validates/overrides in DOCUMENT_NOTES step
4. Space Camp receives scoring rules + document metadata
5. Remove all old random astronaut generation code

**User Flow:**
```
Upload Document
      ↓
Analyze Document (AI infers grade/subject/level)
      ↓
DOCUMENT_NOTES step (see inferred values, can override)
      ↓
Space Camp (uses rules + metadata, returns results to Philosopher)
      ↓
Philosopher Report (teacher sees results)
```

**What NOT to show:**
- ❌ Student selector/preview
- ❌ "Generating astronauts" messages
- ❌ Astronaut list
- ❌ Separate form for metadata

---

# ✅ TASK 1: Create getAstronautScoringRules() Function

**File:** `src/agents/simulation/astronautGenerator.ts` (or create new file `src/config/astronautScoringRules.ts`)

**What:** Return the complete scoring rubric (baselines, multipliers, overlays)

**Code:**
```typescript
// src/config/astronautScoringRules.ts

export interface AstronautRubric {
  gradeBandBaselines: {
    "3-5": {
      readingLevel: [number, number];
      mathLevel: [number, number];
      stamina: [number, number];
      reasoning: [number, number];
      confusionTolerance: [number, number];
    };
    "6-8": {
      readingLevel: [number, number];
      mathLevel: [number, number];
      stamina: [number, number];
      reasoning: [number, number];
      confusionTolerance: [number, number];
    };
    "9-12": {
      readingLevel: [number, number];
      mathLevel: [number, number];
      stamina: [number, number];
      reasoning: [number, number];
      confusionTolerance: [number, number];
    };
  };
  classLevelMultipliers: {
    standard: number;
    honors: number;
    AP: number;
  };
  subjectModifiers: {
    math: { mathLevel: number; readingLevel: number; reasoning: number };
    english: { readingLevel: number; reasoning: number; mathLevel: number };
    science: { mathLevel: number; reasoning: number; readingLevel: number };
    history: { readingLevel: number; reasoning: number; mathLevel: number };
    general: { mathLevel: number; readingLevel: number; reasoning: number };
  };
  overlayMultipliers: {
    adhd: { stamina: number; reasoning: number; confusionTolerance: number };
    dyslexia: { readingLevel: number; confidence: number };
    fatigue_sensitive: { stamina: number; reasoning: number };
    esl: { readingLevel: number; confidence: number };
    anxiety_prone: { confidence: number; confusionTolerance: number };
  };
}

export function getAstronautScoringRules(): AstronautRubric {
  return {
    gradeBandBaselines: {
      "3-5": {
        readingLevel: [0.30, 0.60],
        mathLevel: [0.35, 0.65],
        stamina: [0.45, 0.75],
        reasoning: [0.35, 0.65],
        confusionTolerance: [0.50, 0.80],
      },
      "6-8": {
        readingLevel: [0.40, 0.70],
        mathLevel: [0.45, 0.75],
        stamina: [0.45, 0.75],
        reasoning: [0.45, 0.75],
        confusionTolerance: [0.45, 0.75],
      },
      "9-12": {
        readingLevel: [0.55, 0.85],
        mathLevel: [0.55, 0.85],
        stamina: [0.50, 0.80],
        reasoning: [0.55, 0.85],
        confusionTolerance: [0.45, 0.75],
      },
    },
    classLevelMultipliers: {
      standard: 1.0,
      honors: 1.10,
      AP: 1.20,
    },
    subjectModifiers: {
      math: { mathLevel: 1.1, readingLevel: 1.0, reasoning: 1.0 },
      english: { readingLevel: 1.1, reasoning: 1.0, mathLevel: 1.0 },
      science: { mathLevel: 1.0, reasoning: 1.1, readingLevel: 1.0 },
      history: { readingLevel: 1.1, reasoning: 1.0, mathLevel: 1.0 },
      general: { mathLevel: 1.0, readingLevel: 1.0, reasoning: 1.0 },
    },
    overlayMultipliers: {
      adhd: { stamina: 0.85, reasoning: 0.90, confusionTolerance: 0.75 },
      dyslexia: { readingLevel: 0.65, confidence: 0.80 },
      fatigue_sensitive: { stamina: 0.75, reasoning: 0.85 },
      esl: { readingLevel: 0.75, confidence: 0.85 },
      anxiety_prone: { confidence: 0.80, confusionTolerance: 0.70 },
    },
  };
}
```

**Acceptance Criteria:**
- ✅ Function exports cleanly
- ✅ All 3 grade bands included
- ✅ All 3 class levels defined
- ✅ All 5 subjects defined
- ✅ All 5 overlays defined
- ✅ Build succeeds

---

# ✅ TASK 2: Create DocumentMetadata Interface + Inference Function

**File:** `src/types/pipeline.ts`

**What:** Define document metadata structure with grade/subject/level, plus function to infer them from document

**Code to Add:**
```typescript
// In src/types/pipeline.ts

export interface DocumentMetadata {
  inferredGradeBand: "3-5" | "6-8" | "9-12";
  inferredSubject: "math" | "english" | "science" | "history" | "general";
  inferredClassLevel: "standard" | "honors" | "AP";
  
  // Overrides (user can change inferred values)
  gradeBand?: "3-5" | "6-8" | "9-12";
  subject?: "math" | "english" | "science" | "history" | "general";
  classLevel?: "standard" | "honors" | "AP";
  
  // Confidence scores for inference
  gradeBandConfidence?: number;  // 0.0-1.0
  subjectConfidence?: number;    // 0.0-1.0
  classLevelConfidence?: number; // 0.0-1.0
}

// Helper function to get effective value (override or inferred)
export function getEffectiveGradeBand(metadata: DocumentMetadata): "3-5" | "6-8" | "9-12" {
  return metadata.gradeBand || metadata.inferredGradeBand;
}

export function getEffectiveSubject(metadata: DocumentMetadata): "math" | "english" | "science" | "history" | "general" {
  return metadata.subject || metadata.inferredSubject;
}

export function getEffectiveClassLevel(metadata: DocumentMetadata): "standard" | "honors" | "AP" {
  return metadata.classLevel || metadata.inferredClassLevel;
}
```

**Acceptance Criteria:**
- ✅ DocumentMetadata interface defined
- ✅ Helper functions for effective values
- ✅ Clearly separates inferred vs override
- ✅ Types clean

---

# ✅ TASK 3: Implement Metadata Inference Function

**File:** `src/agents/analysis/inferDocumentMetadata.ts` (new file)

**What:** Analyze document text and infer grade/subject/level

**Pseudocode Logic:**
```typescript
export function inferDocumentMetadata(
  documentText: string,
  problems: UniversalProblem[]
): DocumentMetadata {
  
  // Analyze document for grade level cues:
  // - Word frequency analysis (grade-appropriate vocabulary)
  // - Problem complexity (count Bloom levels in problems)
  // - Reading level estimation (Flesch-Kincaid)
  // → infer "3-5" | "6-8" | "9-12"
  
  // Analyze for subject:
  // - Look for subject keywords (math, english, science, history)
  // - Check problem tags/types
  // → infer subject
  
  // Analyze for class level:
  // - High problem complexity + advanced vocabulary → "AP"
  // - Medium complexity → "honors"
  // - Basic complexity → "standard"
  
  // Calculate confidence scores (0.0-1.0)
  
  return {
    inferredGradeBand,
    inferredSubject,
    inferredClassLevel,
    gradeBandConfidence,
    subjectConfidence,
    classLevelConfidence,
  };
}
```

**Simple Implementation (can upgrade later):**
```typescript
export function inferDocumentMetadata(documentText: string, problems: UniversalProblem[]): DocumentMetadata {
  // Count Bloom levels in problems
  const bloomCounts: Record<string, number> = {};
  problems.forEach(p => {
    bloomCounts[p.BloomLevel] = (bloomCounts[p.BloomLevel] || 0) + 1;
  });
  
  // Infer grade band from Bloom distribution
  const hasAnalyzeOrHigher = bloomCounts['Analyze'] || bloomCounts['Evaluate'] || bloomCounts['Create'];
  let gradeBand: "3-5" | "6-8" | "9-12" = "6-8";
  
  if (hasAnalyzeOrHigher) {
    gradeBand = "9-12";
  } else if (bloomCounts['Remember'] || bloomCounts['Understand']) {
    gradeBand = "3-5";
  }
  
  // Infer subject from text keywords
  const lowerText = documentText.toLowerCase();
  let subject: "math" | "english" | "science" | "history" | "general" = "general";
  
  if (lowerText.includes('equation') || lowerText.includes('calculate') || lowerText.includes('algebra')) {
    subject = "math";
  } else if (lowerText.includes('essay') || lowerText.includes('paragraph') || lowerText.includes('writing')) {
    subject = "english";
  } else if (lowerText.includes('experiment') || lowerText.includes('hypothesis') || lowerText.includes('lab')) {
    subject = "science";
  } else if (lowerText.includes('treaty') || lowerText.includes('history') || lowerText.includes('war')) {
    subject = "history";
  }
  
  // Default to standard class level (can be overridden by teacher)
  const classLevel = "standard";
  
  return {
    inferredGradeBand: gradeBand,
    inferredSubject: subject,
    inferredClassLevel: classLevel,
    gradeBandConfidence: 0.65,
    subjectConfidence: 0.75,
    classLevelConfidence: 0.50,
  };
}
```

**Acceptance Criteria:**
- ✅ Function analyzes document
- ✅ Returns DocumentMetadata with inferred values
- ✅ Returns confidence scores
- ✅ Reasonable heuristics (can be enhanced later)

---

# ✅ TASK 4: Add Metadata Fields to DOCUMENT_NOTES Step

**File:** `src/components/Pipeline/PipelineShell.tsx`

**What:** Show inferred metadata in DOCUMENT_NOTES step with override dropdowns

**Current (approximately):**
```typescript
{state.currentStep === PipelineStep.DOCUMENT_NOTES && (
  <div className="step-container">
    <h2>2️⃣ Document Notes</h2>
    <textarea
      value={state.documentNotes}
      onChange={(e) => setState({...state, documentNotes: e.target.value})}
      placeholder="Teacher notes about this assignment..."
    />
    <button onClick={nextStep}>Continue →</button>
  </div>
)}
```

**New Code:**
```typescript
{state.currentStep === PipelineStep.DOCUMENT_NOTES && (
  <div className="step-container">
    <h2>2️⃣ Document Analysis & Notes</h2>
    
    {/* Inferred Metadata Section */}
    <div className="metadata-section">
      <h3>Detected Class Context</h3>
      <p className="subtitle">AI inferred these values. You can override if needed.</p>
      
      <div className="metadata-grid">
        {/* Grade Band */}
        <div className="metadata-field">
          <label>Grade Level</label>
          <select
            defaultValue={state.documentMetadata?.gradeBand || state.documentMetadata?.inferredGradeBand || "6-8"}
            onChange={(e) => updateMetadata({ gradeBand: e.target.value as any })}
          >
            <option value="3-5">Grades 3-5</option>
            <option value="6-8">Grades 6-8</option>
            <option value="9-12">Grades 9-12</option>
          </select>
          <small>Inferred: {state.documentMetadata?.inferredGradeBand} ({Math.round((state.documentMetadata?.gradeBandConfidence || 0) * 100)}% confidence)</small>
        </div>
        
        {/* Subject */}
        <div className="metadata-field">
          <label>Subject</label>
          <select
            defaultValue={state.documentMetadata?.subject || state.documentMetadata?.inferredSubject || "general"}
            onChange={(e) => updateMetadata({ subject: e.target.value as any })}
          >
            <option value="math">Math</option>
            <option value="english">English / Language Arts</option>
            <option value="science">Science</option>
            <option value="history">History / Social Studies</option>
            <option value="general">General / Multi-subject</option>
          </select>
          <small>Inferred: {state.documentMetadata?.inferredSubject} ({Math.round((state.documentMetadata?.subjectConfidence || 0) * 100)}% confidence)</small>
        </div>
        
        {/* Class Level */}
        <div className="metadata-field">
          <label>Class Level</label>
          <select
            defaultValue={state.documentMetadata?.classLevel || state.documentMetadata?.inferredClassLevel || "standard"}
            onChange={(e) => updateMetadata({ classLevel: e.target.value as any })}
          >
            <option value="standard">Standard</option>
            <option value="honors">Honors</option>
            <option value="AP">AP / Advanced</option>
          </select>
          <small>Inferred: {state.documentMetadata?.inferredClassLevel} ({Math.round((state.documentMetadata?.classLevelConfidence || 0) * 100)}% confidence)</small>
        </div>
      </div>
    </div>
    
    {/* Teacher Notes Section */}
    <div className="notes-section">
      <h3>Teacher Notes (Optional)</h3>
      <textarea
        value={state.documentNotes || ""}
        onChange={(e) => setState({...state, documentNotes: e.target.value})}
        placeholder="Add any notes about this assignment, class, or students..."
        rows={6}
      />
    </div>
    
    <button onClick={nextStep}>Analyze with Space Camp →</button>
  </div>
)}
```

**Helper Function in Hook:**
```typescript
const updateMetadata = (updates: Partial<DocumentMetadata>) => {
  setState(prev => ({
    ...prev,
    documentMetadata: {
      ...prev.documentMetadata!,
      ...updates,
    },
  }));
};
```

**Acceptance Criteria:**
- ✅ Grade/subject/level dropdowns visible
- ✅ Inferred values shown as defaults
- ✅ Confidence scores displayed
- ✅ Teacher can override each field
- ✅ Notes textarea present
- ✅ No form validation errors

---

# ✅ TASK 5: Wire Inference into Pipeline

**File:** `src/hooks/usePipeline.ts`

**What:** Call inference function after document is analyzed, store in state

**Code to Add:**
```typescript
// After document text is extracted/analyzed, before moving to DOCUMENT_NOTES:

const inferMetadata = (documentText: string, problems: UniversalProblem[]) => {
  const metadata = inferDocumentMetadata(documentText, problems);
  setState(prev => ({
    ...prev,
    documentMetadata: metadata,
  }));
};

// Call this when problems are extracted
// This happens automatically as part of analyze flow
```

**Acceptance Criteria:**
- ✅ Metadata inferred when document analyzed
- ✅ Stored in pipeline state
- ✅ Available in DOCUMENT_NOTES step
- ✅ No errors during inference

---

# ✅ TASK 6: Create Space Camp Payload Interface

**File:** `src/types/pipeline.ts`

**What:** Define what Space Camp receives (not astronauts, just rules + metadata)

**Code:**
```typescript
export interface SpaceCampPayload {
  documentId: string;
  problems: UniversalProblem[];
  scoringRules: AstronautRubric;  // ← The rubric from Task 1
  documentMetadata: {
    gradeBand: "3-5" | "6-8" | "9-12";
    subject: "math" | "english" | "science" | "history" | "general";
    classLevel: "standard" | "honors" | "AP";
  };
  // NOT included:
  // - Pre-generated astronauts
  // - Student previews
  // - Student selector results
}
```

**Acceptance Criteria:**
- ✅ Interface clear and simple
- ✅ Only includes necessary fields
- ✅ No astronaut generation in payload
- ✅ Matches Space Camp API contract

---

# ✅ TASK 7: Remove Old Astronaut Generation Code

**Files to Clean Up:**
1. `src/agents/simulation/astronautGenerator.ts` - Remove:
   - `selectRandomOverlays()`
   - `generateStudentProfile()`
   - `getAllAstronauts()`
   - Random generation logic

2. `src/components/Pipeline/PipelineShell.tsx` - Remove:
   - ASTRONOMER_DEFINITION step (completely)
   - SPACE_CAMP_ANALYSIS step (completely)
   - Student preview code
   - Student selector UI

3. `src/hooks/usePipeline.ts` - Remove:
   - ASTRONOMER_DEFINITION step enum
   - SPACE_CAMP_ANALYSIS step enum
   - nextStep() logic for these steps
   - studentFeedback state (will come from Philosopher now)

4. Update `PipelineStep` enum:
```typescript
// OLD:
enum PipelineStep {
  INPUT,
  DOCUMENT_NOTES,
  ASTRONOMER_DEFINITION,      // ← DELETE
  SPACE_CAMP_ANALYSIS,          // ← DELETE
  PHILOSOPHER_REVIEW,
  // ...
}

// NEW:
enum PipelineStep {
  INPUT,
  DOCUMENT_NOTES,
  PHILOSOPHER_REVIEW,  // ← Directly after notes
  // ...
}
```

**Acceptance Criteria:**
- ✅ No references to old random generation
- ✅ ASTRONOMER_DEFINITION removed from pipeline
- ✅ SPACE_CAMP_ANALYSIS removed from pipeline (will be backend only)
- ✅ Build succeeds with 0 errors
- ✅ No "undefined step" warnings

---

# ✅ TASK 8: Update PHILOSOPHER_REVIEW to Receive Results

**File:** `src/components/Pipeline/PipelineShell.tsx`

**What:** PHILOSOPHER_REVIEW step now receives results directly from Space Camp (passed via state)

**Code:**
```typescript
// In usePipeline after calling Space Camp API:
const callSpaceCamp = async (payload: SpaceCampPayload) => {
  const response = await fetch('/api/space-camp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  const results = await response.json();
  
  // Store results in state for Philosopher
  setState(prev => ({
    ...prev,
    spaceCampResults: results,  // Students, clusters, stats
    currentStep: PipelineStep.PHILOSOPHER_REVIEW,
  }));
};
```

**In PHILOSOPHER_REVIEW render:**
```typescript
{state.currentStep === PipelineStep.PHILOSOPHER_REVIEW && (
  <div className="step-container">
    <h2>3️⃣ Analysis Results & Recommendations</h2>
    
    {/* Show space camp results */}
    {state.spaceCampResults && (
      <div className="results">
        <h3>Analysis Summary</h3>
        <p>Estimated average score: {state.spaceCampResults.averageScore}</p>
        <p>Completion rate: {state.spaceCampResults.completionRate}%</p>
        <p>At-risk students: {state.spaceCampResults.atRiskCount}</p>
        
        {/* Show recommendations based on clusters */}
        <div className="recommendations">
          {state.spaceCampResults.recommendations?.map(rec => (
            <div key={rec.id}>
              <h4>{rec.title}</h4>
              <p>{rec.description}</p>
            </div>
          ))}
        </div>
      </div>
    )}
    
    <button onClick={nextStep}>Export / Save →</button>
  </div>
)}
```

**Acceptance Criteria:**
- ✅ Receives results from Space Camp
- ✅ Displays summary metrics
- ✅ Shows recommendations/clusters
- ✅ No student list shown (aggregated only)

---

# ✅ TASK 9: Build & Verify

**Command:**
```bash
npm run build
```

**Expected:**
- ✅ Build succeeds in ~12-15 seconds
- ✅ 0 TypeScript errors
- ✅ No warnings about missing types
- ✅ No references to deleted code

**Acceptance Criteria:**
- ✅ Build passes
- ✅ No type errors
- ✅ Project compiles cleanly

---

# ✅ TASK 10: Manual Testing Flow

**In Browser:**
1. [ ] Navigate to app
2. [ ] Upload assignment document
3. [ ] Click "Analyze Document"
4. [ ] See DOCUMENT_NOTES step with:
   - [ ] Inferred grade level
   - [ ] Inferred subject
   - [ ] Inferred class level
   - [ ] Confidence scores shown
   - [ ] Ability to override each field
   - [ ] Notes textarea
5. [ ] Optional: Override one or more fields
6. [ ] Click "Analyze with Space Camp →"
7. [ ] See PHILOSOPHER_REVIEW step with:
   - [ ] Results summary (average score, etc.)
   - [ ] Recommendations
   - [ ] NO student list
   - [ ] NO "generating students" messages
8. [ ] No console errors

**Acceptance Criteria:**
- ✅ Document upload works
- ✅ Inference shows reasonable values
- ✅ Overrides possible
- ✅ Results display correct
- ✅ No student list visible
- ✅ Clean flow A→B→C

---

# ✅ TASK 11: Tests for getAstronautScoringRules()

**File:** `src/config/__tests__/astronautScoringRules.test.ts` (new)

**Tests:**
```typescript
describe('getAstronautScoringRules', () => {
  const rubric = getAstronautScoringRules();
  
  test('returns complete rubric', () => {
    expect(rubric.gradeBandBaselines).toBeDefined();
    expect(rubric.classLevelMultipliers).toBeDefined();
    expect(rubric.subjectModifiers).toBeDefined();
    expect(rubric.overlayMultipliers).toBeDefined();
  });
  
  test('all grade bands defined', () => {
    expect(rubric.gradeBandBaselines['3-5']).toBeDefined();
    expect(rubric.gradeBandBaselines['6-8']).toBeDefined();
    expect(rubric.gradeBandBaselines['9-12']).toBeDefined();
  });
  
  test('all class levels defined', () => {
    expect(rubric.classLevelMultipliers.standard).toBe(1.0);
    expect(rubric.classLevelMultipliers.honors).toBe(1.10);
    expect(rubric.classLevelMultipliers.AP).toBe(1.20);
  });
  
  test('all subjects defined', () => {
    expect(rubric.subjectModifiers.math).toBeDefined();
    expect(rubric.subjectModifiers.english).toBeDefined();
    expect(rubric.subjectModifiers.science).toBeDefined();
    expect(rubric.subjectModifiers.history).toBeDefined();
    expect(rubric.subjectModifiers.general).toBeDefined();
  });
  
  test('all overlays defined', () => {
    expect(rubric.overlayMultipliers.adhd).toBeDefined();
    expect(rubric.overlayMultipliers.dyslexia).toBeDefined();
    expect(rubric.overlayMultipliers.fatigue_sensitive).toBeDefined();
    expect(rubric.overlayMultipliers.esl).toBeDefined();
    expect(rubric.overlayMultipliers.anxiety_prone).toBeDefined();
  });
  
  test('baseline ranges valid (min <= max)', () => {
    Object.entries(rubric.gradeBandBaselines).forEach(([grade, traits]) => {
      Object.entries(traits).forEach(([trait, [min, max]]) => {
        expect(min).toBeLessThanOrEqual(max);
        expect(min).toBeGreaterThanOrEqual(0);
        expect(max).toBeLessThanOrEqual(1.0);
      });
    });
  });
});
```

**Acceptance Criteria:**
- ✅ All tests pass
- ✅ Rubric structure validated
- ✅ Values in expected ranges

---

# 📊 PROGRESS TRACKING

| Task | Description | Status |
|------|-------------|--------|
| 1 | Create getAstronautScoringRules() | ⬜ Not Started |
| 2 | Define DocumentMetadata + helpers | ⬜ Not Started |
| 3 | Implement inference function | ⬜ Not Started |
| 4 | Add metadata fields to DOCUMENT_NOTES | ⬜ Not Started |
| 5 | Wire inference into pipeline | ⬜ Not Started |
| 6 | Create SpaceCampPayload interface | ⬜ Not Started |
| 7 | Remove old astronaut generation code | ⬜ Not Started |
| 8 | Update PHILOSOPHER_REVIEW step | ⬜ Not Started |
| 9 | Build & verify | ⬜ Not Started |
| 10 | Manual testing | ⬜ Not Started |
| 11 | Write tests | ⬜ Not Started |

---

# 🎯 SUCCESS CRITERIA

Phase 1 complete when:

✅ `getAstronautScoringRules()` exists and returns complete rubric  
✅ Document metadata inferred from document  
✅ Teacher can see and override inferred values in DOCUMENT_NOTES  
✅ Space Camp receives scoring rules (not astronauts)  
✅ All old random generation code removed  
✅ No student list/preview in UI  
✅ ASTRONOMER_DEFINITION step deleted  
✅ SPACE_CAMP_ANALYSIS step deleted  
✅ PHILOSOPHER_REVIEW receives results directly  
✅ Build passes with 0 errors  
✅ All tests pass  
✅ Manual flow works clean: Upload → Notes → Results  

---

# 🚀 READY TO IMPLEMENT

This checklist replaces the old 10-task spec. Follow these 11 tasks in order, 2-3 days total.

Key changes from v1:
1. ❌ No ASTRONOMER form step (uses AI inference instead)
2. ❌ No SPACE_CAMP showing generation (backend-only)
3. ❌ No student selector (metadata in DOCUMENT_NOTES)
4. ✅ Just: Define rules → Infer context → Send to backend
5. ✅ Minimal UI changes (add 3 dropdowns)

