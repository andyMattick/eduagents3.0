-- Teacher Notes: Persistent document-level and problem-level annotations
-- Teachers can add notes at the document level (before foundry) or per-problem (during analysis)
-- Notes are stored separately from UniversalProblem and never mutate assignment data

CREATE TABLE IF NOT EXISTS teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Document and Problem context
  document_id TEXT NOT NULL,
  problem_id TEXT,                -- NULL = document-level note
  
  -- Note content and metadata
  note TEXT NOT NULL,
  category TEXT CHECK (category IN ('clarity', 'difficulty', 'alignment', 'typo', 'other')) DEFAULT 'other',
  
  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_document_id CHECK (length(document_id) > 0),
  CONSTRAINT valid_note_content CHECK (length(note) > 0)
);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_teacher_notes_document_id ON teacher_notes(document_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_problem_id ON teacher_notes(problem_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_teacher_id ON teacher_notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_created_at ON teacher_notes(created_at DESC);

-- Row-level security
ALTER TABLE teacher_notes ENABLE ROW LEVEL SECURITY;

-- Teachers can only see and manage their own notes
CREATE POLICY teacher_notes_select_policy ON teacher_notes
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY teacher_notes_insert_policy ON teacher_notes
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY teacher_notes_update_policy ON teacher_notes
  FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY teacher_notes_delete_policy ON teacher_notes
  FOR DELETE USING (teacher_id = auth.uid());
