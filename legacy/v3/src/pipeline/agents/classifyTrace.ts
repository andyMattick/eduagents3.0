/**
 * classifyTrace — deterministic pipeline failure classifier.
 *
 * Uses signals already stored in blueprint_json + token_usage + quality_score
 * from assessment_versions. No LLM call required. Produces a structured
 * TraceClassification that drives the teacher-facing banner and the
 * pipeline_reports Supabase insert.
 *
 * Agent attribution heuristics:
 *   - Architect   → feasibility overload, slot-count auto-reduction, planning notes
 *   - Writer       → high rewrite count, truncation events, low per-item quality
 *   - Gatekeeper  → constraint warnings, grade/content flags
 *   - InputJudge  → topic rejection signals, gradeTextWarning
 *   - Orchestrator → missing blueprint, unrouted errors
 */

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type TraceSeverity = "none" | "warning" | "error";
export type TraceCategory =
  | "writer"
  | "architect"
  | "inputJudge"
  | "gatekeeper"
  | "orchestrator"
  | "unknown";

export interface TraceClassification {
  severity:       TraceSeverity;
  category:       TraceCategory;
  /** Short human-readable label for the faulting agent, shown in the banner. */
  faultingAgent:  string | null;
  /** One sentence shown to the teacher. */
  summary:        string;
  /** Internal diagnosis — stored in pipeline_reports, not shown to teacher. */
  probableCause:  string;
  /** Actionable hint for the teacher. */
  suggestedFix:   string;
  /** Raw signals that triggered this classification (for DB debugging). */
  signals:        string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal thresholds
// ─────────────────────────────────────────────────────────────────────────────

const REWRITE_WARNING_THRESHOLD = 3;
const REWRITE_ERROR_THRESHOLD   = 6;
const QUALITY_WARNING_THRESHOLD = 5;
const QUALITY_ERROR_THRESHOLD   = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Classifier
// ─────────────────────────────────────────────────────────────────────────────

export function classifyTrace(
  blueprintJson: Record<string, any> | null,
  tokenUsage:    Record<string, any> | null,
  qualityScore:  number | null,
): TraceClassification {
  const bp   = blueprintJson ?? {};
  const tu   = tokenUsage    ?? {};
  const plan = bp.plan       ?? {};

  const signals: string[] = [];

  // Pull raw signal values
  const rewriteCount:         number   = bp.rewriteCount        ?? tu.rewriteCount        ?? 0;
  const constraintWarnings:   string[] = bp.constraintWarnings  ?? [];
  const truncationEvents:     string[] = bp.truncationEvents    ?? [];
  const feasibilityRisk:      string   = bp.feasibilityRisk     ?? bp.riskLevel           ?? "safe";
  const adjustedCount:        number | null = bp.adjustedQuestionCount ?? null;
  const gradeTextWarning:     string | null = bp.gradeTextWarning ?? null;
  const topicRejected:        boolean  = !!bp.topicRejected;
  const missingBlueprint:     boolean  = Object.keys(bp).length === 0;
  const itemsGenerated:       number   = bp.itemsGenerated ?? bp.slotsGenerated ?? 0;
  const slotsRequested:       number   = plan.targetSlots ?? plan.slotCount ?? 0;
  const shortfall:            number   = slotsRequested > 0 ? slotsRequested - itemsGenerated : 0;

  // ── Collect signals ──────────────────────────────────────────────────────

  if (missingBlueprint)
    signals.push("blueprint_missing");
  if (topicRejected)
    signals.push("topic_rejected");
  if (gradeTextWarning)
    signals.push(`grade_text_warning: ${gradeTextWarning}`);
  if (constraintWarnings.length > 0)
    signals.push(`constraint_warnings(${constraintWarnings.length}): ${constraintWarnings.slice(0, 2).join("; ")}`);
  if (truncationEvents.length > 0)
    signals.push(`truncation_events(${truncationEvents.length}): ${truncationEvents.slice(0, 2).join("; ")}`);
  if (rewriteCount >= REWRITE_WARNING_THRESHOLD)
    signals.push(`rewrite_count: ${rewriteCount}`);
  if (feasibilityRisk === "overload")
    signals.push("feasibility: overload");
  else if (feasibilityRisk === "high")
    signals.push("feasibility: high");
  if (adjustedCount !== null)
    signals.push(`question_count_auto_reduced_to: ${adjustedCount}`);
  if (shortfall > 1)
    signals.push(`slot_shortfall: requested ${slotsRequested}, generated ${itemsGenerated}`);
  if (qualityScore !== null && qualityScore < QUALITY_ERROR_THRESHOLD)
    signals.push(`quality_score: ${qualityScore}/10`);
  else if (qualityScore !== null && qualityScore < QUALITY_WARNING_THRESHOLD)
    signals.push(`quality_score_low: ${qualityScore}/10`);

  // ── Classify ─────────────────────────────────────────────────────────────

  // Error cases — most specific first

  if (topicRejected) {
    return {
      severity:     "error",
      category:     "inputJudge",
      faultingAgent: "Input Judge",
      summary:      "This topic was flagged before generation could start.",
      probableCause: "The InputJudge rejected the topic as out-of-scope, inappropriate, or ambiguous.",
      suggestedFix: "Try rephrasing the topic or adding more detail in the Additional Details field.",
      signals,
    };
  }

  if (gradeTextWarning) {
    return {
      severity:     "error",
      category:     "inputJudge",
      faultingAgent: "Input Judge",
      summary:      "A grade-level mismatch was detected — the selected text may not be appropriate for the target audience.",
      probableCause: `gradeTextWarning: ${gradeTextWarning}`,
      suggestedFix: "Confirm the student level setting matches the complexity of the content.",
      signals,
    };
  }

  if (missingBlueprint) {
    return {
      severity:     "error",
      category:     "orchestrator",
      faultingAgent: "Orchestrator",
      summary:      "The assessment was generated but the planning data is missing — something failed early in the pipeline.",
      probableCause: "blueprint_json is empty or null; Architect may have thrown before completing.",
      suggestedFix: "Try regenerating. If this keeps happening, send a report.",
      signals,
    };
  }

  if (shortfall > 2) {
    return {
      severity:     "error",
      category:     "writer",
      faultingAgent: "Writer",
      summary:      `The Writer only produced ${itemsGenerated} of the ${slotsRequested} requested questions.`,
      probableCause: `slot_shortfall: ${shortfall} items missing. Likely topic surface too thin or Writer hit token limits.`,
      suggestedFix: "Add more subtopics or details, or reduce the number of questions.",
      signals,
    };
  }

  if (qualityScore !== null && qualityScore < QUALITY_ERROR_THRESHOLD) {
    return {
      severity:     "error",
      category:     "writer",
      faultingAgent: "Writer",
      summary:      "The quality check scored this assessment poorly — multiple questions may need your review.",
      probableCause: `quality_score ${qualityScore}/10 — below error threshold (${QUALITY_ERROR_THRESHOLD}).`,
      suggestedFix: "Review the questions for clarity and accuracy. Consider branching and adjusting the difficulty level.",
      signals,
    };
  }

  if (rewriteCount >= REWRITE_ERROR_THRESHOLD) {
    return {
      severity:     "error",
      category:     "writer",
      faultingAgent: "Writer",
      summary:      `${rewriteCount} questions needed correction — more than usual for this topic.`,
      probableCause: `High rewrite count (${rewriteCount}) indicates the Writer struggled with this topic or question format.`,
      suggestedFix: "Add more detail in the Additional Details field, or switch to a simpler question format.",
      signals,
    };
  }

  // Warning cases

  if (constraintWarnings.length > 0) {
    const firstWarn = constraintWarnings[0] ?? "";
    return {
      severity:     "warning",
      category:     "gatekeeper",
      faultingAgent: "Gatekeeper",
      summary:      "Some questions were flagged and adjusted before delivery.",
      probableCause: `Gatekeeper constraint warnings (${constraintWarnings.length}): ${firstWarn}`,
      suggestedFix: "Questions have already been corrected automatically. Review if needed.",
      signals,
    };
  }

  if (truncationEvents.length > 0) {
    return {
      severity:     "warning",
      category:     "writer",
      faultingAgent: "Writer",
      summary:      "Some questions were cut short and repaired automatically.",
      probableCause: `Truncation events (${truncationEvents.length}): ${truncationEvents[0] ?? ""}`,
      suggestedFix: "Questions were repaired. If any look incomplete, try regenerating with fewer questions.",
      signals,
    };
  }

  if (feasibilityRisk === "overload" || (feasibilityRisk === "high" && adjustedCount !== null)) {
    return {
      severity:     "warning",
      category:     "architect",
      faultingAgent: "Architect",
      summary:      `The topic was thin for the requested count — the system reduced it to ${adjustedCount ?? "fewer"} questions.`,
      probableCause: `feasibility_risk: ${feasibilityRisk}, auto-adjusted count: ${adjustedCount}`,
      suggestedFix: "Add subtopics or reduce the target question count to avoid repetition.",
      signals,
    };
  }

  if (feasibilityRisk === "high") {
    return {
      severity:     "warning",
      category:     "architect",
      faultingAgent: "Architect",
      summary:      "The topic may not have enough variety to fully support all questions uniquely.",
      probableCause: `feasibility_risk: high`,
      suggestedFix: "Consider adding more subtopics or details for better question variety.",
      signals,
    };
  }

  if (rewriteCount >= REWRITE_WARNING_THRESHOLD) {
    return {
      severity:     "warning",
      category:     "writer",
      faultingAgent: "Writer",
      summary:      `${rewriteCount} questions were revised for quality — the system caught and fixed them.`,
      probableCause: `Moderate rewrite count (${rewriteCount}).`,
      suggestedFix: "Questions look fine. If you want fewer corrections next time, add more topic detail.",
      signals,
    };
  }

  if (qualityScore !== null && qualityScore < QUALITY_WARNING_THRESHOLD) {
    return {
      severity:     "warning",
      category:     "writer",
      faultingAgent: "Writer",
      summary:      "The quality check gave this assessment a moderate score — it should still be usable.",
      probableCause: `quality_score ${qualityScore}/10 — below warning threshold (${QUALITY_WARNING_THRESHOLD}).`,
      suggestedFix: "Review the questions before distributing. A branch with adjusted settings may produce better results.",
      signals,
    };
  }

  // All clear
  return {
    severity:     "none",
    category:     "unknown",
    faultingAgent: null,
    summary:      "Your assessment was generated cleanly.",
    probableCause: "",
    suggestedFix: "",
    signals,
  };
}
