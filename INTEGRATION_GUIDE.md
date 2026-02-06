# 🔌 Integration Guide: Connecting PipelineRouter to PipelineShell

This guide explains how to connect the new user routing system (`PipelineRouter`) with the existing assignment generation and analysis pipeline (`PipelineShell`).

---

## Current Architecture

### Before Integration
```
PipelineRouter (new)
├── GoalSelector
├── SourceSelector
├── FileUploadComponent
├── IntentCaptureComponent
└── [Placeholder routes]

PipelineShell (existing)
├── AssignmentInput
├── TagAnalysis
├── StudentSimulations
├── RewriteResults
└── Step8FinalReview
```

### After Integration
```
PipelineRouter (new)
├── GoalSelector
├── SourceSelector
├── FileUploadComponent
├── IntentCaptureComponent
└── PipelineShell (existing) ← Connected here!
    ├── [Generation/Analysis steps]
    └── DocumentReviewExport (new) ← Replaces Step8FinalReview
```

---

## Step 1: Prepare PipelineShell for Router Input

### Modify `src/components/Pipeline/PipelineShell.tsx`

**Goal:** Accept initial flow state from PipelineRouter and populate the pipeline automatically.

```tsx
interface PipelineShellProps {
  // New props from UserFlow
  goal?: 'create' | 'analyze';
  sourceFile?: File;
  assignmentFile?: File;
  intentData?: {
    topic: string;
    gradeLevel: string;
    assignmentType: string;
    bloomTargets: string[];
  };
  onFlowComplete?: (result: AssignmentAnalysisResult) => void;
}

export function PipelineShell({
  goal,
  sourceFile,
  assignmentFile,
  intentData,
  onFlowComplete,
}: PipelineShellProps) {
  // ... existing code ...

  // On mount, auto-populate data based on props
  useEffect(() => {
    if (sourceFile) {
      // Parse source file and extract assignment metadata
      handleSourceFileParsing(sourceFile);
    }
    if (intentData) {
      // Set assignment metadata from intent
      setAssignmentMetadata({
        gradeLevel: intentData.gradeLevel,
        subject: intentData.topic,
        assignmentType: intentData.assignmentType,
      });
    }
    if (assignmentFile && goal === 'analyze') {
      // Parse assignment for analysis
      handleAssignmentFileParsing(assignmentFile);
    }
  }, [sourceFile, intentData, assignmentFile, goal]);

  // ... rest of existing code ...
}
```

---

## Step 2: Update PipelineRouter Routes

### Modify `src/components/Pipeline/PipelineRouter.tsx`

**Replace placeholder routes with actual PipelineShell integration:**

```tsx
import { PipelineShell } from './PipelineShell';

export function PipelineRouter() {
  const userFlow = useUserFlow();

  // ... existing routes ...

  // Step 4+: Generation/Analysis Routes
  if (currentRoute === '/generate-assignment') {
    return (
      <PipelineShell
        goal={userFlow.goal === 'create' ? 'create' : undefined}
        sourceFile={userFlow.sourceFile || undefined}
        intentData={userFlow.intentData || undefined}
        onFlowComplete={(result) => {
          // Optional: Handle completion
          // e.g., navigate to final review, show success message
          console.log('Assignment generated:', result);
        }}
      />
    );
  }

  if (currentRoute === '/analyze-assignment') {
    return (
      <PipelineShell
        goal={'analyze'}
        sourceFile={userFlow.sourceFile || undefined}
        assignmentFile={userFlow.assignmentFile || undefined}
        onFlowComplete={(result) => {
          console.log('Assignment analyzed:', result);
        }}
      />
    );
  }

  // ... rest of component ...
}
```

---

## Step 3: Create PipelineShell Handlers

### Add File Parsing Methods

```tsx
// In PipelineShell.tsx

const handleSourceFileParsing = async (file: File) => {
  try {
    setIsLoading(true);
    
    // Use existing parseDocumentStructure from agents/analysis/documentStructureParser
    const structure = await parseDocumentStructure(file);
    
    // Convert to asteroids
    const extracted = await extractAsteroidsFromText(structure.text);
    setAsteroids(extracted);
    setOriginalText(structure.text);
    
    // Move to tag analysis step
    nextStep();
  } catch (error) {
    console.error('Error parsing source file:', error);
    setError('Failed to parse file. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

const handleAssignmentFileParsing = async (file: File) => {
  try {
    setIsLoading(true);
    
    // Parse assignment text
    const text = await file.text(); // For text/plain
    // Or use existing PDF/Word parsers
    
    setOriginalText(text);
    
    // Auto-run tag analysis
    await analyzeTextAndTags(text);
  } catch (error) {
    console.error('Error parsing assignment file:', error);
    setError('Failed to parse assignment. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

---

## Step 4: Replace Step 8 with DocumentReviewExport

### Update `src/components/Pipeline/PipelineShell.tsx`

**Replace or enhance the final review step:**

```tsx
// In PipelineShell's step rendering logic:

