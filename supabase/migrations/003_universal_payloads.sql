-- =============================================================================
-- MIGRATION: Universal Payloads Support
-- Purpose: Add support for UniversalProblem, Astronaut, and simulation results
-- Date: 2026-02-11
-- =============================================================================

-- =============================================================================
-- 1. UNIVERSAL PROBLEMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS universal_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity (immutable)
  problem_id TEXT NOT NULL,           -- e.g., "S1_P3_a"
  document_id TEXT NOT NULL,          -- e.g., "doc_1707609600000"
  subject TEXT NOT NULL,              -- e.g., "AP_Statistics"
  section_id TEXT NOT NULL,           -- e.g., "S1"
  parent_problem_id TEXT,             -- If subpart, e.g., "S1_P3"
  
  -- Content (mutable)
  content TEXT NOT NULL,              -- The actual problem text
  
  -- Cognitive metadata (immutable after analyzer)
  cognitive JSONB NOT NULL,           -- CognitiveMetadata object
  
  -- Classification metadata (immutable after analyzer)
  classification JSONB NOT NULL,      -- ClassificationMetadata object
  
  -- Structure
  structure JSONB NOT NULL,           -- StructureMetadata object
  
  -- Analysis and versioning
  analysis JSONB NOT NULL,            -- AnalysisMetadata object
  version TEXT DEFAULT '1.0',         -- Semantic versioning
  
  -- Assignment association
  assignment_id UUID,                 -- Reference to assignment
  teacher_id UUID,                    -- Reference to teacher
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(problem_id, document_id)
);

CREATE INDEX idx_universal_problems_assignment_id ON universal_problems(assignment_id);
CREATE INDEX idx_universal_problems_teacher_id ON universal_problems(teacher_id);
CREATE INDEX idx_universal_problems_subject ON universal_problems(subject);
CREATE INDEX idx_universal_problems_problem_id ON universal_problems(problem_id);

-- =============================================================================
-- 2. PROBLEM VERSIONS TABLE - Track all changes to problems (for immutant enforcement)
-- =============================================================================

CREATE TABLE IF NOT EXISTS problem_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  universal_problem_id UUID NOT NULL REFERENCES universal_problems(id) ON DELETE CASCADE,
  
  version_number TEXT NOT NULL,       -- e.g., "1.0", "1.1"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL,           -- 'analyzer', 'rewriter', 'teacher'
  change_description TEXT,
  
  -- Full problem snapshot
  problem_snapshot JSONB NOT NULL,    -- Complete UniversalProblem at this version
  
  -- Lock status for immutable fields
  immutable_fields_locked BOOLEAN DEFAULT FALSE,
  
  UNIQUE(universal_problem_id, version_number)
);

CREATE INDEX idx_problem_versions_universal_problem_id ON problem_versions(universal_problem_id);
CREATE INDEX idx_problem_versions_version_number ON problem_versions(version_number);

-- =============================================================================
-- 3. ASTRONAUTS TABLE - Student profiles/personas
-- =============================================================================

CREATE TABLE IF NOT EXISTS astronauts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  student_id TEXT NOT NULL,           -- e.g., "student_adhd_001"
  persona_name TEXT NOT NULL,         -- e.g., "Alex (ADHD Profile)"
  
  -- Teacher and organization
  teacher_id UUID,                    -- NULL if predefined template
  is_template BOOLEAN DEFAULT FALSE,  -- Can be used by other teachers
  
  -- Profile characteristics
  overlays TEXT[] DEFAULT '{}',       -- e.g., ["adhd", "fatigue_sensitive"]
  narrative_tags TEXT[] DEFAULT '{}', -- e.g., ["focused", "curious", "visual-learner"]
  
  -- Traits (stored as JSONB for flexibility)
  profile_traits JSONB NOT NULL,      -- ProfileTraits object
  
  -- Grade and accessibility
  grade_level TEXT,                   -- e.g., "11-12"
  is_accessibility_profile BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count BIGINT DEFAULT 0,
  
  UNIQUE(student_id, teacher_id)
);

CREATE INDEX idx_astronauts_teacher_id ON astronauts(teacher_id);
CREATE INDEX idx_astronauts_student_id ON astronauts(student_id);
CREATE INDEX idx_astronauts_is_template ON astronauts(is_template);
CREATE INDEX idx_astronauts_overlays ON astronauts USING GIN(overlays);

-- =============================================================================
-- 4. STUDENT-PROBLEM INTERACTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_problem_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE CASCADE,
  universal_problem_id UUID NOT NULL REFERENCES universal_problems(id) ON DELETE CASCADE,
  simulation_batch_id UUID,
  
  -- Input payload
  interaction_input JSONB NOT NULL,   -- StudentProblemInput object
  
  -- Output payload
  interaction_output JSONB,           -- StudentProblemOutput object (populated after simulation)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_problem_interactions_astronaut_id ON student_problem_interactions(astronaut_id);
