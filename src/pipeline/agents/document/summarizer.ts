import { callGemini } from "pipeline/llm/gemini";

export interface DocumentSummary {
  summary: string;
  keyConcepts: string[];
  vocabulary: string[];
  difficulty: "easy" | "medium" | "hard";
  questionAngles: string[];
}

export async function runSummarizer(
  documents: string[]
): Promise<DocumentSummary> {

  const combined = documents.join("\n\n").slice(0, 12000); // hard cap

  const prompt = `
You are analyzing an educational source document.

Extract the following:

1. A concise summary (3–5 sentences).
2. A list of 8–20 key concepts.
3. A list of important academic vocabulary terms.
4. Estimated difficulty level: easy | medium | hard.
5. Question-worthy angles (ways to test understanding).

Return strict JSON with keys:
summary, keyConcepts, vocabulary, difficulty, questionAngles.
Do not include commentary.

Document:
${combined}
`;

  const response = await callGemini({
    model: "gemini-2.0-flash",
    prompt,
    temperature: 0.2,
  });

  try {
    return JSON.parse(response);
  } catch {
    return {
      summary: "",
      keyConcepts: [],
      vocabulary: [],
      difficulty: "medium",
      questionAngles: []
    };
  }
}