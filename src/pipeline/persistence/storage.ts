import { supabase } from "./supabaseClient";

function isMissingTeacherTemplatesTable(error: any): boolean {
  const message = String(error?.message ?? "").toLowerCase();
  const code = String(error?.code ?? "");
  return code === "PGRST205" || message.includes("teacher_templates") || message.includes("schema cache");
}

export async function writeJSON(teacherId: string, path: string, data: unknown): Promise<void> {
  const { error } = await supabase
    .from("teacher_templates")
    .upsert(
      {
        path,
        teacher_id: teacherId,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "path,teacher_id" }
    );

  if (error) {
    if (isMissingTeacherTemplatesTable(error)) {
      console.warn("[storage] teacher_templates table missing; skipping template save.");
      return;
    }
    throw error;
  }
}

export async function readAllJSON<T>(teacherId: string, prefix?: string): Promise<T[]> {
  let query = supabase
    .from("teacher_templates")
    .select("path, data")
    .eq("teacher_id", teacherId);

  if (prefix) {
    query = query.like("path", `${prefix}%`);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingTeacherTemplatesTable(error)) {
      console.warn("[storage] teacher_templates table missing; returning empty template list.");
      return [];
    }
    throw error;
  }
  return (data ?? []).map((row: { data: unknown }) => row.data as T);
}
