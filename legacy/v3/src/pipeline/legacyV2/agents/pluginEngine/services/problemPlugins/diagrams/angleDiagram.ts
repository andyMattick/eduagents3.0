// @ts-nocheck
/**
 * angleDiagram.ts — Geometry angle diagram plugin.
 */

import type { ProblemPlugin, ProblemSlot, GenerationContext, GeneratedProblem } from "../../../interfaces/problemPlugin";
import { renderAngleSVG } from "../../diagramGenerator";
import { randInt } from "../templates/mathUtils";

export const AngleDiagramPlugin: ProblemPlugin = {
  id: "geometry_angle",
  generationType: "diagram",
  supportedTopics: ["geometry", "angles", "measuring angles", "protractor"],

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<GeneratedProblem> {
    const angle = randInt(20, 160);
    const diagram = renderAngleSVG(angle, { label: "?" });

    return {
      prompt: `What is the measure of the angle shown in the diagram?`,
      answer: `${angle}°`,
      diagram,
      concepts: ["angles", "angle measurement", "geometry"],
      skills: ["angle estimation", "geometric reasoning"],
      standards: ["CCSS.Math.Content.4.MD.C.5"],
      metadata: {
        generation_method: "diagram",
        plugin_id: this.id,
        diagram_type: "geometry_angle",
        difficulty: slot.difficulty,
        angleDeg: angle,
      },
    };
  },
};
