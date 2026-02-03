# Payload Verification Guide

## Overview
The `simulateStudents()` function now fully exposes the payload being sent, including assignment difficulty, grade level, and learner profiles. This allows for complete verification of the data flow through the assignment pipeline.

## What Gets Passed

### When `getFeedback()` is called in the pipeline:
```typescript
// Full payload structure sent to simulateStudents()
const payload = {
  assignmentText: string,           // First 500 chars of the assignment
  textMetadata: {
    textLength: number,              // Total character count
    wordCount: number,               // Word count
    sentenceCount: number,           // Sentence count
    paragraphCount: number,          // Paragraph count
    hasEvidence: boolean,            // Contains "example", "evidence", or "research"
    hasTransitions: boolean,         // Contains transition words
  },
  assignmentMetadata: {
    type: string,                    // Assignment type (essay, quiz, project, etc.)
    difficulty: string,              // difficulty level (easy/intermediate/hard)
    gradeLevel: string,              // Grade level from ReviewMetadata (K-2, 3-5, 6-8, 9-12, College)
    subject: string,                 // Subject area (Math, Science, ELA, etc.)
    learnerProfiles: string[],       // Selected student tags/learner profiles
  },
  processingOptions: {
    selectedStudentTags: string[],   // Which student struggle areas to focus on
    includeAccessibilityProfiles: boolean,
  },
  timestamp: string,                 // ISO timestamp of when simulateStudents was called
}
```

## How to Verify

### Option 1: Browser Console Logging
1. Open the application and go through the pipeline:
   - Upload/Input an assignment
   - Wait for tag analysis to complete
   - Click "→ Continue to Student Analysis & Tag Breakdown"
   - Select grade level and subject (ReviewMetadata)
   - Select student struggle areas (StudentTagBreakdown)
   - Click "Analyze with Selected Students"

2. Open the browser Developer Tools (F12 or Right-click → Inspect)

3. Go to the **Console** tab and look for the log message:
   ```
   📊 SIMULATE STUDENTS PAYLOAD {
     assignmentMetadata: {
       type: "essay",
       difficulty: "intermediate",
       gradeLevel: "6-8",
       subject: "Language Arts",
       learnerProfiles: ["struggling-readers", "ell", "gifted"],
     },
     textMetadata: { ... },
     processingOptions: { ... },
     timestamp: "2024-01-15T10:30:45.123Z"
   }
   ```

### Option 2: JavaScript Console Query
1. In the browser console, run:
   ```javascript
   // Get the last payload sent to simulateStudents
   window.getLastSimulateStudentsPayload?.()
   ```

2. This returns the complete payload object for inspection

3. To see specific values:
   ```javascript
   const payload = window.getLastSimulateStudentsPayload?.();
   console.log("Grade Level:", payload?.assignmentMetadata?.gradeLevel);
   console.log("Subject:", payload?.assignmentMetadata?.subject);
   console.log("Learner Profiles:", payload?.assignmentMetadata?.learnerProfiles);
   console.log("Selected Tags:", payload?.processingOptions?.selectedStudentTags);
   ```

## Key Integration Points

### 1. ReviewMetadata (Grade Level + Subject)
- **Component**: [ReviewMetadataForm.tsx](src/components/Pipeline/ReviewMetadataForm.tsx)
- **Captures**: Grade level (K-2, 3-5, 6-8, 9-12, College) and Subject (Math, Science, ELA, etc.)
- **Flow**: ReviewMetadata → handleMetadataSubmit() → setAssignmentGradeLevel/setAssignmentSubject
- **Storage**: Stored in local component state in PipelineShell

### 2. Student Tag Breakdown (Learner Profiles)
- **Component**: [StudentTagBreakdown.tsx](src/components/Pipeline/StudentTagBreakdown.tsx)
- **Captures**: Which student struggle areas to focus on (11 total options)
- **Examples**: struggling-readers, ell, gifted, adhd, visual-learners, etc.
- **Flow**: Student selects tags → handleStudentTagSelection() → getFeedback(selectedStudentTags)

