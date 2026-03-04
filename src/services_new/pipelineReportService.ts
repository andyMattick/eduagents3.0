/**
 * pipelineReportService — sends a structured pipeline report to Supabase.
 *
 * Called when a teacher clicks "Send Report" on the AiGenerationNotes banner.
 * Stores everything needed to triage the issue: classification, signals,
 * blueprint snapshot, UAR, and an optional teacher note.
 *
 * Database table: public.pipeline_reports (see supabase/schema.sql §10)
 */

import { supabase } from "@/supabase/client";
import type { TraceClassification } from "@/pipeline/agents/classifyTrace";

export interface SendReportPayload {
  userId:               string;
  assessmentVersionId:  string;
  classification:       TraceClassification;
  blueprintJson:        Record<string, any> | null;
  tokenUsage:           Record<string, any> | null;
  qualityScore:         number | null;
  uarJson:              Record<string, any> | null;
  teacherNote?:         string;
}

export async function sendPipelineReport(payload: SendReportPayload): Promise<void> {
  const {
    userId,
    assessmentVersionId,
    classification: c,
    blueprintJson,
    tokenUsage,
    qualityScore,
    uarJson,
    teacherNote,
  } = payload;

  const { error } = await supabase.from("pipeline_reports").insert({
    user_id:               userId,
    assessment_version_id: assessmentVersionId,
    severity:              c.severity,
    category:              c.category,
    faulting_agent:        c.faultingAgent,
    summary:               c.summary,
    probable_cause:        c.probableCause,
    suggested_fix:         c.suggestedFix,
    signals:               c.signals,
    blueprint_json:        blueprintJson,
    token_usage:           tokenUsage,
    quality_score:         qualityScore,
    uar_json:              uarJson,
    teacher_note:          teacherNote ?? null,
  });

  if (error) {
    console.error("[pipelineReportService] Failed to send report:", error.message);
    throw new Error(error.message);
  }
}
