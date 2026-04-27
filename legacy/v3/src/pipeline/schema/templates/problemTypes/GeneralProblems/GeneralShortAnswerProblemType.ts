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
      constructedResponse: true,
    },
  },

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "medium";
    const taskType = slot.constraints?.taskType;
    const intent = slot.cognitive_demand ?? "understand";

    
// --- ELA ---------------------------------------------------------------

    if (taskType === "ela_inference") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Explain what the text about ${topic} suggests about a character, event, or idea. Use evidence from the text to support your answer.`,
        answer: `A correct response identifies an inference supported by the text and cites specific evidence.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "ela_evidence") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Identify one piece of evidence from the text that best supports the idea related to ${topic}. Explain why this evidence is relevant.`,
        answer: `A correct response cites a relevant detail and explains how it supports the idea.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "ela_structure") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Explain how the author’s structural choice in the text about ${topic} affects the meaning or impact of the passage.`,
        answer: `A correct response identifies a structural choice and explains its effect on meaning.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    // --- HISTORY -----------------------------------------------------------

    if (taskType === "history_sourcing") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Explain the author’s purpose or perspective in the source related to ${topic}. Use details from the source to support your explanation.`,
        answer: `A correct response identifies the author’s perspective and supports it with evidence from the source.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "history_claim_evidence") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Make a historical claim about ${topic} and support it with one piece of evidence. Explain how the evidence supports your claim.`,
        answer: `A correct response states a defensible claim and supports it with accurate evidence.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    // --- SCIENCE -----------------------------------------------------------

    if (taskType === "science_cer") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Make a claim about ${topic} and support it with evidence and reasoning that explains why the evidence supports the claim.`,
        answer: `A correct response includes a clear claim, relevant evidence, and reasoning that links the two.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "science_experimental_design") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Describe an experiment that could test a hypothesis related to ${topic}. Include the variables you would change, measure, and keep constant.`,
        answer: `A correct response identifies independent/dependent variables and controls.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "science_phenomena") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Explain the scientific phenomenon involving ${topic}. Describe the underlying process or mechanism.`,
        answer: `A correct response accurately explains the mechanism behind the phenomenon.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    // --- MATH --------------------------------------------------------------

    if (taskType === "math_application") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Write an equation or expression that models the situation involving ${topic}. Explain how each part of your model relates to the situation.`,
        answer: `A correct response provides a valid model and explains the meaning of its components.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "math_error_analysis") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `A student made an error while working with ${topic}. Identify the error and explain how to correct it.`,
        answer: `A correct response identifies the mistake and provides the correct reasoning.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "math_concept") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Explain the mathematical concept behind ${topic} in your own words.`,
        answer: `A correct response gives a clear, accurate conceptual explanation.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    // --- STEM --------------------------------------------------------------

    if (taskType === "stem_debugging") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `A process or algorithm related to ${topic} is producing an incorrect result. Describe the bug and explain how to fix it.`,
        answer: `A correct response identifies the flaw and explains a valid correction.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "stem_modeling") {
      return {
        slot_id: slot.slot_id,
        questionType: "shortAnswer",
        prompt: `Describe a model that represents the system or process involving ${topic}. Explain how the model captures the key relationships.`,
        answer: `A correct response describes a coherent model and explains its components.`,
        metadata: { difficulty, intent, taskType },
      };
    }

    // --- FALLBACK ----------------------------------------------------------

    return {
      slot_id: slot.slot_id,
      questionType: "shortAnswer",
      prompt: `Write a short explanation related to ${topic}.`,
      answer: `A correct response provides a clear and accurate explanation.`,
      metadata: { difficulty, intent, taskType },
    };
  },
};
