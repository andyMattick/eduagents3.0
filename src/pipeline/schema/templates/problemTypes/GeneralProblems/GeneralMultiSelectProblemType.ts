import type {
  GenerationContext,
  ProblemPlugin,
  ProblemSlot,
} from "../../../../agents/pluginEngine/interfaces/problemPlugin";

export const GeneralMultiSelectProblemType: ProblemPlugin = {
  id: "general_multi_select",
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
    label: "Multi-Select (General)",
    itemType: "multiSelect",
    defaultIntent: "analyze",
    defaultDifficulty: "medium",
    supports: {
      multiSelect: true,
    },
  },

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "medium";

    // Teacher-selectable number of correct answers; fall back to 2–3.
    const requestedCorrectCount =
      slot.metadata?.multiSelectCorrectCount ?? null;
    const correctCount =
      requestedCorrectCount && requestedCorrectCount >= 1
        ? requestedCorrectCount
        : 2;

    // Internal rationale/distractor scaffolding would live here.
    const prompt = `Select all statements that correctly describe ${topic}.`;

    const options = [
      "A. A fully correct statement about the topic.",
      "B. Another correct statement about the topic.",
      "C. A partially correct but misleading statement.",
      "D. A common misconception about the topic.",
      "E. An unrelated or off-topic statement.",
    ];

    const correctOptions =
      correctCount === 1
        ? ["A"]
        : correctCount === 2
        ? ["A", "B"]
        : ["A", "B", "C"]; // you can refine this mapping later

    return {
      slot_id: slot.slot_id,
      questionType: "multiSelect",
      prompt,
      options,
      answer: correctOptions,
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "analyze",
        sharedContext: slot.sharedContext ?? "standalone",
        multiSelectCorrectCount: correctCount,
      },
    };
  },
};
