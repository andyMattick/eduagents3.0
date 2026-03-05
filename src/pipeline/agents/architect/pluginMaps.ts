import { TEMPLATE_TOPIC_MAP, DIAGRAM_TOPIC_MAP } from "./topicMaps";
import type { ProblemSlot } from "../pluginEngine/interfaces/problemPlugin";
export interface PluginAssignment {
  problem_source: ProblemSource;
  template_id: string | null;
  diagram_type: string | null;
  image_reference_id: string | null;
}


export type ProblemSource = ProblemSlot["problem_source"];

export const QUESTION_TYPE_PLUGIN_MAP: Record<string, ProblemSource> = {
  arithmeticFluency: "template",
  fractions: "template",
  LinearEquation: "template",
  passageBasedReading: "template",
  fillInTheBlank: "template",
  graphInterpretation: "diagram",
  trueFalse: "template",
  shortAnswer: "template",



  // Add more here later if needed
};

export const QUESTION_TYPE_TEMPLATE_MAP: Record<string, string> = {
  arithmeticFluency: "arithmetic_fluency_template",
  fractions: "fractions_template",
  LinearEquation: "linear_equation_template",
  passageBasedReading: "passage_based_reading_template",
  fillInTheBlank: "fractions_template", // reusing fractions template for fill-in-the-blank
  graphInterpretation: "graph_interpretation_template",
  trueFalse: "generic_content_template",
  shortAnswer: "generic_content_template",
};

export function assignPluginFields(topic: string, questionType: string): PluginAssignment {
  // 1. QuestionType-based routing (waterfall)
if (QUESTION_TYPE_PLUGIN_MAP[questionType]) {
  return {
    problem_source: QUESTION_TYPE_PLUGIN_MAP[questionType],
    template_id: QUESTION_TYPE_TEMPLATE_MAP[questionType] ?? null,
    diagram_type: null,
    image_reference_id: null,
  };
}


  const lower = topic.toLowerCase();

  for (const key of Object.keys(TEMPLATE_TOPIC_MAP)) {
    if (lower.includes(key)) {
      return {
        problem_source: "template",
        template_id: TEMPLATE_TOPIC_MAP[key],
        diagram_type: null,
        image_reference_id: null,
      };
    }
  }

  for (const key of Object.keys(DIAGRAM_TOPIC_MAP)) {
    if (lower.includes(key)) {
      return {
        problem_source: "diagram",
        template_id: null,
        diagram_type: DIAGRAM_TOPIC_MAP[key],
        image_reference_id: null,
      };
    }
  }

  return {
    problem_source: "llm",
    template_id: null,
    diagram_type: null,
    image_reference_id: null,
  };
}
