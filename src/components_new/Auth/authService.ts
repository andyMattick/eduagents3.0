import { supabase } from "../../supabase/client";

export async function login(email: string, password: string) {
  if (!supabase) return { data: null, error: new Error("Supabase not configured") };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signUp(email: string, password: string) {
  if (!supabase) return { data: null, error: new Error("Supabase not configured") };
  return supabase.auth.signUp({ email, password });
}

export async function logout() {
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}