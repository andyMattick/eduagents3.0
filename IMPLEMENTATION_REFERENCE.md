# Pipeline Restructuring - Implementation Reference

## 📦 Files Modified/Created

### Modified Files
1. **src/types/pipeline.ts**
   - Updated `PipelineStep` enum (5 → 6 steps)
   - Added `ClassStudentProfile` interface
   - Added `ClassDefinition` interface
   - Updated `PipelineState` with `classDefinition` field

2. **src/hooks/usePipeline.ts**
   - Updated `analyzeTextAndTags()`: Moves to PROBLEM_ANALYSIS instead of STUDENT_SIMULATIONS
   - Rewrote `nextStep()` function for 6-step flow
   - Removed old flow logic (TAG_ANALYSIS, VERSION_COMPARISON)

3. **src/components/Pipeline/PipelineShell.tsx**
   - Updated imports (removed TagAnalysis, StudentTagBreakdown, VersionComparison)
   - Added imports (ProblemAnalysis, ClassBuilder)
   - Updated step display from "5 of 5" to "6 of 6"
   - Updated progress bar from 5 to 6 segments
   - Added rendering logic for PROBLEM_ANALYSIS, CLASS_BUILDER, EXPORT steps
   - Removed old rendering logic for TAG_ANALYSIS, VERSION_COMPARISON
   - Added classDefinition state

### New Files
1. **src/components/Pipeline/ProblemAnalysis.tsx** (Step 2)
   - Displays extracted problem metadata
   - Two view modes: Metadata cards vs. HTML assignment view
   - Export to JSON: Downloads asteroids array
   - Export to CSV: Downloads tabular metadata
   - Shows all Bloom levels, complexity scores, novelty, similarity, length, structure

2. **src/components/Pipeline/ClassBuilder.tsx** (Step 3)
   - 11 preset student personas with accessible overlays
   - Custom student creation with optional overlays
   - Trait sliders (Reading, Math, Attention, Confidence) per student
   - Class roster management with add/remove functionality
   - Class metadata (name, grade level, subject)
   - Generates ClassDefinition on "Run Simulation" button

---

## 🔄 Step Transition Logic

### analyzeTextAndTags() → PROBLEM_ANALYSIS
```typescript
// OLD: Goes directly to STUDENT_SIMULATIONS (skipped TAG_ANALYSIS)
setState(prev => ({
  ...prev,
  currentStep: PipelineStep.STUDENT_SIMULATIONS, // ❌ OLD
}));

// NEW: Goes to PROBLEM_ANALYSIS to show metadata
setState(prev => ({
  ...prev,
  currentStep: PipelineStep.PROBLEM_ANALYSIS, // ✅ NEW
}));
```

### nextStep() Flow
```typescript
// INPUT → PROBLEM_ANALYSIS
case PipelineStep.INPUT:
  setState(prev => ({
    ...prev,
    currentStep: PipelineStep.PROBLEM_ANALYSIS,
  }));
  break;

// PROBLEM_ANALYSIS → CLASS_BUILDER
case PipelineStep.PROBLEM_ANALYSIS:
  setState(prev => ({
    ...prev,
    currentStep: PipelineStep.CLASS_BUILDER,
  }));
  break;

// CLASS_BUILDER → STUDENT_SIMULATIONS (with getFeedback)
case PipelineStep.CLASS_BUILDER:
  await getFeedback();
  break;

// STUDENT_SIMULATIONS → REWRITE_RESULTS (with rewriteTextAndTags)
case PipelineStep.STUDENT_SIMULATIONS:
  await rewriteTextAndTags();
  break;

// REWRITE_RESULTS → EXPORT
case PipelineStep.REWRITE_RESULTS:
  setState(prev => ({
    ...prev,
    currentStep: PipelineStep.EXPORT,
  }));
  break;

// EXPORT → Reset
case PipelineStep.EXPORT:
  reset();
  break;
```

---

## 📊 Data Flow

