import type {
  GenerationContext,
  ProblemPlugin,
  ProblemSlot,
} from "../../../../agents/pluginEngine/interfaces/problemPlugin";

export const GeneralEssayProblemType: ProblemPlugin = {
  id: "general_essay",
  generationType: "template",
  supportedTopics: [
    "general",
    "history",
    "socialstudies",
    "civics",
    "government",
    "ela",
    "science",
    "math",
  ],
  template: {
    label: "Essay (General)",
    itemType: "essay",
    defaultIntent: "analyze",
    defaultDifficulty: "medium",
    supports: {
      extendedResponse: true,
      essay: true,
    },
  },

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "medium";

    const prompt = `Write a well-organized response explaining ${topic}. Include specific details or examples to support your explanation.`;

    const answer = `A coherent, well-structured response that clearly explains ${topic}, uses relevant details or examples, and maintains focus throughout.`;

    // Internal rubric scaffolding would live here (not emitted).
    return {
      slot_id: slot.slot_id,
      questionType: "extendedResponse",
      prompt,
      answer,
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "analyze",
        sharedContext: slot.sharedContext ?? "extendedResponse",
      },
    };
  },
};
