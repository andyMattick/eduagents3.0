/**
 * MIGRATION: Consolidate Teacher Schema
 * 
 * This migration:
 * 1. Removes the separate teacher_profiles table
 * 2. Consolidates all teacher data into teacher_accounts
 * 3. Updates all references to use user_id directly
 * 4. Updates RLS policies
 * 5. Regenerates views
 */

-- =============================================================================
-- STEP 1: Drop dependent views first
-- =============================================================================

DROP VIEW IF EXISTS teacher_dashboard_overview CASCADE;

-- =============================================================================
-- STEP 2: Disable RLS temporarily to allow modifications
-- =============================================================================

DO $$
BEGIN
  ALTER TABLE teacher_accounts DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE assignment_versions DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE question_bank DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE api_call_logs DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE auth_sessions DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE subscription_changes DISABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================================
-- STEP 3: Update teacher_accounts structure
-- =============================================================================

-- Add new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_accounts' AND column_name = 'user_id') THEN
    ALTER TABLE teacher_accounts ADD COLUMN user_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_accounts' AND column_name = 'is_admin') THEN
    ALTER TABLE teacher_accounts ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Only copy data from teacher_profiles if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teacher_profiles') THEN
    UPDATE teacher_accounts ta
    SET 
      user_id = tp.id,
      email = tp.email,
      name = tp.name,
      school_name = tp.school_name
    FROM teacher_profiles tp
    WHERE ta.profile_id = tp.id AND ta.user_id IS NULL;
  END IF;
END $$;

-- Drop the old profile_id reference if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'teacher_accounts' 
    AND constraint_name = 'teacher_accounts_profile_id_fkey'
  ) THEN
    ALTER TABLE teacher_accounts 
      DROP CONSTRAINT teacher_accounts_profile_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_accounts' AND column_name = 'profile_id') THEN
    ALTER TABLE teacher_accounts 
      DROP COLUMN profile_id;
  END IF;
END $$;

-- Make user_id unique and not null (if not already)
DO $$
BEGIN
  ALTER TABLE teacher_accounts 
    ALTER COLUMN user_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- Column might already have this constraint
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE teacher_accounts
    ADD CONSTRAINT teacher_accounts_user_id_key UNIQUE (user_id);
EXCEPTION WHEN OTHERS THEN
  -- Constraint might already exist
  NULL;
END $$;

-- Add foreign key for user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'teacher_accounts' 
    AND constraint_name = 'teacher_accounts_user_id_fkey'
  ) THEN
    ALTER TABLE teacher_accounts
      ADD CONSTRAINT teacher_accounts_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- STEP 4: Update other tables' foreign keys
-- =============================================================================

-- Drop and recreate assignment foreign key
DO $$
BEGIN
  ALTER TABLE assignments 
    DROP CONSTRAINT IF EXISTS assignments_teacher_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE assignments
    ADD CONSTRAINT assignments_teacher_id_fkey 
    FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop and recreate question_bank foreign key
DO $$
BEGIN
  ALTER TABLE question_bank 
    DROP CONSTRAINT IF EXISTS question_bank_teacher_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE question_bank
    ADD CONSTRAINT question_bank_teacher_id_fkey 
    FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop and recreate api_call_logs foreign key
DO $$
BEGIN
  ALTER TABLE api_call_logs 
    DROP CONSTRAINT IF EXISTS api_call_logs_teacher_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE api_call_logs
    ADD CONSTRAINT api_call_logs_teacher_id_fkey 
    FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop and recreate auth_sessions foreign key
DO $$
BEGIN
  ALTER TABLE auth_sessions 
    DROP CONSTRAINT IF EXISTS auth_sessions_user_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop and recreate subscription_changes foreign key
DO $$
BEGIN
  ALTER TABLE subscription_changes 
    DROP CONSTRAINT IF EXISTS subscription_changes_teacher_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE subscription_changes
    ADD CONSTRAINT subscription_changes_teacher_id_fkey 
    FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================================
-- STEP 5: Drop teacher_profiles table if it exists
-- =============================================================================

