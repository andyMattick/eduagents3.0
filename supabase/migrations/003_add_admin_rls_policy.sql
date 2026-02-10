/**
 * MIGRATION: Add Admin RLS Policy
 * 
 * Allows admins to read all teacher accounts
 */

-- Add admin read policy for teacher_accounts
DROP POLICY IF EXISTS "Admins can read all accounts" ON teacher_accounts;

CREATE POLICY "Admins can read all accounts" ON teacher_accounts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM teacher_accounts WHERE is_admin = true
    )
  );
