// @ts-nocheck
/**
 * coordinateGraphDiagram.ts — Coordinate graph diagram plugin.
 *
 * Generates graph-interpretation problems with an SVG coordinate grid.
 * Deterministic — no LLM calls.
 */

import type { ProblemPlugin, ProblemSlot, GenerationContext, GeneratedProblem } from "../../../interfaces/problemPlugin";
import { renderCoordinateGraphSVG } from "../../diagramGenerator";
import { randInt } from "../templates/mathUtils";

export const CoordinateGraphPlugin: ProblemPlugin = {
  id: "coordinate_graph",
  generationType: "diagram",
  supportedTopics: ["coordinate geometry", "graphing", "linear functions", "algebra"],

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<GeneratedProblem> {
    // Generate a linear relationship y = mx + b
    const m = randInt(1, 4);
    const b = randInt(-3, 5);
    const points: [number, number][] = Array.from({ length: 5 }, (_, i) => [i, m * i + b]);

    const diagram = renderCoordinateGraphSVG(points, {
      title: "Graph of a linear function",
      xLabel: "x",
      yLabel: "y",
    });

    return {
      prompt: `The graph shows a linear function. What is the slope and y-intercept?`,
      answer: `slope = ${m}, y-intercept = ${b}`,
      diagram,
      concepts: ["linear functions", "slope", "y-intercept", "coordinate geometry"],
      skills: ["graph interpretation", "linear analysis"],
      standards: ["CCSS.Math.Content.8.F.A.3"],
      metadata: {
        generation_method: "diagram",
        plugin_id: this.id,
        diagram_type: "coordinate_graph",
        difficulty: slot.difficulty,
        equation: { m, b },
      },
    };
  },
};
