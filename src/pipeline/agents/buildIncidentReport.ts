/**
 * buildIncidentReport — deterministic incident report assembler.
 *
 * Constructs a structured, admin-readable incident JSON from data already
 * present in blueprint_json, token_usage, uar_json, and assessment_json.
 * No LLM call — fully deterministic, executes in < 1 ms.
 *
 * Populated by the enriched blueprint_json written by blueprintForStorage()
 * in runPipeline.ts. Existing assessments with sparse blueprint_json will
 * still produce a useful (if partial) report.
 */

import { classifyTrace } from "./classifyTrace";
import type { TraceClassification } from "./classifyTrace";
import { getPrompt, getAnswer } from "@/pipeline/utils/itemNormalizer";

// ─────────────────────────────────────────────────────────────────────────────
// Output types
// ─────────────────────────────────────────────────────────────────────────────

export interface IncidentReportQuestion {
  index:       number;
  id:          string;
  type:        string | null;
  stem:        string | null;
  bloom_level: string | null;
  difficulty:  string | null;
  answer:      string | null;
  issues:      string[];
}

export interface IncidentReport {
  submitted_at:          string;
  teacher_id:            string;
  assessment_version_id: string;
  teacher_note:          string | null;

  teacher_intent: {
    topic:              string | null;
    course:             string | null;
    unit:               string | null;
    grade:              string | number | null;
    assessment_type:    string | null;
    question_formats:   string[];
    question_count:     number | null;
    time_minutes:       number | null;
    difficulty:         string | null;
    additional_details: string | null;
  };

  defaults_used: {
    bloom_floor:               string | null;
    bloom_ceiling:             string | null;
    difficulty_profile:        string | null;
    pacing_seconds_per_item:   number | null;
    question_type_distribution: Record<string, number>;
    cognitive_distribution:    Record<string, number>;
    style_constraints:         Record<string, string> | null;
  };

  prescriptions_added: Array<{
    source:  "scribe" | "gatekeeper";
    type:    string;
    value:   string;
  }>;

  pipeline_status: {
    architect:  { status: string; notes: string };
    input_judge:{ status: string; notes: string };
    writer:     { status: string; drift: boolean; rewrite_count: number; items_generated: number | null; notes: string };
    gatekeeper: { status: string; violation_count: number; violation_types: string[]; notes: string };
    scribe:     { status: string; quality_score: number | null; notes: string };
  };

  rewrite_history: Array<{
    rewrite_number: number;
    trigger:        string;
    item_id:        string | null;
    agent_reason:   string | null;
  }>;

  /** Direct output of classifyTrace — the condensed single-sentence diagnosis. */
  system_analysis: TraceClassification;

