/**
 * writerAdaptive.ts
 *
 * Adaptive, truncation-safe Writer engine — streaming mode.
 *
 * Architecture:
 *   - Splits blueprint slots into batches (chunks).
 *   - Streams each chunk from the LLM via callGeminiStreaming.
 *   - Each <END_OF_PROBLEM> sentinel fires an onItem callback in real time.
 *   - After the stream ends, each raw block is parsed, slot-bound, and run
 *     through Gate 1 → optional Rewrite → Gate 2 immediately.
 *   - On truncation, only the MISSING slots are retried (not the whole batch).
 *   - chunkSize shrinks on truncation, grows on clean runs.
 *   - Emits telemetry; never surfaces chunking internals to the caller.
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

const DEFAULT_CHUNK_SIZE = 3;
const MAX_CHUNK_SIZE = 6;
const MIN_CHUNK_SIZE = 1;
const MAX_TRUNCATION_RETRIES = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function halve(n: number): number {
  return Math.max(MIN_CHUNK_SIZE, Math.floor(n / 2));
}

function increment(n: number): number {
  return Math.min(MAX_CHUNK_SIZE, n + 1);
}

function extractJson(block: string): GeneratedItem | null {
  const cleaned = block
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    // Replace bare `undefined` values with null (common LLM mistake)
    .replace(/:\s*undefined\b/g, ": null")
    // Remove trailing commas before } or ]
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn(
      `[extractJson] No JSON object in block (${cleaned.length} chars): ${cleaned.substring(0, 200)}`
    );
    return null;
  }
  try {
    return JSON.parse(jsonMatch[0]) as GeneratedItem;
  } catch (err) {
    console.warn(
      `[extractJson] JSON.parse failed: ${(err as Error).message}\nRaw (first 300): ${jsonMatch[0].substring(0, 300)}`
    );
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface WriterAdaptiveResult {
  items: GeneratedItem[];
  telemetry: WriterTelemetry;
}

export async function writerAdaptive(
  blueprint: BlueprintPlanV3_2,
  uar: UnifiedAssessmentRequest,
  scribePrescriptions: ScribePrescriptions
): Promise<WriterAdaptiveResult> {
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
    previousSlotsSummary: [],
  };

  const acceptedItems: GeneratedItem[] = [];
  const allSlots = [...blueprint.slots];

  let chunkSize = DEFAULT_CHUNK_SIZE;
  let offset = 0;

  while (offset < allSlots.length) {
    const batch = allSlots.slice(offset, offset + chunkSize);

    context.previousSlotsSummary = acceptedItems.map((item) => ({
      id: item.slotId,
      questionType: item.questionType,
      cognitiveDemand: "unknown",
      difficulty: "medium",
    }));

    const batchItems = await callStreamWithGateRetry(
      batch,
      context,
      scribePrescriptions,
      uar,
      blueprint,
      telemetry
    );

    acceptedItems.push(...batchItems);

    // Adapt chunk size for the next batch
    const batchWasTruncated = batchItems.length < batch.length;
    chunkSize = batchWasTruncated ? halve(chunkSize) : increment(chunkSize);

    offset += batch.length;
  }

  telemetry.finalProblemCount = acceptedItems.length;
  return { items: acceptedItems, telemetry };
}

// ── Streaming batch call with per-item gating ─────────────────────────────────
//
// 1. Opens a streaming LLM call for `slots`.
// 2. Each <END_OF_PROBLEM> block fires onItem → collected in rawBlocks.
// 3. After stream ends: parse each block, Gate 1 → Rewrite → Gate 2.
// 4. Only slots that still have no item are retried (targeted, not full rebatch).

async function callStreamWithGateRetry(
  slots: BlueprintPlanV3_2["slots"],
  context: WriterContext,
  scribe: ScribePrescriptions,
  uar: UnifiedAssessmentRequest,
  blueprint: BlueprintPlanV3_2,
  telemetry: WriterTelemetry
): Promise<GeneratedItem[]> {
  const acceptedBySlotId = new Map<string, GeneratedItem>();

  let remainingSlots = [...slots];
  let truncationRetries = MAX_TRUNCATION_RETRIES;

  while (remainingSlots.length > 0 && truncationRetries > 0) {
    const batchToSend = remainingSlots;
    telemetry.chunkSizes.push(batchToSend.length);

    const rawBlocks: string[] = [];
    let streamTruncated = false;

    const prompt = buildChunkPrompt(batchToSend, context, scribe);

    await callGeminiStreaming({
      model: "gemini-2.5-flash",
      prompt,
      temperature: 0.2,
      maxOutputTokens: Math.min(8192, batchToSend.length * 900),
      onItem: (block) => {
        rawBlocks.push(block);
      },
      onTruncation: (leftover) => {
        streamTruncated = true;
        // Try to salvage the truncated partial block as a single JSON object
        const salvaged = extractJson(leftover);
        if (salvaged) {
          rawBlocks.push(leftover);
          console.warn(
            `[writerAdaptive] Stream truncated but partial block salvaged for position ${rawBlocks.length - 1}.`
          );
        } else {
          console.warn(
            `[writerAdaptive] Stream truncated. Got ${rawBlocks.length}/${batchToSend.length} complete items.`
          );
        }
      },
    });

    if (streamTruncated) {
      telemetry.truncationEvents++;
    }

    // Gate each received block, bound to slot by position
    for (let i = 0; i < rawBlocks.length; i++) {
      const slot = batchToSend[i];
      if (!slot) continue;

      const parsed = extractJson(rawBlocks[i]);
      if (!parsed) {
        console.warn(`[writerAdaptive] Block ${i} for slot "${slot.id}" failed JSON parse — will retry slot.`);
        continue;
      }

      // Enforce slot binding
      parsed.slotId = slot.id;
      parsed.questionType = slot.questionType;

      const accepted = await gateItem(parsed, slot, uar, blueprint, telemetry);
      acceptedBySlotId.set(slot.id, accepted);
    }

    // Only retry slots that still have no accepted item
    remainingSlots = batchToSend.filter((s) => !acceptedBySlotId.has(s.id));

    if (remainingSlots.length > 0 && truncationRetries > 1) {
      console.warn(
        `[writerAdaptive] Retrying ${remainingSlots.length} missing slot(s): [${remainingSlots.map((s) => s.id).join(", ")}]`
      );
    }

    truncationRetries--;
  }

  if (remainingSlots.length > 0) {
    console.error(
      `[writerAdaptive] Hard failure: ${remainingSlots.length} slot(s) could not be filled: [${remainingSlots.map((s) => s.id).join(", ")}]`
    );
  }

  // Return in original slot order
  return slots.flatMap((s) => {
    const item = acceptedBySlotId.get(s.id);
    return item ? [item] : [];
  });
}

// ── Per-item Gate 1 → Rewrite → Gate 2 ───────────────────────────────────────

async function gateItem(
  item: GeneratedItem,
  slot: BlueprintPlanV3_2["slots"][number],
  uar: UnifiedAssessmentRequest,
  blueprint: BlueprintPlanV3_2,
  telemetry: WriterTelemetry
): Promise<GeneratedItem> {
  const gate1 = Gatekeeper.validateSingle(
    slot,
    item,
    uar as Record<string, any>,
    blueprint.scopeWidth
  );

  telemetry.gatekeeperViolations += gate1.violations.length;

  if (gate1.ok) {
    return item;
  }

  // Rewrite
  telemetry.rewriteCount++;
  const rewritten = await rewriteSingle({
    item,
    violations: gate1.violations.map((v) => v.message),
    mode: gate1.mode,
  });

  // Gate 2
  const gate2 = Gatekeeper.validateSingle(
    slot,
    rewritten,
    uar as Record<string, any>,
    blueprint.scopeWidth
  );

  telemetry.gatekeeperViolations += gate2.violations.length;

  if (!gate2.ok) {
    console.error(
      `[writerAdaptive] Slot "${slot.id}" failed Gate 2 after rewrite.`,
      gate2.violations
    );
    // Accept best-effort rewrite — better than a gap in the assessment
  }

  return rewritten;
}
