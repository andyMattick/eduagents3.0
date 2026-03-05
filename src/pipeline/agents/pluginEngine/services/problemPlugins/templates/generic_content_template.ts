import {
  ProblemPlugin,
  ProblemSlot,
  GenerationContext,
  GeneratedProblem
} from "../../../interfaces/problemPlugin";

export const generic_content_template: ProblemPlugin = {
  id: "generic_content_template",
  generationType: "template",
  supportedTopics: [],

  async generate(
    slot: ProblemSlot,
    context: GenerationContext
  ): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "medium";
    const format = slot.question_format ?? "shortAnswer";

    // Touch context to satisfy TS
    const _course = context.course;

    const definition = {
      slot_id: slot.slot_id,
      prompt: `Define ${topic} in your own words.`,
      answer: `A clear explanation of what ${topic} is.`,
    };

    const causeEffect = {
      slot_id: slot.slot_id,
      prompt: `Explain one major cause or effect related to ${topic}.`,
      answer: `A historically accurate cause or effect associated with ${topic}.`,
    };

    const compareContrast = {
      slot_id: slot.slot_id,
      prompt: `Compare and contrast ${topic} with another related idea, event, or figure.`,
      answer: `A comparison highlighting at least one similarity and one difference.`,
    };

    const timeline = {
      slot_id: slot.slot_id,
      prompt: `Describe one important event in the timeline of ${topic}.`,
      answer: `A correct event and its significance in the timeline of ${topic}.`,
    };

    const options = [definition, causeEffect, compareContrast, timeline];
    const selected = options[slot.slot_id.charCodeAt(slot.slot_id.length - 1) % 4];

    if (format === "multipleChoice") {
      return {
        slot_id: slot.slot_id,
        prompt: selected.prompt,
        answer: selected.answer,
        metadata: {
          difficulty,
          cognitive_demand: slot.cognitive_demand,
          choices: [
            selected.answer,
            `An unrelated fact about ${topic}.`,
            `A partially correct but incomplete idea about ${topic}.`,
            `A common misconception about ${topic}.`,
          ]
        }
      };
    }

    return {
      slot_id: slot.slot_id,
      prompt: selected.prompt,
      answer: selected.answer,
      metadata: {
        difficulty,
        cognitive_demand: slot.cognitive_demand
      }
    };
  },
};
