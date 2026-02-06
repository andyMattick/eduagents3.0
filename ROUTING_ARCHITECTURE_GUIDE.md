# 🧭 User Flow & Routing Architecture Guide

This document explains the new user flow and routing system for eduagents3.0, which provides a structured, step-by-step experience for users to either create or analyze assignments.

## Overview

The system implements a **progressive disclosure pattern** with two main user journeys:

1. **Create Assignment** - Generate new assignments from source documents or learning objectives
2. **Analyze/Refine Assignment** - Test and optimize an existing assignment against student personas

---

## Architecture Components

### 1. **useUserFlow Hook** (`src/hooks/useUserFlow.tsx`)

Central state management for the entire user journey.

**State:**
- `goal`: 'create' | 'analyze' - User's primary goal
- `hasSourceDocs`: boolean - Whether user has source materials
- `sourceFile`: File | null - Uploaded source document
- `assignmentFile`: File | null - Uploaded assignment
- `intentData`: Object - Learning objectives (when no source docs)
- `extractedTags`: string[] - Tags from document parsing
- `getCurrentRoute()`: Returns the current route based on state

**Functions:**
- `setGoal()`, `setHasSourceDocs()`, `setSourceFile()`, etc. - Update state
- `reset()` - Clear all flow data

**Usage:**
```tsx
import { useUserFlow } from '../../hooks/useUserFlow';

function MyComponent() {
  const { goal, setGoal, getCurrentRoute } = useUserFlow();
  // ...
}
```

---

### 2. **Step 1: Goal Selector** (`GoalSelector.tsx`)

Component that presents two options:

```
┌─────────────────────────────────┐
│  Assignment Studio              │
│  What would you like to do?     │
├─────────────────────────────────┤
│ ✨ Create a New Assignment      │
│    → Route: /create             │
├─────────────────────────────────┤
│ 🔍 Analyze or Refine            │
│    → Route: /analyze            │
└─────────────────────────────────┘
```

**Routing:**
- Click "Create" → `setGoal('create')` → Navigates to Source Selection
- Click "Analyze" → `setGoal('analyze')` → Navigates to Source Selection

---

### 3. **Step 2: Source Selector** (`SourceSelector.tsx`)

Component that asks whether user has source materials.

```
┌─────────────────────────────────┐
│ Do you have source materials?   │
├─────────────────────────────────┤
│ 📁 I have source documents      │
│    → setHasSourceDocs(true)     │
├─────────────────────────────────┤
│ 💡 I don't have documents       │
│    → setHasSourceDocs(false)    │
└─────────────────────────────────┘
```

**Behavior:**
- Shows different descriptions based on goal
- For CREATE: "Extract problems from materials" vs "Describe your objectives"
- For ANALYZE: "Provide source + assignment" vs "Upload assignment only"

---

### 4. **File Upload Component** (`FileUploadComponent.tsx`)

Reusable drag-and-drop file upload with validation.

**Features:**
- Drag-and-drop interface
- File type validation (PDF, Word, Text)
- File size limits (default 25MB)
- Error messages
- Shows selected filename

**Props:**
```typescript
interface FileUploadComponentProps {
  title: string;
  description?: string;
  acceptedTypes?: string; // e.g., ".pdf,.doc,.docx"
  maxSizeMB?: number;
  onFileSelected: (file: File) => void;
  selectedFileName?: string;
}
```

---

### 5. **Intent Capture Component** (`IntentCaptureComponent.tsx`)

Form for collecting learning objectives when user has no source documents.

**Fields:**
- **Topic/Learning Objectives** (textarea)
  - Collects: "Students will understand..., be able to..."
  
- **Grade Level** (select)
  - Options: K-2, 3-5, 6-8, 9-10, 11-12, Higher Education, Professional

- **Assignment Type** (select)
  - Options: Multiple Choice, Short Answer, Essay, Problem Set, Project, Mixed, Other

- **Bloom Targets** (multi-select buttons)
  - Options: Remember, Understand, Apply, Analyze, Evaluate, Create
  - Requires at least one selection

**Output:**
Stores in `intentData`:
```typescript
{
  topic: string;
  gradeLevel: string;
  assignmentType: string;
  bloomTargets: string[];
}
```

---

