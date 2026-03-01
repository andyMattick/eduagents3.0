/**
 * writerParallel.ts
 *
 * Parallel, truncation-safe Writer engine.
 *
 * Architecture (replaces sequential writerAdaptive):
 *   1. Splits blueprint slots into fixed groups of 5.
 *   2. Each group gets its OWN prompt containing only that group's
 *      slot instructions — keeps LLM context small and avoids truncation.
 *   3. All groups are dispatched to the LLM in PARALLEL (Promise.allSettled).
 *   4. After all groups return, results are merged in slot order.
 *   5. A single Gatekeeper pass validates every item.
 *   6. Only items with violations are sent to the Rewriter (also in parallel).
 *   7. Rewritten items are re-gated (Gate 2) — best-effort accepted.
 *   8. Any missing slots (truncation / parse failure) get a targeted retry
 *      round (serial, small batch — fallback only).
 *
 * Why this is better:
 *   - Latency: N/5 groups run concurrently instead of N/3 serially.
 *   - Truncation: 5 items ≈ 4,500 tokens well within output limits.
 *   - Rewrite cost: Gatekeeper is local/instant; only offensive items
 *     incur an LLM rewrite call.
 *   - Telemetry: fully tracked, same interface as before.
 */

import type { BlueprintPlanV3_2 } from "@/pipeline/contracts/BlueprintPlanV3_2";
import type { UnifiedAssessmentRequest } from "@/pipeline/contracts/UnifiedAssessmentRequest";
import type { WriterContext, ScribePrescriptions } from "../writerPrompt";
import type { GeneratedItem } from "../types";

import { callGeminiStreaming } from "@/pipeline/llm/gemini";
import { buildChunkPrompt } from "./writerChunkPrompt";
import { Gatekeeper } from "@/pipeline/agents/gatekeeper/Gatekeeper";
import { rewriteSingle, generateArithmeticItem } from "@/pipeline/agents/rewriter/rewriteSingle";
import { createTelemetry, type WriterTelemetry } from "../telemetry";
import { computeBloomAlignment, type BloomAlignmentLog } from "@/pipeline/agents/gatekeeper/bloomClassifier";
import {
  runBloomHintBudget,
  applyAdaptiveDriftBoost,
  type HintMode,
} from "../bloomHintBudget";
import { SCRIBE } from "@/pipeline/agents/scribe/SCRIBE";

// Module-level bloom alignment log — reset each run, read by SCRIBE post-run
let _lastBloomAlignmentLog: BloomAlignmentLog = [];

/** Cache the rewrite count from the most recent run for the next run's budget. */
let _lastRunRewriteCount = 0;

/** Read the bloom alignment log from the most recent writerParallel run. */
export function getLastBloomAlignmentLog(): BloomAlignmentLog {
  return _lastBloomAlignmentLog;
}

// ── Tunables ─────────────────────────────────────────────────────────────────

/** Fixed group size — 5 slots per parallel agent call */
const GROUP_SIZE = 5;

/** Max retries for missing slots in the fallback round */
const MAX_RETRY_ROUNDS = 2;

/** Tokens-per-slot budget for maxOutputTokens.
 * 1400 gives ~500 tokens for the JSON skeleton + 900 for a full multi-sentence
 * short-answer response — comfortable even for single-slot retry calls. */
const TOKENS_PER_SLOT = 1400;

/**
 * Max Gatekeeper-triggered rewrite attempts for a single stubborn slot.
 * After this cap the best attempt is accepted and the run continues.
 */
const MAX_REWRITES_PER_SLOT = 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Walk the string character-by-character and escape any `"` that appears
 * *inside* a JSON string value (i.e. it is not a structural open/close quote).
 *
 * Decision rule for a `"` while `inString === true`:
 *   - If the immediately following non-whitespace chars look like a JSON
 *     structural token (`,`, `:`, `}`, `]`) → closing quote, end string.
 *   - If we are at the very end of input → closing quote.
 *   - Otherwise → inner quote, escape it as `\"`.
 *
 * This correctly handles prompts like:
 *   "what does the letter "m" represent?"
 */
