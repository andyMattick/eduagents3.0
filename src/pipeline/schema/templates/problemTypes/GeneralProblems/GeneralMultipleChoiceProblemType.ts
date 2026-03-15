import type {
  GenerationContext,
  ProblemPlugin,
  ProblemSlot,
} from "../../../../agents/pluginEngine/interfaces/problemPlugin";

export const GeneralMultipleChoiceProblemType: ProblemPlugin = {
  id: "general_multiple_choice",
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
    label: "Multiple Choice (General)",
    itemType: "multipleChoice",
    defaultIntent: "understand",
    defaultDifficulty: "medium",
    supports: {
      mcq: true,
      multipleChoice: true,
    },
  },

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "medium";

    // Internal rationale/distractor scaffolding would live here (not emitted).
    const prompt = `Which of the following best describes ${topic}?`;

    const options = [
      `A. A partially correct but incomplete description of ${topic}.`,
      `B. The most accurate and complete description of ${topic}.`,
      `C. A common misconception about ${topic}.`,
      `D. An unrelated or off-topic statement.`,
    ];

    const answer = "B";

    return {
      slot_id: slot.slot_id,
      questionType: "multipleChoice",
      prompt,
      options,
      answer,
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "understand",
        sharedContext: slot.sharedContext ?? "standalone",
      },
    };
  },
};