### 6. **Pipeline Router** (`PipelineRouter.tsx`)

Orchestrates navigation between all steps based on user selections.

**Route Table:**

| Goal | Has Source Docs | Next Step | Route |
|------|---|---|---|
| create | true | Upload source | /source-upload |
| create | false | Capture intent | /intent-capture |
| analyze | true | Upload both | /source-upload |
| analyze | false | Upload assignment | /assignment-upload |

**Structure:**
```
if (!goal) → /goal-selection
  ↓
if (!hasSourceDocs) → /source-selection
  ↓
if (goal === 'create' && hasSourceDocs) → /source-upload
if (goal === 'create' && !hasSourceDocs) → /intent-capture
if (goal === 'analyze' && hasSourceDocs) → /source-upload (both files)
if (goal === 'analyze' && !hasSourceDocs) → /assignment-upload
```

---

## Document Preview & Export (Step 8)

### DocumentReviewExport Component (`DocumentReviewExport.tsx`)

Provides a printable preview of the generated/revised assignment.

**Features:**

1. **Export Panel**
   - Toggles: Show Metadata, Show Tips, Show Analytics
   - Export buttons (PDF & Word)

2. **Document Preview**
   - Professional printable layout
   - Shows: Title, metadata, problems, tips, analytics
   - Pagination support (load more problems)

3. **Analytics Appendix** (optional)
   - Bloom level histogram
   - Average complexity
   - Time estimates
   - Student feedback summary

**Props:**
```typescript
interface DocumentReviewExportProps {
  assignment: AssignmentContent;
  showMetadata?: boolean;
  showAnalytics?: boolean;
  analysisData?: {
    bloomHistogram?: Record<string, number>;
    averageComplexity?: number;
    totalEstimatedTime?: number;
    studentFeedbackSummary?: string;
  };
}
```

---

### ExportButtons Component (`ExportButtons.tsx`)

Handles PDF and Word export functionality.

**PDF Export:**
- Uses **jsPDF** library
- Preserves formatting and metadata
- Includes problem numbers, tips, metadata badges
- Auto-formats long content with page breaks
- Optional analytics appendix

**Word Export:**
- Uses **docx** library + **file-saver**
- Creates DOCX document with proper formatting
- Tables for metadata
- Formatted problem lists with metadata
- Analytics summary in appendix

**Usage:**
```tsx
<ExportButtons
  assignment={assignmentData}
  includeMetadata={true}
  includeTips={true}
  includeAnalytics={hasAnalytics}
  analyticsData={analyticsData}
/>
```

---

## Integration with PipelineShell

The new routing system is designed to **feed into** the existing PipelineShell for:
1. Tag analysis
2. Student simulations
3. Assignment generation/rewriting
4. Analytics

**Current Integration Points (TODO):**

```tsx
// In PipelineRouter.tsx after file upload:
if (currentRoute === '/generate-assignment') {
  // Connect to PipelineShell with these props:
  // - goal: 'create' | 'analyze'
  // - sourceFile: File | null
  // - intentData: IntentData | null
  // - assignmentFile: File | null
}
```

---

## Data Flow Diagram

```
┌─────────────┐
│ Goal Select │
└──────┬──────┘
       │ setGoal()
       ↓
┌─────────────────┐
│ Source Select   │
└──────┬──────────┘
       │ setHasSourceDocs()
       ↓
    ┌──────────────────────────┐
    │ Has Source Docs?         │
    └─────┬────────────┬───────┘
       YES│            │NO
          ↓            ↓
    ┌──────────┐  ┌──────────────┐
    │ File     │  │ Intent       │
    │ Upload   │  │ Capture      │
    └────┬─────┘  └──────┬───────┘
         │               │ setIntentData()
         └────────┬──────┘
                  ↓
         ┌─────────────────┐
         │ Generate/       │
         │ Analyze with    │ (Connect to PipelineShell)
         │ PipelineShell   │
         └────────┬────────┘
                  ↓
         ┌──────────────────┐
         │ Document Review  │
         │ & Export (PDF/   │
         │ Word)            │
         └──────────────────┘
```

---

## Styling & Dark Mode

