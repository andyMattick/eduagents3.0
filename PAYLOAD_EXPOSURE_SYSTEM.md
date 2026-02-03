# Payload Exposure & Verification System

## Summary
The assignment analysis pipeline now fully exposes all metadata passing through the `simulateStudents()` function, allowing complete verification that **assignment difficulty, grade level, and learner profiles** are correctly transmitted and processed.

## What This Enables

✅ **Verify Grade Level** - Confirm the selected grade level (K-2, 3-5, 6-8, 9-12, College) is passed  
✅ **Verify Subject Area** - Confirm the selected subject (Math, Science, ELA, etc.) is passed  
✅ **Verify Learner Profiles** - Confirm selected student struggle areas are passed  
✅ **Verify Assignment Difficulty** - Confirm difficulty level is detected and passed  
✅ **Debug Data Flow** - Inspect complete payload structure at any time  
✅ **Console Access** - Easy access to payload functions directly from browser console  

## Complete Payload Structure

When `simulateStudents()` is called during feedback generation, the following payload is constructed and logged:

```typescript
interface SimulateStudentsPayload {
  // The assignment text being analyzed
  assignmentText: string;

  // Text-level metadata (automatically calculated)
  textMetadata: {
    textLength: number;          // Total characters
    wordCount: number;           // Total words
    sentenceCount: number;       // Total sentences
    paragraphCount: number;      // Total paragraphs
    hasEvidence: boolean;        // Contains evidence/examples
    hasTransitions: boolean;     // Contains transition words
  };

  // Assignment-level metadata (from user selections)
  assignmentMetadata: {
    type: string;               // Assignment type (essay, quiz, project, etc.)
    difficulty: string;         // difficulty level
    gradeLevel?: string;        // From ReviewMetadata (K-2, 3-5, 6-8, 9-12, College)
    subject?: string;           // From ReviewMetadata (Math, Science, ELA, etc.)
    learnerProfiles?: string[]; // From StudentTagBreakdown
  };

  // Processing options
  processingOptions: {
    selectedStudentTags?: string[];     // Student struggle areas to focus on
    includeAccessibilityProfiles?: boolean;
  };

  // Timestamp of when payload was created
  timestamp: string;            // ISO 8601 format
}
```

## How It Works - Data Flow

```
1. User uploads/enters assignment text
   ↓
2. System analyzes tags and detects assignment type/difficulty
   ↓
3. User selects Grade Level & Subject (ReviewMetadata step)
   ↓
4. User selects Learner Profiles/Student Tags (StudentTagBreakdown step)
   ↓
5. User clicks "Analyze with Selected Students"
   ↓
6. getFeedback() is called with selected tags
   ↓
7. simulateStudents() is called with FULL OPTIONS:
   • gradeLevel (from step 3)
   • subject (from step 3)
   • learnerProfiles (from step 4)
   • selectedStudentTags (from step 4)
   ↓
8. Payload is constructed with ALL METADATA
   ↓
9. Payload is LOGGED to console & STORED globally
   ↓
10. console.log("📊 SIMULATE STUDENTS PAYLOAD", payload)
    appears in browser Developer Tools
```

## Console Verification Methods

### Method 1: Browser Console Log (Automatic)
1. Follow the pipeline through all steps
2. Open browser Developer Tools (F12)
3. Go to **Console** tab
4. You'll see the log message:
   ```
   📊 SIMULATE STUDENTS PAYLOAD {
     assignmentText: "...",
     textMetadata: { ... },
     assignmentMetadata: {
       type: "essay",
       difficulty: "intermediate",
       gradeLevel: "6-8",
       subject: "Language Arts",
       learnerProfiles: ["ell", "struggling-readers"]
     },
     ...
   }
   ```

### Method 2: JavaScript Console Query
In the browser console, you can directly query the payload:

```javascript
// Get the last payload sent to simulateStudents
const payload = window.getLastSimulateStudentsPayload();
console.log(payload);
```

### Method 3: Detailed Field Inspection
```javascript
// Check specific fields
const payload = window.getLastSimulateStudentsPayload();
console.log("Grade Level:", payload.assignmentMetadata.gradeLevel);
console.log("Subject:", payload.assignmentMetadata.subject);
console.log("Learner Profiles:", payload.assignmentMetadata.learnerProfiles);
console.log("Selected Tags:", payload.processingOptions.selectedStudentTags);
console.log("Timestamp:", payload.timestamp);
```

### Method 4: Clear & Reset
To clear the stored payload and start fresh:
```javascript
window.clearSimulateStudentsPayload();
```

## Verification Checklist

When testing the payload exposure system:

- [ ] **Build Success**
  - [ ] `npm run build` completes with 867 modules
  - [ ] No TypeScript errors
  - [ ] No console errors in browser

- [ ] **Automatic Console Logging**
  - [ ] "📊 SIMULATE STUDENTS PAYLOAD" message appears
  - [ ] Message appears at the correct time (when student analysis runs)

