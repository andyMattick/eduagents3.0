import { supabase } from "./supabaseClient";
import { UnifiedAnalyzerOutput } from "../schema/unifiedSchema";

export async function saveAnalyzerOutput(
  documentId: string,
  output: UnifiedAnalyzerOutput
) {
  const { error } = await supabase
    .from("analyzer_outputs")
    .upsert({
      document_id: documentId,
      output_json: output,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("Supabase save error:", error);
    throw error;
  }

  return true;
}