All components include:
- **CSS Variables** for theming (`--color-text-primary`, `--color-bg-card`, etc.)
- **Dark mode support** via `@media (prefers-color-scheme: dark)`
- **Responsive design** breakpoints for mobile
- **Consistent spacing** and typography

---

## File Structure

```
src/
├── hooks/
│   └── useUserFlow.tsx          ← Central state management
├── components/Pipeline/
│   ├── GoalSelector.tsx         ← Step 1
│   ├── GoalSelector.css
│   ├── SourceSelector.tsx       ← Step 2
│   ├── SourceSelector.css
│   ├── FileUploadComponent.tsx  ← File upload
│   ├── FileUploadComponent.css
│   ├── IntentCaptureComponent.tsx ← Learning objectives form
│   ├── IntentCaptureComponent.css
│   ├── PipelineRouter.tsx       ← Orchestrator
│   ├── PipelineRouter.css
│   ├── DocumentReviewExport.tsx ← Final review & export
│   ├── DocumentReviewExport.css
│   ├── ExportButtons.tsx        ← PDF/Word export
│   └── ExportButtons.css
└── App.tsx                      ← Integrated with UserFlowProvider
```

---

## Usage Example

### Basic Setup

```tsx
// App.tsx already includes this:
import { UserFlowProvider } from './hooks/useUserFlow';
import { PipelineRouter } from './components/Pipeline/PipelineRouter';

function App() {
  return (
    <ThemeProvider>
      <UserFlowProvider>
        <PipelineRouter />
      </UserFlowProvider>
    </ThemeProvider>
  );
}
```

### Accessing Flow State

```tsx
function MyComponent() {
  const {
    goal,
    hasSourceDocs,
    sourceFile,
    intentData,
    getCurrentRoute,
    reset,
  } = useUserFlow();

  return (
    <div>
      <p>Current Goal: {goal}</p>
      <p>Current Route: {getCurrentRoute()}</p>
      <button onClick={reset}>Start Over</button>
    </div>
  );
}
```

---

## Dependencies Added

```json
{
  "dependencies": {
    "docx": "^9.5.1",
    "file-saver": "^2.0.5",
    "jspdf": "^4.1.0"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.5"
  }
}
```

Install with:
```bash
npm install file-saver
npm install --save-dev @types/file-saver
```

---

## Next Steps

1. **Connect to PipelineShell**
   - Modify `PipelineRouter.tsx` to pass flow state to PipelineShell
   - Route `/generate-assignment` and `/analyze-assignment` to the generation/analysis steps

2. **Enhance Assignment Content**
   - Update `AssignmentContent` interface to match generated assignment structure
   - Map PipelineShell's asteroids to `AsteroidProblem[]`

3. **Test Export Functionality**
   - Generate sample assignments
   - Export to PDF and Word
   - Verify formatting in different audiences

4. **Analytics Integration**
   - Collect Bloom histograms from tag analysis
   - Calculate complexity metrics
   - Display in DocumentReviewExport

5. **Mobile Optimization**
   - Test responsive design on tablets
   - Adjust touch targets for file upload

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **useContext for state** | Simpler than Redux, adequate for this flow |
| **Progressive disclosure** | Reduces cognitive load by one question at a time |
| **File upload validation** | Prevents processing invalid/oversized files |
| **Optional analytics** | Keeps final review flexible; can be skipped |
| **PDF/Word support** | Covers teacher export preferences |
| **Dark mode** | Accessibility + user preference support |

---

## Troubleshooting

**Issue:** "useUserFlow must be used within UserFlowProvider"
- **Solution:** Ensure `<UserFlowProvider>` wraps the component tree

**Issue:** File upload not working
- **Solution:** Check `acceptedTypes` prop matches your file extensions

**Issue:** Export to Word failing
- **Solution:** Ensure `file-saver` is installed: `npm install file-saver`

**Issue:** CSS not loading
- **Solution:** Verify CSS file imports in components (e.g., `import './GoalSelector.css'`)

---

## Future Enhancements

- [ ] URL-based routing (e.g., `/create/source-upload`)
- [ ] Browser history management with custom back buttons
- [ ] Progress indicator showing current step
- [ ] Auto-save flow state to localStorage
- [ ] Undo/redo for form changes
- [ ] Multi-language support for component text
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Unit tests for flow logic
