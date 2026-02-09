/**
 * SUPABASE SCHEMA SETUP
 * 
 * Run these SQL migrations in your Supabase dashboard to set up the teacher system.
 * Go to: SQL > Create new query > Paste & Run
 */

-- =============================================================================
-- ENABLE EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TEACHER PROFILES
-- =============================================================================

CREATE TABLE IF NOT EXISTS teacher_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  school_name TEXT,
  department TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TEACHER ACCOUNTS (SUBSCRIPTION & USAGE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS teacher_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  
  -- Subscription info
  subscription_tier TEXT NOT NULL DEFAULT 'free' 
    CHECK (subscription_tier IN ('free', 'pro', 'enterprise', 'custom')),
  subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_renewal_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_is_active BOOLEAN DEFAULT TRUE,
  payment_method_id TEXT, -- Stripe payment method ID
  
  -- API Usage
  api_calls_total BIGINT DEFAULT 0,
  api_calls_remaining BIGINT DEFAULT 50, -- Set based on tier
  api_calls_used_today BIGINT DEFAULT 0,
  api_usage_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_api_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Counts
  assignment_count BIGINT DEFAULT 0,
  question_bank_count BIGINT DEFAULT 0,
  
  -- Account info
  last_login TIMESTAMP WITH TIME ZONE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teacher_accounts_profile_id ON teacher_accounts(profile_id);
CREATE INDEX idx_teacher_accounts_tier ON teacher_accounts(subscription_tier);

-- =============================================================================
-- ASSIGNMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  assignment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized', 'archived')),
  
  -- Content
  content JSONB NOT NULL, -- Full assignment detail as JSON
  specifications JSONB NOT NULL, -- Metadata about assignment
  
  -- Counts
  problem_count INTEGER DEFAULT 0,
  estimated_time_minutes INTEGER DEFAULT 0,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  is_template BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  source_file_name TEXT,
  source_file_url TEXT,
  tags TEXT[] DEFAULT '{}',
  bloom_distribution JSONB, -- { "Remember": 10, "Understand": 20, ... }
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_created_at ON assignments(created_at DESC);
CREATE INDEX idx_assignments_is_template ON assignments(is_template);

-- =============================================================================
-- ASSIGNMENT VERSIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS assignment_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  version NUMBER NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL, -- 'AI' or 'teacher'
  change_type TEXT NOT NULL 
    CHECK (change_type IN ('initial', 'regenerated', 'rewrite', 'manual_edit')),
  change_description TEXT,
  
  content JSONB NOT NULL, -- Full assignment detail
  metrics JSONB, -- {averageTimeMinutes, averageEngagementScore, estimatedCompletionRate}
  
  UNIQUE(assignment_id, version)
);

CREATE INDEX idx_assignment_versions_assignment_id ON assignment_versions(assignment_id);
CREATE INDEX idx_assignment_versions_created_at ON assignment_versions(created_at DESC);

-- =============================================================================
-- QUESTION BANK
-- =============================================================================

CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  section_id TEXT, -- Reference to section within assignment
  
  -- Question data
  problem JSONB NOT NULL, -- Full problem object
  bloom_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Related questions
  similar_question_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_question_bank_teacher_id ON question_bank(teacher_id);
CREATE INDEX idx_question_bank_assignment_id ON question_bank(assignment_id);
CREATE INDEX idx_question_bank_bloom_level ON question_bank(bloom_level);
CREATE INDEX idx_question_bank_subject ON question_bank(subject);
CREATE INDEX idx_question_bank_is_favorite ON question_bank(is_favorite);
CREATE INDEX idx_question_bank_tags ON question_bank USING GIN(tags);

-- =============================================================================
-- API CALL LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL 
    CHECK (action IN ('generate', 'regenerate', 'analyze', 'rewrite', 'preview')),
  cost INTEGER NOT NULL DEFAULT 1, -- How many API calls consumed
  status TEXT NOT NULL 
    CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_call_logs_teacher_id ON api_call_logs(teacher_id);
