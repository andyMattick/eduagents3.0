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

/** Regenerates a fresh arithmetic expression scaled to grade level and topic.
 *  No LLM call — deterministic and instant.
 */
export interface ArithmeticContext {
  /** Numeric grade level, e.g. 6. Parsed from the first element of uar.gradeLevels. */
  grade?: number;
  /** Topic string (e.g. "multi-digit multiplication and long division") */
  topic?: string;
  /** Slot-level operator constraint ("add"|"subtract"|"multiply"|"divide"|"any") */
  operation?: string;
  /** Operand range from UAR. When present, BOTH operands are constrained to [min, max]. Overrides grade-scaled defaults. */
  range?: { min: number; max: number };
}

/** Pick a random int in [min, max] inclusive. */
function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Detect which operators the topic implies. Returns null when topic is neutral. */
function operatorsFromTopic(topic: string): string[] | null {
  const t = topic.toLowerCase();
  const hasMul = /multipl|times|product/.test(t);
  const hasDiv = /divis|quotient|divided/.test(t);
  const hasAdd = /addit|sum|plus/.test(t);
  const hasSub = /subtract|minus|difference/.test(t);
  const ops: string[] = [];
  if (hasMul) ops.push("×");
  if (hasDiv) ops.push("÷");
  if (hasAdd) ops.push("+");
  if (hasSub) ops.push("-");
  return ops.length > 0 ? ops : null;
}

export function generateArithmeticItem(
  item: GeneratedItem,
  ctx: ArithmeticContext = {}
): GeneratedItem {
  const grade = ctx.grade ?? 4;
  const topic = ctx.topic ?? "";

  // ── Pick operator ──────────────────────────────────────────────────────
  //  Priority: 1. slot.operation constraint  2. topic keywords  3. fallback from item
  let op: string;

  if (ctx.operation && ctx.operation !== "any") {
    const opMap: Record<string, string> = {
      add: "+", subtract: "-", multiply: "×", divide: "÷",
    };
    op = opMap[ctx.operation] ?? "+";
  } else {
    const topicOps = operatorsFromTopic(topic);
    if (topicOps) {
      op = topicOps[Math.floor(Math.random() * topicOps.length)];
    } else {
      // Fall back to original item's operator if detectable
      const original = item.prompt ?? "";
      const opMatch = original.match(/[+\-×÷*/]/);
      const rawOp = opMatch?.[0] ?? "+";
      op = rawOp === "*" ? "×" : rawOp === "/" ? "÷" : rawOp;
    }
  }

  // ── Number ranges ───────────────────────────────────────────────────────
  // When ctx.range is provided (from UAR), BOTH operands must stay within
  // [range.min, range.max].  This is the authoritative override — grade-scaled
  // defaults only apply as a fallback when no explicit range is given.
  let a: number;
  let b: number;
  let answer: number;

  const rMin = ctx.range?.min ?? null;
  const rMax = ctx.range?.max ?? null;
  const hasRange = rMin !== null && rMax !== null;

  if (op === "+" || op === "-") {
    if (hasRange) {
      a = randRange(rMin!, rMax!); b = randRange(rMin!, rMax!);
    } else if (grade <= 2) {
      a = randRange(1, 10); b = randRange(1, 10);
    } else if (grade <= 4) {
      a = randRange(10, 99); b = randRange(1, 49);
    } else if (grade <= 5) {
      a = randRange(100, 499); b = randRange(10, 99);
    } else if (grade <= 6) {
      a = randRange(100, 999); b = randRange(100, 499);
    } else {
      a = randRange(1000, 9999); b = randRange(100, 999);
    }
    if (op === "-") {
      if (a < b) { const tmp = a; a = b; b = tmp; }
      answer = a - b;
    } else {
      answer = a + b;
    }
  } else if (op === "×") {
    if (hasRange) {
      a = randRange(rMin!, rMax!); b = randRange(rMin!, rMax!);
    } else if (grade <= 3) {
      a = randRange(1, 9); b = randRange(1, 9);
    } else if (grade <= 4) {
      a = randRange(1, 12); b = randRange(1, 12);
    } else if (grade <= 5) {
      a = randRange(10, 29); b = randRange(2, 9);
    } else if (grade <= 6) {
      if (Math.random() < 0.5) {
        a = randRange(11, 59); b = randRange(11, 19);
      } else {
        a = randRange(100, 399); b = randRange(2, 9);
      }
    } else {
      a = randRange(100, 499); b = randRange(12, 49);
    }
    answer = a * b;
  } else {
    // Division (÷) — always whole-number quotient, no remainders
    if (hasRange) {
      // Pick quotient and divisor within range; compute dividend
      answer = randRange(rMin!, rMax!); b = randRange(Math.max(rMin!, 2), rMax!);
    } else if (grade <= 3) {
      answer = randRange(1, 9); b = randRange(1, 9);
    } else if (grade <= 4) {
      answer = randRange(1, 12); b = randRange(1, 12);
    } else if (grade <= 5) {
      answer = randRange(2, 19); b = randRange(2, 9);
    } else if (grade <= 6) {
      if (Math.random() < 0.5) {
        answer = randRange(10, 99); b = randRange(2, 9);
      } else {
        answer = randRange(10, 99); b = randRange(10, 49);
      }
    } else {
      answer = randRange(10, 199); b = randRange(10, 99);
    }
    a = answer * b;
  }

  return {
    ...item,
    prompt: `${a} ${op} ${b}`,
    answer: String(answer),
    options: undefined,
  };
}

