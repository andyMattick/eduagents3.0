import { callAI } from "@/config/aiConfig";
import { buildRewriterPrompt } from "./rewriterPrompt";
import { PipelineTrace } from "@/types/Trace";
import { applyMathFormat } from "@/utils/mathFormatters";
import type { MathFormat } from "@/utils/mathFormatters";

/**
 * Validate that a value is strict JSON-serialisable (no undefined, no circular refs).
 * Returns the parsed object on success, or null on failure.
 */
function validateStrictJSON(value: any): { ok: boolean; error?: string } {
  try {
    JSON.parse(JSON.stringify(value));
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/**
 * Apply math formatting to all string fields recursively.
 * Only touches `prompt` and `answer` leaf fields.
 */
function applyMathFormatToItems(items: any[], fmt: MathFormat): any[] {
  return items.map(item => ({
    ...item,
    prompt: typeof item.prompt === "string" ? applyMathFormat(item.prompt, fmt) : item.prompt,
    answer: typeof item.answer === "string" ? applyMathFormat(item.answer, fmt) : item.answer,
  }));
}

export async function runRewriter({
  writerDraft,
  rewriteInstructions,
  mathFormat,
  trace,
}: {
  writerDraft: any;
  rewriteInstructions: any[];
  mathFormat?: MathFormat;
  trace?: PipelineTrace;
}) {
  const startedAt = Date.now();
  const fmt: MathFormat = mathFormat ?? "unicode";

  const prompt = buildRewriterPrompt({
    writerDraft,
    rewriteInstructions,
  });

  async function doRewrite(promptText: string): Promise<any> {
    const aiResponse = await callAI(promptText);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Rewriter did not return valid JSON");
    return JSON.parse(jsonMatch[0]);
  }

  try {
    let parsed = await doRewrite(prompt);

    // ── Strict JSON validation ──────────────────────────────────────────────
    const jsonCheck = validateStrictJSON(parsed);
    if (!jsonCheck.ok) {
      console.warn(`[Rewriter] Strict JSON validation failed: ${jsonCheck.error}. Triggering repair rewrite.`);
      const repairPrompt = buildRewriterPrompt({
        writerDraft: parsed,
        rewriteInstructions: [{ problemId: "ALL", issues: ["invalid JSON structure"], instructions: "Return the full draft as clean, valid JSON with no undefined values or circular references." }],
      });
      parsed = await doRewrite(repairPrompt);
    }

    // ── Math normalization ─────────────────────────────────────────────────
    const items = Array.isArray(parsed) ? parsed : (parsed.writerDraft ?? parsed);
    const normalizedItems = Array.isArray(items)
      ? applyMathFormatToItems(items, fmt)
      : items;
    const result = Array.isArray(parsed) ? normalizedItems : { ...parsed, writerDraft: normalizedItems };

    if (trace) {
      trace.steps.push({
        agent: "Rewriter",
        input: { writerDraft, rewriteInstructions },
        output: result,
        errors: [],
        startedAt,
        finishedAt: Date.now(),
        duration: Date.now() - startedAt,
      });
    }

    return Array.isArray(parsed) ? result : result.writerDraft;
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
