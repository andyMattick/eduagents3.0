/**
 * adjustPlanForTime.ts
 *
 * Makes teacher time a hard constraint, not advisory.
 *
 * After the Architect builds its initial slot list it calls this function.
 * If `realisticTotalMinutes > teacherMinutes + TIME_TOLERANCE_MINUTES`, we
 * iteratively reduce the plan via three progressively invasive phases:
 *
 *   Phase 1 — Simplify item types  (no cognitive loss)
 *     constructedResponse → shortAnswer → multipleChoice/trueFalse
 *     Cheapest savings: constructed responses cost 240–400 s each.
 *
 *   Phase 2 — Lower Bloom ceiling  (cognitive loss — least vocabulary change)
 *     Replace the highest-demand slots with the next lower level, one pass.
 *     Stops when budget is met or depthCeiling would fall below depthFloor.
 *
 *   Phase 3 — Reduce questionCount  (last resort)
 *     Drop trailing slots until budget fits.
 *
 * Each phase re-estimates time after mutations; the next phase only activates
 * if still over budget.  A full trace of every decision is returned.
 *
 * @returns Mutated (new) slot array plus diagnostic metadata. Original array
 * is NOT modified.
 */

import type { BlueprintSlot } from "@/types/Blueprint";
import type { CognitiveProcess } from "@/pipeline/contracts/BlueprintPlanV3_2";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** How many minutes over the teacher's limit we tolerate before adjusting. */
export const TIME_TOLERANCE_MINUTES = 1;

/** Ordered simplification ladder for question types (fastest-saving first). */
const TYPE_SIMPLIFICATION_LADDER: Array<{ from: string; to: string }> = [
  { from: "constructedResponse", to: "shortAnswer" },
  { from: "shortAnswer",         to: "multipleChoice" },
  { from: "ordering",            to: "multipleChoice" },
  { from: "matching",            to: "multipleChoice" },
  { from: "fillInTheBlank",      to: "multipleChoice" },
  { from: "image",               to: "multipleChoice" },
  { from: "trueFalse",           to: "multipleChoice" }, // already fast, but keeps ladder complete
];

