# MinimalAssessmentForm Clean-Break Rebuild

## Overview
Successfully replaced the complex 618-line multi-step MinimalAssessmentForm with a clean-break minimal implementation per user specification.

## Objectives Met ✅

### 1. **4-Decision Core Interface**
- **Source**: Upload document OR Enter topic (toggle)
- **Student Level**: Dropdown (Remedial, Standard, Honors, AP)
- **Assessment Type**: Dropdown (Quiz, Test, Practice)
- **Time Minutes**: Number input (5-480 minutes)

### 2. **Advanced Options (Collapsed)**
- **Focus Areas**: Textarea (optional, one per line)
- **Emphasis**: Radio group (Conceptual, Procedural, ExamStyle)
- **Difficulty Profile**: Radio group (Scaffolded, Balanced, Challenging)
- **Classroom Context**: Textarea (optional, max 500 chars shown in CSS)

### 3. **Data Contract**
```typescript
export interface AssessmentIntent {
  sourceFile?: File;
  sourceTopic?: string;
  studentLevel: StudentLevel;
  assessmentType: AssessmentType;
  timeMinutes: number;
  focusAreas?: string[];
  emphasis?: Emphasis;
  difficultyProfile?: DifficultyProfile;
  classroomContext?: string;
}
```

### 4. **Hard Constraints Enforced**
✅ **NO Gemini calls** - Form only produces intent, delegates to assessmentSummarizerService  
✅ **NO Bloom distribution** - Handled by downstream services  
✅ **NO question counting** - Not form's responsibility  
✅ **NO Space Camp payload** - Form output is clean AssessmentIntent  

### 5. **User Experience**
- Under 60 seconds to complete (4 core fields)
- Loading animation with progress (Designing structure → Simulating → Refining → Finalizing)
- Clear error validation with specific messages
- Responsive mobile design
- Dark mode support via CSS variables

## Files Modified

### `/src/components/Pipeline/MinimalAssessmentForm.tsx` (280 lines)
**From**: 618-line multi-step wizard with complex validation  
**To**: Clean single-page form with 4 core decisions + collapsed advanced

**Key Changes**:
- Removed: `renderSourceStep()`, `renderCoreStep()`, `renderAdvancedStep()` multi-step logic
- Removed: `validateAssessmentIntent()` complex validator function
- Removed: Imported option constants (STUDENT_LEVELS, ASSESSMENT_TYPES, etc.)
- Added: Simple inline state for sourceType, sourceFile, sourceTopic, etc.
- Added: `isValid()` function for basic validation
- Added: `handleSubmit()` that produces clean AssessmentIntent
- Changed: Single return JSX instead of step-based render logic

**New Exports**:
```typescript
export interface AssessmentIntent { /* ... */ }
export function MinimalAssessmentForm({ onSubmit, isLoading }): JSX.Element
```

### `/src/components/Pipeline/MinimalAssessmentForm.css` (280 lines)
**From**: Multi-step wizard styling (544 lines)  
**To**: Minimal clean form styling (280 lines)

**New Classes** (instead of old `maf-` prefix):
- `.minimal-form-container` - Main form wrapper
- `.form-header` - Title and description
- `.form-body` - Core form sections
- `.form-section` - Individual decision areas
- `.section-label` / `.section-number` - Numbered indicators (1️⃣ 2️⃣ etc)
- `.source-toggle` - Upload/Topic toggle buttons
- `.drag-drop-zone` - File upload area
- `.topic-input` - Topic text input
- `.form-select` / `.form-textarea` - Standard inputs
- `.time-input-group` - Time + minutes label
- `.advanced-section` - Collapsed advanced options
- `.advanced-toggle` - Show/hide advanced button
- `.error-messages` - Validation error display
- `.form-footer` - Bottom action button
- `.generate-button` - Primary CTA button
- `.loading-content` - Loading animation state

**CSS Features**:
- Theme-aware via CSS variables (dark/light mode)
- Responsive breakpoint at 600px (mobile-friendly)
- Smooth animations (slideIn, expandDown, pulse, bounce)
- Accessible color contrast

## Type Definitions

### StudentLevel
```typescript
type StudentLevel = 'Remedial' | 'Standard' | 'Honors' | 'AP';
```

### AssessmentType
```typescript
type AssessmentType = 'Quiz' | 'Test' | 'Practice';
```

### Emphasis
```typescript
type Emphasis = 'Conceptual' | 'Procedural' | 'ExamStyle';
```

### DifficultyProfile
```typescript
type DifficultyProfile = 'Balanced' | 'Challenging' | 'Scaffolded';
```

### SourceType
```typescript
type SourceType = 'document' | 'topic' | null;
```

## Form Flow

