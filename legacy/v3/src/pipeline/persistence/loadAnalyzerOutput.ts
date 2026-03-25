import { supabase } from "./supabaseClient";
import { UnifiedAnalyzerOutput } from "../schema/unifiedSchema";

export async function loadAnalyzerOutput(
  documentId: string
): Promise<UnifiedAnalyzerOutput | null> {
  const { data, error } = await supabase
    .from("analyzer_outputs")
    .select("output_json")
    .eq("document_id", documentId)
    .single();

  if (error) {
    console.error("Supabase load error:", error);
    return null;
  }

  return data?.output_json ?? null;
}
