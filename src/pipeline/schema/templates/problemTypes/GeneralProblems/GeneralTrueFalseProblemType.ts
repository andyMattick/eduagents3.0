import type {
  GenerationContext,
  ProblemPlugin,
  ProblemSlot,
} from "../../../../agents/pluginEngine/interfaces/problemPlugin";

export const GeneralTrueFalseProblemType: ProblemPlugin = {
  id: "general_true_false",
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
    label: "True/False (General)",
    itemType: "trueFalse",
    defaultIntent: "remember",
    defaultDifficulty: "easy",
    supports: {
      trueFalse: true,
    },
  },

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "easy";

    // Internal rationale would track why this is true/false (not emitted).
    const isTrue = true;
    const prompt = `True or False: ${topic} is accurately described by the following statement.`;

    const statement = `“${topic} is a key idea that students should be able to recognize and describe correctly.”`;

    const answer = isTrue ? "True" : "False";

    return {
      slot_id: slot.slot_id,
      questionType: "trueFalse",
      prompt: `${prompt}\n\n${statement}`,
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
