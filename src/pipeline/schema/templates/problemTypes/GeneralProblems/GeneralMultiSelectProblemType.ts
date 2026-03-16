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
    const taskType = slot.constraints?.taskType;
    const intent = slot.cognitive_demand ?? "analyze";

    // -------------------------------------------------------------
    // ELA
    // -------------------------------------------------------------

    if (taskType === "ela_inference") {
      return {
        slot_id: slot.slot_id,
        questionType: "multiSelect",
        prompt: `Which statements are reasonable inferences based on the text about ${topic}? Select TWO answers.`,
        options: [
          "A. An inference strongly supported by the text.",
          "B. Another inference supported by the text.",
          "C. A detail mentioned but not an inference.",
          "D. An unrelated or unsupported idea.",
        ],
        answers: ["A", "B"],
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "ela_evidence") {
      return {
        slot_id: slot.slot_id,
        questionType: "multiSelect",
        prompt: `Which TWO details best support an idea related to ${topic}?`,
        options: [
          "A. A detail that directly supports the idea.",
          "B. Another detail that supports the idea.",
          "C. A detail taken out of context.",
          "D. An unrelated detail.",
        ],
        answers: ["A", "B"],
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // HISTORY
    // -------------------------------------------------------------

    if (taskType === "history_claim_evidence") {
      return {
        slot_id: slot.slot_id,
        questionType: "multiSelect",
        prompt: `Which TWO pieces of evidence best support a historical claim about ${topic}?`,
        options: [
          "A. Evidence directly supporting the claim.",
          "B. Additional evidence supporting the claim.",
          "C. Evidence that contradicts the claim.",
          "D. Evidence unrelated to the claim.",
        ],
        answers: ["A", "B"],
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "history_sourcing") {
      return {
        slot_id: slot.slot_id,
        questionType: "multiSelect",
        prompt: `Which TWO statements best describe the author's perspective or purpose in the source about ${topic}?`,
        options: [
          "A. A perspective supported by the source.",
          "B. Another perspective supported by the source.",
          "C. A perspective contradicted by the source.",
          "D. A perspective unrelated to the source.",
        ],
        answers: ["A", "B"],
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // SCIENCE
    // -------------------------------------------------------------

    if (taskType === "science_cer") {
      return {
        slot_id: slot.slot_id,
        questionType: "multiSelect",
        prompt: `Which TWO claims are best supported by scientific evidence related to ${topic}?`,
        options: [
          "A. A claim strongly supported by evidence.",
          "B. Another claim supported by evidence.",
          "C. A claim contradicted by evidence.",
          "D. A claim unrelated to the evidence.",
        ],
        answers: ["A", "B"],
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "science_phenomena") {
      return {
        slot_id: slot.slot_id,
        questionType: "multiSelect",
        prompt: `Which TWO explanations best describe the phenomenon involving ${topic}?`,
        options: [
          "A. A scientifically accurate explanation.",
          "B. Another accurate explanation.",
          "C. A common misconception.",
          "D. An unrelated explanation.",
        ],
        answers: ["A", "B"],
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // MATH
    // -------------------------------------------------------------

    if (taskType === "math_application") {
      return {
        slot_id: slot.slot_id,
        questionType: "multiSelect",
        prompt: `Which TWO equations or expressions best model a situation involving ${topic}?`,
        options: [
          "A. A correct model.",
          "B. Another correct model.",
          "C. A model with a major misconception.",
          "D. A model unrelated to the situation.",
        ],
        answers: ["A", "B"],
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "math_concept") {
      return {
        slot_id: slot.slot_id,
        questionType: "multiSelect",
        prompt: `Which TWO statements best describe the mathematical concept behind ${topic}?`,
        options: [
          "A. A correct conceptual explanation.",
          "B. Another correct conceptual explanation.",
          "C. A common misconception.",
          "D. An unrelated statement.",
        ],
        answers: ["A", "B"],
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // FALLBACK
    // -------------------------------------------------------------

    return {
      slot_id: slot.slot_id,
      questionType: "multiSelect",
      prompt: `Which TWO statements best describe ${topic}?`,
      options: [
        `A. A partially correct description of ${topic}.`,
        `B. A fully correct description of ${topic}.`,
        `C. A misconception about ${topic}.`,
        `D. An unrelated statement.`,
      ],
      answers: ["A", "B"],
      metadata: { difficulty, intent, taskType },
    };
  },
};
