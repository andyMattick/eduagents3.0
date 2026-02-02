# Integration Guide: Assignment Analysis System

This guide shows how to integrate the Assignment Analysis system into your existing assignment builder workflow.

## Quick Start

### 1. Import Components

```tsx
import { AssignmentAnalysis, AnalysisResults } from '../components/Analysis/AssignmentAnalysis';
import { AssignmentMetadataForAnalysis } from '../agents/analysis/types';
```

### 2. Add Analysis Button to Builder

In `PromptBuilderSimplified.tsx`, add a button in the Step 5 or after "Generate Assignment":

```tsx
<button
  onClick={() => setShowAnalysis(true)}
  style={{
    padding: '10px 16px',
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '8px',
  }}
>
  🔍 Analyze Assignment
</button>
```

### 3. Prepare Assignment Metadata

```tsx
const analysisMetadata: AssignmentMetadataForAnalysis = {
  title,
  content: parts.map(p => `${p.title}\n${p.instructions}`).join('\n\n'),
  learningObjectives,
  estimatedTimeMinutes: totalPoints,  // or your actual estimate
  gradeLevel,
  bloomLevels: assessmentQuestions.map(q => q.bloomLevel),
  rubric: criteria,
  extractedTags,
};
```

### 4. Show Analysis Modal

```tsx
{showAnalysis && (
  <AssignmentAnalysis
    assignmentMetadata={analysisMetadata}
    onAnalysisComplete={(results) => {
      console.log('Analysis complete:', results);
      // Optionally save results, show summary, etc.
      handleAnalysisResults(results);
    }}
  />
)}
```

## Integration Points

### With PromptBuilderSimplified

**Location**: Add after Step 5 completion

```tsx
// State
const [showAnalysis, setShowAnalysis] = useState(false);
const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);

// Handler
const handleAnalysisResults = (results: AnalysisResults) => {
  setAnalysisResults(results);
  // Could save to database, show in dashboard, etc.
};

// UI
{showAnalysis && (
  <div style={{ position: 'fixed', top: 0, left: 0, ... }}>
    <AssignmentAnalysis
      assignmentMetadata={analysisMetadata}
      onAnalysisComplete={handleAnalysisResults}
    />
  </div>
)}
```

### With Tag Analysis (Existing System)

The analysis system **complements** your existing tag analysis:

```tsx
// From PromptBuilderSimplified
const { extractedTags } = usePipeline();

// Pass to analysis
const analysisMetadata: AssignmentMetadataForAnalysis = {
  // ...
  extractedTags,  // Already extracted from documents
};
```

### With Student Simulations

The analysis returns detailed student simulations:

```tsx
onAnalysisComplete={(results) => {
  const { studentSimulations } = results;
  // Potentially integrate with existing StudentSimulations component
  handleStudentSimulations(studentSimulations);
}}
```

## Data Flow Example

```
User fills assignment builder form
        ↓
User clicks "Analyze Assignment"
        ↓
AssignmentAnalysis component receives metadata
        ↓
Calls analysis functions:
  - extractTags()
  - estimateTime()
  - calculateScores()
  - generatePeerReviewComments()
  - simulateStudentPerformance()
  - generateRubric()
        ↓
Displays results in tabbed interface:
  1. Dashboard (visual scores & metrics)
  2. Notes (peer review with AI/teacher fixes)
  3. Simulations (student performance)
  4. Rubric (editable criteria)
        ↓
User resolves notes, edits rubric
        ↓
onAnalysisComplete() callback fires with final results
        ↓
Results can be saved to database or passed to next step
```

## API Reference

### AssignmentAnalysisProps

```tsx
interface AssignmentAnalysisProps {
  // Required: Metadata about the assignment
  assignmentMetadata: AssignmentMetadataForAnalysis;
  
  // Optional: Called when analysis completes
  onAnalysisComplete?: (results: AnalysisResults) => void;
}
```

### AssignmentMetadataForAnalysis

