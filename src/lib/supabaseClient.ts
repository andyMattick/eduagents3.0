// Supabase client initialization
// Install @supabase/supabase-js if you want to enable Supabase integration:
// npm install @supabase/supabase-js

// Uncomment the below once @supabase/supabase-js is installed
/*
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
*/

// Placeholder for when Supabase is not available
export const supabase = null;

export async function saveAssignment(text: string, tags: any[]) {
  // TODO: Implement once Supabase is available
  console.log('Save assignment:', text, tags);
}

export async function loadAssignment(id: string) {
  // TODO: Implement once Supabase is available
  console.log('Load assignment:', id);
  return null;
}

