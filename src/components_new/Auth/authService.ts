import { supabase } from "../../supabase/client";

/**
 * Upserts a row in `teachers` so that every FK-dependent table
 * (teacher_assessment_history, teacher_defaults, dossiers, etc.)
 * can insert without a foreign-key violation.  Non-fatal on error.
 */
export async function ensureTeacherRow(
  userId: string,
  email?: string | null,
  name?: string | null,
  schoolName?: string | null,
): Promise<void> {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from("teachers")
    .upsert(
      { id: userId, email: email ?? null, name: name ?? null, school_name: schoolName ?? null },
      { onConflict: "id" },
    );
  if (error) {
    console.warn("[auth] teachers upsert failed (non-fatal):", error.message);
  }
}

export async function login(email: string, password: string) {
  if (!supabase) return { data: null, error: new Error("Supabase not configured") };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error && data?.user) {
    await ensureTeacherRow(
      data.user.id,
      data.user.email,
      data.user.user_metadata?.name ?? null,
      data.user.user_metadata?.schoolName ?? null,
    );
  }
  return { data, error };
}

export async function signUp(
  email: string,
  password: string,
  name?: string,
  schoolName?: string,
) {
  if (!supabase) return { data: null, error: new Error("Supabase not configured") };
  const result = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name ?? null, schoolName: schoolName ?? null } },
  });
  if (!result.error && result.data?.user) {
    await ensureTeacherRow(
      result.data.user.id,
      result.data.user.email,
      name ?? null,
      schoolName ?? null,
    );
  }
  return result;
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