# Assignment Difficulty, Grade Level, and Learner Profiles Verification

## Executive Summary

The assignment pipeline now **fully exposes and logs all metadata** being passed to the `simulateStudents()` function, including:
- ✅ **Assignment Difficulty** (easy/intermediate/hard)
- ✅ **Grade Level** (K-2, 3-5, 6-8, 9-12, College)
- ✅ **Learner Profiles** (student struggle areas: struggling-readers, ELL, gifted, ADHD, visual-learners, etc.)

All metadata is captured, logged to browser console, and accessible via JavaScript console functions.

## How to Verify

### Quick Start (In Your Browser)

1. **Open the application** and go through the pipeline:
   - Upload/enter an assignment
   - Complete tag analysis
   - Select a **Grade Level** (e.g., "9-12")
   - Select a **Subject** (e.g., "English")
   - Select **Learner Profiles** (e.g., "struggling-readers", "visual-learners")
   - Click "Analyze with Selected Students"

2. **Open Developer Tools** (F12 or Right-click → Inspect)

3. **Go to the Console tab** and look for:
   ```
   📊 SIMULATE STUDENTS PAYLOAD
   ```

4. **Expand the object** to see:
   ```javascript
   assignmentMetadata: {
     gradeLevel: "9-12",              // ✅ Your selected grade level
     subject: "English",              // ✅ Your selected subject
     learnerProfiles: [               // ✅ Your selected learner profiles
       "struggling-readers",
       "visual-learners"
     ]
   }
   ```

### Verify via Console Commands

In the browser console (F12 → Console), you can directly inspect the payload:

```javascript
// Get the last payload
const payload = window.getLastSimulateStudentsPayload();

// View all metadata
console.log("Grade Level:", payload.assignmentMetadata.gradeLevel);
console.log("Subject:", payload.assignmentMetadata.subject);
console.log("Learner Profiles:", payload.assignmentMetadata.learnerProfiles);
console.log("Selected Student Tags:", payload.processingOptions.selectedStudentTags);

// View entire payload
console.log(payload);
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: ReviewMetadata                                      │
│ • Grade Level: [K-2, 3-5, 6-8, 9-12, College]             │
│ • Subject: [Math, Science, ELA, Social Studies, etc.]      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: StudentTagBreakdown                                 │
│ • Select Learner Profiles:                                  │
│   - struggling-readers, ELL, gifted, ADHD, etc.            │
│   (11 total student struggle tags)                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: getFeedback(selectedStudentTags)                    │
│ Passes metadata to simulateStudents():                       │
│   • gradeLevel: "9-12"                                      │
│   • subject: "English"                                      │
│   • learnerProfiles: ["struggling-readers", ...]           │
│   • selectedStudentTags: ["struggling-readers", ...]       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: simulateStudents(text, tags, options)              │
│ • Receives ALL metadata via options parameter               │
│ • Constructs full payload object                            │
│ • Logs to console: "📊 SIMULATE STUDENTS PAYLOAD"          │
│ • Stores globally: lastSimulateStudentsPayload             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Console Output & Storage                                    │
│ • Automatic log message in browser console                  │
│ • Accessible via window.getLastSimulateStudentsPayload()   │
│ • Can be cleared with window.clearSimulateStudentsPayload()│
└─────────────────────────────────────────────────────────────┘
```

## Complete Payload Example

When you complete the verification steps above, the console will show:

```javascript
📊 SIMULATE STUDENTS PAYLOAD {
  assignmentText: "Analyze the role of symbolism in The Great Gatsby...",
  
  textMetadata: {
    textLength: 487,
    wordCount: 78,
    sentenceCount: 6,
    paragraphCount: 2,
    hasEvidence: true,
    hasTransitions: true
  },
  
  assignmentMetadata: {
    type: "analysis",
    difficulty: "intermediate",
    gradeLevel: "9-12",                    ← GRADE LEVEL VERIFIED
    subject: "English Language Arts",      ← SUBJECT VERIFIED
    learnerProfiles: [                     ← LEARNER PROFILES VERIFIED
      "struggling-readers",
      "visual-learners",
      "gifted"
    ]
  },
  
  processingOptions: {
    selectedStudentTags: [
      "struggling-readers",
      "visual-learners",
      "gifted"
    ],
    includeAccessibilityProfiles: true
  },
  
  timestamp: "2024-01-15T14:30:45.123Z"
}
```

