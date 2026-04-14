export const PREPAREDNESS_V2_ALIGNMENT_PROMPT_TEMPLATE = `You are an expert educator. Compare the PREP document and the TEST document.

Your task is to analyze the concepts taught in the PREP and the concepts required by the TEST, then determine how well aligned they are.

Follow these rules:

1. Extract the key concepts taught in the PREP document using natural language.
2. Extract the key concepts required to answer each TEST question.
3. For each TEST question:
  - Identify the concepts required.
  - Determine whether the question is:
     "covered"      -> PREP fully teaches the required concepts.
     "uncovered"    -> PREP does not teach the required concepts at all.
     "misaligned"   -> PREP touches the concept but not at the depth, method, or difficulty needed.
  - Provide a short explanation.
  - Estimate the difficulty of the question on a scale of 1-5.
4. Summarize:
  - covered_items
  - misaligned_items
  - uncovered_items
  - overall alignment
5. Provide a teacher-friendly narrative summary.
6. Estimate the overall difficulty of the PREP document on a scale of 1-5, where:
  1 = very basic, 2 = foundational, 3 = moderate, 4 = advanced, 5 = very advanced.

Return ONLY valid JSON in the following structure:

{
  "prep_concepts": [...],
  "prep_difficulty": 1-5,

  "test_items": [
    {
      "question_number": 1,
      "question_text": "...",
      "concepts": [...],
      "alignment": "covered" | "uncovered" | "misaligned",
      "difficulty": 1-5,
      "explanation": "..."
    }
  ],

  "coverage_summary": {
    "covered_items": [...],
    "misaligned_items": [...],
    "uncovered_items": [...],
    "overall_alignment": "..."
  },

  "teacher_summary": "..."
}

PREP DOCUMENT:
<<<PREP_TEXT>>>

TEST DOCUMENT:
<<<TEST_TEXT>>>`;

export const PREPAREDNESS_V2_REVIEW_SNIPPET_PROMPT_TEMPLATE = `You are an expert educator. Generate a short review explanation that teaches the student the concept they need for this test question.

The explanation must be:
- concise
- clear
- student-friendly
- directly tied to the concept
- not dependent on the original prep document

Return ONLY valid JSON:

{
  "review_snippet": "..."
}

TEST QUESTION:
<<<QUESTION_TEXT>>>

CONCEPTS NEEDED:
<<<CONCEPT_LIST>>>`;

export const PREPAREDNESS_V2_REWRITE_QUESTION_PROMPT_TEMPLATE = `Rewrite the following test question according to the teacher's instructions.

Rules:
- Preserve the original learning objective.
- Keep the difficulty level similar unless the teacher specifies otherwise.
- Keep the question clear and student-friendly.
- Do not add new concepts unless requested.

Return ONLY valid JSON:

{
  "rewritten_question": "..."
}

ORIGINAL QUESTION:
<<<QUESTION_TEXT>>>

TEACHER INSTRUCTIONS:
<<<TEACHER_NOTES>>>`;

export const PREPAREDNESS_V2_REWRITE_TO_DIFFICULTY_PROMPT_TEMPLATE = `Rewrite the following test question to match the target difficulty level.

Rules:
- Preserve the learning objective.
- Adjust complexity, scaffolding, and cognitive demand to match the target difficulty.
- Keep the question clear and student-friendly.

Return ONLY valid JSON:
{
  "rewritten_question": "..."
}

ORIGINAL QUESTION:
<<<QUESTION_TEXT>>>

TARGET DIFFICULTY:
<<<TARGET_DIFFICULTY>>>`;

export const PREPAREDNESS_V2_PRACTICE_PROBLEM_PROMPT_TEMPLATE = `Create a practice problem that helps a student learn the concept required for the test question.

Rules:
- The problem must be solvable using the concept.
- Keep the difficulty appropriate for the grade level implied by the question.
- Include the correct answer and a short explanation.

Return ONLY valid JSON:

{
  "practice_question": "…",
  "answer": "…",
  "explanation": "…"
}

CONCEPTS:
<<<CONCEPT_LIST>>>

TEST QUESTION:
<<<QUESTION_TEXT>>>`;

export const PREPAREDNESS_V2_GENERATE_REVIEW_PACKET_PROMPT_TEMPLATE = `You are an expert educator. Create a complete REVIEW PACKET based on the TEST ITEMS below.

Your goals:
- Teach the concepts required to answer each test question.
- Use clear, student-friendly explanations.
- Include examples when helpful.
- Keep the review concise but complete.
- Do NOT copy the test questions; teach the underlying ideas.

Return ONLY valid JSON in the following structure:

{
  "review_sections": [
    {
      "title": "Concept Name",
      "explanation": "Clear explanation of the concept",
      "example": "Optional example or demonstration"
    }
  ],
  "summary": "A short teacher-facing summary of what this review covers."
}

TEST ITEMS:
<<<TEST_ITEMS_JSON>>>`;

