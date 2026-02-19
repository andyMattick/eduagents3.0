import { buildWriterPrompt } from "./writerPrompt";
import { WriterDraft } from "./WriterDraft";
import { UnifiedAssessmentRequest } from "../contracts/assessmentContracts";
import { callAI } from "../../../config/aiConfig";

export async function runWriter(
  req: UnifiedAssessmentRequest
): Promise<WriterDraft> {
  const prompt = buildWriterPrompt(req);

  const aiResponse = await callAI(prompt, {
    modelName: "gemini-2.5-flash",
    maxTokens: 6000
  });

  const text =
    aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  console.log(
  "%c[Writer v2] Raw AI Response:",
  "color: #4ea1ff; font-weight: bold;",
  text
);


  if (!text.trim()) {
    throw new Error("Writer returned an empty response");
  }

  // Extract JSON object from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Writer did not return valid JSON");
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Writer JSON parse error:", err);
    throw new Error("Writer returned malformed JSON");
  }

  if (!parsed.problemPayload || !Array.isArray(parsed.problemPayload)) {
    throw new Error("Writer JSON missing required problemPayload array");
  }

  return {
    problemPayload: parsed.problemPayload
  };
}