## Verification Checklist

Go through the pipeline and verify each item:

### Build & Setup
- [ ] `npm run build` succeeds (✅ VERIFIED - 867 modules)
- [ ] No TypeScript compilation errors
- [ ] No console errors when page loads

### Grade Level Verification
- [ ] ReviewMetadata form displays grade level options
- [ ] Selected grade level appears in console payload
- [ ] Value matches selection: K-2, 3-5, 6-8, 9-12, or College

### Subject Verification
- [ ] ReviewMetadata form displays subject options
- [ ] Selected subject appears in console payload
- [ ] Value matches selection (Math, Science, ELA, etc.)

### Learner Profiles Verification
- [ ] StudentTagBreakdown component displays all student tags
- [ ] Selected learner profiles appear in payload.assignmentMetadata.learnerProfiles
- [ ] Same tags appear in payload.processingOptions.selectedStudentTags
- [ ] Count matches number of selected tags

### Console Verification
- [ ] "📊 SIMULATE STUDENTS PAYLOAD" log message appears
- [ ] Message appears after clicking "Analyze with Selected Students"
- [ ] `window.getLastSimulateStudentsPayload()` returns the payload object
- [ ] All fields are populated

## Technical Implementation

### Key Components

1. **Payload Interface** (`simulateStudents.ts`)
   - Defines complete structure of data being passed
   - Includes textMetadata, assignmentMetadata, processingOptions

2. **Global Storage** (`simulateStudents.ts`)
   - `lastSimulateStudentsPayload` variable stores latest payload
   - `getLastSimulateStudentsPayload()` function retrieves it
   - `clearSimulateStudentsPayload()` function clears it

3. **Console Logging** (`simulateStudents.ts`)
   - Automatic `console.log("📊 SIMULATE STUDENTS PAYLOAD", payload)`
   - Executed whenever `simulateStudents()` is called

4. **Window Object Exposure** (`index.tsx`)
   - Functions exposed via `window.getLastSimulateStudentsPayload`
   - Accessible directly from browser console
   - No need to dig through React component state

5. **Metadata Flow** (`usePipeline.ts`)
   - `getFeedback()` passes options to `simulateStudents()`
   - Includes gradeLevel, subject, learnerProfiles, selectedStudentTags
   - All from user selections in pipeline UI

### Files Modified

```
✅ src/agents/simulation/simulateStudents.ts
   ├─ SimulateStudentsPayload interface
   ├─ getLastSimulateStudentsPayload() function
   ├─ clearSimulateStudentsPayload() function
   └─ Payload construction & logging

✅ src/index.tsx
   ├─ Import payload functions
   ├─ Global type declarations
   └─ Window object exposure

✅ src/hooks/usePipeline.ts
   ├─ Pass options to simulateStudents()
   └─ Metadata from state

✅ src/types/pipeline.ts
   └─ Add assignmentMetadata to PipelineState

✅ src/components/Pipeline/PipelineShell.tsx
   └─ StudentTagBreakdown integration

✅ src/components/Pipeline/StudentTagBreakdown.tsx
   └─ Learner profile selection UI
```

## Important: What Gets Logged

When `simulateStudents()` is called, the following is logged to the console:

```javascript
📊 SIMULATE STUDENTS PAYLOAD {
  assignmentText: string,           // First 500 chars of assignment
  textMetadata: {...},              // Analyzed text properties
  assignmentMetadata: {
    type: string,                   // Essay, quiz, project, etc.
    difficulty: string,             // easy, intermediate, hard
    gradeLevel?: string,            // K-2, 3-5, 6-8, 9-12, College
    subject?: string,               // Math, Science, ELA, etc.
    learnerProfiles?: string[],     // Selected student struggle areas
  },
  processingOptions: {
    selectedStudentTags?: string[],
    includeAccessibilityProfiles?: boolean,
  },
  timestamp: string,                // ISO 8601 timestamp
}
```

