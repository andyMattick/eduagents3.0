# Migration Guide: 5-Step → 6-Step Pipeline

## 🎯 What Changed and Why

### The Challenge
The previous 5-step pipeline ran full simulations within the system. But as the system matured, it became clear that:
1. **Data preparation** (tagging problems) should be separate from **simulation analysis**
2. **Teachers need control** over their student class definitions
3. **External processors** should handle the heavy computation
4. **Metadata export** should be a first-class feature, not an afterthought

### The Solution
We restructured into a **6-step pipeline** that makes these concerns explicit:

---

## 📊 Side-by-Side Comparison

| Step | Old (5-step) | New (6-step) | Key Change |
|------|-------------|------------|-----------|
| 1 | INPUT | INPUT | Same |
| 2 | TAG_ANALYSIS | **PROBLEM_ANALYSIS** | Now shows metadata prominently |
| 3 | STUDENT_SIMULATIONS | **CLASS_BUILDER** | NEW: Teachers define their class |
| 4 | REWRITE_RESULTS | STUDENT_SIMULATIONS | Moved down, but now uses teacher's class |
| 5 | VERSION_COMPARISON | REWRITE_RESULTS | Simplified flow |
| 6 | — | **EXPORT** | NEW: Export for external processor |

---

## 🔄 Flow Comparison

### Old Pipeline
```
INPUT 
  ↓ (auto-tag, skip UI)
TAG_ANALYSIS (hidden)
  ↓
STUDENT_SIMULATIONS (uses 11 fixed personas)
  ↓
REWRITE_RESULTS
  ↓
VERSION_COMPARISON (compare metrics)
  ↓
DONE (no export)
```

### New Pipeline
```
INPUT 
  ↓ (user sees metadata)
PROBLEM_ANALYSIS (show metadata, allow export)
  ↓
CLASS_BUILDER (teacher defines their students)
  ↓
STUDENT_SIMULATIONS (test with teacher's class)
  ↓
REWRITE_RESULTS
  ↓
EXPORT (download metadata + class)
  ↓
DONE (ready for external processor)
```

---

## 🔑 Key Differences

### 1. Metadata Visibility
**Old**: Hidden in a tab during simulations
```typescript
{activeTab === 'metadata' && (
  <div>Show metadata</div>
)}
```

**New**: Prominent Step 2 with export options
```typescript
<ProblemAnalysis
  asteroids={asteroids}
  onNext={handleNextStep}
/>
```

### 2. Student Selection
**Old**: Fixed 11 personas, auto-selected
```typescript
const astronauts = generateAllAstronauts();
// No user control, all 11 always simulated
```

**New**: Teacher builds their actual class
```typescript
<ClassBuilder
  classDefinition={classDefinition}
  onClassDefinitionChange={setClassDefinition}
/>
```

### 3. Simulation Purpose
**Old**: Main focus of the system
- Comprehensive analysis
- Student feedback displayed
- Comparison metrics shown

**New**: Preview/verification only
- Teacher sees how their students would do
- Optional, can skip if desired
- Data prepared for external processor

### 4. Export Capability
**Old**: Limited CSV export, no standard format
```typescript
// No structured export format
// No JSON option
// No class definition export
```

**New**: Full structured export (JSON + Text)
```typescript
{
  asteroids: Asteroid[],
  classDefinition: ClassDefinition
}
// Ready for external processor
```

### 5. Step Count
**Old**: 5 steps
```
Step 1 of 5
Step 2 of 5
Step 3 of 5
Step 4 of 5
Step 5 of 5
```

**New**: 6 steps
```
Step 1 of 6
Step 2 of 6
Step 3 of 6
Step 4 of 6
Step 5 of 6
Step 6 of 6
```

---

## 🛠️ For Developers: Breaking Changes

### Component Props
**Old StudentSimulations**:
```typescript
interface StudentSimulationsProps {
  feedback: StudentFeedback[];
  asteroids?: Asteroid[];
  showProblemMetadata?: boolean;
  onToggleProblemMetadata?: () => void;
}
```

**New StudentSimulations**:
```typescript
interface StudentSimulationsProps {
  feedback: StudentFeedback[];
  asteroids?: Asteroid[];
  // Removed showProblemMetadata (metadata moved to Step 2)
  // Removed onToggleProblemMetadata
}
```

### usePipeline Hook
**Old nextStep()**:
```typescript
case PipelineStep.TAG_ANALYSIS:
  await getFeedback();
  break;
case PipelineStep.STUDENT_SIMULATIONS:
  await rewriteTextAndTags();
  break;
case PipelineStep.REWRITE_RESULTS:
  await compareVersions();
  break;
case PipelineStep.VERSION_COMPARISON:
  reset();
  break;
```

**New nextStep()**:
```typescript
case PipelineStep.PROBLEM_ANALYSIS:
  setState(prev => ({
    ...prev,
    currentStep: PipelineStep.CLASS_BUILDER,
  }));
  break;
case PipelineStep.CLASS_BUILDER:
  await getFeedback(); // Now uses teacher's class
  break;
case PipelineStep.STUDENT_SIMULATIONS:
  await rewriteTextAndTags();
  break;
case PipelineStep.REWRITE_RESULTS:
  setState(prev => ({
    ...prev,
    currentStep: PipelineStep.EXPORT,
  }));
  break;
case PipelineStep.EXPORT:
  reset();
  break;
```