import { DocumentReviewExport } from './DocumentReviewExport';

// ... in step rendering ...

case 'step_final_review':
  const assignmentContent = asteroids.map((asteroid, idx) => ({
    id: asteroid.id || `problem-${idx}`,
    text: asteroid.text,
    bloomLevel: asteroid.bloomLevel,
    complexity: asteroid.complexity,
    novelty: asteroid.novelty,
    tips: asteroid.tips,
    multipart: asteroid.multipart,
  }));

  return (
    <DocumentReviewExport
      assignment={{
        title: assignmentMetadata.title || 'Untitled Assignment',
        topic: assignmentMetadata.subject,
        gradeLevel: assignmentMetadata.gradeLevel,
        type: assignmentMetadata.assignmentType,
        problems: assignmentContent,
        metadata: {
          subject: assignmentMetadata.subject,
          totalTime: 45, // Calculate from simulations
          instructions: assignmentMetadata.instructions,
        },
      }}
      showMetadata={true}
      showAnalytics={true}
      analysisData={{
        bloomHistogram: calculateBloomHistogram(asteroids),
        averageComplexity: calculateAverageComplexity(asteroids),
        totalEstimatedTime: estimateTotalTime(asteroids),
        studentFeedbackSummary: generateFeedbackSummary(studentFeedback),
      }}
    />
  );
```

---

## Step 5: Data Mapping

### Create Helper Functions

```tsx
// src/components/Pipeline/pipelineHelpers.ts

export function mapAsteroidsToProblems(asteroids: Asteroid[]) {
  return asteroids.map((asteroid, idx) => ({
    id: asteroid.id || `problem-${idx}`,
    text: asteroid.text,
    bloomLevel: asteroid.bloomLevel,
    complexity: asteroid.complexity,
    novelty: asteroid.novelty,
    tips: asteroid.tips,
    multipart: asteroid.multipart,
  }));
}

export function calculateBloomHistogram(asteroids: Asteroid[]): Record<string, number> {
  const histogram = {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  };

  asteroids.forEach(a => {
    if (a.bloomLevel && a.bloomLevel in histogram) {
      histogram[a.bloomLevel as keyof typeof histogram]++;
    }
  });

  return histogram;
}

export function calculateAverageComplexity(asteroids: Asteroid[]): number {
  if (asteroids.length === 0) return 0;
  const sum = asteroids.reduce((acc, a) => acc + (a.complexity || 0), 0);
  return sum / asteroids.length;
}

export function estimateTotalTime(asteroids: Asteroid[]): number {
  // Use existing completionSimulation logic
  // Each problem: baseTime × (1 + complexity + bloomWeight)
  return Math.ceil(
    asteroids.reduce((sum, a) => {
      const baseTime = a.text.split(' ').length / 40; // ~40 words per minute
      const bloomMultiplier = getBloomTimeFactor(a.bloomLevel);
      return sum + baseTime * (1 + (a.complexity || 0) + bloomMultiplier);
    }, 0)
  );
}

export function generateFeedbackSummary(feedback: StudentFeedback[]): string {
  if (feedback.length === 0) return 'No student feedback available.';

  const avgEngagement = 
    feedback.reduce((sum, f) => sum + (f.engagementScore || 0), 0) / feedback.length;
  const atRiskCount = feedback.filter(f => f.atRiskProfile).length;

  return `Assignment tested with ${feedback.length} student personas. Average engagement: ${(avgEngagement * 100).toFixed(0)}%. ${atRiskCount} personas at risk.`;
}
```

---

## Step 6: Integration Checklist

### Before Deploy

- [ ] PipelineShell accepts `goal`, `sourceFile`, `intentData`, `assignmentFile` props
- [ ] PipelineShell auto-runs parsing when files/intent provided
- [ ] Final step renders `DocumentReviewExport` component
- [ ] Export buttons produce PDF and Word files
- [ ] Analytics calculations work correctly
- [ ] User can export and return to home
- [ ] Dark mode works in all steps
- [ ] Mobile responsive design tested
- [ ] Error handling for file parsing failures
- [ ] Loading states display during parsing

### Testing Scenarios

1. **Create with Source Documents**
   - Select "Create" → "I have documents"
   - Upload PDF → Auto-extract → Tag analysis → Simulate → Review & Export

2. **Create with Intent**
   - Select "Create" → "I don't have documents"
   - Fill intent form → Generate from objectives → Simulate → Review & Export

3. **Analyze with Both**
   - Select "Analyze" → "I have documents"
   - Upload source + assignment → Tag & analyze → Review & Export

4. **Analyze Assignment Only**
   - Select "Analyze" → "I don't have documents"
   - Upload assignment → Tag & analyze → Review & Export

---

## Step 7: Type Safety

### Ensure TypeScript Compatibility

```tsx
// src/components/Pipeline/index.ts - Export all types
export { PipelineRouter } from './PipelineRouter';
export { PipelineShell, PipelineShellProps } from './PipelineShell';
export { DocumentReviewExport, AssignmentContent } from './DocumentReviewExport';
export { ExportButtons } from './ExportButtons';
export { useUserFlow } from '../../hooks/useUserFlow';
```

---

## Step 8: Optional Enhancements

### Add Progress Indicator

```tsx
// Display current step in header
<div className="pipeline-progress">
  <div className="progress-step active">1. Goal</div>
  <div className="progress-step active">2. Source</div>
  <div className="progress-step active">3. Upload</div>
  <div className="progress-step active">4. Analyze</div>
  <div className="progress-step">5. Review</div>
