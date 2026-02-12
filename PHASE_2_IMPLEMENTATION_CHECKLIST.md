# 🚀 **PHASE 2 CHECKLIST — Teacher Notes Persistence & Integration**  
### *Coder‑ready, implementation‑ready, aligned with v1.2.*

---

# 🎯 **PHASE 2 GOAL**  
Implement **persistent teacher notes** that:

- can be added at the **document level**  
- can be added at the **problem level**  
- are stored in the database  
- are retrieved and displayed in later pipeline stages  
- are available to the rewrite engine  
- are visible in the Philosopher Review  
- survive version changes and session restarts  

Teacher notes **never mutate UniversalProblem** — they are annotations only.

---

# ✅ **1. Create the Teacher Notes Database Table**

### **Task 2.1 — Add migration file**
Create:

`supabase/migrations/00X_teacher_notes.sql`

### **Task 2.2 — Table schema**
```sql
CREATE TABLE teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  problem_id TEXT,                -- NULL = document-level note
  note TEXT NOT NULL,
  category TEXT CHECK (category IN ('clarity', 'difficulty', 'alignment', 'typo', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teacher_notes_document_id ON teacher_notes(document_id);
CREATE INDEX idx_teacher_notes_problem_id ON teacher_notes(problem_id);
CREATE INDEX idx_teacher_notes_teacher_id ON teacher_notes(teacher_id);

ALTER TABLE teacher_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_notes_policy ON teacher_notes
  FOR ALL USING (teacher_id = auth.uid());
```

### **Acceptance Criteria**
- Table exists  
- RLS enabled  
- Teachers can only see their own notes  

---

# ✅ **2. Add Teacher Notes Types & Service Layer**

### **Task 2.3 — Add interface**
`src/types/teacherNotes.ts`

```ts
export interface TeacherNote {
  id: string;
  teacherId: string;
  documentId: string;
  problemId?: string;
  note: string;
  category?: "clarity" | "difficulty" | "alignment" | "typo" | "other";
  createdAt: string;
  updatedAt: string;
}
```

### **Task 2.4 — Add service functions**
`src/services/teacherNotesService.ts`

Implement:

```ts
export async function saveTeacherNote(...)
export async function getTeacherNotes(...)
export async function updateTeacherNote(...)
export async function deleteTeacherNote(...)
```

### **Acceptance Criteria**
- All CRUD functions work  
- All functions tested  
- Errors handled gracefully  

---

# ✅ **3. Integrate Notes Into Pipeline Steps**

Teacher notes appear in **three pipeline stages**:

1. **Document Notes** (before Foundry)  
2. **Problem Notes** (after Foundry)  
3. **Philosopher Review** (after simulation + clustering)  

---

## **3.1 Document-Level Notes (DOCUMENT_NOTES step)**

### **Task 2.5 — Add save logic**
In `PipelineShell.tsx`:

```ts
await saveTeacherNote(user.id, {
  documentId,
  note: documentNotes,
  category: "general"
});
```

### **Task 2.6 — Load notes on entry**
```ts
useEffect(() => {
  if (step === PipelineStep.DOCUMENT_NOTES) {
    loadDocumentNotes();
  }
}, [step]);
```

### **Acceptance Criteria**
- Notes persist  
- Notes reload when returning to the step  

---

## **3.2 Problem-Level Notes (PROBLEM_ANALYSIS step)**

### **Task 2.7 — Create component**
`src/components/Pipeline/ProblemNotes.tsx`

Contains:

- textarea  
- save button  
- list of existing notes  

### **Task 2.8 — Integrate into problem loop**
```tsx
{problems.map(problem => (
  <div key={problem.problemId}>
    <ProblemAnalysisCard problem={problem} />
    <ProblemNotes
      problemId={problem.problemId}
      documentId={documentId}
      onNoteSaved={reloadNotes}
    />
  </div>
))}
```

### **Acceptance Criteria**
- Notes saved per problem  
- Notes displayed under each problem  
- Notes persist across sessions  

---

## **3.3 Display Notes in Philosopher Review**

### **Task 2.9 — Load notes**
In `PhilosopherReview.tsx`:

```ts
const [notes, setNotes] = useState<TeacherNote[]>([]);

useEffect(() => {
  getTeacherNotes(documentId, user.id).then(setNotes);
}, [documentId]);
```

### **Task 2.10 — Display notes**
```tsx
<div className="teacher-notes-summary">
  <h4>Your Notes</h4>
  {notes.map(n => (
    <div key={n.id}>
      {n.problemId && <strong>Problem {n.problemId}</strong>}
      <p>{n.note}</p>
    </div>
  ))}
</div>
```

### **Acceptance Criteria**
- Notes visible in Philosopher Review  
- Notes grouped by problem  
- Notes readable and styled  

---

# ✅ **4. Pass Notes Into Rewrite Stage**

### **Task 2.11 — Update rewrite request payload**
In `PipelineShell.tsx`:

```ts
await rewriteDocument({
  problems,
  selectedFeedback,
  clusterReport,
  generationContext,
  teacherNotes: notes
});
```

### **Task 2.12 — Update rewrite API contract**
Add:

```ts
teacherNotes?: TeacherNote[];
```

### **Acceptance Criteria**
- Rewrite engine receives teacher notes  
- Notes do not mutate UniversalProblem  
- Notes influence rewrite decisions  

---

# ✅ **5. Add Tests**

### **Task 2.13 — Test service layer**
- save  
- retrieve  
- update  
- delete  
- RLS enforcement  

### **Task 2.14 — Test UI integration**
- Document notes save & reload  
- Problem notes save & reload  
- Notes appear in Philosopher Review  

---

# 🎉 **PHASE 2 COMPLETION CRITERIA**

You are done when:

- [ ] `teacher_notes` table exists  
- [ ] CRUD service functions implemented  
- [ ] Document-level notes persist  
- [ ] Problem-level notes persist  
- [ ] Notes appear in Philosopher Review  
- [ ] Notes passed into rewrite stage  
- [ ] All tests passing  
- [ ] No notes stored in pipeline state only  
- [ ] Build passes with no errors  

---

# 📋 **SUMMARY**

Phase 2 focuses on **database persistence** and **pipeline integration** of teacher notes. Notes are storage-agnostic annotations that teachers add throughout the workflow — they inform rewriting but never alter the problem data itself. This decoupling keeps the system clean and maintainable.

**Key design pattern**: Notes in → Rewriter logic → Improved problems out. Teachers stay in control.
