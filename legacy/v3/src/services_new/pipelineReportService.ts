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
import type { TraceClassification } from "pipeline/agents/classifyTrace";
import { buildIncidentReport } from "pipeline/agents/buildIncidentReport";

/** Source type stored in signals so the admin dashboard can filter by intent. */
export type ReportSource = "flagged" | "voluntary" | "recommended";

export interface SendReportPayload {
  userId:               string;
  assessmentVersionId:  string;
  classification:       TraceClassification;
  blueprintJson:        Record<string, any> | null;
  tokenUsage:           Record<string, any> | null;
  qualityScore:         number | null;
  uarJson:              Record<string, any> | null;
  /** Full assessment JSON (items array) — used to build the incident report. */
  assessmentJson?:      Record<string, any> | null;
  teacherNote?:         string;
  /** Indicates whether the teacher sent this proactively (voluntary/recommended) or the system prompted them (flagged). */
  reportSource?:        ReportSource;
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
    assessmentJson,
    teacherNote,
    reportSource,
  } = payload;

  // Append report_source as a signal string so the admin dashboard can distinguish types
  const signals = [
    ...(c.signals ?? []),
    ...(reportSource ? [`report_source:${reportSource}`] : []),
  ];

  // Build the deterministic 7-section incident report
  let incidentJson: Record<string, any> | null = null;
  try {
    incidentJson = buildIncidentReport({
      userId,
      assessmentVersionId,
      blueprintJson,
      uarJson,
      assessmentJson: assessmentJson ?? null,
      tokenUsage,
      qualityScore,
      teacherNote,
    });
  } catch (err) {
    console.warn("[pipelineReportService] buildIncidentReport failed (non-fatal):", err);
  }

  const { error } = await supabase.from("pipeline_reports").insert({
    user_id:               userId,
    assessment_version_id: assessmentVersionId,
    severity:              c.severity,
    category:              c.category,
    faulting_agent:        c.faultingAgent,
    summary:               c.summary,
    probable_cause:        c.probableCause,
    suggested_fix:         c.suggestedFix,
    signals,
    blueprint_json:        blueprintJson,
    token_usage:           tokenUsage,
    quality_score:         qualityScore,
    uar_json:              uarJson,
    teacher_note:          teacherNote ?? null,
    incident_json:         incidentJson,
  });

  if (error) {
    console.error("[pipelineReportService] Failed to send report:", error.message);
    throw new Error(error.message);
  }
}
