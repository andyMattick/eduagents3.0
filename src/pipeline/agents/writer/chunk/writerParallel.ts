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
import { rewriteSingle } from "@/pipeline/agents/rewriter/rewriteSingle";
import { createTelemetry, type WriterTelemetry } from "../telemetry";

// ── Tunables ─────────────────────────────────────────────────────────────────

/** Fixed group size — 5 slots per parallel agent call */
const GROUP_SIZE = 5;

/** Max retries for missing slots in the fallback round */
const MAX_RETRY_ROUNDS = 2;

/** Tokens-per-slot budget for maxOutputTokens */
const TOKENS_PER_SLOT = 900;

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanLLMJson(raw: string): string {
  return raw
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

/** Partition an array into chunks of `size` */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    groups.push(arr.slice(i, i + size));
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
    topic: uar.topic ?? "unknown",
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
  const groups = chunkArray(allSlots, GROUP_SIZE);

  console.log(
    `[writerParallel] Dispatching ${groups.length} group(s) of up to ${GROUP_SIZE} slots in parallel (${allSlots.length} total slots).`
  );

  // ── Step 1: Dispatch all groups in parallel ─────────────────────────────
  const groupResults = await dispatchGroupsParallel(
    groups,
    context,
    scribePrescriptions,
    telemetry
  );

  // ── Step 2: Merge into a single map ─────────────────────────────────────
  const allItems = new Map<string, GeneratedItem>();
  for (const gr of groupResults) {
    for (const [slotId, item] of gr.items) {
      allItems.set(slotId, item);
    }
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
        telemetry
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

  // ── Step 4: Gatekeeper pass on ALL collected items ──────────────────────
  // Use validateSingle per item (avoids type mismatch between contract and
  // types BlueprintPlanV3_2 — same pattern writerAdaptive used).
  const allViolations: { slotId: string; type: string; message: string }[] = [];

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

  // ── Step 6: Return in original slot order ───────────────────────────────
  const finalItems = allSlots.flatMap((s) => {
    const item = allItems.get(s.id);
    return item ? [item] : [];
  });

  telemetry.finalProblemCount = finalItems.length;
  return { items: finalItems, telemetry };
}

// ── Parallel dispatch ─────────────────────────────────────────────────────────

async function dispatchGroupsParallel(
  groups: BlueprintPlanV3_2["slots"][],
  context: WriterContext,
  scribe: ScribePrescriptions,
  telemetry: WriterTelemetry
): Promise<GroupResult[]> {
  const promises = groups.map((group, idx) =>
    callGroupLLM(group, context, scribe, telemetry).then((result) => ({
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
  telemetry: WriterTelemetry
): Promise<GroupResult> {
  telemetry.chunkSizes.push(slots.length);

  const rawBlocks: string[] = [];
  let truncated = false;

  const prompt = buildChunkPrompt(slots, context, scribe);

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

async function rewriteOffendingItems(
  violations: { slotId: string; type: string; message: string }[],
  allItems: Map<string, GeneratedItem>,
  allSlots: BlueprintPlanV3_2["slots"],
  uar: UnifiedAssessmentRequest,
  blueprint: BlueprintPlanV3_2,
  telemetry: WriterTelemetry
): Promise<void> {
  // Group violations by slotId
  const violationsBySlot = new Map<string, typeof violations>();
  for (const v of violations) {
    const list = violationsBySlot.get(v.slotId) ?? [];
    list.push(v);
    violationsBySlot.set(v.slotId, list);
  }

  // Build rewrite tasks — only for slots that have an existing item
  const rewriteTasks: Promise<void>[] = [];

  for (const [slotId, slotViolations] of violationsBySlot) {
    const item = allItems.get(slotId);
    if (!item) continue; // missing item — handled by retry, not rewrite

    const slot = allSlots.find((s) => s.id === slotId);
    if (!slot) continue;

    telemetry.rewriteCount++;

    // Determine dominant RewriteMode from the Gatekeeper
    const singleResult = Gatekeeper.validateSingle(
      slot,
      item,
      uar as Record<string, any>,
      blueprint.scopeWidth
    );

    rewriteTasks.push(
      rewriteSingle({
        item,
        violations: slotViolations.map((v) => v.message),
        mode: singleResult.mode,
      }).then((rewritten) => {
        // Gate 2 — verify the rewrite fixed the issue
        const gate2 = Gatekeeper.validateSingle(
          slot,
          rewritten,
          uar as Record<string, any>,
          blueprint.scopeWidth
        );

        telemetry.gatekeeperViolations += gate2.violations.length;

        if (!gate2.ok) {
          console.error(
            `[writerParallel] Slot "${slotId}" still has violations after rewrite:`,
            gate2.violations
          );
          // Accept best-effort rewrite — better than a gap
        }

        allItems.set(slotId, rewritten);
      })
    );
  }

  // Fire all rewrites in parallel
  const settled = await Promise.allSettled(rewriteTasks);

  for (const outcome of settled) {
    if (outcome.status === "rejected") {
      console.error("[writerParallel] Rewrite task failed:", outcome.reason);
    }
  }
}
