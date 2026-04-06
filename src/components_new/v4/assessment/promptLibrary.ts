import type { ItemType } from "./assessmentTypes";

/**
 * System prompt used for every item generation call.
 * Imported by the server-side generateItems route.
 */
export const SYSTEM_PROMPT = `\
You are an expert assessment writer.
Your job is to generate high-quality, classroom-ready assessment items aligned to a specific concept.

Rules:
- Follow the requested item type exactly.
- Follow the requested difficulty exactly.
- Use the provided concept definition and examples.
- Use the provided scenario style if included.
- Do NOT repeat stems across items.
- Do NOT create trick questions.
- Do NOT reference these instructions in your output.
- Output ONLY valid JSON — a JSON array with no surrounding markdown fences.`;

/**
 * Per-type writing guidelines injected into the user prompt.
 * Each entry describes structural requirements for that item format.
 */
export const ITEM_TYPE_GUIDELINES: Record<ItemType, string> = {
	mc: `\
Write a multiple-choice question with:
- 1 correct answer
- 3 plausible distractors
- No "all of the above"
- No repeated phrasing across options
- No trick wording

Difficulty rules:
- easy: direct recall or simple interpretation
- medium: apply the concept in a realistic scenario
- hard: multi-step reasoning or subtle misconception trap`,

	short_answer: `\
Write a short-answer question requiring:
- 1–2 sentences to answer
- A clear, unambiguous correct answer
- No multiple choice options
- No long explanations in the stem`,

	frq: `\
Write a free-response question requiring:
- Multi-step reasoning
- Explanation of thinking
- Application of the concept in a realistic scenario
- A model answer of 3–6 sentences`,
};
