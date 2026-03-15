import type {
  GenerationContext,
  ProblemPlugin,
  ProblemSlot,
} from "../../../../agents/pluginEngine/interfaces/problemPlugin";

export const GeneralPassageBasedProblemType: ProblemPlugin = {
  id: "general_passage_based",
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
    label: "Passage-Based (General)",
    itemType: "passageBased",
    sharedContext: "passage",
    defaultIntent: "understand",
    defaultDifficulty: "medium",
    supports: {
      passageBased: true,
    },
  },

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "medium";

    const defaultQuestionCount = 3;
    const requestedCount = slot.metadata?.passageQuestionCount ?? null;
    const questionCount =
      requestedCount && requestedCount >= 1
        ? requestedCount
        : defaultQuestionCount;

    const passage = `Read the following passage about ${topic}. The passage introduces key ideas, examples, and implications related to ${topic}, written at an appropriate level for the class.`;

    const questions = [];

    for (let i = 0; i < questionCount; i++) {
      if (i === 0) {
        questions.push({
          questionType: "multipleChoice",
          prompt: `According to the passage, which statement best summarizes a central idea about ${topic}?`,
          options: [
            "A. A minor detail from the passage.",
            "B. The main idea of the passage.",
            "C. A statement that contradicts the passage.",
            "D. An unrelated idea not mentioned in the passage.",
          ],
          answer: "B",
        });
      } else if (i === 1) {
        questions.push({
          questionType: "shortAnswer",
          prompt: `Based on the passage, explain one important effect or consequence related to ${topic}.`,
          answer: `A clear explanation of an effect or consequence described in the passage, using relevant details.`,
        });
      } else {
        questions.push({
          questionType: "trueFalse",
          prompt: `True or False: The passage suggests that ${topic} has no impact on people or events.`,
          answer: "False",
        });
      }
    }

    return {
      slot_id: slot.slot_id,
      questionType: "passageBased",
      prompt: `Read the passage and answer the questions about ${topic}.`,
      passage,
      questions,
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "understand",
        sharedContext: slot.sharedContext ?? "passage",
        passageQuestionCount: questionCount,
      },
    };
  },
};
