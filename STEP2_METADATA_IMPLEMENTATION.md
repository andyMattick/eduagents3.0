# Phase 2 Implementation: Automated Problem Metadata Tagging

## 📋 Summary

Successfully replaced Step 2 with **automated problem metadata tagging** that happens invisibly to the user. The pipeline now:

1. ✅ Accepts assignment (Step 1)
2. ✅ **Automatically tags each problem** with metadata (Phase 2 - hidden)
3. ✅ Shows student simulations (Step 3)
4. ✅ Allows viewing problem metadata with optional "View Problem Metadata" tab
5. ✅ Provides rewrite suggestions (Step 4)
6. ✅ Shows version comparison (Step 5)

---

## 🔄 User Flow Changes

### Before
```
Step 1: Upload/Generate Assignment
  ↓
Step 2: Tag Analysis (show UI with manual tagging)
  ↓
Step 3: Student Simulations
```

### After
```
Step 1: Upload/Generate Assignment
  ↓
Step 2: Automated Problem Metadata Tagging (HIDDEN - happens automatically)
  ↓
Step 3: Student Simulations (with optional "View Problem Metadata" tab)
```

---

## 🛠️ Implementation Details

### 1. **usePipeline.ts** — Enhanced metadata extraction

**Added imports:**
```typescript
import { extractAsteroidsFromText } from '../agents/pipelineIntegration';
import { Asteroid } from '../types/simulation';
```

**Updated `initialState`:**
- Added `asteroids: []` — stores extracted problems with metadata
- Added `showProblemMetadata: false` — toggle for viewing metadata

**Enhanced `analyzeTextAndTags()` function:**
- Calls `extractAsteroidsFromText()` to decompose assignment into problems
- Automatically generates `Asteroid[]` with:
  - **BloomLevel**: Remember, Understand, Apply, Analyze, Evaluate, Create
  - **LinguisticComplexity**: 0.0-1.0 (reading difficulty)
  - **SimilarityToPrevious**: 0.0-1.0 (how similar to previous problem)
  - **NoveltyScore**: 0.0-1.0 (how unique compared to others)
  - **MultiPart**: Whether it has sub-questions
  - **ProblemLength**: Word count
  - **TestType**: Question type (free_response, multiple_choice, etc.)
  - **Subject**: Subject area

**Key change:**
```typescript
// OLD: Goes to TAG_ANALYSIS step
setState(prev => ({
  ...prev,
  originalText: text,
  tags,
  currentStep: PipelineStep.TAG_ANALYSIS,
}));

// NEW: Skips TAG_ANALYSIS and goes directly to STUDENT_SIMULATIONS
setState(prev => ({
  ...prev,
  originalText: text,
  tags,
  asteroids,  // Store extracted problems
  currentStep: PipelineStep.STUDENT_SIMULATIONS,  // Skip to step 3
}));
```

**New function:**
```typescript
const toggleProblemMetadataView = useCallback(() => {
  setState(prev => ({
    ...prev,
    showProblemMetadata: !prev.showProblemMetadata,
  }));
}, []);
```

**Returned in hook:**
- `asteroids` — the extracted problems
- `showProblemMetadata` — visibility toggle state
- `toggleProblemMetadataView()` — function to toggle visibility

---

### 2. **PipelineState** — Updated to track metadata

**File:** `src/types/pipeline.ts`

**Added field:**
```typescript
showProblemMetadata?: boolean;
```

This allows toggling the visibility of Phase 2 metadata without forcing users to see it.

---

### 3. **PipelineShell.tsx** — Pass metadata to StudentSimulations

**Updated component imports:**
```typescript
const {
  step,
  // ... existing fields
  asteroids,
  showProblemMetadata,
  toggleProblemMetadataView,
} = usePipeline();
```

**Updated StudentSimulations render:**
```typescript
{step === PipelineStep.STUDENT_SIMULATIONS && (
  <StudentSimulations
    feedback={studentFeedback}
    isLoading={isLoading}
    onNext={handleNextStep}
    asteroids={asteroids}                  // NEW
    showProblemMetadata={showProblemMetadata}        // NEW
    onToggleProblemMetadata={toggleProblemMetadataView} // NEW
  />
)}
```