function repairInnerQuotes(json: string): string {
  let out = "";
  let inString = false;
  let i = 0;
  while (i < json.length) {
    const ch = json[i];
    // Handle already-escaped sequences — pass through unchanged
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
        // Peek ahead (skip whitespace) to decide if this is structural
        let j = i + 1;
        while (j < json.length && (json[j] === " " || json[j] === "\t")) j++;
        const next = json[j] ?? "";
        const isStructural = next === "" || /[,:\}\]]/.test(next);
        if (isStructural) {
          inString = false;
          out += ch;
        } else {
          // Inner quote — escape it
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

function cleanLLMJson(raw: string): string {
  const step1 = raw
    // Strip markdown fences
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    // Replace bare `undefined` values with null (common LLM mistake)
    .replace(/:\s*undefined\b/g, ": null")
    // Remove trailing commas before } or ] (invalid JSON)
    .replace(/,\s*([}\]])/g, "$1")
    // Replace single-quoted strings with double-quoted (best effort)
    .replace(/'([^'\n]*)'/g, '"$1"')
    .trim();

  // If standard cleaning already produces valid JSON, return as-is.
  // Otherwise run the inner-quote repair and try again.
  try {
    JSON.parse(step1.match(/\{[\s\S]*\}/)?.[0] ?? "null");
    return step1;
  } catch {
    return repairInnerQuotes(step1);
  }
}

function extractJson(block: string): GeneratedItem | null {
  const cleaned = cleanLLMJson(block);
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn(
      `[extractJson] No JSON object found in block (${cleaned.length} chars): ${cleaned.substring(0, 200)}`
    );
    return null;
  }
  try {
    return JSON.parse(jsonMatch[0]) as GeneratedItem;
  } catch (err) {
    console.warn(
      `[extractJson] JSON.parse failed: ${(err as Error).message}\nRaw block (first 300 chars): ${jsonMatch[0].substring(0, 300)}`
    );
    return null;
  }
}