/** Bloom order for ceiling-lowering (Phase 2). */
const BLOOM_ORDER: CognitiveProcess[] = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TimeAdjustmentResult {
  /** Adjusted slot array (shallow-clone of originals with mutations applied). */
  slots: BlueprintSlot[];

  /** New estimated total in minutes after adjustments. */
  realisticTotalMinutes: number;

  /** New estimated total in seconds after adjustments. */
  realisticTotalSeconds: number;

  /**
   * Effective depth ceiling after Phase 2 may have lowered it.
   * Same as input `depthCeiling` if Phase 2 was not triggered.
   */
  effectiveDepthCeiling: CognitiveProcess;

  /** Human-readable log of every adjustment applied. */
  adjustments: string[];

  /** True if the plan fits within teacherMinutes + tolerance after all phases. */
  withinBudget: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param slots               Initial slot array from the Architect.
 * @param realisticTotalMinutes Initial weighted time estimate.
 * @param teacherMinutes      The teacher's declared time limit.
 * @param depthFloor          Minimum Bloom level permitted (from rigorProfile).
 * @param depthCeiling        Current maximum Bloom level (from rigorProfile).
 * @param estimateSlotSeconds Per-slot pacing function from the Architect's
 *                            closure — takes (questionType, cognitiveDemand).
 */
export function adjustPlanForTime(
  slots: BlueprintSlot[],
  realisticTotalMinutes: number,
  teacherMinutes: number,
  depthFloor: CognitiveProcess,
  depthCeiling: CognitiveProcess,
  estimateSlotSeconds: (qType: string, demand: string) => number
): TimeAdjustmentResult {
  const adjustments: string[] = [];
  const budget = teacherMinutes + TIME_TOLERANCE_MINUTES;

  if (realisticTotalMinutes <= budget) {
    const totalSec = Math.round(realisticTotalMinutes * 60);
    return {
      slots: [...slots],
      realisticTotalMinutes,
      realisticTotalSeconds: totalSec,
      effectiveDepthCeiling: depthCeiling,
      adjustments: [],
      withinBudget: true,
    };
  }

  // Work on a shallow-cloned array so originals are not mutated.
  let working: BlueprintSlot[] = slots.map(s => ({ ...s }));
  let effectiveCeiling = depthCeiling;

  /** Recompute total from the current working array. */
  function recomputeTotal(): number {
    return working.reduce(
      (sum, slot) =>
        sum +
        estimateSlotSeconds(
          slot.questionType as string,
          slot.cognitiveDemand ?? "understand"
        ),
      0
    );
  }

  // ── Phase 1: Simplify item types ────────────────────────────────────────
  //
  // Walk the simplification ladder.  For each (from→to) pair, replace ALL
  // matching slots then recheck — often resolves the budget in one sweep.
  //
  phaseName: for (const { from, to } of TYPE_SIMPLIFICATION_LADDER) {
    const targets = working.filter(s => s.questionType === from);
    if (targets.length === 0) continue;

    let changed = 0;
    for (const slot of working) {
      if (slot.questionType !== from) continue;
      slot.questionType = to as any;
      changed++;

      // Recheck after each conversion (greedy: stop as soon as budget is met)
      const newTotal = recomputeTotal();
      const newMin = Math.round(newTotal / 60);
      if (newMin <= budget) {
        adjustments.push(
          `Phase 1: converted ${changed} × ${from} → ${to} ` +
          `(${realisticTotalMinutes}→${newMin} min)`
        );
        realisticTotalMinutes = newMin;
        break phaseName;
      }
    }

    const afterTotal = recomputeTotal();
    const afterMin = Math.round(afterTotal / 60);
    if (afterMin < realisticTotalMinutes) {
      adjustments.push(
        `Phase 1: converted ${changed} × ${from} → ${to} ` +
        `(${realisticTotalMinutes}→${afterMin} min)`
      );
      realisticTotalMinutes = afterMin;
    }

    if (realisticTotalMinutes <= budget) break;
  }

  if (realisticTotalMinutes <= budget) {
    const totalSec = recomputeTotal();
    return {
      slots: working,
      realisticTotalMinutes,
      realisticTotalSeconds: totalSec,
      effectiveDepthCeiling: effectiveCeiling,
      adjustments,
      withinBudget: true,
    };
  }

  // ── Phase 2: Lower Bloom ceiling ────────────────────────────────────────
  //
  // For each step we lower the ceiling by one Bloom level and cap all slots
  // that exceed the new ceiling.  We never lower below depthFloor.
  //
  const floorIdx = BLOOM_ORDER.indexOf(depthFloor);
  let ceilIdx    = BLOOM_ORDER.indexOf(effectiveCeiling);

  while (realisticTotalMinutes > budget && ceilIdx > floorIdx) {
    const prevCeiling = BLOOM_ORDER[ceilIdx];
    ceilIdx -= 1;
    const newCeiling = BLOOM_ORDER[ceilIdx];

    let capped = 0;
    for (const slot of working) {
      const slotIdx = BLOOM_ORDER.indexOf(
        (slot.cognitiveDemand ?? "understand") as CognitiveProcess
      );
      if (slotIdx > ceilIdx) {
        slot.cognitiveDemand = newCeiling;
        // Difficulty tracks Bloom: keep mapping consistent
        slot.difficulty =
          ceilIdx <= 0 ? "easy" :
          ceilIdx <= 2 ? "medium" : "hard";
        capped++;
      }
    }

    effectiveCeiling = newCeiling;
    const newTotal = recomputeTotal();
    const newMin   = Math.round(newTotal / 60);

    if (capped > 0) {
      adjustments.push(
        `Phase 2: lowered Bloom ceiling ${prevCeiling}→${newCeiling}, ` +
        `capped ${capped} slot(s) (${realisticTotalMinutes}→${newMin} min)`
      );
      realisticTotalMinutes = newMin;
    }
  }

  if (realisticTotalMinutes <= budget) {
    const totalSec = recomputeTotal();
    return {
      slots: working,
      realisticTotalMinutes,
      realisticTotalSeconds: totalSec,
      effectiveDepthCeiling: effectiveCeiling,
      adjustments,
      withinBudget: true,
    };
  }

  // ── Phase 3: Reduce questionCount ───────────────────────────────────────
  //
  // Drop trailing slots one at a time until budget is met.
  // We drop from the end (lowest cognitive demand in progressive ordering,
  // or mixed-most-disposable items in mixed ordering).
  //
  const originalCount = working.length;
  while (realisticTotalMinutes > budget && working.length > 1) {
    working.pop();
    const newTotal = recomputeTotal();
    realisticTotalMinutes = Math.round(newTotal / 60);
  }

  const droppedCount = originalCount - working.length;
  if (droppedCount > 0) {
    adjustments.push(
      `Phase 3: dropped ${droppedCount} slot(s) to fit time budget ` +
      `(questionCount ${originalCount}→${working.length}, ~${realisticTotalMinutes} min)`
    );
  }

  const finalTotalSec = recomputeTotal();
  return {
    slots: working,
    realisticTotalMinutes: Math.round(finalTotalSec / 60),
    realisticTotalSeconds: finalTotalSec,
    effectiveDepthCeiling: effectiveCeiling,
    adjustments,
    withinBudget: Math.round(finalTotalSec / 60) <= budget,
  };
}
