import { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import { Blueprint } from "@/pipeline/contracts/Blueprint";
import { callGemini } from "@/pipeline/llm/gemini"; // your wrapper
import { WriterOutput } from "@/pipeline/contracts/writerModels"; // optional but recommended

/** Build a monolithic writer prompt from the full UAR + plan + constraints */
function buildWriterCallPrompt(
  uar: UnifiedAssessmentRequest,
  plan: Blueprint["plan"],
  constraints: Blueprint["constraints"]
): string {
  return `Generate an assessment for ${uar.topic} (${uar.assessmentType}, grade ${uar.gradeLevels.join(", ")}).
Plan: ${JSON.stringify(plan, null, 2)}
Constraints: ${JSON.stringify(constraints, null, 2)}
Output valid JSON matching the WriterOutput schema.`;
}

export async function writerCall(
  uar: UnifiedAssessmentRequest,
  plan: Blueprint["plan"],
  constraints: Blueprint["constraints"]
): Promise<WriterOutput> {
  // 1. Build the prompt
  const prompt = buildWriterCallPrompt(uar, plan, constraints);

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
