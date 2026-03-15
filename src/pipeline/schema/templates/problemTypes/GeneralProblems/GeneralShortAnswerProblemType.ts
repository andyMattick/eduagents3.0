import type {
  GenerationContext,
  ProblemPlugin,
  ProblemSlot,
} from "../../../../agents/pluginEngine/interfaces/problemPlugin";

export const GeneralShortAnswerProblemType: ProblemPlugin = {
  id: "general_short_answer",
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
    label: "Short Answer (General)",
    itemType: "shortAnswer",
    defaultIntent: "remember",
    defaultDifficulty: "medium",
    supports: {
      shortAnswer: true,
    },
  },

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "medium";

    const prompt = `Briefly explain ${topic} in one or two sentences.`;

    const answer = `A clear, concise explanation of ${topic} that captures the essential idea without unnecessary detail.`;

    return {
      slot_id: slot.slot_id,
      questionType: "shortAnswer",
      prompt,
      answer,
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "remember",
        sharedContext: slot.sharedContext ?? "standalone",
      },
    };
  },
};
