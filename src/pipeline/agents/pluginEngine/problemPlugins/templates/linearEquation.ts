/**
 * linearEquation.ts — Deterministic linear equation template plugin.
 *
 * Generates problems of the form: Solve ax + b = c
 * No LLM calls. Pure math.
 */

import type { ProblemPlugin, ProblemSlot, GenerationContext, GeneratedProblem } from "../../interfaces/problemPlugin";
import { randInt } from "./mathUtils";

export const LinearEquationPlugin: ProblemPlugin = {
  id: "linear_equation_template",
  generationType: "TEMPLATE",
  supportedTopics: ["linear equations", "algebra", "linear functions", "equations"],

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<GeneratedProblem> {
    const difficulty = slot.difficulty ?? "medium";

    let a: number, x: number, b: number, c: number;

    switch (difficulty) {
      case "easy":
        a = randInt(1, 5);
        x = randInt(1, 10);
        b = randInt(1, 10);
        break;
      case "hard":
        a = randInt(3, 15);
        x = randInt(-10, 10);
        b = randInt(-20, 20);
        break;
      default: // medium
        a = randInt(2, 8);
        x = randInt(1, 10);
        b = randInt(1, 10);
    }

    c = a * x + b;

    const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
    const prompt = `Solve for x: ${a}x ${signB} = ${c}`;

    return {
      prompt,
      answer: `x = ${x}`,
      concepts: ["linear equations", "solving equations", "algebra"],
      skills: ["equation solving", "arithmetic"],
      standards: ["CCSS.Math.Content.8.EE.C.7"],
      metadata: {
        generation_method: "template",
        plugin_id: this.id,
        template_id: "linear_equation",
        difficulty,
        coefficients: { a, b, c, x },
      },
    };
  },

  validate(problem, _slot) {
    const errors: string[] = [];
    if (!problem.prompt) errors.push("Missing prompt");
    if (problem.answer === undefined) errors.push("Missing answer");
    return { valid: errors.length === 0, errors, warnings: [] };
  },
};