---

### 4. **StudentSimulations.tsx** — New Metadata Tab UI

**Updated props:**
```typescript
interface StudentSimulationsProps {
  feedback: StudentFeedback[];
  isLoading?: boolean;
  onNext: () => void;
  completionSimulations?: { /* ... */ };
  asteroids?: Asteroid[];                 // NEW
  showProblemMetadata?: boolean;          // NEW
  onToggleProblemMetadata?: () => void;   // NEW
}
```

**Enhanced tab navigation:**
- Old: "Student Feedback" | "Completion & Performance"
- New: "Student Feedback" | "Completion & Performance" | **"📋 View Problem Metadata"** ← NEW

**New metadata tab displays each problem with:**

| Field | Display | Color | Range |
|-------|---------|-------|-------|
| **Problem Text** | First 150 chars | #333 | Text |
| **Bloom Level** | Remember → Create | 🔵 #0066cc | Dropdown |
| **Linguistic Complexity** | Percentage + bar | 🟠 #ff9800 | 0-100% |
| **Novelty Score** | Percentage + bar | 🟢 #28a745 | 0-100% |
| **Structure** | Single/Multi-part | 🔴/#28a745 | Boolean |
| **Word Count** | Length in words | #666 | Number |
| **Similarity to Previous** | Percentage + bar | 🟣 #9c27b0 | 0-100% |

**Visual design:**
- Each problem in a card with grid layout of metadata
- Color-coded metrics for quick scanning
- Progress bars for numeric values (0-1.0 scale)
- Helpful explanation text about what Phase 2 is and how it's used

---

## 📊 Data Flow

### Before Upload
```
User input: Assignment text
    ↓
No metadata
```

### During Upload (PHASE 1)
```
Assignment text
    ↓
extractProblems() — split by delimiters
    ↓
Problems array
```

### Immediately After Upload (PHASE 2 - Hidden)
```
Problems array
    ↓
classifyBloomLevel() — analyze verbs
    ↓
calculateLinguisticComplexity() — word length, sentence length, jargon
    ↓
calculateSimilarity() — compare to previous problems
    ↓
recalculateNoveltyScores() — inverse of similarity
    ↓
Asteroid[] {
  ProblemId,
  ProblemText,
  BloomLevel,
  LinguisticComplexity,
  SimilarityToPrevious,
  NoveltyScore,
  MultiPart,
  ProblemLength,
  TestType,
  Subject
}
```

### In Student Simulations (PHASE 3)
```
Asteroids + Astronauts
    ↓
For each (student, problem) pair:
  - calculatePerceivedSuccess() using BloomLevel
  - calculateTimeOnTask() using LinguisticComplexity + ProblemLength
  - calculateConfusionSignals() using novelty + complexity
  - calculateEngagementScore() using all metrics
    ↓
StudentFeedback[]
```

### Optional: View Metadata
```
User clicks "📋 View Problem Metadata" tab
    ↓
Shows all Asteroid metadata in UI
    ↓
Teacher can see exactly what drove the simulation
```

---

## 🎯 Benefits of This Approach

### ✅ For Teachers
- **Clean UI** — No confusing "tag adjustment" step visible
- **Transparency** — Can click "View Metadata" to see exactly what drove feedback
- **Speed** — Assignment flows directly from upload to student feedback
- **Insight** — Metadata explains *why* students struggle (high novelty, complexity, Bloom mismatch, etc.)

### ✅ For Developers
- **Separation of Concerns** — Phase 2 logic isolated in `pipelineIntegration.ts` and `asteroidGenerator.ts`
- **Reusability** — Same metadata used for simulation, rewriting, and analytics
- **Testing** — Mock data system can generate realistic asteroids and simulate their impact
- **Extensibility** — Easy to add new metadata fields (e.g., cultural relevance, prerequisite knowledge)

