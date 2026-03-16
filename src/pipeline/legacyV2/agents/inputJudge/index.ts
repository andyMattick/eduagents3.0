// @ts-nocheck
/**
 * inputJudge/index.ts — Feasibility judge for the plugin engine.
 *
 * Runs after the Architect (slot plan) and before the Generator Router.
 * Validates that each slot is feasible: the required plugin exists, the
 * slot fields are internally consistent, and the overall assessment is
 * achievable within constraints.
 *
 * Master Spec §1: Architect → InputJudge → GeneratorRouter → …
 */

import type { ProblemSlot } from "../pluginEngine/interfaces/problemPlugin";
import { getPlugin, listPlugins } from "../pluginEngine/services/pluginRegistry";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface InputJudgeResult {
  feasible: boolean;
  /** Per-slot feasibility verdicts */
  slotResults: SlotFeasibility[];
  /** Overall warnings (non-blocking) */
  warnings: string[];
  /** Overall errors (blocking) */
  errors: string[];
}

export interface SlotFeasibility {
  slot_id: string;
  feasible: boolean;
  pluginResolved: string | null;
  issues: string[];
}

// ─── Judge Logic ───────────────────────────────────────────────────────────

/**
 * runInputJudge — validate an array of ProblemSlots for feasibility.
 *
 * Rules:
 *   - problem_source = "template"       → template_id must be set and plugin must exist
 *   - problem_source = "diagram"        → diagram_type must be set and plugin must exist
 *   - problem_source = "image_analysis" → image_reference_id must be set and plugin must exist
 *   - problem_source = "llm"            → "llm_default" plugin must be registered
 *   - Every slot must have a topic and difficulty
 */
export function runInputJudge(slots: ProblemSlot[]): InputJudgeResult {
  const slotResults: SlotFeasibility[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (slots.length === 0) {
    errors.push("No slots provided to InputJudge.");
    return { feasible: false, slotResults, warnings, errors };
  }

  const registeredPlugins = listPlugins();

  for (const slot of slots) {
    const issues: string[] = [];
    let pluginResolved: string | null = null;

    // Basic field validation
    if (!slot.slot_id) issues.push("Missing slot_id");
    if (!slot.topic) issues.push("Missing topic");
    if (!slot.difficulty) issues.push("Missing difficulty");
    if (!slot.problem_source) issues.push("Missing problem_source");

    // Source-specific validation
    switch (slot.problem_source) {
      case "template":
        if (!slot.template_id) {
          issues.push("problem_source is 'template' but template_id is missing");
        } else {
          const p = getPlugin(slot.template_id);
          if (p) {
            pluginResolved = p.id;
          } else {
            issues.push(`No plugin found for template_id="${slot.template_id}". Available: [${registeredPlugins.join(", ")}]`);
          }
        }
        break;

      case "diagram":
        if (!slot.diagram_type) {
          issues.push("problem_source is 'diagram' but diagram_type is missing");
        } else {
          const p = getPlugin(slot.diagram_type);
          if (p) {
            pluginResolved = p.id;
          } else {
            issues.push(`No plugin found for diagram_type="${slot.diagram_type}". Available: [${registeredPlugins.join(", ")}]`);
          }
        }
        break;

      case "image_analysis":
        if (!slot.image_reference_id) {
          issues.push("problem_source is 'image_analysis' but image_reference_id is missing");
        } else {
          const p = getPlugin(slot.image_reference_id);
          if (p) {
            pluginResolved = p.id;
          } else {
            // Image plugins may not be registered yet — warn but don't block
            warnings.push(`Slot ${slot.slot_id}: No image plugin for "${slot.image_reference_id}" — will fall back to LLM.`);
            const llm = getPlugin("llm_default");
            pluginResolved = llm ? "llm_default" : null;
          }
        }
        break;

      case "llm": {
        const p = getPlugin("llm_default");
        if (p) {
          pluginResolved = "llm_default";
        } else {
          issues.push('No "llm_default" plugin registered');
        }
        break;
      }

      default:
        issues.push(`Unknown problem_source: "${slot.problem_source}"`);
    }

    slotResults.push({
      slot_id: slot.slot_id,
      feasible: issues.length === 0,
      pluginResolved,
      issues,
    });
  }

  const infeasibleSlots = slotResults.filter((s) => !s.feasible);
  if (infeasibleSlots.length > 0) {
    errors.push(
      `${infeasibleSlots.length}/${slots.length} slots are infeasible: ` +
      infeasibleSlots.map((s) => `${s.slot_id} (${s.issues.join("; ")})`).join(" | ")
    );
  }

  return {
    feasible: infeasibleSlots.length === 0,
    slotResults,
    warnings,
    errors,
  };
}
