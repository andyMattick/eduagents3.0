/**
 * problemGeneratorRouter.ts — Routes ProblemSlots to the correct plugin.
 *
 * Routing priority (per Master Spec §3):
 *   1. slot.template_id     → template plugin
 *   2. slot.diagram_type    → diagram plugin
 *   3. slot.image_reference_id → image plugin
 *   4. fallback             → "llm_default" plugin
 *
 * If no plugin is found at all, throws with a descriptive error.
 */

import type {
  ProblemSlot,
  GeneratedProblem,
  GenerationContext,
} from "../interfaces/problemPlugin";
import { getPlugin } from "./pluginRegistry";

/**
 * generateProblem — resolve the correct plugin for `slot` and generate a problem.
 *
 * @param slot    — Architect-emitted slot (never contains content)
 * @param context — shared generation context (grade, course, topic, DIL summary)
 * @returns GeneratedProblem from the matched plugin
 */
export async function generateProblem(
  slot: ProblemSlot,
  context: GenerationContext
): Promise<GeneratedProblem & { _pluginId: string }> {
  const plugin =
    getPlugin(slot.template_id) ||
    getPlugin(slot.diagram_type) ||
    getPlugin(slot.image_reference_id) ||
    getPlugin("llm_default");

  if (!plugin) {
    throw new Error(
      `[ProblemGeneratorRouter] No plugin found for slot ${slot.slot_id}. ` +
      `template_id=${slot.template_id ?? "none"}, ` +
      `diagram_type=${slot.diagram_type ?? "none"}, ` +
      `image_reference_id=${slot.image_reference_id ?? "none"}. ` +
      `Ensure "llm_default" plugin is registered.`
    );
  }

  console.info(
    `[Router] Slot ${slot.slot_id} → plugin "${plugin.id}" (${plugin.generationType})`
  );

  const problem = await plugin.generate(slot, context);

  // Run plugin-level validation if available
  if (plugin.validate) {
    const validation = plugin.validate(problem, slot);
    if (!validation.valid) {
      console.warn(
        `[Router] Plugin "${plugin.id}" self-validation failed for slot ${slot.slot_id}:`,
        validation.errors
      );
    }
  }

  return { ...problem, _pluginId: plugin.id };
}

/**
 * generateAllProblems — batch-generate problems for an array of slots.
 * Runs sequentially to respect potential rate limits on LLM plugins.
 */
export async function generateAllProblems(
  slots: ProblemSlot[],
  context: GenerationContext
): Promise<(GeneratedProblem & { _pluginId: string; slot_id: string })[]> {
  const results: (GeneratedProblem & { _pluginId: string; slot_id: string })[] = [];

  for (const slot of slots) {
    const problem = await generateProblem(slot, context);
    results.push({ ...problem, slot_id: slot.slot_id });
  }

  return results;
}