## How Assignment Difficulty Is Determined

The system detects assignment difficulty in two ways:

1. **From Assignment Type Selection** (if user selected a type)
   ```javascript
   assignmentMetadata.type = "essay"  // Type correlates to difficulty
   ```

2. **From Tag Analysis** (automatic detection)
   ```javascript
   assignmentMetadata.difficulty = "intermediate"  // Detected from content
   ```

The difficulty is embedded in the metadata tags during initial analysis and passed through to `simulateStudents()`.

## Testing Steps

### Test 1: Basic Payload Verification
```
1. Upload: "Students will analyze primary sources and identify bias."
2. Select: Grade Level = "6-8"
3. Select: Subject = "Social Studies"
4. Select: Learner Profiles = "struggling-readers"
5. Open Console (F12)
6. ✅ Look for "📊 SIMULATE STUDENTS PAYLOAD"
7. ✅ Verify gradeLevel = "6-8"
8. ✅ Verify subject = "Social Studies"
9. ✅ Verify learnerProfiles = ["struggling-readers"]
```

### Test 2: Multiple Learner Profiles
```
1. Upload: Any assignment
2. Select: Grade Level = "9-12"
3. Select: Subject = "English Language Arts"
4. Select: Multiple learner profiles (e.g., "visual-learners", "gifted", "ell")
5. Open Console
6. ✅ Verify learnerProfiles array contains all 3 selected tags
7. ✅ Verify selectedStudentTags contains all 3 selected tags
```

### Test 3: Console Function Access
```
1. Open Console
2. Run: window.getLastSimulateStudentsPayload()
3. ✅ Returns the payload object
4. Run: window.getLastSimulateStudentsPayload().assignmentMetadata.gradeLevel
5. ✅ Returns the grade level string
6. Run: window.clearSimulateStudentsPayload()
7. Run: window.getLastSimulateStudentsPayload()
8. ✅ Returns null
```

## Troubleshooting

### "📊 SIMULATE STUDENTS PAYLOAD" doesn't appear
- [ ] Refresh the page (Ctrl+R or Cmd+R)
- [ ] Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- [ ] Check for JavaScript errors in console
- [ ] Make sure ReviewMetadata was completed (grade level + subject selected)
- [ ] Make sure at least one learner profile was selected

### `window.getLastSimulateStudentsPayload()` returns null
- [ ] Run the pipeline again to generate a new payload
- [ ] Clear browser cache if needed
- [ ] Check that simulateStudents() was actually called

### Payload is missing gradeLevel or subject
- [ ] Verify the ReviewMetadata form was completed
- [ ] Verify the values were selected (not left blank)
- [ ] Check that the form was submitted before proceeding

### Payload is missing learnerProfiles
- [ ] This is normal if no learner profiles were selected
- [ ] Select at least one profile on the StudentTagBreakdown component
- [ ] Run the analysis again

## Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `simulateStudents.ts` | Added payload interface, logging, storage | Expose full payload for verification |
| `index.tsx` | Expose functions on window object | Make functions accessible from console |
| `usePipeline.ts` | Pass options to simulateStudents | Flow metadata through pipeline |
| `PipelineShell.tsx` | Integrate StudentTagBreakdown | Capture learner profiles |
| `StudentTagBreakdown.tsx` | New component | UI for selecting learner profiles |

## What Gets Verified

✅ **Assignment Difficulty** - Detected from content analysis
✅ **Grade Level** - Selected by user via ReviewMetadata  
✅ **Subject Area** - Selected by user via ReviewMetadata  
✅ **Learner Profiles** - Selected by user via StudentTagBreakdown  
✅ **All Together** - Passed simultaneously to simulateStudents()  
✅ **Console Visibility** - Logged automatically and accessible via functions  

---

**Build Status**: ✅ VERIFIED (867 modules compiled)  
**Console Logging**: ✅ ENABLED  
**Window Functions**: ✅ EXPOSED  
**Ready for Verification**: ✅ YES  

See [PAYLOAD_EXPOSURE_SYSTEM.md](PAYLOAD_EXPOSURE_SYSTEM.md) for detailed technical documentation.
