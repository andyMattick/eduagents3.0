/**
 * scatterPlotDiagram.ts — Scatter plot diagram plugin.
 */

import type { ProblemPlugin, ProblemSlot, GenerationContext, GeneratedProblem } from "../../interfaces/problemPlugin";
import { renderScatterPlotSVG } from "../../services/diagramGenerator";
import { randInt } from "../templates/mathUtils";

export const ScatterPlotPlugin: ProblemPlugin = {
  id: "scatter_plot",
  generationType: "DIAGRAM",
  supportedTopics: ["statistics", "scatter plots", "data analysis", "correlation"],

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<GeneratedProblem> {
    // Generate positively correlated data with some noise
    const n = randInt(8, 12);
    const m = randInt(1, 3);
    const b = randInt(0, 5);
    const points: [number, number][] = Array.from({ length: n }, () => {
      const x = randInt(1, 15);
      const noise = randInt(-3, 3);
      return [x, m * x + b + noise] as [number, number];
    });

    const diagram = renderScatterPlotSVG(points, {
      title: "Study Hours vs Score",
      xLabel: "Hours",
      yLabel: "Score",
    });

    return {
      prompt: `The scatter plot shows the relationship between study hours and test scores. Describe the correlation and estimate the score for a student who studies 10 hours.`,
      answer: `Positive correlation. Estimated score for 10 hours ≈ ${m * 10 + b}.`,
      diagram,
      concepts: ["scatter plots", "correlation", "prediction", "data analysis"],
      skills: ["graph interpretation", "trend analysis", "estimation"],
      standards: ["CCSS.Math.Content.8.SP.A.1"],
      metadata: {
        generation_method: "diagram",
        plugin_id: this.id,
        diagram_type: "scatter_plot",
        difficulty: slot.difficulty,
        dataPoints: points,
      },
    };
  },
};