/** Thin wrapper kept for internal rewriteSingle call-site (no context available). */
function regenerateArithmeticItem(item: GeneratedItem): GeneratedItem {
  return generateArithmeticItem(item);
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
  // Arithmetic fluency items must never go through LLM rewrites.
  // A bad expression (wrong answer / bad format) is regenerated locally — fast, zero tokens.
  if (item.questionType === "arithmeticFluency") {
    return regenerateArithmeticItem(item);
  }

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

  // Multi-part FRQ prompts (AP stats, essay, etc.) can easily exceed 2048 tokens.
  // Truncated output leaves unclosed JSON → regex fails → item is silently kept broken.
  // Use 4096 for non-MCQ, 2048 is sufficient for MCQ-only rewrites.
  const raw = await callGemini({
    model: "gemini-2.5-flash",
    prompt,
    temperature: 0.1,
    maxOutputTokens: isMC ? 2048 : 4096,
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

  let jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  // ── Truncation recovery ───────────────────────────────────────────────────
  // When maxOutputTokens is hit mid-response the JSON has no closing brace.
  // Attempt to close the object so the regex can at least extract a partial match.
  if (!jsonMatch && cleaned.trimStart().startsWith("{")) {
    // Count open braces: append the missing closing braces
    let depth = 0;
    let inStr = false;
    for (let ci = 0; ci < cleaned.length; ci++) {
      const ch = cleaned[ci];
      if (ch === "\\" && inStr) { ci++; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
      }
    }
    if (depth > 0) {
      // Strip trailing comma/whitespace then close the object
      const patched = cleaned.replace(/[,\s]+$/, "") + "}".repeat(depth);
      jsonMatch = patched.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.warn(
          `[rewriteSingle] Truncated JSON patched for slot ${item.slotId} (added ${depth} closing brace(s)).`
        );
      }
    }
  }

  if (!jsonMatch) {
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
    // Fix LLM tokenization artifacts: "10or" → "10 or", "789is" → "789 is"
    const fixSpacing = (s: string) =>
      s.replace(/(\d)([A-Za-z])/g, "$1 $2").replace(/([A-Za-z])(\d)/g, "$1 $2");
    rewritten.prompt  = fixSpacing(rewritten.prompt ?? "");
    if (rewritten.answer) rewritten.answer = fixSpacing(rewritten.answer);
    if (rewritten.options) rewritten.options = rewritten.options.map(fixSpacing);
    return rewritten;
  } catch {
    console.error(`[rewriteSingle] Parse error for slot ${item.slotId}`);
    return item;
  }
}
