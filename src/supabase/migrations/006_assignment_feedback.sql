-- Assignment Feedback Tables
-- Teachers rate assignment performance for writer improvement

CREATE TABLE IF NOT EXISTS assignment_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Overall assessment
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  completion_rate INTEGER NOT NULL CHECK (completion_rate BETWEEN 0 AND 100),
  student_count INTEGER NOT NULL,
  time_to_complete_minutes INTEGER,
  
  -- Observations
  strengths_observed TEXT[] DEFAULT ARRAY[]::TEXT[],
  problems_observed TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes_for_writer TEXT,
  
  -- Problem-level feedback (stored as JSONB for flexibility)
  problem_feedback JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Audit
  CONSTRAINT fk_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_assignment_feedback_teacher ON assignment_feedback(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignment_feedback_assignment ON assignment_feedback(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_feedback_created ON assignment_feedback(created_at DESC);

-- View: Aggregate feedback for writers (internal, not exposed to teachers)
CREATE OR REPLACE VIEW writer_feedback_summary AS
SELECT
  af.assignment_id,
  COUNT(*) as feedback_count,
  AVG(af.overall_rating::numeric) as avg_rating,
  AVG(af.completion_rate::numeric) as avg_completion_rate,
  AVG(af.time_to_complete_minutes::numeric) as avg_actual_time,
  array_agg(DISTINCT unnest(af.strengths_observed)) FILTER (WHERE af.strengths_observed IS NOT NULL) as top_strengths,
  array_agg(DISTINCT unnest(af.problems_observed)) FILTER (WHERE af.problems_observed IS NOT NULL) as top_problems,
  array_agg(af.notes_for_writer) FILTER (WHERE af.notes_for_writer IS NOT NULL) as writer_notes
FROM assignment_feedback af
GROUP BY af.assignment_id;