  final_output: {
    total_items:   number | null;
    question_types: string[];
    /** Capped at 20 questions to keep the JSON manageable. */
    questions:     IncidentReportQuestion[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Assembler
// ─────────────────────────────────────────────────────────────────────────────

export function buildIncidentReport({
  userId,
  assessmentVersionId,
  blueprintJson,
  uarJson,
  assessmentJson,
  tokenUsage,
  qualityScore,
  teacherNote,
}: {
  userId:               string;
  assessmentVersionId:  string;
  blueprintJson:        Record<string, any> | null;
  uarJson:              Record<string, any> | null;
  assessmentJson:       Record<string, any> | null;
  tokenUsage:           Record<string, any> | null;
  qualityScore:         number | null;
  teacherNote?:         string;
}): IncidentReport {
  const bp  = blueprintJson  ?? {};
  const uar = uarJson        ?? {};
  const fa  = assessmentJson ?? {};
  const tu  = tokenUsage     ?? {};

  // Writer Contract snapshot (populated by blueprintForStorage)
  const wc = bp.writerContract ?? {};
  const ti = wc.teacherIntent  ?? {};
  const sc = wc.systemConstraints ?? {};
  const gk = wc.gatekeeperPrescriptions ?? {};
  const sp = bp.scribePrescriptions ?? wc.scribePrescriptions ?? {};
  const plan = bp.plan ?? {};

  // ── 1. Teacher Intent ────────────────────────────────────────────────────
  const teacher_intent = {
    topic:              (uar.topic ?? uar.lessonName ?? ti.topic ?? null) as string | null,
    course:             (uar.course ?? ti.course ?? null) as string | null,
    unit:               (uar.unitName ?? null) as string | null,
    grade:              ((uar.gradeLevels?.[0] ?? uar.grade ?? ti.grade ?? null)) as string | number | null,
    assessment_type:    (uar.assessmentType ?? ti.assessmentType ?? null) as string | null,
    question_formats:   ((uar.questionTypes ?? ti.questionTypes ?? []) as string[]),
    question_count:     (uar.questionCount != null ? Number(uar.questionCount) : ti.questionCount != null ? Number(ti.questionCount) : null) as number | null,
    time_minutes:       (uar.time != null ? Number(uar.time) : ti.timeMinutes != null ? Number(ti.timeMinutes) : null) as number | null,
    difficulty:         (uar.studentLevel ?? null) as string | null,
    additional_details: (uar.additionalDetails ?? ti.additionalDetails ?? null) as string | null,
  };

  // ── 2. Defaults Used ─────────────────────────────────────────────────────
  const defaults_used = {
    bloom_floor:               (sc.bloomFloor ?? null) as string | null,
    bloom_ceiling:             (sc.bloomCeiling ?? null) as string | null,
    difficulty_profile:        (sc.difficultyProfile ?? plan.difficultyProfile ?? null) as string | null,
    pacing_seconds_per_item:   (sc.pacingSecondsPerItem != null ? Number(sc.pacingSecondsPerItem) : plan.pacingSecondsPerItem != null ? Number(plan.pacingSecondsPerItem) : null) as number | null,
    question_type_distribution: ((sc.questionTypeDistribution ?? {}) as Record<string, number>),
    cognitive_distribution:    ((plan.cognitiveDistribution ?? {}) as Record<string, number>),
    style_constraints:         (wc.styleConstraints ?? null) as Record<string, string> | null,
  };

  // ── 3. Prescriptions Added ───────────────────────────────────────────────
  const prescriptions_added: IncidentReport["prescriptions_added"] = [];

  for (const b of (sp.requiredBehaviors ?? []) as string[]) {
    prescriptions_added.push({ source: "scribe", type: "required_behavior", value: b });
  }
  for (const w of (sp.weaknesses ?? []) as string[]) {
    prescriptions_added.push({ source: "scribe", type: "weakness_guard", value: w });
  }
  for (const f of (sp.forbiddenBehaviors ?? []) as string[]) {
    prescriptions_added.push({ source: "scribe", type: "forbidden_behavior", value: f });
  }
  const gkViolList = (gk.violations ?? []) as string[];
  const gkConsList = (gk.addedConstraints ?? []) as string[];
  for (let i = 0; i < gkViolList.length; i++) {
    if (gkConsList[i]) {
      prescriptions_added.push({ source: "gatekeeper", type: gkViolList[i], value: gkConsList[i] });
    }
  }

  // ── 4. Pipeline Status ───────────────────────────────────────────────────
  const rewriteCount   = bp.rewriteCount  ?? tu.rewriteCount ?? 0;
  const violations     = (bp.gatekeeperViolations ?? []) as Array<{ type: string; message?: string; itemId?: string }>;
  const hasTopicDrift  = violations.some(v => v.type === "topic_mismatch" || v.type === "domain_mismatch");
  const hasBloomDrift  = violations.some(v => v.type === "bloom_mismatch" || v.type === "cognitive_demand_mismatch");

  const pipeline_status: IncidentReport["pipeline_status"] = {
    architect: {
      status: bp.feasibilityRisk === "overload" ? "warning" : "passed",
      notes:  bp.feasibilityRisk === "overload"
        ? "Feasibility overload — question count may have been reduced."
        : bp.adjustedQuestionCount != null
        ? `Question count adjusted to ${bp.adjustedQuestionCount}.`
        : "Blueprint feasible with requested parameters.",
    },
    input_judge: {
      status: bp.topicRejected ? "error" : bp.gradeTextWarning ? "warning" : "passed",
      notes:  bp.topicRejected
        ? "Topic was rejected as unsafe or out of scope."
        : bp.gradeTextWarning
        ? String(bp.gradeTextWarning)
        : "No conflicts detected.",
    },
    writer: {
      status:          (rewriteCount >= 6 || hasTopicDrift) ? "error"
                      : (rewriteCount >= 3 || hasBloomDrift) ? "warning"
                      : "passed",
      drift:           hasTopicDrift || hasBloomDrift,
      rewrite_count:   rewriteCount,
      items_generated: bp.itemsGenerated ?? (fa.items?.length ?? null),
      notes: hasTopicDrift     ? "Writer drifted off the specified topic."
           : hasBloomDrift     ? "Bloom taxonomy alignment drift detected."
           : rewriteCount >= 6 ? `${rewriteCount} rewrites — significant correction effort.`
           : rewriteCount >= 3 ? `${rewriteCount} rewrites applied before passing Gatekeeper.`
           : rewriteCount > 0  ? `${rewriteCount} light rewrite(s) applied.`
           : "Questions generated cleanly with no corrections.",
    },
    gatekeeper: {
      status:          violations.length >= 5 ? "error" : violations.length > 0 ? "warning" : "passed",
      violation_count: violations.length,
      violation_types: [...new Set(violations.map(v => v.type))],
      notes:           violations.length > 0
        ? `${violations.length} violation(s) caught; prescriptions added for next run.`
        : "All structural and alignment checks passed.",
    },
    scribe: {
      status:        qualityScore != null && qualityScore < 4 ? "warning" : "passed",
      quality_score: qualityScore,
      notes:         qualityScore == null ? "Quality score not available."
                   : qualityScore >= 8   ? "Strong quality — minimal corrections."
                   : qualityScore >= 6   ? "Good quality — minor edits applied automatically."
                   : qualityScore >= 4   ? "Fair quality — some corrections were required."
                   : "Low quality score — significant corrections applied.",
    },
  };

  // ── 5. Rewrite History ───────────────────────────────────────────────────
  const rewrite_history: IncidentReport["rewrite_history"] = violations
    .slice(0, 12)
    .map((v, i) => ({
      rewrite_number: i + 1,
      trigger:        v.type,
      item_id:        v.itemId ?? null,
      agent_reason:   v.message ?? null,
    }));

  // ── 6. System Analysis ───────────────────────────────────────────────────
  const system_analysis = classifyTrace(blueprintJson, tokenUsage, qualityScore);

  // ── 7. Final Output ──────────────────────────────────────────────────────
  const items = (fa.items ?? []) as any[];
  const questions: IncidentReportQuestion[] = items.slice(0, 20).map((item, idx) => {
    const itemViolations = violations.filter(
      v => v.itemId === item.id || v.itemId === `q${idx + 1}` || v.itemId === String(idx + 1)
    );
    return {
      index:       idx + 1,
      id:          String(item.id ?? `Q${idx + 1}`),
      type:        (item.questionType ?? null) as string | null,
      stem:        (getPrompt(item) ?? item.stem ?? item.text ?? null) as string | null,
      bloom_level: (item.bloomLevel ?? item.cognitiveDemand ?? null) as string | null,
      difficulty:  (item.difficulty ?? null) as string | null,
      answer:      (getAnswer(item) ?? null) as string | null,
      issues:      itemViolations.map(v => v.type),
    };
  });

  const questionTypes = [...new Set(items.map((i: any) => i.questionType).filter(Boolean))] as string[];

  return {
    submitted_at:          new Date().toISOString(),
    teacher_id:            userId,
    assessment_version_id: assessmentVersionId,
    teacher_note:          teacherNote ?? null,

    teacher_intent,
    defaults_used,
    prescriptions_added,
    pipeline_status,
    rewrite_history,
    system_analysis,

    final_output: {
      total_items:    fa.totalItems ?? items.length ?? null,
      question_types: questionTypes,
      questions,
    },
  };
}
