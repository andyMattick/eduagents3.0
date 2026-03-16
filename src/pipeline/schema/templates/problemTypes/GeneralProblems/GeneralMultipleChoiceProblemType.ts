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
  const taskType = slot.constraints?.taskType;

  // --- TaskType-aware branching -----------------------------------------

  // ELA
  if (taskType === "ela_inference") {
    return {
      slot_id: slot.slot_id,
      questionType: "multipleChoice",
      prompt: `Based on the text about ${topic}, what can the reader infer?`,
      options: [
        `A. An inference strongly supported by the text.`,
        `B. A detail mentioned but not connected to the inference.`,
        `C. A common misconception about the text.`,
        `D. An unrelated or unsupported idea.`,
      ],
      answer: "A",
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "understand",
        sharedContext: slot.sharedContext ?? "standalone",
        taskType,
      },
    };
  }

  if (taskType === "ela_evidence") {
    return {
      slot_id: slot.slot_id,
      questionType: "multipleChoice",
      prompt: `Which detail from the text about ${topic} best supports the idea that ___?`,
      options: [
        `A. A detail that directly supports the idea.`,
        `B. A detail that is related but does not support the idea.`,
        `C. A detail taken out of context.`,
        `D. An unrelated detail.`,
      ],
      answer: "A",
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "understand",
        sharedContext: slot.sharedContext ?? "standalone",
        taskType,
      },
    };
  }

  // History
  if (taskType === "history_sourcing") {
    return {
      slot_id: slot.slot_id,
      questionType: "multipleChoice",
      prompt: `Which statement best describes the author's purpose or perspective in the source related to ${topic}?`,
      options: [
        `A. A perspective supported by the source.`,
        `B. A perspective contradicted by the source.`,
        `C. A perspective unrelated to the source.`,
        `D. A perspective based on modern assumptions rather than the source.`,
      ],
      answer: "A",
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "understand",
        sharedContext: slot.sharedContext ?? "standalone",
        taskType,
      },
    };
  }

  if (taskType === "history_claim_evidence") {
    return {
      slot_id: slot.slot_id,
      questionType: "multipleChoice",
      prompt: `Which piece of evidence best supports the historical claim about ${topic}?`,
      options: [
        `A. Evidence directly supporting the claim.`,
        `B. Evidence related but not supportive.`,
        `C. Evidence that contradicts the claim.`,
        `D. Evidence unrelated to the claim.`,
      ],
      answer: "A",
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "understand",
        sharedContext: slot.sharedContext ?? "standalone",
        taskType,
      },
    };
  }

  // Science
  if (taskType === "science_cer") {
    return {
      slot_id: slot.slot_id,
      questionType: "multipleChoice",
      prompt: `Which claim is best supported by the scientific evidence related to ${topic}?`,
      options: [
        `A. A claim strongly supported by the evidence.`,
        `B. A claim weakly supported by the evidence.`,
        `C. A claim contradicted by the evidence.`,
        `D. A claim unrelated to the evidence.`,
      ],
      answer: "A",
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "understand",
        sharedContext: slot.sharedContext ?? "standalone",
        taskType,
      },
    };
  }

  if (taskType === "science_phenomena") {
    return {
      slot_id: slot.slot_id,
      questionType: "multipleChoice",
      prompt: `Which explanation best describes the phenomenon involving ${topic}?`,
      options: [
        `A. The scientifically accurate explanation.`,
        `B. A partially correct explanation.`,
        `C. A common misconception.`,
        `D. An unrelated explanation.`,
      ],
      answer: "A",
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "understand",
        sharedContext: slot.sharedContext ?? "standalone",
        taskType,
      },
    };
  }

  // Math
  if (taskType === "math_concept") {
    return {
      slot_id: slot.slot_id,
      questionType: "multipleChoice",
      prompt: `Which statement best describes the mathematical concept behind ${topic}?`,
      options: [
        `A. The correct conceptual explanation.`,
        `B. A partially correct explanation.`,
        `C. A common misconception.`,
        `D. An unrelated statement.`,
      ],
      answer: "A",
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "understand",
        sharedContext: slot.sharedContext ?? "standalone",
        taskType,
      },
    };
  }

  if (taskType === "math_application") {
    return {
      slot_id: slot.slot_id,
      questionType: "multipleChoice",
      prompt: `Which equation or expression best models the situation involving ${topic}?`,
      options: [
        `A. The correct model.`,
        `B. A model with a minor error.`,
        `C. A model with a major misconception.`,
        `D. A model unrelated to the situation.`,
      ],
      answer: "A",
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent: slot.cognitive_demand ?? "understand",
        sharedContext: slot.sharedContext ?? "standalone",
        taskType,
      },
    };
  }

  // --- Fallback (existing behavior) -----------------------------------------

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
      taskType,
    },
  };
},
};
