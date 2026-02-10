/**
 * Authentication Service
 * 
 * Handles:
 * - User registration and login
 * - Password reset and recovery
 * - Session management
 * - Token refresh
 */

import { getSupabase } from './teacherSystemService';
import { LoginRequest, SignUpRequest, PasswordResetRequest, AuthSession } from '../types/teacherSystem';

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

export async function signUp(request: SignUpRequest): Promise<AuthSession> {
  const supabase = getSupabase();

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: request.email,
    password: request.password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

  // Create teacher account (consolidated - no separate profiles table)
  const { error: accountError } = await supabase.from('teacher_accounts').insert({
    user_id: authData.user.id,
    email: request.email,
    name: request.name,
    school_name: undefined,
    subscription_tier: 'free',
    api_calls_remaining: 50,
    is_verified: false,
  });

  if (accountError) throw accountError;

  // Create session
  return createSession(authData.user.id, request.email);
}

export async function login(request: LoginRequest): Promise<AuthSession> {
  const supabase = getSupabase();

  // Authenticate with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: request.email,
    password: request.password,
  });

  if (authError) {
    console.error('Login error:', authError);
    
    // Provide more helpful error message
    if (authError.message.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password. Please check and try again.');
    }
    
    throw authError;
  }
  
  if (!authData.user) throw new Error('Login failed');

  // Update last login (using user_id)
  await supabase
    .from('teacher_accounts')
    .update({ last_login: new Date().toISOString() })
    .eq('user_id', authData.user.id);

  return createSession(authData.user.id, request.email);
}

export async function logout(sessionToken: string): Promise<void> {
  const supabase = getSupabase();

  // Delete session
  await supabase.from('auth_sessions').delete().eq('session_token', sessionToken);

  // Sign out from Supabase Auth
  await supabase.auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) throw error;
}

export async function resetPassword(request: PasswordResetRequest): Promise<void> {
  const supabase = getSupabase();

  // This assumes you capture the reset token from the email link
  const { error } = await supabase.auth.updateUser({
    password: request.newPassword,
  });

  if (error) throw error;
}

export async function verifyEmail(token: string): Promise<void> {
  const supabase = getSupabase();

  // Verify email token (typically sent via email)
  const { error } = await supabase.auth.verifyOtp({
    email: '', // Would be passed from email link
    token,
    type: 'email',
  });

  if (error) throw error;
}

export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const supabase = getSupabase();

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    return {
      id: data.user.id,
      email: data.user.email || '',
    };
  }
  return null;
}

export async function validateSession(sessionToken: string): Promise<AuthSession | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('auth_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;

  // Update last activity
  await supabase
    .from('auth_sessions')
    .update({ last_activity: new Date().toISOString() })
    .eq('id', data.id);

  return mapAuthSession(data);
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

async function createSession(userId: string, email: string): Promise<AuthSession> {
  const supabase = getSupabase();

  const sessionToken = generateToken(32);
  const refreshToken = generateToken(32);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  const { data, error } = await supabase
    .from('auth_sessions')
    .insert({
      user_id: userId,
      session_token: sessionToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw error;

  return mapAuthSession(data);
}

function generateToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function mapAuthSession(data: any): AuthSession {
  return {
    userId: data.user_id,
    email: data.email,
    sessionToken: data.session_token,
    expiresAt: data.expires_at,
    refreshToken: data.refresh_token,
  };
}

// ============================================================================
// OAuth PROVIDERS (optional for future integration)
// ============================================================================

export async function signInWithGoogle(): Promise<AuthSession> {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;

  // After OAuth callback, user will be automatically signed in
  const user = await getCurrentUser();
  if (!user) throw new Error('OAuth sign in failed');

  return createSession(user.id, user.email);
}

export async function signInWithMicrosoft(): Promise<AuthSession> {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;

  const user = await getCurrentUser();
  if (!user) throw new Error('OAuth sign in failed');

  return createSession(user.id, user.email);
}

export default {
  signUp,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  getCurrentUser,
  validateSession,
  signInWithGoogle,
  signInWithMicrosoft,
};