### Asteroids (Problems)
```
Upload Assignment
    ↓
extractAsteroidsFromText()
    ↓
Array of Asteroid objects
    {
      ProblemId: string
      ProblemText: string
      BloomLevel: BloomLevel
      LinguisticComplexity: number (0-1)
      NoveltyScore: number (0-1)
      SimilarityToPrevious: number (0-1)
      ProblemLength: number
      MultiPart: boolean
    }
    ↓
Stored in state.asteroids
    ↓
Displayed in Step 2 (ProblemAnalysis)
    ↓
Included in Step 6 export (JSON/Text)
```

### Class Definition
```
Build Class (Step 3)
    ↓
Select preset or create custom students
    ↓
Customize traits per student
    ↓
Click "Run Simulation"
    ↓
Creates ClassDefinition object:
    {
      id: string
      name: string
      gradeLevel: string
      subject: string
      studentProfiles: ClassStudentProfile[]
      createdAt: string
    }
    ↓
Passed to nextStep() → getFeedback()
    ↓
Stored for simulation
    ↓
Included in Step 6 export
```

### Export Format
```typescript
// Step 2 Exports (ProblemAnalysis)
type Step2Export = Asteroid[];
// - JSON: Array of problem metadata
// - CSV: Tabular format with headers

// Step 6 Export (ExportPanel)
type Step6Export = {
  asteroids: Asteroid[];
  classDefinition: ClassDefinition;
};
// - JSON: Complete structured data
// - Text: Human-readable format
```

---

## 🎨 UI Components Architecture

### Component Hierarchy
```
PipelineShell (main container)
├── AssignmentInput (Step 1 input)
├── PromptBuilder (Step 1 generation)
├── ProblemAnalysis (Step 2) ← NEW
│   ├── View Toggle (Metadata ↔ HTML)
│   ├── Metadata Cards
│   └── Export Buttons (JSON, CSV)
├── ClassBuilder (Step 3) ← NEW
│   ├── Class Name Input
│   ├── Preset Personas Grid
│   ├── Custom Student Form
│   └── Student Roster with Trait Sliders
├── StudentSimulations (Step 4)
│   ├── Feedback Tabs
│   └── Completion Analysis
├── RewriteResults (Step 5)
│   ├── Original Text
│   ├── Rewritten Text
│   └── Change Summary
└── Export Panel (Step 6) ← NEW
    ├── Export Options (JSON, Text)
    └── Success Message
```

---

## 🔌 Component Props

### ProblemAnalysis
```typescript
interface ProblemAnalysisProps {
  asteroids: Asteroid[];
  onNext: () => void;
  isLoading?: boolean;
}
```

### ClassBuilder
```typescript
interface ClassBuilderProps {
  gradeLevel?: string;
  subject?: string;
  classDefinition?: ClassDefinition;
  onClassDefinitionChange: (classDefinition: ClassDefinition) => void;
  onNext: () => void;
  isLoading?: boolean;
}
```

### Export Panel (inline in PipelineShell)
```typescript
// No separate component yet
// Rendered inline in Step 6
// Uses: asteroids, classDefinition from state
// Actions: Download JSON, Download Text, Reset
```

---

## 🧪 Testing Checklist

### Unit Tests Needed
- [ ] ProblemAnalysis export functions (JSON, CSV)
- [ ] ClassBuilder student add/remove logic
- [ ] ClassBuilder trait slider updates
- [ ] ClassDefinition creation with selected students

### Integration Tests Needed
- [ ] Full pipeline flow: INPUT → PROBLEM_ANALYSIS → CLASS_BUILDER → ...
- [ ] Step transitions work correctly
- [ ] State updates properly at each step
- [ ] Export data includes all required fields

### Manual Testing Checklist
- [ ] Upload assignment → auto-tags and shows Step 2
- [ ] Problem metadata displays correctly
- [ ] Export JSON downloads valid structure
- [ ] Export CSV opens in spreadsheet
- [ ] Preset personas add to roster
- [ ] Custom student creation works
- [ ] Trait sliders adjust values 0-100%
- [ ] Remove student button deletes from roster
- [ ] Step transitions smooth
- [ ] Progress bar updates (6 segments)
- [ ] Export files contain correct data

---

## 🚀 Performance Considerations

