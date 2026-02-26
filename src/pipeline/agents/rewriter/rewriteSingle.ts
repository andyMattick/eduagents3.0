/**
 * rewriteSingle.ts
 *
 * Surgical single-item rewrite. Called after per-problem Gatekeeper validation.
 *
 * The rewrite is conditioned on a RewriteMode so the LLM only fixes
 * what the Gatekeeper flagged — nothing else changes.
 */

import { callGemini } from "@/pipeline/llm/gemini";
import type { GeneratedItem } from "../writer/types";
import type { RewriteMode } from "../gatekeeper/Gatekeeper";

const MODE_INSTRUCTIONS: Record<RewriteMode, string> = {
  formatFix:
    "Fix structural formatting only. Ensure MCQ has exactly 4 options and answer matches one option.",
  distractorStrengthen:
    "Replace weak or implausible distractors with plausible, educationally-grounded alternatives.",
  clarityFix:
    "Rephrase for clarity. Reduce sentence length. Eliminate ambiguous phrasing.",
  cognitiveAdjust:
    "Align the question stem to the required Bloom level. Use the correct Bloom-level verbs.",
  difficultyAdjust:
    "Adjust difficulty. For 'easy', remove proof-level reasoning. For 'challenge', increase rigor.",
  topicGrounding:
    "Explicitly reference the required topic and/or domain in the question stem.",
};

export async function rewriteSingle({
  item,
  violations,
  mode,
}: {
  item: GeneratedItem;
  violations: string[];
  mode: RewriteMode;
}): Promise<GeneratedItem> {
  const isMC = item.questionType === "multipleChoice";
  const instruction = MODE_INSTRUCTIONS[mode];

  const prompt = `
You are REWRITER v4 — surgical mode.
You will fix ONLY the flagged issue in the problem below. Do NOT change the slotId,
questionType, cognitiveDemand, or any other field unless the instruction explicitly requires it.

PROBLEM:
${JSON.stringify(item, null, 2)}

VIOLATIONS DETECTED:
${violations.join("\n")}

REWRITE MODE: ${mode}
INSTRUCTION: ${instruction}

OUTPUT FORMAT (STRICT JSON ONLY — no markdown, no commentary):
{
  "slotId": "${item.slotId}",
  "questionType": "${item.questionType}",
  "prompt": "<fixed stem>",
  ${isMC ? `"options": ["...", "...", "...", "..."],` : ""}
  "answer": "<answer>"
}
`;

  const raw = await callGemini({
    model: "gemini-2.5-flash",
    prompt,
    temperature: 0.1,
    maxOutputTokens: 1024,
  });

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    // Replace bare `undefined` values (common LLM output)
    .replace(/:\s*undefined\b/g, ": null")
    // Remove trailing commas before } or ]
    .replace(/,\s*([}\]])/g, "$1")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Return original if rewriter fails to produce valid JSON — Gatekeeper
    // will catch it again on the second pass and log a hard error.
    console.error(
      `[rewriteSingle] No JSON in rewriter response for slot ${item.slotId}. Raw (first 200): ${cleaned.substring(0, 200)}`
    );
    return item;
  }

  try {
    const rewritten = JSON.parse(jsonMatch[0]) as GeneratedItem;
    // Preserve slot binding — LLM must not drift these
    rewritten.slotId = item.slotId;
    rewritten.questionType = item.questionType;
    return rewritten;
  } catch {
    console.error(`[rewriteSingle] Parse error for slot ${item.slotId}`);
    return item;
  }
}
