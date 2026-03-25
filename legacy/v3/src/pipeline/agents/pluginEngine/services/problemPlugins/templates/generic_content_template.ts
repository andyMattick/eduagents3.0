import type {
  GenerationContext,
  ProblemPlugin,
  ProblemSlot,
} from "../../../interfaces/problemPlugin";

export const GenericContentTemplate: ProblemPlugin = {
  id: "generic_content_template",
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
    "stem",
  ],
  template: {
    label: "Generic Content Template",
    itemType: "content",
    defaultIntent: "understand",
    defaultDifficulty: "medium",
    supports: {
      content: true,
    },
  },

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "medium";
    const taskType = slot.constraints?.taskType;
    const intent = slot.cognitive_demand ?? "understand";

    // -------------------------------------------------------------
    // ELA
    // -------------------------------------------------------------

    if (taskType === "ela_inference") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Explain what the text suggests about ${topic}. Identify an inference and describe the evidence that supports it.`,
        answer: `A correct response identifies a reasonable inference and supports it with textual evidence.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "ela_evidence") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Identify a central idea related to ${topic} and explain how specific evidence from the text supports it.`,
        answer: `A correct response identifies a central idea and explains how evidence supports it.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "ela_theme") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Describe the theme related to ${topic} and explain how the author develops it through characters, events, or structure.`,
        answer: `A correct response identifies a theme and explains how it is developed.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "ela_structure") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Explain how the author's structural choices help convey meaning related to ${topic}.`,
        answer: `A correct response identifies a structural choice and explains its effect.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // HISTORY
    // -------------------------------------------------------------

    if (taskType === "history_sourcing") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Explain the author's perspective or purpose in a source related to ${topic}. Describe how context influences the message.`,
        answer: `A correct response identifies perspective/purpose and connects it to context.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "history_claim_evidence") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Make a historical claim about ${topic} and support it with evidence. Explain how the evidence supports your claim.`,
        answer: `A correct response states a defensible claim and supports it with evidence.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "history_timeline") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Create a brief timeline showing key developments related to ${topic}. Explain how each event contributes to the overall historical pattern.`,
        answer: `A correct response lists events in order and explains their significance.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // SCIENCE
    // -------------------------------------------------------------

    if (taskType === "science_cer") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Make a scientific claim about ${topic}, support it with evidence, and explain the reasoning that connects the evidence to the claim.`,
        answer: `A correct response includes a claim, evidence, and reasoning.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "science_phenomena") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Describe the scientific phenomenon involving ${topic} and explain the underlying mechanism.`,
        answer: `A correct response explains the phenomenon and mechanism accurately.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "science_graph_interpretation") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Describe a graph that could represent a relationship involving ${topic}. Identify the variables and explain how they relate.`,
        answer: `A correct response identifies variables and describes their relationship.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "science_experimental_design") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Describe an experiment that could test a hypothesis related to ${topic}. Identify variables, controls, and expected outcomes.`,
        answer: `A correct response identifies variables, controls, and a valid procedure.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // MATH
    // -------------------------------------------------------------

    if (taskType === "math_concept") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Explain the mathematical concept behind ${topic} in clear, precise terms.`,
        answer: `A correct response provides an accurate conceptual explanation.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "math_application") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Describe a real-world situation involving ${topic} and explain how it can be modeled mathematically.`,
        answer: `A correct response identifies a situation and explains the model.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "math_error_analysis") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Describe a common error someone might make when working with ${topic} and explain how to correct it.`,
        answer: `A correct response identifies the error and provides correct reasoning.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // STEM
    // -------------------------------------------------------------

    if (taskType === "stem_debugging") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Describe a bug that could occur in a system or algorithm related to ${topic}. Explain why it happens and how to fix it.`,
        answer: `A correct response identifies a plausible bug and explains the fix.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "stem_modeling") {
      return {
        slot_id: slot.slot_id,
        questionType: "content",
        prompt: `Describe a model that represents a system or process involving ${topic}. Explain how the model captures key relationships.`,
        answer: `A correct response describes a coherent model and explains its components.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    // -------------------------------------------------------------
    // FALLBACK (generic conceptual prompt)
    // -------------------------------------------------------------

    return {
      slot_id: slot.slot_id,
      questionType: "content",
      prompt: `Explain an important idea related to ${topic}. Provide clear reasoning and relevant details.`,
      answer: `A correct response provides a clear explanation with supporting details.`,
      metadata: { difficulty, intent, taskType },
    };
  },
};