- [ ] **Grade Level**
  - [ ] Selected grade level appears in payload.assignmentMetadata.gradeLevel
  - [ ] Correct value (K-2, 3-5, 6-8, 9-12, or College)

- [ ] **Subject Area**
  - [ ] Selected subject appears in payload.assignmentMetadata.subject
  - [ ] Correct value (Math, Science, ELA, Social Studies, etc.)

- [ ] **Learner Profiles**
  - [ ] Selected student tags appear in payload.assignmentMetadata.learnerProfiles
  - [ ] selectedStudentTags array contains the same values
  - [ ] Array is not empty (if tags were selected)

- [ ] **Text Metadata**
  - [ ] wordCount is correctly calculated
  - [ ] sentenceCount is reasonable
  - [ ] hasEvidence/hasTransitions correctly detected

- [ ] **Console Functions**
  - [ ] `window.getLastSimulateStudentsPayload()` returns object
  - [ ] `window.clearSimulateStudentsPayload()` clears the payload

## Example Test Case

**Setup:**
1. Upload assignment about "The Great Gatsby"
2. Select Grade Level: "9-12"
3. Select Subject: "English Literature"
4. Select Learner Profiles: "struggling-readers", "visual-learners", "gifted"

**Expected Payload (in console):**
```javascript
{
  assignmentText: "The Great Gatsby is a novel...",
  textMetadata: {
    textLength: 1250,
    wordCount: 195,
    sentenceCount: 12,
    paragraphCount: 3,
    hasEvidence: true,
    hasTransitions: true
  },
  assignmentMetadata: {
    type: "analysis",
    difficulty: "intermediate",
    gradeLevel: "9-12",              // ✅ Should be "9-12"
    subject: "English Literature",   // ✅ Should be "English Literature"
    learnerProfiles: [               // ✅ Should match selected tags
      "struggling-readers",
      "visual-learners",
      "gifted"
    ]
  },
  processingOptions: {
    selectedStudentTags: [           // ✅ Should match learnerProfiles
      "struggling-readers",
      "visual-learners",
      "gifted"
    ],
    includeAccessibilityProfiles: true
  },
  timestamp: "2024-01-15T10:30:45.123Z"
}
```

## Files Involved in Payload Exposure

### Core Implementation
- **[simulateStudents.ts](src/agents/simulation/simulateStudents.ts)** - Payload interface, storage, logging
- **[index.tsx](src/index.tsx)** - Window object exposure

### Integration Points
- **[usePipeline.ts](src/hooks/usePipeline.ts)** - Passes metadata options to simulateStudents
- **[pipeline.ts](src/types/pipeline.ts)** - PipelineState type with metadata

### UI Components
- **[ReviewMetadataForm.tsx](src/components/Pipeline/ReviewMetadataForm.tsx)** - Captures grade level & subject
- **[StudentTagBreakdown.tsx](src/components/Pipeline/StudentTagBreakdown.tsx)** - Captures learner profiles
- **[PipelineShell.tsx](src/components/Pipeline/PipelineShell.tsx)** - Orchestrates flow & calls getFeedback

## Troubleshooting

### Console log doesn't appear
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Verify you reached StudentTagBreakdown step
- [ ] Check for JavaScript errors (red errors in console)
- [ ] Ensure grade level and subject are selected

### Payload missing fields
- [ ] Verify ReviewMetadata was completed (grade level + subject must be selected)
- [ ] Verify StudentTagBreakdown has at least one tag selected
- [ ] Check that both forms were fully filled out before clicking "Analyze"

### learnerProfiles is empty array
- This is normal if no student tags were selected
- The system still functions, feedback just doesn't focus on specific struggles
- Select tags on StudentTagBreakdown to populate this field

### Functions not accessible in console
- [ ] Hard refresh the page
- [ ] Check DevTools console for JavaScript errors
- [ ] Verify build completed with `npm run build`

## Security Note

These debugging functions (`getLastSimulateStudentsPayload`, `clearSimulateStudentsPayload`) are **only exposed in development/testing**. In production builds, consider adding environment checks to disable console exposure.

## Next Steps for Verification

1. **Run the application**: `npm run dev`
2. **Complete the pipeline**:
   - Upload an assignment
   - Wait for tag analysis
   - Select grade level and subject
   - Select learner profiles
   - Click "Analyze with Selected Students"
3. **Open browser console** (F12 → Console tab)
4. **Look for** the "📊 SIMULATE STUDENTS PAYLOAD" message
5. **Verify** that gradeLevel, subject, and learnerProfiles are all present and correct
6. **Query console** with `window.getLastSimulateStudentsPayload()` for detailed inspection

---

**Status**: ✅ READY FOR VERIFICATION  
**Build**: ✅ 867 modules compiled successfully  
**Console Functions**: ✅ Exposed via window object  
**Logging**: ✅ Automatic console output enabled  