CREATE INDEX idx_student_problem_interactions_universal_problem_id ON student_problem_interactions(universal_problem_id);
CREATE INDEX idx_student_problem_interactions_simulation_batch_id ON student_problem_interactions(simulation_batch_id);

-- =============================================================================
-- 5. SIMULATION BATCHES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS simulation_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  assignment_id UUID NOT NULL,        -- Reference to assignment
  teacher_id UUID NOT NULL,           -- Reference to teacher
  
  -- Batch metadata
  batch_name TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Astronauts used in this batch
  astronaut_ids UUID[] NOT NULL,
  
  -- Results summary (aggregated)
  results_summary JSONB,              -- ClassCompletionSummary object
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_simulation_batches_assignment_id ON simulation_batches(assignment_id);
CREATE INDEX idx_simulation_batches_teacher_id ON simulation_batches(teacher_id);
CREATE INDEX idx_simulation_batches_created_at ON simulation_batches(created_at DESC);

-- =============================================================================
-- 6. STUDENT ASSIGNMENT SIMULATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_assignment_simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  simulation_batch_id UUID NOT NULL REFERENCES simulation_batches(id) ON DELETE CASCADE,
  astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL,
  
  -- Complete simulation results
  simulation_results JSONB NOT NULL,  -- StudentAssignmentSimulation object
  
  -- Key metrics for querying
  total_time_minutes NUMERIC,
  estimated_score NUMERIC,
  estimated_grade TEXT,
  at_risk BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_assignment_simulations_simulation_batch_id ON student_assignment_simulations(simulation_batch_id);
CREATE INDEX idx_student_assignment_simulations_astronaut_id ON student_assignment_simulations(astronaut_id);
CREATE INDEX idx_student_assignment_simulations_assignment_id ON student_assignment_simulations(assignment_id);
CREATE INDEX idx_student_assignment_simulations_at_risk ON student_assignment_simulations(at_risk);

-- =============================================================================
-- 7. ALTER EXISTING TABLES FOR NEW SCHEMA
-- =============================================================================

-- Add columns to assignments table to support UniversalProblems
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS universal_problems_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS last_simulation_batch_id UUID;

-- Add indexes for new relationships
CREATE INDEX IF NOT EXISTS idx_assignments_last_simulation_batch_id 
ON assignments(last_simulation_batch_id);

-- Add columns to question_bank to support UniversalProblems
ALTER TABLE question_bank
ADD COLUMN IF NOT EXISTS universal_problem_id UUID;

ALTER TABLE question_bank
ADD COLUMN IF NOT EXISTS problem_version TEXT;

CREATE INDEX IF NOT EXISTS idx_question_bank_universal_problem_id 
ON question_bank(universal_problem_id);

-- =============================================================================
-- 8. AUDIT TRAIL FOR INVARIANT ENFORCEMENT
-- =============================================================================

CREATE TABLE IF NOT EXISTS invariant_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  problem_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,       -- 'immutable_field_changed', 'version_conflict'
  violation_description TEXT,
  
  original_value JSONB,
  attempted_value JSONB,
  
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  detected_by TEXT,                   -- 'system', 'rewriter', 'teacher'
  
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT
);

CREATE INDEX idx_invariant_violations_problem_id ON invariant_violations(problem_id);
CREATE INDEX idx_invariant_violations_detected_at ON invariant_violations(detected_at DESC);

-- =============================================================================
-- 9. VIEWS
-- =============================================================================

-- View: Recent simulation results with assignment details
CREATE OR REPLACE VIEW recent_simulations AS
SELECT 
  sas.id,
  sas.assignment_id,
  a.teacher_id,
  sas.astronaut_id,
  ast.persona_name,
  a.title AS assignment_title,
  sas.total_time_minutes,
  sas.estimated_score,
  sas.estimated_grade,
  sas.at_risk,
  sas.created_at
FROM student_assignment_simulations sas
JOIN simulation_batches sb ON sas.simulation_batch_id = sb.id
JOIN assignments a ON sb.assignment_id = a.id
JOIN astronauts ast ON sas.astronaut_id = ast.id
ORDER BY sas.created_at DESC;

-- View: Problem cognitive profiles (for analytics)
CREATE OR REPLACE VIEW problem_cognitive_profiles AS
SELECT 
  up.problem_id,
  up.assignment_id,
  up.teacher_id,
  up.subject,
  up.content,
  (up.cognitive ->> 'bloomsLevel') AS blooms_level,
  (up.cognitive ->> 'bloomsConfidence')::NUMERIC AS blooms_confidence,
  (up.cognitive ->> 'complexityLevel')::INTEGER AS complexity_level,
  (up.cognitive ->> 'estimatedTimeMinutes')::NUMERIC AS estimated_time_minutes,
  (up.cognitive ->> 'linguisticComplexity')::NUMERIC AS linguistic_complexity,
  (up.classification ->> 'problemType') AS problem_type,
  up.created_at
FROM universal_problems up
WHERE up.cognitive IS NOT NULL
ORDER BY up.created_at DESC;
