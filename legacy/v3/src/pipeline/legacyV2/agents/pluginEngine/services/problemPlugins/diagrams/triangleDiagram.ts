// @ts-nocheck
/**
 * triangleDiagram.ts — Triangle diagram plugin (Master Spec §9.2).
 *
 * Generates a geometry problem with an SVG triangle diagram.
 * Deterministic — no LLM calls.
 */

import type { ProblemPlugin, ProblemSlot, GenerationContext, GeneratedProblem } from "../../../interfaces/problemPlugin";
import { generateTriangle, renderTriangleSVG } from "../../diagramGenerator";

export const TriangleDiagramPlugin: ProblemPlugin = {
  id: "triangle",
  generationType: "diagram",
  supportedTopics: ["geometry", "triangles", "pythagorean theorem", "right triangles"],

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<GeneratedProblem> {
    const triangle = generateTriangle();
    const diagram = renderTriangleSVG(triangle);

    return {
      prompt: `In triangle ABC, side AB = ${triangle.b} and side BC = ${triangle.a}. Find the length of side AC.`,
      answer: `${triangle.c}`,
      diagram,
      concepts: ["pythagorean theorem", "right triangles", "geometry"],
      skills: ["geometric reasoning", "computation"],
      standards: ["CCSS.Math.Content.8.G.B.7"],
      metadata: {
        generation_method: "diagram",
        plugin_id: this.id,
        diagram_type: "triangle",
        difficulty: slot.difficulty,
      },
    };
  },

  validate(problem) {
    const errors: string[] = [];
    if (!problem.diagram) errors.push("Missing diagram");
    if (!problem.prompt) errors.push("Missing prompt");
    return { valid: errors.length === 0, errors, warnings: [] };
  },
};
