import { buildWriterPrompt } from "./writerPrompt";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { Blueprint } from "@/pipeline/contracts/Blueprint";
import { callGemini } from "@/pipeline/llm/gemini"; // your wrapper
import { WriterOutput } from "@/pipeline/contracts/writerOutput"; // optional but recommended

export async function writerCall(
  uar: UnifiedAssessmentRequest,
  plan: Blueprint["plan"],
  constraints: Blueprint["constraints"]
): Promise<WriterOutput> {
  // 1. Build the prompt
  const prompt = buildWriterPrompt(uar, plan, constraints);

  // 2. Call the model
  const raw = await callGemini({
    model: "gemini-2.5-flash",
    prompt,
    temperature: 0.2,
    maxOutputTokens: 4096
  });

  // 3. Parse JSON safely
  let parsed: WriterOutput;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error("WriterCall: Model did not return valid JSON.");
  }

  // 4. Return the parsed Writer output
  return parsed;
}
