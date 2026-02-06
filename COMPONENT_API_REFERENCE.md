# 🔍 Component API Reference

Complete API documentation for all new components in the routing system.

---

## useUserFlow Hook

**Location:** `src/hooks/useUserFlow.tsx`

### Type Definition

```typescript
interface UserFlowState {
  // Step 1: Goal Selection
  goal: UserGoal | null;
  setGoal: (goal: UserGoal) => void;

  // Step 2: Source Document Selection
  hasSourceDocs: boolean | null;
  setHasSourceDocs: (hasSourceDocs: boolean) => void;

  // Uploaded/Selected files
  sourceFile: File | null;
  setSourceFile: (file: File | null) => void;

  assignmentFile: File | null;
  setAssignmentFile: (file: File | null) => void;

  // Intent capture data
  intentData: {
    topic: string;
    gradeLevel: string;
    assignmentType: string;
    bloomTargets: string[];
  } | null;
  setIntentData: (data: UserFlowState['intentData']) => void;

  // Extracted data
  extractedTags: string[];
  setExtractedTags: (tags: string[]) => void;

  // Methods
  reset: () => void;
  getCurrentRoute: () => string;
}

type UserGoal = 'create' | 'analyze';
```

### Usage

```typescript
import { useUserFlow } from '../../hooks/useUserFlow';

function MyComponent() {
  const {
    goal,
    setGoal,
    hasSourceDocs,
    setHasSourceDocs,
    sourceFile,
    setSourceFile,
    assignmentFile,
    setAssignmentFile,
    intentData,
    setIntentData,
    extractedTags,
    setExtractedTags,
    reset,
    getCurrentRoute,
  } = useUserFlow();

  return (
    <div>
      <p>Current Goal: {goal}</p>
      <p>Route: {getCurrentRoute()}</p>
    </div>
  );
}
```

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `setGoal()` | `'create' \| 'analyze'` | `void` | Set primary user goal |
| `setHasSourceDocs()` | `boolean` | `void` | Indicate source availability |
| `setSourceFile()` | `File \| null` | `void` | Store source document |
| `setAssignmentFile()` | `File \| null` | `void` | Store assignment document |
| `setIntentData()` | `IntentData \| null` | `void` | Store learning objectives |
| `setExtractedTags()` | `string[]` | `void` | Store extracted problem tags |
| `reset()` | none | `void` | Clear all flow state |
| `getCurrentRoute()` | none | `string` | Get current navigation route |

### Route Values

```typescript
'/goal-selection'         // Step 1: Choose goal
'/source-selection'       // Step 2: Choose source
'/source-upload'          // Step 3a: Upload source
'/intent-capture'         // Step 3b: Describe objectives
'/assignment-upload'      // Step 3c: Upload assignment only
'/generate-assignment'    // Step 4: Generation
'/analyze-assignment'     // Step 4: Analysis
```

---

## GoalSelector

**Location:** `src/components/Pipeline/GoalSelector.tsx`

### Purpose
First step in user journey. User selects between creating or analyzing assignments.

### Component Props
```typescript
// No props required - uses useUserFlow internally
```

### Usage

```typescript
import { GoalSelector } from './GoalSelector';

function App() {
  return <GoalSelector />;
}
```

### Output
- Sets `goal` in useUserFlow to `'create'` or `'analyze'`
- Triggers navigation to SourceSelector

### Styling
- File: `GoalSelector.css`
- Dark mode: Yes
- Responsive: Yes
- Print: N/A

---

## SourceSelector

**Location:** `src/components/Pipeline/SourceSelector.tsx`

### Purpose
Second step. User indicates whether they have source documents.

### Component Props
```typescript
// No props required - uses useUserFlow internally
```

### Usage

```typescript
import { SourceSelector } from './SourceSelector';

function App() {
  return <SourceSelector />;
}
```

### Output
- Sets `hasSourceDocs` in useUserFlow to `true` or `false`
- Descriptions are dynamic based on `goal`
- Triggers navigation to appropriate Step 3