CREATE INDEX idx_api_call_logs_action ON api_call_logs(action);
CREATE INDEX idx_api_call_logs_created_at ON api_call_logs(created_at DESC);

-- =============================================================================
-- MONTHLY API USAGE REPORTS (Materialized View)
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_api_usage_reports AS
SELECT 
  teacher_id,
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) FILTER (WHERE status = 'success') AS total_calls_used,
  COUNT(*) FILTER (WHERE action = 'generate' AND status = 'success') AS calls_generate,
  COUNT(*) FILTER (WHERE action = 'regenerate' AND status = 'success') AS calls_regenerate,
  COUNT(*) FILTER (WHERE action = 'analyze' AND status = 'success') AS calls_analyze,
  COUNT(*) FILTER (WHERE action = 'rewrite' AND status = 'success') AS calls_rewrite,
  COUNT(*) FILTER (WHERE action = 'preview' AND status = 'success') AS calls_preview
FROM api_call_logs
GROUP BY teacher_id, DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX idx_monthly_usage_unique ON monthly_api_usage_reports(teacher_id, month);

-- =============================================================================
-- SESSIONS / AUTH TOKENS
-- =============================================================================

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT UNIQUE,
  
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_session_token ON auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- =============================================================================
-- SUBSCRIPTION TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscription_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  reason TEXT, -- 'upgrade', 'downgrade', 'trial_ended', 'manual_adjustment'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_changes_teacher_id ON subscription_changes(teacher_id);

-- =============================================================================
-- VIEWS FOR EASY QUERYING
-- =============================================================================

-- Teacher dashboard overview
CREATE VIEW teacher_dashboard_overview AS
SELECT 
  tp.id,
  tp.email,
  tp.name,
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
FROM teacher_profiles tp
LEFT JOIN teacher_accounts ta ON ta.profile_id = tp.id
LEFT JOIN assignments a ON a.teacher_id = tp.id
LEFT JOIN question_bank qb ON qb.teacher_id = tp.id
GROUP BY tp.id, tp.email, tp.name, ta.subscription_tier, ta.api_calls_remaining, 
         ta.assignment_count, ta.question_bank_count, ta.last_login, ta.is_verified;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- Teachers can only see their own data
CREATE POLICY "Teachers can read own profile" ON teacher_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Teachers can update own profile" ON teacher_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Teachers can read own account" ON teacher_accounts
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Teachers can read own assignments" ON assignments
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create assignments" ON assignments
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own assignments" ON assignments
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own assignments" ON assignments
  FOR DELETE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can read own question bank" ON question_bank
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can manage own question bank" ON question_bank
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own questions" ON question_bank
  FOR UPDATE USING (auth.uid() = teacher_id);

-- =============================================================================
-- FUNCTIONS FOR MAINTENANCE
-- =============================================================================

-- Function to reset monthly API limits (call via cron job)
CREATE OR REPLACE FUNCTION reset_monthly_api_limits()
RETURNS void AS $$
BEGIN
  UPDATE teacher_accounts
  SET 
    api_calls_remaining = CASE 
      WHEN subscription_tier = 'free' THEN 50
      WHEN subscription_tier = 'pro' THEN 500
      WHEN subscription_tier = 'enterprise' THEN 5000
      WHEN subscription_tier = 'custom' THEN 10000
      ELSE 50
    END,
    api_calls_total = 0,
    api_calls_used_today = 0,
    last_api_reset_date = api_usage_reset_date,
    api_usage_reset_date = NOW()
  WHERE api_usage_reset_date < NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE PLPGSQL;

-- Function to log API call
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
  WHERE profile_id = p_teacher_id;
END;
$$ LANGUAGE PLPGSQL;

-- =============================================================================
-- TRIGGERS FOR AUTOMATICUPDATES
-- =============================================================================

-- Auto-update `updated_at` timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER teacher_profiles_update_timestamp
  BEFORE UPDATE ON teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER teacher_accounts_update_timestamp
  BEFORE UPDATE ON teacher_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER assignments_update_timestamp
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER question_bank_update_timestamp
  BEFORE UPDATE ON question_bank
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