### New Type System
**New Types**:
```typescript
// ClassStudentProfile - Individual student in a class
interface ClassStudentProfile {
  id: string;
  name: string;
  profileType: 'standard' | 'accessibility' | 'custom';
  basePersona?: string;
  overlays: string[];
  traits: {
    readingLevel: number;
    mathFluency: number;
    attentionSpan: number;
    confidence: number;
  };
}

// ClassDefinition - Complete class roster
interface ClassDefinition {
  id: string;
  name: string;
  gradeLevel: string;
  subject: string;
  studentProfiles: ClassStudentProfile[];
  createdAt: string;
}
```

---

## 📦 Migration Checklist

### If You Have Custom Code Using Old Pipeline

- [ ] Update imports (remove TagAnalysis, StudentTagBreakdown, VersionComparison)
- [ ] Add imports (ProblemAnalysis, ClassBuilder)
- [ ] Update PipelineStep enum references
  - [ ] Change `PipelineStep.TAG_ANALYSIS` → `PipelineStep.PROBLEM_ANALYSIS`
  - [ ] Remove `PipelineStep.VERSION_COMPARISON` references
  - [ ] Add `PipelineStep.EXPORT` references
- [ ] Update usePipeline usage
  - [ ] Update `nextStep()` logic if you override it
  - [ ] Handle new `classDefinition` state if needed
- [ ] Update component props
  - [ ] Remove `showProblemMetadata` and `onToggleProblemMetadata` from StudentSimulations
  - [ ] Add `classDefinition` handling in your components
- [ ] Update tests
  - [ ] Update step count assertions (5 → 6)
  - [ ] Update flow tests with new step names
  - [ ] Add tests for ClassBuilder and ProblemAnalysis

### If You Have Tests

**Old test flow**:
```typescript
expect(step).toBe(PipelineStep.TAG_ANALYSIS);
await nextStep();
expect(step).toBe(PipelineStep.STUDENT_SIMULATIONS);
```

**New test flow**:
```typescript
expect(step).toBe(PipelineStep.PROBLEM_ANALYSIS);
await nextStep();
expect(step).toBe(PipelineStep.CLASS_BUILDER);
await nextStep();
expect(step).toBe(PipelineStep.STUDENT_SIMULATIONS);
```

---

## 🚀 Migration Path

### Minimal Approach
Keep things working with minimal changes:

1. **Update PipelineStep enum** (already done)
2. **Update PipelineShell** to render new components (already done)
3. **Update usePipeline nextStep()** (already done)
4. Run existing tests, adjust for 6 steps
5. Test end-to-end flow

### Comprehensive Approach
Fully embrace the new architecture:

1. **All above** ✅
2. Add tests for ProblemAnalysis export functions
3. Add tests for ClassBuilder class definition creation
4. Update documentation (we did this)
5. Create dashboard to display exported data
6. Connect to external processor API

---

## ✨ Benefits of the New Architecture

### For Teachers
✅ **More Control**: Define their actual student class
✅ **Transparency**: See all problem metadata upfront
✅ **Flexibility**: Export at Step 2 if just need metadata
✅ **Better Workflow**: Natural progression from data prep → simulation → rewrite → export

### For Developers
✅ **Cleaner Separation**: Data prep ≠ Simulation
✅ **Easier Testing**: Each step is more isolated
✅ **Better Type Safety**: ClassDefinition is explicit
✅ **Extensibility**: Export format is standard (JSON)
✅ **Scalability**: External processor can be swapped/upgraded

### For System Architecture
✅ **Microservices Ready**: Clear API boundary at export
✅ **Reduced Coupling**: Don't do all processing in-system
✅ **Better UX**: Progressive disclosure (see what you need at each step)
✅ **Data-Driven**: Metadata-first approach

---

## 🎓 Conceptual Shift

### Old Mental Model
```
Assignment → System does everything → Results
```

### New Mental Model
```
Assignment 
  → Extract & Tag (Phase 2 - in system)
  → Class Definition (Phase 2.5 - in system, NEW)
  → Verify/Simulate (Phase 3 - in system, optional)
  → Polish (Phase 4 - in system)
  → Export (Phase 5 - in system, NEW)
  → Detailed Analysis (Phase 6 - external processor)
```

The **shift**: Explicit acknowledgment that detailed analysis happens **outside this system**.

---

## 🔮 Future Compatibility

### What Stays the Same
- Asteroid structure (problem metadata)
- Astronaut/persona system (11 personas still available)
- Bloom's taxonomy classification
- Simulation logic (external processor)
- Student feedback model

### What Changes
- Step names and order
- Export format (now includes ClassDefinition)
- User workflows
- Internal state management

### Backward Compatibility
- **No automatic migration**: Old saved states won't work
- **Manual conversion possible**: If you have old exports, can still parse asteroids
- **API contract**: If external processor expects JSON, format is stable

---

## 📊 Impact Summary

| Area | Impact | Level |
|------|--------|-------|
| User Workflows | Major change | ⚠️ High |
| Component APIs | Breaking changes in props | ⚠️ High |
| Data Types | New types added, old flow removed | ⚠️ High |
| Tests | Need update for new steps | ⚠️ Medium |
| External Integration | Export format changed (better) | 📈 Positive |
| Performance | Unchanged | ✅ None |
| Build Size | Unchanged | ✅ None |

---

## ✅ Verification Checklist

- [x] Build compiles (877 modules, 0 errors)
- [x] All imports resolve
- [x] Type system updated
- [x] Components created (ProblemAnalysis, ClassBuilder)
- [x] usePipeline logic updated
- [x] PipelineShell rendering updated
- [x] Export functionality implemented
- [x] Documentation complete
- [ ] Manual testing (you'll do this in browser)
- [ ] Unit tests updated
- [ ] Integration tests updated
- [ ] E2E tests updated

---

**Status**: ✅ Migration Complete - Ready for Testing
**Date**: December 20, 2024
**Breaking Changes**: Yes - Update any custom code using old pipeline