</div>
```

### Add Breadcrumbs

```tsx
<nav className="breadcrumbs">
  <span>Goal: {goal}</span>
  <span>→</span>
  <span>Source: {hasSourceDocs ? 'Yes' : 'No'}</span>
  <span>→</span>
  <span>Step: {step}</span>
</nav>
```

### Save Flow State to localStorage

```tsx
// Auto-save on change
useEffect(() => {
  const flowState = {
    goal,
    hasSourceDocs,
    sourceFile: sourceFile?.name, // Don't store actual file
    intentData,
  };
  localStorage.setItem('eduagents_flow_state', JSON.stringify(flowState));
}, [goal, hasSourceDocs, sourceFile, intentData]);

// Restore on mount
useEffect(() => {
  const saved = localStorage.getItem('eduagents_flow_state');
  if (saved) {
    // Restore if user refreshes page
    const state = JSON.parse(saved);
    setGoal(state.goal);
    // etc...
  }
}, []);
```

---

## API Reference

### Key Functions to Call

```tsx
// From PipelineShell (existing)
analyzeTextAndTags(text: string) → Promise<Tag[]>
simulateStudents() → Promise<StudentFeedback[]>
rewriteAssignment() → Promise<string>
analyzeVersions() → Promise<AnalysisComparison>

// New from DocumentReviewExport
<DocumentReviewExport assignment={} analyticsData={} />

// New from UserFlow
useUserFlow() → {
  goal, hasSourceDocs, getCurrentRoute(), reset(), ...
}
```

---

## Code Examples

### Complete Flow Example

```tsx
// User journey in code:

// 1. User selects goal
setGoal('create');

// 2. User selects source
setHasSourceDocs(true);

// 3. Router navigates to /source-upload
// getCurrentRoute() === '/source-upload'

// 4. User uploads file
setSourceFile(file);

// 5. Router navigates to /generate-assignment
// getCurrentRoute() === '/generate-assignment'

// 6. PipelineRouter renders PipelineShell with file
<PipelineShell sourceFile={sourceFile} goal="create" />

// 7. PipelineShell auto-parses file
handleSourceFileParsing(sourceFile);

// 8. Steps execute: analyze → simulate → rewrite → review
// Final step renders DocumentReviewExport

// 9. User exports to PDF/Word
<ExportButtons assignment={content} />

// 10. User can reset and start over
reset();
```

---

## Debugging Tips

**Enable console logging in PipelineRouter:**
```tsx
useEffect(() => {
  console.log('Current route:', getCurrentRoute());
  console.log('User flow:', { goal, hasSourceDocs, sourceFile, assignmentFile });
}, [goal, hasSourceDocs, sourceFile, assignmentFile]);
```

**Monitor PipelineShell prop changes:**
```tsx
useEffect(() => {
  console.log('PipelineShell received:', { goal, sourceFile, intentData });
}, [goal, sourceFile, intentData]);
```

**Check export file generation:**
```tsx
const handleExportPDF = async () => {
  console.log('Exporting with data:', assignment);
  // ... export code ...
};
```

---

## Performance Considerations

1. **File Parsing**, Use Web Workers for large PDFs:
   ```tsx
   const worker = new Worker('pdfParseWorker.js');
   ```

2. **Memoize Expensive Calculations:**
   ```tsx
   const bloomHistogram = useMemo(
     () => calculateBloomHistogram(asteroids),
     [asteroids]
   );
   ```

3. **Lazy Load DocumentReviewExport:**
   ```tsx
   const DocumentReviewExport = lazy(() =>
     import('./DocumentReviewExport')
   );
   ```

---

## Questions?

Refer to:
- `ROUTING_ARCHITECTURE_GUIDE.md` - Architecture overview
- `src/copilot-instructions.md` - Project structure
- Existing code in `src/agents/` - Reference implementations