export const PREPAREDNESS_V2_GENERATE_TEST_FROM_REVIEW_PROMPT_TEMPLATE = `You are an expert educator. Create a complete TEST based on the REVIEW CONCEPTS below.

Your goals:
- Assess each concept taught in the review.
- Use clear, well-structured questions.
- Include a mix of formats (multiple choice, short answer, conceptual reasoning).
- Keep difficulty appropriate for the level implied by the review.
- Provide an answer key with short explanations.

Return ONLY valid JSON in the following structure:

{
  "test_items": [
    {
      "question_number": 1,
      "question_text": "The full question",
      "answer": "Correct answer",
      "explanation": "Short explanation of why this is correct"
    }
  ],
  "test_summary": "A short teacher-facing summary of what this test measures."
}

REVIEW CONCEPTS:
<<<REVIEW_CONCEPTS_JSON>>>`;

function renderPrompt(template: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (prompt, [token, value]) => prompt.replaceAll(token, value),
    template,
  );
}

export function renderPreparednessV2AlignmentPrompt(prepText: string, testText: string): string {
  return renderPrompt(PREPAREDNESS_V2_ALIGNMENT_PROMPT_TEMPLATE, {
    "<<<PREP_TEXT>>>": prepText,
    "<<<TEST_TEXT>>>": testText,
  });
}

export function renderPreparednessV2ReviewSnippetPrompt(questionText: string, conceptList: string): string {
  return renderPrompt(PREPAREDNESS_V2_REVIEW_SNIPPET_PROMPT_TEMPLATE, {
    "<<<QUESTION_TEXT>>>": questionText,
    "<<<CONCEPT_LIST>>>": conceptList,
  });
}

export const renderPreparednessReviewSnippetPrompt = renderPreparednessV2ReviewSnippetPrompt;

export function renderPreparednessV2RewriteQuestionPrompt(questionText: string, teacherNotes: string): string {
  return renderPrompt(PREPAREDNESS_V2_REWRITE_QUESTION_PROMPT_TEMPLATE, {
    "<<<QUESTION_TEXT>>>": questionText,
    "<<<TEACHER_NOTES>>>": teacherNotes,
  });
}

export const renderPreparednessRewritePrompt = renderPreparednessV2RewriteQuestionPrompt;

export function renderPreparednessV2RewriteToDifficultyPrompt(questionText: string, targetDifficulty: number): string {
  return renderPrompt(PREPAREDNESS_V2_REWRITE_TO_DIFFICULTY_PROMPT_TEMPLATE, {
    "<<<QUESTION_TEXT>>>": questionText,
    "<<<TARGET_DIFFICULTY>>>": String(targetDifficulty),
  });
}

export const renderPreparednessRewriteToDifficultyPrompt = renderPreparednessV2RewriteToDifficultyPrompt;

export function renderPreparednessV2PracticeProblemPrompt(questionText: string, conceptList: string): string {
  return renderPrompt(PREPAREDNESS_V2_PRACTICE_PROBLEM_PROMPT_TEMPLATE, {
    "<<<QUESTION_TEXT>>>": questionText,
    "<<<CONCEPT_LIST>>>": conceptList,
  });
}

export const renderPreparednessPracticePrompt = renderPreparednessV2PracticeProblemPrompt;

export function renderPreparednessV2GenerateReviewPacketPrompt(testItemsJson: string): string {
  return renderPrompt(PREPAREDNESS_V2_GENERATE_REVIEW_PACKET_PROMPT_TEMPLATE, {
    "<<<TEST_ITEMS_JSON>>>": testItemsJson,
  });
}

export const renderPreparednessGenerateReviewPrompt = renderPreparednessV2GenerateReviewPacketPrompt;

export function renderPreparednessV2GenerateTestFromReviewPrompt(reviewConceptsJson: string): string {
  return renderPrompt(PREPAREDNESS_V2_GENERATE_TEST_FROM_REVIEW_PROMPT_TEMPLATE, {
    "<<<REVIEW_CONCEPTS_JSON>>>": reviewConceptsJson,
  });
}

export const renderPreparednessGenerateTestPrompt = renderPreparednessV2GenerateTestFromReviewPrompt;