### Optimization Points
1. **Large Asteroids Array**: Currently renders all problems in grid
   - Consider pagination/virtualization for 50+ problems
   - Or add search/filter capability

2. **ClassBuilder Trait Sliders**: 11+ students × 4 sliders each
   - Currently re-renders on each slider change
   - Consider useCallback optimization for sliders

3. **Export Processing**: JSON.stringify() could be slow for large datasets
   - Works fine for typical ~20 problems + 30 students
   - Might need streaming for very large exports

### Build Size
- **Current**: 877 modules, ~1.5MB uncompressed
- **Gzip**: ~330KB
- **No bloat added** by new components (they're relatively small)

---

## 🔐 Data Validation

### Asteroid Validation
- Required fields: ProblemId, ProblemText, BloomLevel
- Numeric ranges: Complexity, Novelty, Similarity must be 0-1
- ProblemLength must be > 0

### ClassStudentProfile Validation
- Required: id, name, traits object with 4 values
- Trait values must be 0-1
- Overlays must be valid strings (adhd, dyslexic, esl, fatigue_sensitive, anxiety)

### ClassDefinition Validation
- Required: id, name, gradeLevel, subject, studentProfiles array
- At least 1 student in roster
- CreatedAt must be valid ISO 8601 timestamp

---

## 🔗 External Processor Interface

### Expected Input Format
```json
{
  "asteroids": [ /* Asteroid[] */ ],
  "classDefinition": { /* ClassDefinition */ }
}
```

### What External Processor Does
1. Receives exported JSON from Step 6
2. Runs detailed simulation:
   - For each student in classDefinition
   - For each problem in asteroids
   - Calculates interaction metrics
3. Returns analytics dashboard
4. Shows detailed performance predictions

### Return Format (Expected)
```json
{
  "simulationResults": {
    "perStudentAnalytics": [ /* student-level metrics */ ],
    "perProblemAnalytics": [ /* problem-level metrics */ ],
    "testLevelSummary": { /* overall metrics */ },
    "predictions": { /* completion rates, performance */ }
  }
}
```

---

## 📈 Future Enhancements

### Planned
1. **Save/Load Class Templates**
   - Save class definition for reuse
   - Create multiple classes for different cohorts

2. **Metadata Refinement**
   - Manual override of auto-generated tags
   - Batch edit metadata
   - Custom metadata fields

3. **Dashboard Integration**
   - Display results from external processor
   - Compare metrics before/after rewrite
   - Export analytics reports

4. **Advanced ClassBuilder**
   - Student import from CSV
   - Demographic templates (ELL, special ed, etc.)
   - Bulk trait assignment

### Possible (Low Priority)
1. **Versioning**: Track multiple rewrites
2. **Collaboration**: Share assignments with colleagues
3. **Rubric Generation**: Create assessment rubrics from metadata
4. **API Integration**: Connect external processor via API instead of manual export

---

## 📋 Dependency Graph

```
types/pipeline.ts
├── PipelineStep enum
├── PipelineState
├── ClassStudentProfile
└── ClassDefinition

↓

hooks/usePipeline.ts
├── Uses PipelineState
├── Manages nextStep() transitions
└── Orchestrates agent functions

↓

components/Pipeline/
├── PipelineShell (container)
│   ├── ProblemAnalysis (Step 2)
│   ├── ClassBuilder (Step 3)
│   ├── StudentSimulations (Step 4)
│   ├── RewriteResults (Step 5)
│   └── Export Panel (Step 6)
└── All use usePipeline hook

↓

agents/
├── analysis/asteroidGenerator
├── simulation/simulateStudents
├── rewrite/rewriteAssignment
└── shared/assignmentMetadata
```

---

## ✅ Build Verification

```
📦 Modules: 877
✅ Errors: 0
✅ Warnings: 0 (only chunk size warning)
⏱️ Build Time: 10.22s
📊 Bundle Size: ~1.5MB uncompressed, ~330KB gzipped
```

---

**Last Updated**: December 20, 2024
**Status**: ✅ Implementation Complete
**Testing**: Ready for manual and automated testing