### Styling
- File: `SourceSelector.css`
- Dark mode: Yes
- Responsive: Yes
- Print: N/A

---

## FileUploadComponent

**Location:** `src/components/Pipeline/FileUploadComponent.tsx`

### Purpose
Reusable drag-and-drop file upload with validation.

### Component Props

```typescript
interface FileUploadComponentProps {
  title: string;                    // "Source Document"
  description?: string;             // Help text
  acceptedTypes?: string;           // ".pdf,.doc,.docx,.txt"
  maxSizeMB?: number;              // Default: 25
  onFileSelected: (file: File) => void;
  selectedFileName?: string;        // Show selected filename
}
```

### Usage

```typescript
import { FileUploadComponent } from './FileUploadComponent';

function MyComponent() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <FileUploadComponent
      title="Upload Your Document"
      description="PDF, Word, or text files"
      acceptedTypes=".pdf,.doc,.docx,.txt"
      maxSizeMB={25}
      onFileSelected={setFile}
      selectedFileName={file?.name}
    />
  );
}
```

### Features
- ✅ Drag-and-drop interface
- ✅ Click-to-browse fallback
- ✅ File type validation
- ✅ File size validation
- ✅ Error messages
- ✅ File preview/confirmation

### Events

| Event | When | Data |
|-------|------|------|
| `onFileSelected` | User selects valid file | `File` object |

### Styling
- File: `FileUploadComponent.css`
- Dark mode: Yes
- Responsive: Yes

---

## IntentCaptureComponent

**Location:** `src/components/Pipeline/IntentCaptureComponent.tsx`

### Purpose
Form for collecting learning objectives when user has no source documents.

### Component Props
```typescript
// No props required - uses useUserFlow internally
```

### Form Fields

| Field | Type | Required | Options |
|-------|------|----------|---------|
| Topic/Objectives | textarea | Yes | Free text |
| Grade Level | select | Yes | K-2, 3-5, 6-8, 9-10, 11-12, Higher Ed, Professional |
| Assignment Type | select | Yes | Multiple Choice, Short Answer, Essay, Problem Set, Project, Mixed, Other |
| Bloom Targets | multi-select | Yes (≥1) | Remember, Understand, Apply, Analyze, Evaluate, Create |

### Usage

```typescript
import { IntentCaptureComponent } from './IntentCaptureComponent';

function App() {
  return <IntentCaptureComponent />;
}
```

### Output
- Sets `intentData` in useUserFlow with:
  ```typescript
  {
    topic: string;
    gradeLevel: string;
    assignmentType: string;
    bloomTargets: string[];
  }
  ```
- Triggers navigation to /generate-assignment

### Validation
- Topic cannot be empty
- At least 1 Bloom level required
- Shows error list if validation fails

### Styling
- File: `IntentCaptureComponent.css`
- Dark mode: Yes
- Responsive: Yes

---

## PipelineRouter

**Location:** `src/components/Pipeline/PipelineRouter.tsx`

### Purpose
Main orchestrator for the entire user flow. Routes between all components based on state.

### Component Props
```typescript
// No props - uses useUserFlow internally
```

### Usage

```typescript
import { PipelineRouter } from './PipelineRouter';
import { UserFlowProvider } from '../../hooks/useUserFlow';

function App() {
  return (
    <UserFlowProvider>
      <PipelineRouter />
    </UserFlowProvider>
  );
}
```

### Routing Logic

```
No Goal
  ↓
/goal-selection → GoalSelector

Has Goal, No Source Decision
  ↓
/source-selection → SourceSelector

Create + Has Source, No File
  ↓
/source-upload → FileUploadComponent

Create + No Source, No Intent
  ↓
/intent-capture → IntentCaptureComponent

Analyze + Has Source, No Files
  ↓
/source-upload → FileUploadComponent (both files)

Analyze + No Source, No Assignment
  ↓
/assignment-upload → FileUploadComponent

Create + Has Source + Has File
  ↓
/generate-assignment → [PipelineShell]

Create + No Source + Has Intent
  ↓
/generate-assignment → [PipelineShell]

Analyze + Files Selected
  ↓
/analyze-assignment → [PipelineShell]
```

