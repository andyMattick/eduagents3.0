/**
 * writerBridge.ts — Writer Contract Extensions for the Plugin Engine.
 *
 * Master Spec §11:
 *   Writer MUST: wrap plugin output, add rationale/explanation/cognitive trace,
 *                apply teacher defaults, handle diagrams/images, provide LLM fallback.
 *   Writer MUST NOT: change math, diagrams, data points, template logic.
 *   Writer MAY: adjust grammar, clarity, formatting.
 *
 * This module converts GeneratedProblem (plugin output) into GeneratedItem
 * (Writer output) while preserving invariants.
 */

import type { GeneratedProblem, ProblemSlot } from "../interfaces/problemPlugin";
import type { GeneratedItem } from "@/pipeline/agents/writer/types";

/**
 * Options for wrapping plugin output.
 */
export interface WriterWrapOptions {
  /** Grade level for language calibration */
  grade?: string;
  /** Teacher defaults from profile */
  teacherDefaults?: {
    tone?: string;
    languageLevel?: string;
    instructionLength?: string;
  };
  /** Whether to add rationale text */
  addRationale?: boolean;
}

/**
 * wrapPluginOutput — convert a GeneratedProblem into a GeneratedItem.
 *
 * Preserves:
 *   - Math expressions (never modified)
 *   - Diagram SVG (passed through as metadata)
 *   - Data points (never modified)
 *   - Template logic results
 *
 * Adds:
 *   - slotId mapping
 *   - questionType mapping
 *   - metadata enrichment
 */
export function wrapPluginOutput(
  problem: GeneratedProblem & { _pluginId?: string; slot_id: string },
  slot: ProblemSlot,
  _options: WriterWrapOptions = {}
): GeneratedItem {
  // Map problem_type to existing questionType enum
  const questionType = mapQuestionType(slot.problem_type, slot.question_format);

  // Base item
  const item: GeneratedItem = {
    slotId: slot.slot_id,
    questionType,
    prompt: problem.prompt,
    answer: typeof problem.answer === "string" ? problem.answer : JSON.stringify(problem.answer),
    metadata: {
      ...(problem.metadata ?? {}),
      // Plugin engine metadata (SCRIBE needs these)
      pluginId: problem._pluginId ?? problem.metadata?.plugin_id ?? "unknown",
      generationMethod: problem.metadata?.generation_method ?? "unknown",
      // Concept Graph tags
      concepts: problem.concepts ?? [],
      skills: problem.skills ?? [],
      standards: problem.standards ?? [],
      // Diagram reference (Builder will embed SVG)
      diagram: problem.diagram ?? null,
      // Image reference
      imageReferenceId: problem.image_reference_id ?? null,
    },
  };

  // MCQ handling: preserve immutability when attaching options.
  if (questionType === "multipleChoice" && problem.metadata?.options) {
    return {
      ...item,
      options: Array.isArray(problem.metadata.options) ? problem.metadata.options : null,
    };
  }

  return item;
}

/**
 * wrapAllPluginOutputs — batch wrapper for multiple problems.
 */
export function wrapAllPluginOutputs(
  problems: (GeneratedProblem & { _pluginId?: string; slot_id: string })[],
  slots: ProblemSlot[],
  options: WriterWrapOptions = {}
): GeneratedItem[] {
  const slotMap = new Map(slots.map((s) => [s.slot_id, s]));
  return problems.map((p) => {
    const slot = slotMap.get(p.slot_id);
    if (!slot) {
      throw new Error(`[WriterBridge] No slot found for problem slot_id="${p.slot_id}"`);
    }
    return wrapPluginOutput(p, slot, options);
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapQuestionType(
  problemType: string,
  questionFormat?: string
): string {
  const type = (questionFormat ?? problemType ?? "").toLowerCase();

  const mapping: Record<string, string> = {
    mcq: "multipleChoice",
    multiple_choice: "multipleChoice",
    multiplechoice: "multipleChoice",
    short_answer: "shortAnswer",
    shortanswer: "shortAnswer",
    constructed_response: "constructedResponse",
    constructedresponse: "constructedResponse",
    true_false: "trueFalse",
    truefalse: "trueFalse",
    arithmetic_fluency: "arithmeticFluency",
    arithmeticfluency: "arithmeticFluency",
    fill_in_blank: "fillInTheBlank",
    fillintheblank: "fillInTheBlank",
    matching: "matching",
    passage_based: "passageBased",
    passagebased: "passageBased",
    graph_interpretation: "graphInterpretation",
    graphinterpretation: "graphInterpretation",
  };

  return mapping[type] ?? type ?? "shortAnswer";
}
