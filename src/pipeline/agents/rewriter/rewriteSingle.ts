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
    "Fix structural formatting only. For MCQ: ensure exactly 4 options, each prefixed 'A. ', 'B. ', 'C. ', 'D. ', and set 'answer' to the FULL matching option string (e.g. \"B. Find a common denominator\").",
  distractorStrengthen:
    "Replace weak or implausible distractors with plausible, educationally-grounded alternatives. Prefix options 'A. ', 'B. ', 'C. ', 'D. '. Set 'answer' to the FULL option string of the correct answer.",
  clarityFix:
    "Rephrase the prompt for clarity. Reduce sentence length. Eliminate ambiguous phrasing. Do not change options or answer.",
  cognitiveAdjust:
    "Rewrite the question stem so it uses verbs that match the required Bloom level (e.g. 'explain', 'apply', 'analyze'). Keep options and answer identical unless the stem change makes them semantically wrong.",
  difficultyAdjust:
    "Adjust difficulty. For 'easy', remove proof-level reasoning. For 'challenge', increase rigor. Preserve options format.",
  topicGrounding:
    "Explicitly reference the required topic and/or domain in the question stem. Preserve options and answer.",
};

// MCQ answer contract injected into every rewrite prompt
const MCQ_CONTRACT = `
MCQ CONTRACT (mandatory when questionType is "multipleChoice"):
- options: array of exactly 4 strings, each starting with its letter prefix: "A. ...", "B. ...", "C. ...", "D. ..."
- answer: the FULL text of the correct option (e.g. "B. Find a common denominator") — NOT just the letter.
- The value of "answer" MUST exactly match one of the strings in "options".
`.trim();

/** Escape any `"` that appears inside a JSON string but isn't a structural quote. */
function repairRewriterQuotes(json: string): string {
  let out = "";
  let inString = false;
  let i = 0;
  while (i < json.length) {
    const ch = json[i];
    if (ch === "\\" && inString) {
      out += ch + (json[i + 1] ?? "");
      i += 2;
      continue;
    }
    if (ch === '"') {
      if (!inString) {
        inString = true;
        out += ch;
      } else {
        let j = i + 1;
        while (j < json.length && (json[j] === " " || json[j] === "\t")) j++;
        const next = json[j] ?? "";
        if (next === "" || /[,:\}\]]/.test(next)) {
          inString = false;
          out += ch;
        } else {
          out += '\\"';
        }
      }
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

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

  const mcqExample = isMC
    ? `{
  "slotId": "${item.slotId}",
  "questionType": "multipleChoice",
  "prompt": "<question stem>",
  "options": ["A. <option A>", "B. <option B>", "C. <option C>", "D. <option D>"],
  "answer": "B. <option B>"
}`
    : `{
  "slotId": "${item.slotId}",
  "questionType": "${item.questionType}",
  "prompt": "<question stem>",
  "answer": "<answer text>"
}`;

  const prompt = `You are REWRITER v4 — surgical mode.
Fix ONLY the flagged violation(s). Do NOT change slotId or questionType.

${isMC ? MCQ_CONTRACT + "\n" : ""}
PROBLEM (current version):
${JSON.stringify(item, null, 2)}

VIOLATIONS TO FIX:
${violations.map((v, i) => `${i + 1}. ${v}`).join("\n")}

REWRITE MODE: ${mode}
INSTRUCTION: ${instruction}

OUTPUT (strict JSON only — no markdown fences, no commentary, no extra keys):
${mcqExample}`;

  const raw = await callGemini({
    model: "gemini-2.5-flash",
    prompt,
    temperature: 0.1,
    maxOutputTokens: 2048,
  });

  // ── Clean the LLM response ────────────────────────────────────────────────
  // Strip fences and common LLM JSON mistakes, then repair any unescaped
  // inner double-quotes (common in math prompts: "what does the "m" mean?")
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/:\s*undefined\b/g, ": null")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();

  // If the cleaned string doesn't parse, attempt inner-quote repair.
  const firstTry = cleaned.match(/\{[\s\S]*\}/)?.[0];
  if (firstTry) {
    try {
      JSON.parse(firstTry);
    } catch {
      // Repair unescaped inner quotes via a character-level walk
      cleaned = repairRewriterQuotes(cleaned);
    }
  }

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