### ✅ For Data Flow
- **Payload Verification** — Can inspect `asteroids` array at any point
- **Backward Compatibility** — Old `tags` array still generated for legacy components
- **Type Safety** — `Asteroid` type ensures all metadata fields present

---

## 📁 Files Modified

1. **src/hooks/usePipeline.ts**
   - Added asteroid extraction
   - Added metadata visibility toggle
   - Skip TAG_ANALYSIS step
   - Return asteroids and toggle function

2. **src/types/pipeline.ts**
   - Added `showProblemMetadata?: boolean` field

3. **src/components/Pipeline/PipelineShell.tsx**
   - Pass `asteroids`, `showProblemMetadata`, `toggleProblemMetadataView` to StudentSimulations

4. **src/components/Pipeline/StudentSimulations.tsx**
   - Added `Asteroid` import
   - Added props: `asteroids`, `showProblemMetadata`, `onToggleProblemMetadata`
   - Added "📋 View Problem Metadata" tab button
   - Added metadata tab content with:
     - Explanation of Phase 2
     - Problem cards showing all metadata
     - Color-coded metrics with progress bars
     - Explanation of how metadata affects Phase 3 simulation

---

## 🔍 Testing the Implementation

### Test Case 1: Upload Assignment
1. Open app
2. Click "Build or Upload an Assignment"
3. Upload or paste an assignment
4. **Expected**: Immediately shows student feedback (Step 3), NOT tag analysis (Step 2)

### Test Case 2: View Metadata
1. Complete Test Case 1
2. Click "📋 View Problem Metadata" tab
3. **Expected**: See all problems with metadata cards showing Bloom, Complexity, Novelty, etc.

### Test Case 3: Metadata Consistency
1. In browser console, run: `window.demonstrateMockData()`
2. Inspect the mock asteroids in console
3. Compare displayed values in "View Problem Metadata" tab
4. **Expected**: Values match exactly

### Test Case 4: No Metadata if No Problems
1. Upload a very short, single-line assignment
2. Click "📋 View Problem Metadata" tab
3. **Expected**: Tab doesn't appear (grayed out) if `asteroids.length === 0`

### Test Case 5: Engagement Simulation Uses Metadata
1. Upload assignment
2. Note the engagement scores in Student Feedback
3. Click "View Problem Metadata" tab
4. Note complexity + Bloom levels of high-confusion problems
5. **Expected**: High engagement/confusion on high-complexity, high-Bloom problems

---

## 🚀 Next Steps

### Immediately Available
- ✅ Hidden Phase 2 metadata tagging
- ✅ Optional "View Problem Metadata" tab
- ✅ Use metadata in Phase 3 (Student Simulation)
- ✅ Mock data system for testing without AI

### For Future Enhancement
1. **Teacher Overrides** — Allow manual adjustment of Bloom levels/complexity before simulation
2. **Metadata Export** — Save asteroid data to CSV/JSON
3. **Rewriter Integration** — Use metadata to suggest specific rewrites
4. **Analytics Dashboard** — Visualize Bloom distribution, complexity patterns
5. **Standards Alignment** — Map Bloom levels to curriculum standards

---

## 📝 Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Step 2 Visibility** | Shown to all users (Tag Analysis UI) | Hidden (automatic) |
| **Metadata Generation** | Manual or missing | Automatic + complete |
| **User Flow** | 5 steps visible to teacher | 5 steps visible (Step 2 automated) |
| **Customization** | Manual tag adjustment UI | Optional "View Metadata" tab |
| **Data Used for Simulation** | Loose tags + AI | Structured Asteroid metadata |
| **Build Status** | ✅ No errors | ✅ No errors |

---

## 💡 Key Insights

1. **Hidden = Better UX** — Teachers see cleaner flow; automation happens invisibly
2. **Structured Metadata** — `Asteroid` type ensures all required fields for simulation
3. **Transparency Option** — "View Metadata" tab allows curious teachers to understand the system
4. **Phase Separation** — Each phase (Extract → Tag → Simulate → Analyze → Rewrite) is independent
5. **Bloom-Driven Simulation** — All student feedback ultimately driven by problem metadata (Bloom, complexity, novelty)

