import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;



if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) not set. " +
    "Backend features (DossierManager, AgentSelector, Auth) will not work."
  );
}

// ⭐ Always export a valid client — never null export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