### Styling
- File: `PipelineRouter.css`
- Dark mode: Yes
- Responsive: Yes

---

## DocumentReviewExport

**Location:** `src/components/Pipeline/DocumentReviewExport.tsx`

### Purpose
Final step: preview assignment and export to PDF/Word.

### Component Props

```typescript
interface DocumentReviewExportProps {
  assignment: AssignmentContent;
  showMetadata?: boolean;           // Default: true
  showAnalytics?: boolean;          // Default: true
  analysisData?: {
    bloomHistogram?: Record<string, number>;
    averageComplexity?: number;
    totalEstimatedTime?: number;
    studentFeedbackSummary?: string;
  };
}

interface AssignmentContent {
  title: string;
  topic?: string;
  gradeLevel?: string;
  type?: string;
  problems: AsteroidProblem[];
  metadata?: {
    subject?: string;
    totalTime?: number;
    instructions?: string;
  };
}

interface AsteroidProblem {
  id: string;
  text: string;
  bloomLevel?: string;
  complexity?: number;
  novelty?: number;
  tips?: string;
  multipart?: boolean;
}
```

### Usage

```typescript
import { DocumentReviewExport } from './DocumentReviewExport';

function MyComponent() {
  const assignmentData = {
    title: 'Unit 3: American Revolution',
    topic: 'History',
    gradeLevel: '9-10',
    type: 'Mixed Essay + MC',
    problems: [
      {
        id: 'q1',
        text: 'Analyze the causes of the American Revolution...',
        bloomLevel: 'Analyze',
        complexity: 0.7,
        novelty: 0.4,
      },
      // ... more problems
    ],
  };

  const analytics = {
    bloomHistogram: {
      'Remember': 2,
      'Understand': 3,
      'Apply': 4,
      'Analyze': 5,
      'Evaluate': 2,
      'Create': 1,
    },
    averageComplexity: 0.65,
    totalEstimatedTime: 45,
    studentFeedbackSummary: 'Good coverage, some students may struggle with Apply level.',
  };

  return (
    <DocumentReviewExport
      assignment={assignmentData}
      showMetadata={true}
      showAnalytics={true}
      analysisData={analytics}
    />
  );
}
```

### Features
- ✅ Professional document preview
- ✅ Toggle controls (metadata, tips, analytics)
- ✅ Problem pagination
- ✅ Analytics appendix
- ✅ Print-ready styling
- ✅ Export buttons

### Styling
- File: `DocumentReviewExport.css`
- Dark mode: Yes
- Print: Yes (special @media print rules)
- Responsive: Yes

---

## ExportButtons

**Location:** `src/components/Pipeline/ExportButtons.tsx`

### Purpose
Provides PDF and Word download functionality.

### Component Props

```typescript
interface ExportButtonsProps {
  assignment: AssignmentContent;
  includeMetadata?: boolean;        // Default: true
  includeTips?: boolean;            // Default: true
  includeAnalytics?: boolean;       // Default: false
  analyticsData?: {
    bloomHistogram?: Record<string, number>;
    averageComplexity?: number;
    totalEstimatedTime?: number;
    studentFeedbackSummary?: string;
  };
}
```

### Usage

```typescript
import { ExportButtons } from './ExportButtons';

function MyComponent() {
  return (
    <ExportButtons
      assignment={assignmentData}
      includeMetadata={true}
      includeTips={true}
      includeAnalytics={true}
      analyticsData={analyticsData}
    />
  );
}
```

### Export Formats

#### PDF
- **Library:** jsPDF v4.1.0
- **Features:**
  - Professional formatting
  - Page breaks for long content
  - Metadata in header
  - Problem numbering
  - Tips in italics
  - Optional analytics appendix
- **File naming:** `{title}.pdf`