```tsx
interface AssignmentMetadataForAnalysis {
  title: string;                          // Assignment name
  content: string;                        // Full assignment text
  learningObjectives: string[];           // Learning goals
  estimatedTimeMinutes?: number;          // Teacher estimate (optional)
  gradeLevel: number;                     // 6-12
  bloomLevels?: BloomLevel[];             // Bloom classification
  rubric?: RubricCriterion[];             // Existing rubric (optional)
  extractedTags?: string[];               // From document analysis
}
```

### AnalysisResults

```tsx
interface AnalysisResults {
  analysis: AssignmentAnalysis;              // Main scores & metrics
  teacherNotes: TeacherNote[];              // Resolved feedback
  studentSimulations: StudentSimulation[];  // 4 student personas
  rubric: GeneratedRubric;                  // Final rubric
  summaryComment: string;                   // Overall feedback
}
```

## Styling & Customization

### Override Component Styles

All components use inline styles for flexibility:

```tsx
// Custom styling example
<AssignmentAnalysis
  assignmentMetadata={metadata}
  onAnalysisComplete={results => {
    // Could wrap in styled container
  }}
/>
```

### Theme Configuration

To match your application's theme, modify these core styles:

- Primary color: `#2196f3` (blue)
- Success color: `#4caf50` (green)
- Warning color: `#ff9800` (orange)
- Error color: `#f44336` (red)

Search for these hex values in component files to override.

## Common Use Cases

### Use Case 1: Analyzing User's Generated Assignment

```tsx
const metadata: AssignmentMetadataForAnalysis = {
  title: assignment.title,
  content: assignment.content,
  learningObjectives: assignment.objectives,
  estimatedTimeMinutes: assignment.estimatedTime,
  gradeLevel: assignment.gradeLevel,
  extractedTags: assignment.tags,
};
```

### Use Case 2: Improving Existing Rubric

```tsx
const metadata: AssignmentMetadataForAnalysis = {
  // ...
  rubric: existingRubric,  // System will validate & suggest improvements
};
```

### Use Case 3: Peer Review with AI Fixes

```tsx
onAnalysisComplete={(results) => {
  // User can click "Let AI Fix It" for each comment
  // AI rewrite results flow back through TeacherNotesPanel
  // Teacher can also manually edit with "I'll Fix It"
});
```

### Use Case 4: Student Simulation Report

```tsx
onAnalysisComplete((results) => {
  const report = {
    averageTime: results.studentSimulations.reduce(
      (sum, s) => sum + s.timeToCompleteMinutes, 0
    ) / results.studentSimulations.length,
    highestRisk: results.studentSimulations
      .filter(s => s.dropoffReason)
      .map(s => s.persona),
  };
  saveReport(report);
});
```

## Troubleshooting Integration

**Q: Analysis takes too long to load**
A: Check network if using remote AI service. System should complete in <2 seconds locally.

**Q: Data not persisting after edit**
A: Call `onAnalysisComplete()` callback to capture final state before unmounting.

**Q: Tags not being extracted**
A: Ensure `extractedTags` array is passed in metadata. Check tag content matches assignment text.

**Q: Student simulations show unrealistic grades**
A: Review Bloom distribution and persona definitions in `simulateStudents.ts`.

## Database Integration

### Saving Analysis Results

```tsx
const handleAnalysisComplete = async (results: AnalysisResults) => {
  await saveToDB({
    assignmentId: currentAssignment.id,
    analysis: results.analysis,
    rubric: results.rubric,
    studentSimulations: results.studentSimulations,
    timestamp: new Date(),
  });
};
```

### Retrieving Cached Results

```tsx
const cachedResults = await loadFromDB(assignmentId);
if (cachedResults) {
  setAnalysisResults(cachedResults);
  // Skip re-analysis
}
```

## Next Steps

1. ✅ Components created and tested
2. ⬜ Integrate into PromptBuilderSimplified
3. ⬜ Connect to backend for AI rewrite service
4. ⬜ Add database persistence
5. ⬜ Create teacher dashboard to view all analyses
6. ⬜ Add comparison view (before/after revisions)

---

For detailed API documentation, see [README.md](./README.md) in the analysis directory.
