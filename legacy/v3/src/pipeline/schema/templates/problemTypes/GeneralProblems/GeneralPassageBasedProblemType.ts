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
      requiresPassage: true,
    },
  },

  async generate(slot: ProblemSlot, _context: GenerationContext): Promise<any> {
    const topic = slot.topic ?? "the topic";
    const difficulty = slot.difficulty ?? "medium";
    const taskType = slot.constraints?.taskType;
    const intent = slot.cognitive_demand ?? "understand";

    // ---------------------------------------------------------------------
    // 1. Generate a neutral, topic-anchored passage
    // ---------------------------------------------------------------------
    const passage = `
${topic} plays an important role in many real-world situations. People often
encounter it without realizing how it influences decisions, outcomes, or
interpretations. In some cases, ${topic} appears in everyday experiences,
while in others it shapes broader historical, scientific, or mathematical
patterns. Understanding how ${topic} works can help explain why certain
events unfold the way they do, how evidence supports claims, or how models
represent complex ideas.
    `.trim();

    // ---------------------------------------------------------------------
    // 2. Build sub-questions based on taskType
    // ---------------------------------------------------------------------

    const questions: any[] = [];

    // --- ELA --------------------------------------------------------------
    if (taskType === "ela_inference") {
      questions.push({
        prompt: `What can the reader infer about the role of ${topic} based on the passage?`,
        answer: `A correct response identifies an inference supported by the passage.`,
      });
    }

    if (taskType === "ela_evidence") {
      questions.push({
        prompt: `Which sentence from the passage best supports an idea about ${topic}? Explain your choice.`,
        answer: `A correct response cites a relevant sentence and explains how it supports the idea.`,
      });
    }

    if (taskType === "ela_theme") {
      questions.push({
        prompt: `What central idea about ${topic} is developed in the passage?`,
        answer: `A correct response identifies a theme and explains how the passage develops it.`,
      });
    }

    if (taskType === "ela_structure") {
      questions.push({
        prompt: `How does the structure of the passage help explain ${topic}?`,
        answer: `A correct response identifies a structural choice and explains its effect.`,
      });
    }

    // --- HISTORY ----------------------------------------------------------
    if (taskType === "history_sourcing") {
      questions.push({
        prompt: `What perspective or purpose does the author seem to have when discussing ${topic}?`,
        answer: `A correct response identifies a plausible perspective supported by the passage.`,
      });
    }

    if (taskType === "history_claim_evidence") {
      questions.push({
        prompt: `Make a claim about ${topic} based on the passage and support it with one piece of evidence.`,
        answer: `A correct response states a claim and cites accurate evidence.`,
      });
    }

    if (taskType === "history_timeline") {
      questions.push({
        prompt: `Based on the passage, what sequence of events or developments is implied about ${topic}?`,
        answer: `A correct response identifies a logical sequence supported by the passage.`,
      });
    }

    // --- SCIENCE ----------------------------------------------------------
    if (taskType === "science_cer") {
      questions.push({
        prompt: `Make a claim about ${topic} and support it with evidence from the passage.`,
        answer: `A correct response includes a claim, evidence, and reasoning.`,
      });
    }

    if (taskType === "science_phenomena") {
      questions.push({
        prompt: `What phenomenon involving ${topic} is described or implied in the passage?`,
        answer: `A correct response explains the phenomenon and underlying mechanism.`,
      });
    }

    if (taskType === "science_graph_interpretation") {
      questions.push({
        prompt: `If you were to graph a relationship involving ${topic}, what variables might be included and why?`,
        answer: `A correct response identifies reasonable variables and explains their relationship.`,
      });
    }

    // --- MATH -------------------------------------------------------------
    if (taskType === "math_application") {
      questions.push({
        prompt: `Describe a real-world situation from the passage that could be modeled mathematically using ${topic}.`,
        answer: `A correct response identifies a situation and explains how it could be modeled.`,
      });
    }

    if (taskType === "math_error_analysis") {
      questions.push({
        prompt: `Identify a possible misconception someone might have about ${topic} based on the passage.`,
        answer: `A correct response identifies a misconception and explains why it is incorrect.`,
      });
    }

    if (taskType === "math_concept") {
      questions.push({
        prompt: `Explain the mathematical idea related to ${topic} that is suggested by the passage.`,
        answer: `A correct response gives a clear conceptual explanation.`,
      });
    }

    // ---------------------------------------------------------------------
    // 3. Ensure we always have 3 questions (fallbacks if needed)
    // ---------------------------------------------------------------------
    while (questions.length < 3) {
      questions.push({
        prompt: `Explain how ${topic} is important in the context described in the passage.`,
        answer: `A correct response provides a clear explanation using passage details.`,
      });
    }

    // ---------------------------------------------------------------------
    // 4. Return the passage-based item
    // ---------------------------------------------------------------------
    return {
      slot_id: slot.slot_id,
      questionType: "passageBased",
      passage,
      questions,
      metadata: {
        subject: slot.course ?? null,
        difficulty,
        intent,
        taskType,
      },
    };
  },
};
