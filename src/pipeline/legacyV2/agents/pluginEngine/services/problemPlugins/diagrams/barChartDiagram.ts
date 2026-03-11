/**
 * barChartDiagram.ts — Bar chart diagram plugin.
 *
 * Generates data interpretation problems with an SVG bar chart.
 * Deterministic — no LLM calls.
 */

import type { ProblemPlugin, ProblemSlot, GenerationContext, GeneratedProblem } from "../../../interfaces/problemPlugin";
import { renderBarChartSVG } from "../../diagramGenerator";
import { randInt, shuffle } from "../templates/mathUtils";

const CATEGORY_SETS = [
  ["Red", "Blue", "Green", "Yellow", "Purple"],
  ["Mon", "Tue", "Wed", "Thu", "Fri"],
  ["Pizza", "Tacos", "Burgers", "Pasta", "Salad"],
  ["Spring", "Summer", "Fall", "Winter"],
];

export const BarChartPlugin: ProblemPlugin = {
  id: "bar_chart",
  generationType: "diagram",
  supportedTopics: ["data analysis", "statistics", "graphing", "bar charts"],

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<GeneratedProblem> {
    const categories = shuffle(CATEGORY_SETS[randInt(0, CATEGORY_SETS.length - 1)]);
    const count = randInt(3, Math.min(5, categories.length));
    const data = categories.slice(0, count).map(label => ({
      label,
      value: randInt(5, 50),
    }));

    const diagram = renderBarChartSVG(data, { title: "Survey Results" });

    const maxItem = data.reduce((a, b) => (a.value > b.value ? a : b));
    const total = data.reduce((s, d) => s + d.value, 0);

    return {
      prompt: `The bar chart shows survey results. Which category has the highest value? What is the total of all values?`,
      answer: `${maxItem.label} has the highest value (${maxItem.value}). Total = ${total}.`,
      diagram,
      concepts: ["data analysis", "bar charts", "comparison"],
      skills: ["graph reading", "addition", "comparison"],
      standards: ["CCSS.Math.Content.3.MD.B.3"],
      metadata: {
        generation_method: "diagram",
        plugin_id: this.id,
        diagram_type: "bar_chart",
        difficulty: slot.difficulty,
      },
    };
  },
};
