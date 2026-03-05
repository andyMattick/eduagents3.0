/**
 * problemGeneratorRouter.ts — Routes ProblemSlots to the correct plugin.
 */

import {
  assignPluginFields,
} from "../../architect/pluginMaps";

import type {
  ProblemSlot,
  GeneratedProblem,
  GenerationContext,
} from "../interfaces/problemPlugin";

import { getPlugin } from "./pluginRegistry";

export async function problemGeneratorRouter(
  slot: ProblemSlot,
  context: GenerationContext
): Promise<GeneratedProblem & { _pluginId: string }> {

  // 1. Run the selector
  const assignment = assignPluginFields(slot.topic, slot.questionType);

  // 2. Resolve plugin
  const plugin =
    (assignment.problem_source === "template" && assignment.template_id
      ? getPlugin(assignment.template_id)
      : null) ||
    (assignment.problem_source === "diagram" && assignment.diagram_type
      ? getPlugin(assignment.diagram_type)
      : null) ||
    getPlugin("llm_default");

    if (!plugin) {
  throw new Error(
    `[Router] No plugin found for assignment: ${JSON.stringify(assignment)}`
  );
}


  console.info(
    `[Router] Slot ${slot.slot_id} → plugin "${plugin.id}" (${plugin.generationType})`
  );

  // 3. Generate
  const problem = await plugin.generate(slot, context);

  // 4. Optional validation
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

export async function generateAllProblems(
  slots: ProblemSlot[],
  context: GenerationContext
): Promise<(GeneratedProblem & { _pluginId: string; slot_id: string })[]> {
  const results: (GeneratedProblem & { _pluginId: string; slot_id: string })[] = [];

  for (const slot of slots) {
    const problem = await problemGeneratorRouter(slot, context);
    results.push({ ...problem, slot_id: slot.slot_id });
  }

  return results;
}