```
User Opens Form
│
├─ Sees 4 core decisions
│   ├─ 1️⃣ Source (document upload OR topic text)
│   ├─ 2️⃣ Student Level (dropdown)
│   ├─ 3️⃣ Assessment Type (dropdown)
│   └─ 4️⃣ Time Minutes (number input)
│
├─ Optional: Click "Advanced Options" toggle
│   ├─ Focus Areas (textarea)
│   ├─ Emphasis (radio group)
│   ├─ Difficulty Profile (radio group)
│   └─ Classroom Context (textarea)
│
├─ Validation on form submission
│   └─ Show errors if missing required fields
│
├─ Generate button clicked
│   ├─ isLoading = true
│   ├─ Show loading animation
│   └─ Call onSubmit(intent)
│
└─ Parent receives clean AssessmentIntent object
```

## Integration Guide

### Basic Usage
```typescript
import { MinimalAssessmentForm, AssessmentIntent } from './MinimalAssessmentForm';

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = (intent: AssessmentIntent) => {
    setIsLoading(true);
    // Delegate to assessmentSummarizerService
    assessmentSummarizerService.summarizeAssessmentIntent(intent)
      .then(result => {
        // Process result
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <MinimalAssessmentForm 
      onSubmit={handleFormSubmit}
      isLoading={isLoading}
    />
  );
}
```

### What Parent Component Should Handle
1. **isLoading state**: Pass to form, update after submission
2. **onSubmit callback**: Receive AssessmentIntent, don't validate (form does that)
3. **Error display**: Handle any submission errors (network, processing)
4. **Next step routing**: Navigate to appropriate pipeline stage after submission

## Validation Rules

### Source (Required)
- Either: File selected (any of .pdf, .docx, .txt)
- Or: Topic text entered (non-empty string)
- Error: "Please select a source type" / "Please upload a document" / "Please enter a topic"

### Student Level (Required)
- Must be one of: Remedial, Standard, Honors, AP
- Error: "Please select a student level"

### Assessment Type (Required)
- Must be one of: Quiz, Test, Practice
- Error: "Please select an assessment type"

### Time Minutes (Required)
- Must be: 5 ≤ timeMinutes ≤ 480
- Error: "Time must be between 5 and 480 minutes"

### Advanced Fields (All Optional)
- focusAreas: Split by newlines, filter empty, can be undefined
- emphasis, difficultyProfile: Only included if shown in advanced section
- classroomContext: Trimmed, can be undefined if empty

## Loading States

When `isLoading={true}`, form shows:
```
    🧠
Generating Assessment

✓ Designing structure
✓ Simulating student performance
✓ Refining difficulty
✓ Finalizing document

⋙ ⋙ ⋙ (animated bouncing dots)
```

## Testing Notes

### Build Verification
✅ `npm run build` - Succeeds with no TypeScript errors  
✅ CSS warnings present but non-critical  
✅ Chunk size warnings (pre-existing)

### Service Tests
✅ 128 core service tests passing (pre-existing unrelated failures in other specs)  
✅ Form itself is not unit-tested (integration component)

### Manual Testing Checklist
- [ ] Form loads without errors
- [ ] 4 core decisions are visible and functional
- [ ] Source toggle switches between upload and topic
- [ ] File upload works (drag & drop + click)
- [ ] All dropdowns function correctly
- [ ] Time input accepts valid range (5-480)
- [ ] Advanced options can be toggled
- [ ] Form validates on submit
- [ ] Error messages display clearly
- [ ] Generate button shows loading animation
- [ ] Responsive on mobile (< 600px)
- [ ] Dark mode colors are correct

## Next Steps

1. **Integration with Pipeline**
   - Import MinimalAssessmentForm in appropriate router component
   - Wire onSubmit callback to assessmentSummarizerService
   - Ensure AssessmentIntent flows to next pipeline stage

2. **Testing**
   - Manual visual inspection in browser
   - Test each decision path (document upload, topic entry)
   - Verify advanced options don't break layout
   - Test on mobile device/responsive viewer

3. **Deployment**
   - Verify on staging environment
   - Check dark mode in actual browser dark mode
   - Monitor any integration issues

## Philosophy

This is a **clean break**, not a refactored version:
- New data contract (only 4 core + optional advanced)
- New CSS class naming (not `maf-*` complexity)
- New validation approach (simple isValid, not complex validateAssessmentIntent)
- New component philosophy: **signal intelligence, not configuration**

The form trusts downstream services to build Bloom distributions, count questions, construct Space Camp payloads, etc. The form's job is ONLY to capture user intent cleanly and quickly.

---

**Completed**: December 2024  
**Status**: ✅ Form code complete, ready for integration testing
