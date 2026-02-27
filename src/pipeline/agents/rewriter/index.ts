import { callAI } from "@/config/aiConfig";
import { buildRewriterPrompt } from "./rewriterPrompt";
import { PipelineTrace } from "@/types/Trace";

export async function runRewriter({
  writerDraft,
  rewriteInstructions,
  trace,
}: {
  writerDraft: any;
  rewriteInstructions: any[];
  trace?: PipelineTrace;
}) {
  const startedAt = Date.now();

  const prompt = buildRewriterPrompt({
    writerDraft,
    rewriteInstructions,
  });

  try {
    const aiResponse = await callAI(prompt);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Rewriter did not return valid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (trace) {
      trace.steps.push({
        agent: "Rewriter",
        input: { writerDraft, rewriteInstructions },
        output: parsed,
        errors: [],
        startedAt,
        finishedAt: Date.now(),
        duration: Date.now() - startedAt,
      });
    }

    return parsed.writerDraft;
  } catch (err: any) {
    if (trace) {
      trace.steps.push({
        agent: "Rewriter",
        input: { writerDraft, rewriteInstructions },
        output: null,
        errors: [err.message],
        startedAt,
        finishedAt: Date.now(),
        duration: Date.now() - startedAt,
      });
    }

    throw err;
  }
}