/**
 * Partition an array into balanced chunks of at most `size`.
 * Distributes items evenly to avoid tiny remainder groups.
 * e.g. 6 items with size=5 → [[3],[3]] instead of [[5],[1]]
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const numGroups = Math.ceil(arr.length / size);
  if (numGroups <= 1) return [arr.slice()];
  const baseSize = Math.floor(arr.length / numGroups);
  const larger = arr.length % numGroups;
  const groups: T[][] = [];
  let offset = 0;
  for (let i = 0; i < numGroups; i++) {
    const groupSize = i < larger ? baseSize + 1 : baseSize;
    groups.push(arr.slice(offset, offset + groupSize));
    offset += groupSize;
  }
  return groups;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WriterParallelResult {
  items: GeneratedItem[];
  telemetry: WriterTelemetry;
}

interface GroupResult {
  groupIndex: number;
  items: Map<string, GeneratedItem>; // slotId → item
  truncated: boolean;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function writerParallel(
  blueprint: BlueprintPlanV3_2,
  uar: UnifiedAssessmentRequest,
  scribePrescriptions: ScribePrescriptions
): Promise<WriterParallelResult> {
  const telemetry = createTelemetry();

  const context: WriterContext = {
    domain: uar.course ?? "unknown",
    topic: uar.topic ?? uar.lessonName ?? uar.unitName ?? "general",
    grade: uar.gradeLevels?.[0] ?? "unknown",
    unitName: uar.unitName ?? "",
    lessonName: uar.lessonName ?? null,
    additionalDetails: uar.additionalDetails ?? null,
    focusAreas: (uar as any).focusAreas ?? null,
    misconceptions: (uar as any).misconceptions ?? null,
    avoidList: (uar as any).avoidList ?? null,
    scopeWidth: blueprint.scopeWidth,
    previousSlotsSummary: [], // not used in parallel mode (no sequential dependency)
  };

  const allSlots = [...blueprint.slots];

  // ── Step 0: Pre-generate arithmetic fluency slots locally ─────────────
  // These never go to the LLM — deterministic, zero tokens, grade-scaled.
  const rawGrade = parseInt(String(uar.gradeLevels?.[0] ?? "4"), 10);
  const grade = isNaN(rawGrade) ? 4 : rawGrade;
  const topic = uar.topic ?? uar.lessonName ?? uar.unitName ?? "";

  const preGeneratedIds = new Set<string>();
  const preGenMap = new Map<string, GeneratedItem>();

  for (const slot of allSlots) {
    const acceptedTypes: string[] = (slot.questionTypes && slot.questionTypes.length > 0)
      ? slot.questionTypes
      : [slot.questionType];
    if (!acceptedTypes.includes("arithmeticFluency")) continue;

    const stub: GeneratedItem = {
      slotId: slot.id,
      questionType: "arithmeticFluency",
      prompt: "",
      answer: "",
    };
    const generated = generateArithmeticItem(stub, {
      grade,
      topic,
      operation: (slot as any).operation,
    });
    preGenMap.set(slot.id, generated);
    preGeneratedIds.add(slot.id);
  }

  // Only send non-arithmetic slots to the LLM
  const llmSlots = allSlots.filter(s => !preGeneratedIds.has(s.id));
  const groups = chunkArray(llmSlots, GROUP_SIZE);

  console.log(
    `[writerParallel] Dispatching ${groups.length} group(s) of up to ${GROUP_SIZE} slots in parallel` +
    ` (${llmSlots.length} LLM slots` +
    (preGeneratedIds.size > 0 ? ` + ${preGeneratedIds.size} arithmetic pre-generated` : "") +
    `).\n  Total: ${allSlots.length} slots.`
  );

  // ── Bloom Hint Budget: compute hint verbosity mode for this run ─────────
  // Use the PREVIOUS run's drift rate (captured before log reset in Step 4).
  const prevLog = _lastBloomAlignmentLog;
  const prevDrift  = prevLog.length > 0
    ? prevLog.filter(e => !e.aligned).length / prevLog.length
    : 0;

  // Compute depthCeiling from the blueprint slots
  const BLOOMS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;
  const maxBloomIdx = allSlots.reduce((max, s) => {
    const idx = BLOOMS.indexOf((s.cognitiveDemand ?? "understand") as typeof BLOOMS[number]);
    return idx > max ? idx : max;
  }, 0);
  const depthCeiling = BLOOMS[maxBloomIdx];

  const rawStudentLevel = (uar as any).studentLevel ?? "standard";
  const studentLevel: "remedial" | "standard" | "honors" | "ap" =
    ["remedial", "standard", "honors", "ap"].includes(rawStudentLevel)
      ? rawStudentLevel
      : "standard";

  const budgetResult = runBloomHintBudget({
    slotCount:                allSlots.length,
    timeMinutes:              (uar as any).timeLimit ?? (uar as any).durationMinutes ?? 30,
    depthCeiling,
    studentLevel,
    bloomDriftRate:           prevDrift,
    trustScore:               SCRIBE.getWriterTrustScore(),
    previousRunRewriteCount:  _lastRunRewriteCount,
  });
  const hintMode: HintMode = budgetResult.hintMode;
  console.log(
    `[writerParallel] BloomHintBudget: mode=${hintMode}, risk=${budgetResult.riskScore}`,
    budgetResult.trace
  );

  // ── Step 1: Dispatch all groups in parallel ─────────────────────────────
  const groupResults = await dispatchGroupsParallel(
    groups,
    context,
    scribePrescriptions,
    telemetry,
    hintMode
  );

  // ── Step 2: Merge into a single map ─────────────────────────────────────
  const allItems = new Map<string, GeneratedItem>();
  for (const gr of groupResults) {
    for (const [slotId, item] of gr.items) {
      allItems.set(slotId, item);
    }
  }
  // Inject pre-generated arithmetic items (Step 0) — they bypass the LLM entirely
  for (const [slotId, item] of preGenMap) {
    allItems.set(slotId, item);
  }
  if (preGenMap.size > 0) {
    console.log(`[writerParallel] Pre-generated ${preGenMap.size} arithmetic fluency slot(s) locally (grade=${grade}).`);
  }

  // ── Step 3: Identify missing slots & retry (fallback, serial) ───────────
  let missingSlots = allSlots.filter((s) => !allItems.has(s.id));

  if (missingSlots.length > 0) {
    console.warn(
      `[writerParallel] ${missingSlots.length} slot(s) missing after parallel round: [${missingSlots.map((s) => s.id).join(", ")}]. Retrying...`
    );

    for (let retry = 0; retry < MAX_RETRY_ROUNDS && missingSlots.length > 0; retry++) {
      const retryResult = await callGroupLLM(
        missingSlots,
        context,
        scribePrescriptions,
        telemetry,
        hintMode
      );

      for (const [slotId, item] of retryResult.items) {
        allItems.set(slotId, item);
      }

      missingSlots = allSlots.filter((s) => !allItems.has(s.id));
    }

    if (missingSlots.length > 0) {
      console.error(
        `[writerParallel] Hard failure: ${missingSlots.length} slot(s) could not be filled: [${missingSlots.map((s) => s.id).join(", ")}]`
      );
    }
  }

  // ── Step 3b: Micro self-check (zero LLM cost) ──────────────────────────
  // A fast boolean pre-screen before the expensive Gatekeeper pass.
  // Catches the two most common issues that lead to rewrites:
  //   (a) prompt has no keyword anchor from topic/lesson/unit
  //   (b) prompt has no verb that plausibly matches cognitiveDemand
  // Items that fail are flagged with a hint comment so the Gatekeeper
  // (which runs immediately after) has better violation messages.
  {
    const topicKeywords = [
      uar.topic ?? "",
      uar.lessonName ?? "",
      uar.unitName ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .split(/[\s\-_,]+/)
      .filter(w => w.length >= 3);

    const BLOOM_SIGNAL: Record<string, string[]> = {
      remember:  ["what", "which", "who", "when", "where", "list", "name", "define", "recall", "identify"],
      understand: ["explain", "describe", "summarize", "why", "how does", "what does", "classify", "means"],
      apply:     ["solve", "calculate", "use", "find", "compute", "convert", "show", "if", "given"],
      analyze:   ["compare", "contrast", "examine", "distinguish", "both", "why does", "identify"],
      evaluate:  ["justify", "defend", "judge", "assess", "which is best", "argue", "evaluate"],
      create:    ["design", "construct", "generate", "write", "formulate", "develop"],
    };

    for (const slot of allSlots) {
      const item = allItems.get(slot.id);
      if (!item) continue;
      const pLower = (item.prompt ?? "").toLowerCase();

      // (a) Topic anchor check
      const hasTopicKeyword = topicKeywords.length === 0 || topicKeywords.some(kw => pLower.includes(kw));
      if (!hasTopicKeyword) {
        console.warn(`[writerParallel] Micro-check: slot "${slot.id}" prompt has no topic keyword. ` +
          `Topic sources: ${[uar.topic, uar.lessonName, uar.unitName].filter(Boolean).join(", ")}`);
      }

      // (b) Bloom verb signal check (MC remember slots are exempt — they rarely use explicit verbs)
      const demand = (slot.cognitiveDemand ?? "").toLowerCase();
      const isRememberMC = demand === "remember" && slot.questionType === "multipleChoice";
      if (demand && !isRememberMC) {
        const signals = BLOOM_SIGNAL[demand] ?? [];
        const hasSignal = signals.some(s => pLower.includes(s));
        if (!hasSignal) {
          console.warn(`[writerParallel] Micro-check: slot "${slot.id}" prompt may lack Bloom verb for "${demand}".`);
        }
      }
    }
  }

  // ── Step 4: Gatekeeper pass on ALL collected items ──────────────────────
  // Use validateSingle per item (avoids type mismatch between contract and
  // types BlueprintPlanV3_2 — same pattern writerAdaptive used).
  const allViolations: { slotId: string; type: string; message: string }[] = [];

  // Reset the module-level bloom log for this run
  _lastBloomAlignmentLog = [];

  for (const slot of allSlots) {
    const item = allItems.get(slot.id);
    if (!item) continue;

    const result = Gatekeeper.validateSingle(
      slot,
      item,
      uar as Record<string, any>,
      blueprint.scopeWidth
    );

    telemetry.gatekeeperViolations += result.violations.length;
    allViolations.push(...result.violations);

    // Bloom alignment logging: compare slot intent vs detected Bloom level
    if (slot.cognitiveDemand) {
      const entry = computeBloomAlignment(
        slot.id,
        slot.cognitiveDemand as any,
        item.prompt ?? ""
      );
      _lastBloomAlignmentLog.push(entry);

      if (!entry.aligned) {
        console.warn(
          `[Bloom] ${slot.id}: intent=${entry.writerBloom} | ` +
          `detected=${entry.gatekeeperBloom ?? "none"} | ` +
          `direction=${entry.direction} [MISMATCH]`
        );
      } else {
        console.log(
          `[Bloom] ${slot.id}: intent=${entry.writerBloom} | ` +
          `detected=${entry.gatekeeperBloom} [✓]`
        );
      }
    }
  }

  if (allViolations.length === 0) {
    console.log("[writerParallel] Gatekeeper: all items passed.");
  } else {
    console.warn(
      `[writerParallel] Gatekeeper found ${allViolations.length} violation(s). Sending offending items to Rewriter.`
    );

    // ── Step 5: Rewrite only offensive items (in parallel) ────────────────
    await rewriteOffendingItems(
      allViolations,
      allItems,
      allSlots,
      uar,
      blueprint,
      telemetry
    );
  }

  // ── Step 5b: Forbidden generic-phrase post-scan ──────────────────────────
  // These patterns are never subject-specific and consistently trigger
  // Gatekeeper topic/domain violations in subsequent runs. Catch them here
  // before they leave the Writer so SCRIBE never learns them as weaknesses.
  const FORBIDDEN_PHRASES = [
    "in general mathematics",
    "from a general perspective",
    "in everyday terms",
    "as a matter of general knowledge",
    "generally speaking",
    "in mathematics generally",
    "in general terms",
    "in a general sense",
    "as a general rule",
  ];

  const phraseScanViolations: { slotId: string; type: string; message: string }[] = [];
  for (const slot of allSlots) {
    const item = allItems.get(slot.id);
    if (!item) continue;
    const text = (item.prompt ?? "").toLowerCase();
    const matched = FORBIDDEN_PHRASES.filter((p) => text.includes(p));
    if (matched.length > 0) {
      phraseScanViolations.push({
        slotId: slot.id,
        type: "forbidden_phrase",
        message: `Prompt contains generic filler phrases: "${matched.join('", "')}". Replace with subject-specific language tied to the lesson topic.`,
      });
      telemetry.gatekeeperViolations += 1;
    }
  }

  if (phraseScanViolations.length > 0) {
    console.warn(
      `[writerParallel] Forbidden-phrase scan found ${phraseScanViolations.length} item(s). Rewriting...`
    );
    await rewriteOffendingItems(
      phraseScanViolations,
      allItems,
      allSlots,
      uar,
      blueprint,
      telemetry
    );
  }

  // ── Step 6: Return in original slot order ───────────────────────────────
  const finalItems = allSlots.flatMap((s) => {
    const item = allItems.get(s.id);
    return item ? [item] : [];
  });

  telemetry.finalProblemCount = finalItems.length;

  // ── Adaptive Drift Boost (Step 6 of budget algorithm) ───────────────────
  // Compute the drift rate for THIS run and schedule a hint boost if needed.
  const thisRunDrift = _lastBloomAlignmentLog.length > 0
    ? _lastBloomAlignmentLog.filter(e => !e.aligned).length / _lastBloomAlignmentLog.length
    : 0;
  const boostMsg = applyAdaptiveDriftBoost(thisRunDrift);
  console.log(boostMsg);

  // Cache rewrite count for the budget algorithm's stability check next run.
  _lastRunRewriteCount = telemetry.rewriteCount;

  return { items: finalItems, telemetry };
}

// ── Parallel dispatch ─────────────────────────────────────────────────────────

async function dispatchGroupsParallel(
  groups: BlueprintPlanV3_2["slots"][],
  context: WriterContext,
  scribe: ScribePrescriptions,
  telemetry: WriterTelemetry,
  hintMode: HintMode = "FULL"
): Promise<GroupResult[]> {
  const promises = groups.map((group, idx) =>
    callGroupLLM(group, context, scribe, telemetry, hintMode).then((result) => ({
      ...result,
      groupIndex: idx,
    }))
  );

  const settled = await Promise.allSettled(promises);
  const results: GroupResult[] = [];

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
    } else {
      console.error(
        `[writerParallel] Group ${i} failed entirely:`,
        outcome.reason
      );
      // Push empty result — slots will be picked up by the retry round
      results.push({ groupIndex: i, items: new Map(), truncated: true });
      telemetry.truncationEvents++;
    }
  }

  return results;
}

// ── Single group LLM call (used by both parallel dispatch and retry) ──────────

async function callGroupLLM(
  slots: BlueprintPlanV3_2["slots"],
  context: WriterContext,
  scribe: ScribePrescriptions,
  telemetry: WriterTelemetry,
  hintMode: HintMode = "FULL"
): Promise<GroupResult> {
  telemetry.chunkSizes.push(slots.length);

  const rawBlocks: string[] = [];
  let truncated = false;

  const prompt = buildChunkPrompt(slots, context, scribe, hintMode);

  await callGeminiStreaming({
    model: "gemini-2.5-flash",
    prompt,
    temperature: 0.2,
    maxOutputTokens: Math.min(8192, slots.length * TOKENS_PER_SLOT),
    onItem: (block) => {
      rawBlocks.push(block);
    },
    onTruncation: (leftover) => {
      truncated = true;
      const salvaged = extractJson(leftover);
      if (salvaged) {
        rawBlocks.push(leftover);
        console.warn(
          `[writerParallel] Group truncated — partial block salvaged (position ${rawBlocks.length - 1}).`
        );
      } else {
        console.warn(
          `[writerParallel] Group truncated. Got ${rawBlocks.length}/${slots.length} complete items.`
        );
      }
    },
  });

  if (truncated) {
    telemetry.truncationEvents++;
  }

  // Parse and bind to slots by position
  const items = new Map<string, GeneratedItem>();

  for (let i = 0; i < rawBlocks.length; i++) {
    const slot = slots[i];
    if (!slot) continue;

    const parsed = extractJson(rawBlocks[i]);
    if (!parsed) {
      console.warn(
        `[writerParallel] Block ${i} for slot "${slot.id}" failed JSON parse — will retry.`
      );
      continue;
    }

    // Enforce slot binding
    parsed.slotId = slot.id;
    parsed.questionType = slot.questionType;

    items.set(slot.id, parsed);
  }

  return { groupIndex: 0, items, truncated };
}

// ── Gatekeeper-driven rewrite (only offensive items) ──────────────────────────
//
// Each offending slot gets up to MAX_REWRITES_PER_SLOT attempts.
// After the cap the best attempt is accepted — the run never hard-fails
// because of a single stubborn slot.

async function rewriteOffendingItems(
  violations: { slotId: string; type: string; message: string }[],
  allItems: Map<string, GeneratedItem>,
  allSlots: BlueprintPlanV3_2["slots"],
  uar: UnifiedAssessmentRequest,
  blueprint: BlueprintPlanV3_2,
  telemetry: WriterTelemetry
): Promise<void> {
  const slotCount = allSlots.length;

  const violationsBySlot = new Map<string, typeof violations>();
  for (const v of violations) {
    const list = violationsBySlot.get(v.slotId) ?? [];
    list.push(v);
    violationsBySlot.set(v.slotId, list);
  }

  const rewriteTasks: Promise<void>[] = [];

  for (const [slotId, initialViolations] of violationsBySlot) {

    const slot = allSlots.find((s) => s.id === slotId);
    if (!slot) continue;

    const startingItem = allItems.get(slotId);
    if (!startingItem) continue;

    rewriteTasks.push((async () => {

      let current = startingItem;
      let currentViolations = initialViolations.map(v => v.message);

      // ✅ Track best candidate OUTSIDE loop
      let bestCandidate = startingItem;
      let bestViolationCount = initialViolations.length;
      let stagnationCount = 0;

      for (let attempt = 1; attempt <= MAX_REWRITES_PER_SLOT; attempt++) {
        const MAX_TOTAL_REWRITES = Math.min(slotCount * 3, 30);
        // 🔒 GLOBAL CAP CHECK (before increment + rewrite)
        if (telemetry.rewriteCount >= MAX_TOTAL_REWRITES) {
          console.warn(
            `[writerParallel] Global rewrite cap reached (${MAX_TOTAL_REWRITES}). ` +
            `Accepting best candidate for slot "${slotId}".`
          );
          allItems.set(slotId, bestCandidate);
          return;
        }

        telemetry.rewriteCount++;

        const singleResult = Gatekeeper.validateSingle(
          slot,
          current,
          uar as Record<string, any>,
          blueprint.scopeWidth
        );

        const rewritten = await rewriteSingle({
          item: current,
          violations: currentViolations,
          mode: singleResult.mode,
        });

        const gateResult = Gatekeeper.validateSingle(
          slot,
          rewritten,
          uar as Record<string, any>,
          blueprint.scopeWidth
        );

        telemetry.gatekeeperViolations += gateResult.violations.length;

        // ✅ CLEAN SUCCESS
        if (gateResult.ok) {
          allItems.set(slotId, rewritten);
          return;
        }

        const violationCount = gateResult.violations.length;

        // 🏆 Track best candidate
        if (violationCount < bestViolationCount) {
          bestCandidate = rewritten;
          bestViolationCount = violationCount;
          stagnationCount = 0;
        } else {
          stagnationCount++;
        }

        // 🛑 STAGNATION DETECTION (prevents oscillation)
        if (stagnationCount >= 2) {
          console.warn(
            `[writerParallel] Slot "${slotId}" stagnated after ${attempt} attempts. ` +
            `Accepting best candidate.`
          );
          allItems.set(slotId, bestCandidate);
          return;
        }

        // Promote rewrite for next attempt
        current = rewritten;
        currentViolations = gateResult.violations.map(v => v.message);

        // 🔚 PER-SLOT CAP
        if (attempt === MAX_REWRITES_PER_SLOT) {
          console.warn(
            `[writerParallel] Slot "${slotId}" hit rewrite cap (${MAX_REWRITES_PER_SLOT}). ` +
            `Accepting best candidate with ${bestViolationCount} remaining violations.`
          );
          allItems.set(slotId, bestCandidate);
          return;
        }
      }

    })());
  }

  const settled = await Promise.allSettled(rewriteTasks);

  for (const outcome of settled) {
    if (outcome.status === "rejected") {
      console.error("[writerParallel] Rewrite task failed:", outcome.reason);
    }
  }
}
