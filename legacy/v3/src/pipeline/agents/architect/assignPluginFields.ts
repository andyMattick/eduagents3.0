import { TEMPLATE_TOPIC_MAP, DIAGRAM_TOPIC_MAP } from "../architect/topicMaps";
import {
  QUESTION_TYPE_PLUGIN_MAP,
  QUESTION_TYPE_TEMPLATE_MAP
} from "./pluginMaps";


export function assignPluginFields(topic: string, questionType: string) {
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
