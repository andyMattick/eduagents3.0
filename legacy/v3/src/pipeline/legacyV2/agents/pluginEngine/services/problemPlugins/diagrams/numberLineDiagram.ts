// @ts-nocheck
/**
 * numberLineDiagram.ts — Number line diagram plugin.
 *
 * Generates number line problems with SVG visualization.
 * Deterministic — no LLM calls.
 */

import type { ProblemPlugin, ProblemSlot, GenerationContext, GeneratedProblem } from "../../../interfaces/problemPlugin";
import { renderNumberLineSVG } from "../../diagramGenerator";
import { randInt } from "../templates/mathUtils";

export const NumberLinePlugin: ProblemPlugin = {
  id: "number_line",
  generationType: "diagram",
  supportedTopics: ["number line", "integers", "ordering", "fractions", "decimals"],

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<GeneratedProblem> {
    const target = randInt(-5, 15);
    const marks = Array.from(new Set([0, 5, 10, target - 2, target + 2]))
      .filter(n => n >= -10 && n <= 20)
      .sort((a, b) => a - b);

    const diagram = renderNumberLineSVG(marks, {
      min: Math.min(...marks) - 2,
      max: Math.max(...marks) + 2,
      highlight: target,
    });

    return {
      prompt: `A point is marked on the number line. What number does the red dot represent?`,
      answer: `${target}`,
      diagram,
      concepts: ["number line", "integers", "number sense"],
      skills: ["number identification", "spatial reasoning"],
      standards: ["CCSS.Math.Content.2.MD.B.6"],
      metadata: {
        generation_method: "diagram",
        plugin_id: this.id,
        diagram_type: "number_line",
        difficulty: slot.difficulty,
      },
    };
  },
};