DROP TABLE IF EXISTS teacher_profiles CASCADE;

-- =============================================================================
-- STEP 6: Add missing indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_teacher_accounts_user_id ON teacher_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_accounts_email ON teacher_accounts(email);

-- =============================================================================
-- STEP 7: Recreate the view
-- =============================================================================

CREATE VIEW teacher_dashboard_overview AS
SELECT 
  ta.user_id AS id,
  ta.email,
  ta.name,
  ta.subscription_tier,
  ta.api_calls_remaining,
  ta.assignment_count,
  ta.question_bank_count,
  ta.last_login,
  ta.is_verified,
  COUNT(a.id) FILTER (WHERE a.status = 'draft') AS draft_assignments,
  COUNT(a.id) FILTER (WHERE a.status = 'finalized') AS finalized_assignments,
  COUNT(DISTINCT CASE WHEN qb.id IS NOT NULL THEN qb.id END) AS total_questions,
  MAX(a.updated_at) AS last_assignment_updated
FROM teacher_accounts ta
LEFT JOIN assignments a ON a.teacher_id = ta.user_id
LEFT JOIN question_bank qb ON qb.teacher_id = ta.user_id
GROUP BY ta.user_id, ta.email, ta.name, ta.subscription_tier, ta.api_calls_remaining, 
         ta.assignment_count, ta.question_bank_count, ta.last_login, ta.is_verified;

-- =============================================================================
-- STEP 8: Re-enable RLS and update policies
-- =============================================================================

DO $$
BEGIN
  ALTER TABLE teacher_accounts ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE assignment_versions ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop old policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Teachers can read own profile" ON teacher_profiles;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Teachers can update own profile" ON teacher_profiles;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "Teachers can read own account" ON teacher_accounts;
DROP POLICY IF EXISTS "Teachers can update own account" ON teacher_accounts;
DROP POLICY IF EXISTS "Teachers can insert own account" ON teacher_accounts;

-- Create new policies for teacher_accounts with user_id
CREATE POLICY "Teachers can insert own account" ON teacher_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can read own account" ON teacher_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can update own account" ON teacher_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all accounts" ON teacher_accounts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM teacher_accounts WHERE is_admin = true
    )
  );

-- Recreate other policies
DROP POLICY IF EXISTS "Teachers can read own assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can create assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can update own assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers can delete own assignments" ON assignments;

CREATE POLICY "Teachers can read own assignments" ON assignments
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create assignments" ON assignments
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own assignments" ON assignments
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own assignments" ON assignments
  FOR DELETE USING (auth.uid() = teacher_id);

-- Question bank policies
DROP POLICY IF EXISTS "Teachers can read own question bank" ON question_bank;
DROP POLICY IF EXISTS "Teachers can manage own question bank" ON question_bank;
DROP POLICY IF EXISTS "Teachers can update own questions" ON question_bank;

CREATE POLICY "Teachers can read own question bank" ON question_bank
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can manage own question bank" ON question_bank
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own questions" ON question_bank
  FOR UPDATE USING (auth.uid() = teacher_id);

-- =============================================================================
-- STEP 9: Update log_api_call function
-- =============================================================================

CREATE OR REPLACE FUNCTION log_api_call(
  p_teacher_id UUID,
  p_action TEXT,
  p_cost INTEGER,
  p_assignment_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Insert the log entry
  INSERT INTO api_call_logs (
    teacher_id, action, cost, status, error_message, assignment_id, metadata
  ) VALUES (
    p_teacher_id, p_action, p_cost, p_status, p_error_message, p_assignment_id, p_metadata
  );
  
  -- Update teacher account usage
  UPDATE teacher_accounts
  SET 
    api_calls_total = api_calls_total + p_cost,
    api_calls_remaining = GREATEST(0, api_calls_remaining - p_cost),
    api_calls_used_today = api_calls_used_today + p_cost
  WHERE user_id = p_teacher_id;
END;
$$ LANGUAGE PLPGSQL;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