#### Word (.docx)
- **Library:** docx v9.5.1 + file-saver v2.0.5
- **Features:**
  - Proper DOCX structure
  - Metadata tables
  - Formatted problem lists
  - Heading hierarchy
  - Optional analytics summary
- **File naming:** `{title}.docx`

### Error Handling
- Catches and logs errors to console
- Shows user alert if export fails
- Graceful fallback messages

### Styling
- File: `ExportButtons.css`
- Dark mode: Yes
- Responsive: Yes

---

## Type Definitions

### UserGoal
```typescript
type UserGoal = 'create' | 'analyze';
```

### IntentData
```typescript
interface IntentData {
  topic: string;
  gradeLevel: string;
  assignmentType: string;
  bloomTargets: string[];
}
```

### Grade Levels
```typescript
const GRADE_LEVELS = [
  'K-2', '3-5', '6-8', '9-10', '11-12',
  'Higher Education', 'Professional'
];
```

### Assignment Types
```typescript
const ASSIGNMENT_TYPES = [
  'Multiple Choice Quiz',
  'Short Answer',
  'Essay',
  'Problem Set',
  'Project',
  'Mixed (Multiple choice + Written)',
  'Other'
];
```

### Bloom Levels
```typescript
const BLOOM_LEVELS = [
  'remember', 'understand', 'apply',
  'analyze', 'evaluate', 'create'
];
```

---

## CSS Classes

### Global Classes

```
.goal-selector           - Goal selection container
.source-selector         - Source selection container
.file-upload-component   - File upload container
.file-upload-zone        - Drag-drop area
.intent-capture-component - Intent form container
.pipeline-router-container - Router main container
.document-review-export  - Document preview container
.document-page          - Printable document
.export-buttons         - Export button group
```

### State Classes

```
.dragging               - File upload during drag
.has-file               - File upload with selected file
.selected               - Multi-select button selected
.active                 - Active tab/button
```

### Theme Variables

```css
--color-bg-primary
--color-bg-secondary
--color-bg-card
--color-bg-hover

--color-text-primary
--color-text-secondary

--color-border
--color-accent-primary
--color-accent-secondary
--color-success
--color-warning
--color-danger
--color-info
```

---

## Dependencies

### Required
- `react@19.2.4` - UI framework
- `jspdf@4.1.0` - PDF export
- `docx@9.5.1` - Word export
- `file-saver@2.0.5` - File download

### Optional for TypeScript
- `@types/file-saver@2.0.5` - Type definitions

---

## Best Practices

1. **Always wrap in UserFlowProvider** when using useUserFlow
2. **Use CSS classes for styling**, avoid inline styles
3. **Implement dark mode** in all new CSS files
4. **Make responsive** with mobile-first approach
5. **Validate user input** before calling handlers
6. **Provide clear error messages** to users
7. **Test on mobile** and tablet viewports
8. **Include JSDoc comments** on functions

---

## Integration Testing

### Test Sequence
1. GoalSelector → SourceSelector
2. SourceSelector → FileUploadComponent
3. FileUploadComponent → IntentCaptureComponent or next step
4. IntentCaptureComponent → PipelineRouter
5. DocumentReviewExport → ExportButtons
6. ExportButtons → PDF/Word download

### Test Data

```javascript
// Sample assignment for testing
const testAssignment = {
  title: 'Test Assignment',
  topic: 'Test Topic',
  gradeLevel: '6-8',
  type: 'Mixed',
  problems: [
    {
      id: '1',
      text: 'Test problem 1',
      bloomLevel: 'Remember',
      complexity: 0.5,
      novelty: 0.3,
    },
  ],
};
```

---

## Performance Notes

### Optimizations Applied
- ✅ Lazy component loading ready
- ✅ Memoization-friendly structure
- ✅ CSS variables (no re-renders on theme change)
- ✅ Pagination in document preview

### Bottlenecks to Watch
- File parsing (large PDFs)
- Export generation (large assignments)
- Document rendering (1000+ problems)

---

**Last Updated:** February 6, 2026
