import { supabase } from "./supabaseClient";

export async function writeJSON(path: string, data: unknown): Promise<void> {
  const { error } = await supabase
    .from("teacher_templates")
    .upsert({ path, data });

  if (error) throw error;
}

export async function readAllJSON<T>(prefix: string): Promise<T[]> {
  const { data, error } = await supabase
    .from("teacher_templates")
    .select("data")
    .like("path", `${prefix}%`);

  if (error) throw error;
  return (data ?? []).map((row: { data: unknown }) => row.data as T);
}