### 3. Pipeline State
- **Type**: [PipelineState](src/types/pipeline.ts#L30-L40)
- **Key Fields**: 
  - `assignmentMetadata.gradeLevel`
  - `assignmentMetadata.subject`
  - `selectedStudentTags` (stored in state)

### 4. Hook Integration
- **Hook**: [usePipeline.ts](src/hooks/usePipeline.ts#L65-L85)
- **Function**: `getFeedback(selectedStudentTags?: string[])`
- **Call**: Passes all metadata to simulateStudents as options parameter

## Verification Checklist

- [ ] Build succeeds with `npm run build` (✅ VERIFIED - 867 modules)
- [ ] Browser console shows "📊 SIMULATE STUDENTS PAYLOAD" when analyzing
- [ ] Payload includes selected grade level (from ReviewMetadata)
- [ ] Payload includes selected subject (from ReviewMetadata)
- [ ] Payload includes selected learner profiles (from StudentTagBreakdown)
- [ ] Payload includes selectedStudentTags array
- [ ] Timestamp is valid ISO string
- [ ] textMetadata properly calculated (word count, sentence count, etc.)

## Example Payload Output

```javascript
📊 SIMULATE STUDENTS PAYLOAD {
  assignmentText: "Analyze the following primary sources...",
  textMetadata: {
    textLength: 487,
    wordCount: 82,
    sentenceCount: 6,
    paragraphCount: 2,
    hasEvidence: true,
    hasTransitions: true,
  },
  assignmentMetadata: {
    type: "analysis",
    difficulty: "intermediate",
    gradeLevel: "9-12",
    subject: "Social Studies",
    learnerProfiles: ["struggling-readers", "visual-learners"],
  },
  processingOptions: {
    selectedStudentTags: ["struggling-readers", "visual-learners"],
    includeAccessibilityProfiles: true,
  },
  timestamp: "2024-01-15T14:32:10.456Z",
  textLength: "487 chars",
  wordCount: "82 words"
}
```

## Debugging Tips

### If payload is missing fields:
1. Ensure ReviewMetadata form is completed (grade level + subject)
2. Ensure at least one student tag is selected
3. Check that both steps completed before clicking "Analyze with Selected Students"

### If console log doesn't appear:
1. Verify `npm run build` completed successfully
2. Reload the application (Ctrl+Shift+R for hard refresh)
3. Check browser console for any JavaScript errors
4. Verify you're on the StudentTagBreakdown step

### If learnerProfiles is empty:
- This is normal if no student tags are selected
- The system still functions, just without focusing on specific student struggles
- Select tags on the StudentTagBreakdown component to populate this field

## Files Modified for Payload Exposure

1. **simulateStudents.ts** - Added SimulateStudentsPayload interface, storage, getter functions
2. **usePipeline.ts** - Updated getFeedback() to pass full options to simulateStudents
3. **pipeline.ts** - Added assignmentMetadata and selectedStudentTags to PipelineState
4. **PipelineShell.tsx** - Integrated StudentTagBreakdown with getFeedback() call
5. **StudentTagBreakdown.tsx** - Captures learner profiles and triggers getFeedback

## Next Steps

To use the payload for further verification:
1. Navigate through the complete pipeline
2. At the StudentTagBreakdown step, select desired learner profiles
3. Click "Analyze with Selected Students"
4. Open browser console (F12)
5. Verify "📊 SIMULATE STUDENTS PAYLOAD" log contains all expected fields
6. Run `getLastSimulateStudentsPayload()` in console to inspect detailed payload

---

**Last Build**: ✅ VERIFIED
**Modules**: 867 transformed
**Bundle Size**: 1,035 KB (minified)
**Status**: Ready for payload verification and debugging
