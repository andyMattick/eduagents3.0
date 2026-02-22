import { buildWriterPrompt } from "./writerPrompt";
import { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { Blueprint } from "@/pipeline/contracts/Blueprint";
import { callGemini } from "@/pipeline/llm/gemini"; // your wrapper
import { WriterOutput } from "@/pipeline/contracts/writerModels"; // optional but recommended

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
  return parsed;// 4. Validate shape (optional but recommended) if (!parsed.assessment || !parsed.writerSelfCheck) { throw new Error("WriterCall: Missing assessment or writerSelfCheck."); } // 5. Return both assessment + self-check to SCRIBE return { assessment: parsed.assessment, writerSelfCheck: parsed.writerSelfCheck };
}
