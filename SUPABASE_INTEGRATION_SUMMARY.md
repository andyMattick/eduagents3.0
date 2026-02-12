# Supabase Integration Summary

## ✅ What Has Been Connected

### 1. **Assignment Saving to Database**
- **Location**: `PipelineShell.tsx` → `handleCompleteSaveProblems()`
- **Flow**: When user completes the EXPORT step:
  - Full assignment document is saved to `assignments` table
  - Rewritten text is embedded in the assignment
  - Metadata (Bloom distribution, rewrite notes, history) is preserved
  - All individual problems/asteroids are saved to `problem_bank` table

### 2. **Data Persisted to Supabase**
The following data is automatically saved when user exports:

#### Assignment Data (`assignments` table)
- `id`: Assignment UUID (generated)
- `teacher_id`: Current authenticated teacher
- `title`: Auto-generated based on date
- `subject`: From assignment metadata
- `grade_level`: From assignment metadata
- `content`: Full GeneratedAssignment object
- `sections`: Array of problems with text and metadata
- `estimated_time_minutes`: Calculated from problem count
- `metadata`: Includes:
  - `bloomDistribution`: Bloom level breakdown
  - `rewriteSummary`: Summary of changes made
  - `studentFeedbackNotes`: Teacher's notes that drove rewrites
  - `rewriteHistory`: Complete edit trail with iterations/timestamps

#### Problem Bank Data (`problem_bank` table)
- `teacher_id`: Current teacher (for access control)
- `problem`: Full UniversalProblem JSONB:
  - Problem text
  - Bloom level (Remember/Understand/Apply/Analyze/Evaluate/Create)
  - Linguistic complexity (0.0-1.0)
  - Novelty score
  - Multi-part flag
  - Problem length
- `source_document_id`: Document ID from this session
- `source_assignment_id`: Assignment ID from this session
- `performance_metrics`: Initially set to 0 (updated with real usage data over time)
- `immutable_lock`: Tracks which layers are locked (prevents accidental modification)

### 3. **Deferred Save Flow**
The pipeline now enforces a validation flow before saving:

1. **Problems extracted** → asteroids created
2. **Simulation runs** → student feedback generated
3. **User can add notes** → captured in UI
4. **Rewrite happens** → driven by notes
5. **Reanalysis required** → `hasUnsavedChanges=true` blocks export button
6. **Reanalysis completes** → `hasUnsavedChanges=false`, export button enabled
7. **Export clicked** → calls `handleCompleteSaveProblems()`
   - Saves full assignment to `assignments` table
   - Saves asteroids to `problem_bank` table
   - Upserts to avoid duplicates (uses unique constraint on teacher_id + document_id + problem_id)

### 4. **Service Functions Used**
- **`saveAssignment()`** from `teacherSystemService.ts`
  - Inserts new assignments or updates existing ones
  - Automatically increments teacher's assignment count
  - Enforces subscription limits
  
- **`saveAsteroidsToProblemBank()`** from `saveProblemsToProblemBank.ts`
  - Upserts problems to avoid duplicates across rewrites
  - Locks immutable layers after first analysis
  - Updates usage counts

---

## 📊 Supabase Tables Involved

### `assignments` Table
Stores complete assignment documents with metadata and content.
- Indexed by: `teacher_id`, `created_at`
- Includes: Full GeneratedAssignment object in `content` JSONB column

### `problem_bank` Table
Stores individual problems/asteroids with performance history.
- Indexed by: `teacher_id`, `problem->'problemId'`, `is_favorite`
- Includes:
  - Full UniversalProblem JSONB
  - Immutable layer locking mechanism
  - Performance tracking (success rate, time, attempt count)
  - Usage history (which assignments used this problem)

### `problem_bank_assembly` Table
(Optional) Tracks when problems are reused/reassembled in new assignments
- Stores: Original problem ID → new problem ID mappings
- Preserves: Immutable lock status across rewrites
- Validates: Problem structure integrity

### `immutability_violations` Table
(Audit Trail) Logs any attempts to modify locked fields
- Records: What was attempted, original value, timestamp
- Helps: Identify accidental/intentional modification attempts

---

## 🔒 Data Security & Integrity

### Row-Level Security
- Problems are filtered by `teacher_id` (teachers only see their own)
- Assignments are filtered by `teacher_id`
- Cross-teacher access is prevented at database level

### Immutable Field Locking
After initial problem analysis:
- **Cognitive layer** (Bloom level, complexity) is locked
- **Classification layer** (tags, type) is locked  
- **Structure layer** (multi-part flag) is locked
- Prevents accidental corruption from rewrites
- Any violation attempt is recorded in audit trail

### Upsert Deduplication
Problems use unique constraint: `(teacher_id, source_document_id, original_problem_id)`
- Prevents duplicate problems across rewrites
- Latest version always overwrites older versions
- Maintains single source of truth per teacher per document

---

## 🚀 What Happens at Export

When user clicks "Continue to Export" in PipelineShell EXPORT step:

```
Step8FinalReview.handleCompleteWithSave()
  ↓
calls onCompleteSaveProblems() callback
  ↓
PipelineShell.handleCompleteSaveProblems()
  ├─ [NEW] saveAssignment(user.id, assignmentToSave)
  │   ├─ Inserts to assignments table
  │   └─ Stores metadata + rewrite history
  │
  └─ saveAsteroidsToProblemBank({...})
      ├─ Upserts to problem_bank table
      └─ Preserves immutable locks
```

### Data Saved for Each Problem:
- Original text (from extraction)
- Rewritten text (if modified)
- Bloom level classification
- Linguistic complexity analysis
- Novelty score calculation
- Multi-part structure analysis
- Performance baseline (initialized at 0)
- Metadata tags and references

---

## 📝 Example Rewrite History (Stored in Assignment)

```json
{
  "rewriteHistory": [
    {
      "iteration": 1,
      "timestamp": "2026-02-12T10:30:00Z",
      "originalText": "[original text]",
      "rewrittenText": "[rewritten text after first analysis]",
      "notes": "Clarify Question 1 wording. Break Question 3 into parts.",
      "feedbackFromPersonas": ["Visual Learner", "ADHD Learner", "Strong Reader"]
    },
    {
      "iteration": 2,
      "timestamp": "2026-02-12T10:45:00Z",
      "originalText": "[previous rewritten text]",
      "rewrittenText": "[rewritten text after feedback]",
      "notes": "Add scaffolding. Reduce complexity for at-risk students.",
      "feedbackFromPersonas": ["Visual Learner", "ADHD Learner", "Strong Reader"]
    }
  ]
}
```

---

## ✅ Verification Checklist

To verify the integration is working:

1. ✅ TypeScript compilation succeeds (npm run build)
2. ✅ No missing imports (saveAssignment is dynamically imported)
3. ✅ Pipeline state includes hasUnsavedChanges flag
4. ✅ Rewrite notes are captured in studentFeedbackNotes
5. ✅ Reanalysis clears hasUnsavedChanges flag
6. ✅ Export button disabled until reanalysis complete
7. ✅ handleCompleteSaveProblems called on export
8. ✅ Both assignment and asteroids saved to Supabase

To test in UI:
1. Upload assignment
2. Run simulation
3. Add rewrite notes
4. Trigger rewrite
5. Click "Reanalyze with Same Students"
6. Wait for analysis to complete
7. Click "Continue to Export"
8. Asteroids + assignment should appear in Supabase dashboard

---

## 🔧 Configuration Required

Make sure these environment variables are set:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

If not set, the app will throw an error when trying to save:
`Error: Missing Supabase environment variables`
