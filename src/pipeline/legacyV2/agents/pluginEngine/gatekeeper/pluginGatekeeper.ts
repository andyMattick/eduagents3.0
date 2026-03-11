/**
 * pluginGatekeeper.ts — Gatekeeper extensions for plugin-generated problems.
 *
 * Master Spec §12: Gatekeeper must validate plugin outputs, Writer wrapping,
 * alignment with slot, difficulty/rigor, hallucination checks.
 *
 * Rewrite rules: max_rewrites = 2.
 * Rewrite triggers: topic drift, missing rationale, invalid answer,
 *                   hallucinated diagram/image content.
 */

import type { GeneratedProblem, ProblemSlot } from "../interfaces/problemPlugin";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PluginViolation {
  slot_id: string;
  type: string;
  severity: "error" | "warning";
  message: string;
}

export interface PluginGatekeeperResult {
  ok: boolean;
  violations: PluginViolation[];
  rewriteNeeded: boolean;
  rewriteCount: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_REWRITES = 2;

// ─── Validation ────────────────────────────────────────────────────────────

/**
 * validatePluginOutput — validate a single plugin-generated problem against its slot.
 */
export function validatePluginOutput(
  problem: GeneratedProblem,
  slot: ProblemSlot
): PluginViolation[] {
  const violations: PluginViolation[] = [];

  // 1. Must have a prompt
  if (!problem.prompt || problem.prompt.trim().length === 0) {
    violations.push({
      slot_id: slot.slot_id,
      type: "missing_prompt",
      severity: "error",
      message: "Problem has no prompt text.",
    });
  }

  // 2. Must have an answer
  if (problem.answer === undefined || problem.answer === null || String(problem.answer).trim().length === 0) {
    violations.push({
      slot_id: slot.slot_id,
      type: "invalid_answer",
      severity: "error",
      message: "Problem has no answer.",
    });
  }

  // 3. Topic alignment check
  if (slot.topic && problem.prompt) {
    const topicWords = slot.topic.toLowerCase().split(/\s+/);
    const promptLower = problem.prompt.toLowerCase();
    const conceptsLower = (problem.concepts ?? []).map((c) => c.toLowerCase());
    const topicInPrompt = topicWords.some((w) => promptLower.includes(w));
    const topicInConcepts = topicWords.some((w) => conceptsLower.some((c) => c.includes(w)));

    if (!topicInPrompt && !topicInConcepts) {
      violations.push({
        slot_id: slot.slot_id,
        type: "topic_drift",
        severity: "warning",
        message: `Problem does not reference slot topic "${slot.topic}".`,
      });
    }
  }

  // 4. Diagram validation (when slot expects a diagram)
  if (slot.problem_source === "diagram") {
    if (!problem.diagram) {
      violations.push({
        slot_id: slot.slot_id,
        type: "missing_diagram",
        severity: "error",
        message: "Diagram slot has no diagram in output.",
      });
    } else if (!problem.diagram.svg || problem.diagram.svg.trim().length === 0) {
      violations.push({
        slot_id: slot.slot_id,
        type: "hallucinated_diagram",
        severity: "error",
        message: "Diagram has empty SVG content.",
      });
    }
  }

  // 5. Image validation (when slot expects image analysis)
  if (slot.problem_source === "image_analysis") {
    if (!problem.image_reference_id) {
      violations.push({
        slot_id: slot.slot_id,
        type: "missing_image_reference",
        severity: "error",
        message: "Image analysis slot has no image_reference_id.",
      });
    }
  }

  // 6. Concept tags (every problem should have these)
  if (!problem.concepts || problem.concepts.length === 0) {
    violations.push({
      slot_id: slot.slot_id,
      type: "missing_concepts",
      severity: "warning",
      message: "Problem has no concept tags.",
    });
  }

  return violations;
}

/**
 * validateAllPluginOutputs — validate a batch of problems.
 * Returns an overall result with rewrite recommendation.
 */
export function validateAllPluginOutputs(
  problems: (GeneratedProblem & { slot_id: string })[],
  slots: ProblemSlot[],
  currentRewriteCount = 0
): PluginGatekeeperResult {
  const slotMap = new Map(slots.map((s) => [s.slot_id, s]));
  const allViolations: PluginViolation[] = [];

  for (const problem of problems) {
    const slot = slotMap.get(problem.slot_id);
    if (!slot) {
      allViolations.push({
        slot_id: problem.slot_id,
        type: "orphan_problem",
        severity: "error",
        message: `No matching slot for problem slot_id="${problem.slot_id}"`,
      });
      continue;
    }
    allViolations.push(...validatePluginOutput(problem, slot));
  }

  const errors = allViolations.filter((v) => v.severity === "error");
  const rewriteNeeded = errors.length > 0 && currentRewriteCount < MAX_REWRITES;

  return {
    ok: errors.length === 0,
    violations: allViolations,
    rewriteNeeded,
    rewriteCount: currentRewriteCount,
  };
}
