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
    const taskType = slot.constraints?.taskType;
    const intent = slot.cognitive_demand ?? "remember";

    // -------------------------------------------------------------
    // ELA
    // -------------------------------------------------------------

    if (taskType === "ela_vocab") {
      return {
        slot_id: slot.slot_id,
        questionType: "trueFalse",
        prompt: `True or False: In the context of ${topic}, the word “___” means “___.”`,
        answer: "False",
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "ela_inference") {
      return {
        slot_id: slot.slot_id,
        questionType: "trueFalse",
        prompt: `True or False: The passage directly states the inference about ${topic}.`,
        answer: "False",
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // HISTORY
    // -------------------------------------------------------------

    if (taskType === "history_claim_evidence") {
      return {
        slot_id: slot.slot_id,
        questionType: "trueFalse",
        prompt: `True or False: The passage provides evidence supporting a claim about ${topic}.`,
        answer: "True",
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "history_sourcing") {
      return {
        slot_id: slot.slot_id,
        questionType: "trueFalse",
        prompt: `True or False: The author's perspective about ${topic} is neutral and unbiased.`,
        answer: "False",
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // SCIENCE
    // -------------------------------------------------------------

    if (taskType === "science_phenomena") {
      return {
        slot_id: slot.slot_id,
        questionType: "trueFalse",
        prompt: `True or False: The phenomenon involving ${topic} can be explained by a scientific mechanism.`,
        answer: "True",
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "science_cer") {
      return {
        slot_id: slot.slot_id,
        questionType: "trueFalse",
        prompt: `True or False: A scientific claim about ${topic} must be supported by evidence.`,
        answer: "True",
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // MATH
    // -------------------------------------------------------------

    if (taskType === "math_concept") {
      return {
        slot_id: slot.slot_id,
        questionType: "trueFalse",
        prompt: `True or False: A key concept related to ${topic} is accurately described by the statement above.`,
        answer: "False",
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "math_error_analysis") {
      return {
        slot_id: slot.slot_id,
        questionType: "trueFalse",
        prompt: `True or False: The reasoning shown for ${topic} contains no mathematical errors.`,
        answer: "False",
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // FALLBACK
    // -------------------------------------------------------------

    return {
      slot_id: slot.slot_id,
      questionType: "trueFalse",
      prompt: `True or False: A statement about ${topic} is accurate.`,
      answer: "True",
      metadata: { difficulty, intent, taskType },
    };
  },
};
