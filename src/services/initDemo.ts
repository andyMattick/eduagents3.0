/**
 * Demo User Initialization
 * 
 * Automatically creates demo users (teacher@example.com, admin@example.com)
 * in Supabase Auth and teacher_accounts table if they don't exist.
 * 
 * This is purely for development/testing purposes.
 */

import { getSupabase } from './teacherSystemService';

const DEMO_USERS = [
  {
    email: 'teacher@example.com',
    password: 'password',
    name: 'Demo Teacher',
    isAdmin: false,
  },
  {
    email: 'admin@example.com',
    password: 'password',
    name: 'Demo Admin',
    isAdmin: true,
  },
];

/**
 * Initialize demo users if they don't already exist
 * Safe to call multiple times - won't create duplicates
 * Only runs once per session to avoid repeated 422 errors
 */
export async function initializeDemoUsers(): Promise<void> {
  // Skip if already initialized in this session
  if (sessionStorage.getItem('demoUsersInitialized')) {
    return;
  }

  try {
    const supabase = getSupabase();

    for (const demo of DEMO_USERS) {
      try {
        // Try to create auth user - this will fail gracefully if user already exists
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: demo.email,
          password: demo.password,
        });

        // If user already exists, fetch their ID from auth.users
        let userId: string | null = null;
        
        if (authError) {
          if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
            console.log(`ℹ️  Demo user ${demo.email} already exists (created by trigger), skipping...`);
            continue; // User already exists with teacher_accounts entry created by trigger
          } else if (authError.message.includes('Database error') || authError.status === 500) {
            // 500 error - likely email confirmation issue or database constraint
            console.warn(`⚠️  Signup failed (500): ${authError.message}`);
            console.warn(`   This might be due to email confirmation being required.`);
            console.warn(`   Tip: Go to Supabase Auth settings and disable "Confirm email" for development.`);
            continue;
          } else {
            console.warn(`⚠️  Signup error for ${demo.email}: ${authError.message}`);
            throw authError;
          }
        } else if (authData.user) {
          userId = authData.user.id;
          console.log(`✅ Created auth user: ${demo.email}`);
        }

        // Now create/update teacher_accounts entry
        if (userId) {
          // First check if account already exists
          const { data: existing, error: checkError } = await supabase
            .from('teacher_accounts')
            .select('id')
            .eq('user_id', userId);

          if (checkError) {
            console.error(`Error checking teacher_accounts:`, checkError);
            continue;
          }

          if (existing && existing.length > 0) {
            console.log(`ℹ️  Teacher account already exists for ${demo.email}, skipping...`);
            continue;
          }

          // Create the teacher_accounts entry
          const { error: insertError } = await supabase
            .from('teacher_accounts')
            .insert({
              user_id: userId,
              email: demo.email,
              name: demo.name,
              is_admin: demo.isAdmin,
              subscription_tier: 'free',
              api_calls_remaining: 100,
              is_verified: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`✗ Failed to create teacher_accounts for ${demo.email}:`, insertError);
          } else {
            console.log(`✅ Created demo user: ${demo.email}${demo.isAdmin ? ' (Admin)' : ''}`);
          }
        }
      } catch (err) {
        console.error(`Error initializing demo user ${demo.email}:`, err);
      }
    }
  } catch (err) {
    console.error('Failed to initialize demo users:', err);
    // Don't throw - this is non-critical setup
  }

  // Mark as initialized to prevent repeated attempts
  sessionStorage.setItem('demoUsersInitialized', 'true');
}
