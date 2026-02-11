-- Problem Bank Tables
-- Complete UniversalProblem storage with immutable field locking

-- Problem Bank: Primary storage for full UniversalProblems
CREATE TABLE IF NOT EXISTS problem_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Full UniversalProblem (stored as JSONB for flexibility and querying)
  problem JSONB NOT NULL,
  
  -- Performance History (simulated usage data)
  performance_success_rate INTEGER DEFAULT 0, -- 0-100%
  performance_avg_time_seconds INTEGER DEFAULT 0,
  performance_attempt_count INTEGER DEFAULT 0,
  performance_feedback_count INTEGER DEFAULT 0,
  performance_last_attempted TIMESTAMP WITH TIME ZONE,
  
  -- Immutable Layer Tracking
  immutable_lock JSONB NOT NULL DEFAULT jsonb_build_object(
    'problemId', '',
    'lockedAt', NOW()::text,
    'lockedBy', 'system',
    'cognitiveLocked', false,
    'classificationLocked', false,
    'structureLocked', false
  ),
  
  -- Usage Tracking
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  used_in_assignment_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_used TIMESTAMP WITH TIME ZONE,
  
  -- Source Tracking
  source_assignment_id UUID,
  source_document_id TEXT,
  
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_problem_id CHECK ((problem->>'problemId') ~ '^[A-Za-z0-9]+_P\d+(_[a-z])?$'),
  CONSTRAINT valid_bloom_level CHECK ((problem->'cognitive'->>'bloomsLevel') IN ('Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create')),
  CONSTRAINT valid_complexity CHECK ((problem->'cognitive'->>'complexityLevel')::INT BETWEEN 1 AND 5)
);

-- Index for teacher access
CREATE INDEX IF NOT EXISTS idx_problem_bank_teacher ON problem_bank(teacher_id);

-- Index for problem_id lookup
CREATE INDEX IF NOT EXISTS idx_problem_bank_problem_id ON problem_bank USING GIN ((problem->'problemId'));

-- Index for favorite filtering
CREATE INDEX IF NOT EXISTS idx_problem_bank_favorites ON problem_bank(teacher_id, is_favorite) WHERE is_favorite = true;

-- Index for subject filtering
CREATE INDEX IF NOT EXISTS idx_problem_bank_subject ON problem_bank USING GIN ((problem->'subject'));

-- Immutability Violation Log: Audit trail for attempted immutable field modifications
CREATE TABLE IF NOT EXISTS immutability_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES auth.users(id),
  attempted_field TEXT NOT NULL,
  attempted_value TEXT,
  original_value TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  blocked BOOLEAN DEFAULT true,
  FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for violation lookup
CREATE INDEX IF NOT EXISTS idx_immutability_violations_problem ON immutability_violations(problem_id, teacher_id);

-- Problem Bank Assembly Log: Track problem re-sequencing for new assessments
CREATE TABLE IF NOT EXISTS problem_bank_assembly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_problem_bank_entry_id UUID NOT NULL REFERENCES problem_bank(id) ON DELETE RESTRICT,
  
  -- Original problem context
  original_problem_id TEXT NOT NULL,
  
  -- New problem context
  new_problem_id TEXT NOT NULL,
  new_section_id TEXT NOT NULL,
  new_assignment_id UUID NOT NULL,
  
  -- ID mapping
  id_mapping JSONB NOT NULL, -- IdResequencingMap
  
  -- Lock status preserved
  immutable_lock_preserved JSONB NOT NULL,
  
  -- Validation results
  validation_passed BOOLEAN NOT NULL,
  validation_warnings TEXT[],
  
  -- Audit
  assembled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assembled_by UUID NOT NULL REFERENCES auth.users(id),
  
  CONSTRAINT valid_new_id CHECK (new_problem_id ~ '^[A-Za-z0-9]+_P\d+(_[a-z])?$')
);

-- Index for assembly lookups
CREATE INDEX IF NOT EXISTS idx_problem_bank_assembly_assignment ON problem_bank_assembly(new_assignment_id);
CREATE INDEX IF NOT EXISTS idx_problem_bank_assembly_source ON problem_bank_assembly(source_problem_bank_entry_id);

-- View: Problem Bank with validation status
CREATE OR REPLACE VIEW problem_bank_validated AS
SELECT 
  pb.id,
  pb.teacher_id,
  pb.problem,
  pb.immutable_lock,
  pb.is_favorite,
  pb.usage_count,
  pb.last_used,
  -- Check if cognitive is locked
  (pb.immutable_lock->>'cognitiveLocked')::BOOLEAN as cognitive_locked,
  -- Check if classification is locked
  (pb.immutable_lock->>'classificationLocked')::BOOLEAN as classification_locked,
  -- Check if structure is locked
  (pb.immutable_lock->>'structureLocked')::BOOLEAN as structure_locked,
  pb.created_at,
  pb.updated_at
FROM problem_bank pb;

-- Trigger to update updated_at on modification
CREATE OR REPLACE FUNCTION update_problem_bank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER trigger_problem_bank_updated_at
BEFORE UPDATE ON problem_bank
FOR EACH ROW
EXECUTE FUNCTION update_problem_bank_updated_at();

-- Trigger to prevent modification of immutable layers when locked
CREATE OR REPLACE FUNCTION check_immutable_layers()
RETURNS TRIGGER AS $$
DECLARE
  old_problem JSONB;
  new_problem JSONB;
  lock_status JSONB;
BEGIN
  old_problem := OLD.problem;
  new_problem := NEW.problem;
  lock_status := NEW.immutable_lock;
  
  -- If cognitive is locked, prevent cognitive changes
  IF (lock_status->>'cognitiveLocked')::BOOLEAN THEN
    IF old_problem->'cognitive' IS DISTINCT FROM new_problem->'cognitive' THEN
      RAISE EXCEPTION 'Cannot modify cognitive layer - fields are locked after analysis';
    END IF;
  END IF;
  
  -- If classification is locked, prevent classification changes
  IF (lock_status->>'classificationLocked')::BOOLEAN THEN
    IF old_problem->'classification' IS DISTINCT FROM new_problem->'classification' THEN
      RAISE EXCEPTION 'Cannot modify classification layer - fields are locked after analysis';
    END IF;
  END IF;
  
  -- If structure is locked, prevent structure changes
  IF (lock_status->>'structureLocked')::BOOLEAN THEN
    IF old_problem->'structure' IS DISTINCT FROM new_problem->'structure' THEN
      RAISE EXCEPTION 'Cannot modify structure layer - fields are locked after analysis';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER trigger_check_immutable_layers
BEFORE UPDATE ON problem_bank
FOR EACH ROW
EXECUTE FUNCTION check_immutable_layers();
