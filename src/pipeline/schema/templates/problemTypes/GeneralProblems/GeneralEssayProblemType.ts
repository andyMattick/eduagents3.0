import type {
  GenerationContext,
  ProblemPlugin,
  ProblemSlot,
} from "../../../../agents/pluginEngine/interfaces/problemPlugin";

export const GeneralEssayProblemType: ProblemPlugin = {
  id: "general_essay",
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
    label: "Essay (General)",
    itemType: "essay",
    defaultIntent: "analyze",
    defaultDifficulty: "medium",
    supports: {
      extendedResponse: true,
      essay: true,
    },
  },

    async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "hard";
    const taskType = slot.constraints?.taskType;
    const intent = slot.cognitive_demand ?? "analyze";

    // ---------------------------------------------------------------------
    // ELA
    // ---------------------------------------------------------------------

    if (taskType === "ela_inference") {
      return {
        slot_id: slot.slot_id,
        questionType: "essay",
        prompt: `Write an essay explaining what the text suggests about ${topic}. Develop an inference and support it with multiple pieces of textual evidence. Explain how each piece of evidence strengthens your inference.`,
        rubric: {
          claim: "Inference is clear and defensible.",
          evidence: "Uses multiple relevant pieces of textual evidence.",
          reasoning: "Explains how each piece of evidence supports the inference.",
          organization: "Logical structure with clear transitions.",
        },
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "ela_evidence") {
      return {
        slot_id: slot.slot_id,
        questionType: "essay",
        prompt: `Write an essay analyzing how evidence in the text supports an idea related to ${topic}. Identify a central idea and explain how specific details develop and strengthen it.`,
        rubric: {
          claim: "Central idea is clearly stated.",
          evidence: "Evidence is relevant, accurate, and well-integrated.",
          reasoning: "Explains how evidence supports the idea.",
          organization: "Clear introduction, body, and conclusion.",
        },
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "ela_theme") {
      return {
        slot_id: slot.slot_id,
        questionType: "essay",
        prompt: `Write an essay explaining the theme related to ${topic} in the text. Describe how the author develops this theme through characters, events, or structural choices.`,
        rubric: {
          claim: "Theme is clearly articulated.",
          evidence: "Uses relevant textual details.",
          reasoning: "Explains how details develop the theme.",
          organization: "Coherent structure with effective transitions.",
        },
        metadata: { difficulty, intent, taskType },
      };
    }

    // ---------------------------------------------------------------------
    // HISTORY
    // ---------------------------------------------------------------------

    if (taskType === "history_sourcing") {
      return {
        slot_id: slot.slot_id,
        questionType: "essay",
        prompt: `Write an essay analyzing the author's perspective or purpose in the source related to ${topic}. Explain how the author's background, context, or position influences the message.`,
        rubric: {
          sourcing: "Identifies and explains author perspective/purpose.",
          evidence: "Uses details from the source to support analysis.",
          context: "Connects perspective to historical context.",
          reasoning: "Explains how evidence supports claims.",
        },
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "history_claim_evidence") {
      return {
        slot_id: slot.slot_id,
        questionType: "essay",
        prompt: `Write an essay making a historical claim about ${topic}. Support your claim with at least two pieces of evidence and explain how each piece of evidence supports your argument.`,
        rubric: {
          claim: "Claim is historically defensible.",
          evidence: "Uses accurate, relevant historical evidence.",
          reasoning: "Explains how evidence supports the claim.",
          context: "Situates argument in broader historical context.",
        },
        metadata: { difficulty, intent, taskType },
      };
    }

    // ---------------------------------------------------------------------
    // SCIENCE
    // ---------------------------------------------------------------------

    if (taskType === "science_cer") {
      return {
        slot_id: slot.slot_id,
        questionType: "essay",
        prompt: `Write a CER (Claim–Evidence–Reasoning) essay about ${topic}. Make a clear claim, support it with scientific evidence, and explain the reasoning that connects the evidence to the claim.`,
        rubric: {
          claim: "Claim is clear and scientifically accurate.",
          evidence: "Uses appropriate scientific data or observations.",
          reasoning: "Explains the scientific principles linking evidence to claim.",
          accuracy: "Scientific explanations are correct and precise.",
        },
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "science_experimental_design") {
      return {
        slot_id: slot.slot_id,
        questionType: "essay",
        prompt: `Design an experiment to investigate a question related to ${topic}. Describe the hypothesis, variables, procedure, controls, and how you would analyze the results.`,
        rubric: {
          hypothesis: "Hypothesis is testable and clear.",
          variables: "Correctly identifies independent, dependent, and controlled variables.",
          procedure: "Procedure is replicable and scientifically sound.",
          analysis: "Explains how results would be interpreted.",
        },
        metadata: { difficulty, intent, taskType },
      };
    }

    // ---------------------------------------------------------------------
    // MATH
    // ---------------------------------------------------------------------

    if (taskType === "math_application") {
      return {
        slot_id: slot.slot_id,
        questionType: "essay",
        prompt: `Write an essay explaining how a mathematical model could represent a situation involving ${topic}. Describe the variables, relationships, and assumptions in your model.`,
        rubric: {
          model: "Model is mathematically valid.",
          explanation: "Explains variables and relationships clearly.",
          reasoning: "Justifies why the model fits the situation.",
          precision: "Uses correct mathematical language.",
        },
        metadata: { difficulty, intent, taskType },
      };
    }

    if (taskType === "math_error_analysis") {
      return {
        slot_id: slot.slot_id,
        questionType: "essay",
        prompt: `Write an essay analyzing a common error someone might make when working with ${topic}. Explain why the error occurs and how to correct the reasoning.`,
        rubric: {
          identification: "Correctly identifies a plausible error.",
          explanation: "Explains why the error is incorrect.",
          correction: "Provides accurate corrected reasoning.",
          clarity: "Explanation is clear and mathematically sound.",
        },
        metadata: { difficulty, intent, taskType },
      };
    }

    // ---------------------------------------------------------------------
    // STEM
    // ---------------------------------------------------------------------

    if (taskType === "stem_debugging") {
      return {
        slot_id: slot.slot_id,
        questionType: "essay",
        prompt: `Write an essay describing a bug in a system or algorithm related to ${topic}. Explain why the bug occurs and how to fix it.`,
        rubric: {
          identification: "Identifies a realistic bug.",
          explanation: "Explains the cause clearly.",
          correction: "Provides a valid fix.",
          clarity: "Technical explanation is clear and coherent.",
        },
        metadata: { difficulty, intent, taskType },
      };
    }

    // ---------------------------------------------------------------------
    // FALLBACK
    // ---------------------------------------------------------------------

    return {
      slot_id: slot.slot_id,
      questionType: "essay",
      prompt: `Write an essay explaining an important idea related to ${topic}. Use clear reasoning and relevant details.`,
      rubric: {
        clarity: "Explanation is clear and coherent.",
        evidence: "Uses relevant details or examples.",
        reasoning: "Explains ideas logically.",
        organization: "Has a clear structure.",
      },
      metadata: { difficulty, intent, taskType },
    };
  },
};