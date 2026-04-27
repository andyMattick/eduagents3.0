/**
 * bloomHintBudget.ts
 *
 * Deterministic Bloom hint budgeting algorithm.
 *
 * Selects a hint verbosity mode (MINIMAL | STANDARD | FULL) per run based on
 * six risk/pressure signals, then applies per-slot selective hinting rules
 * and a token-safety downgrade guard.
 *
 * Design goals:
 *   - Maximize output quality (higher hints when drift is high)
 *   - Minimize token load (penalise large batches and short tests)
 *   - Prevent rewrite instability (MINIMAL under heavy-rewrite runs)
 *   - Adapt across runs (drift-based boost for next run)
 *
 * This is a pure gain-controller: balances scaffolding strength vs token economy.
 */

import type { BloomLevel, HintMode } from "./bloomHints";
// Re-export shared types/helpers sourced from bloomHints to avoid circular deps
export type { HintMode, DemandTier, SlotHintComponents } from "./bloomHints";
export { demandTier, slotHintComponents } from "./bloomHints";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
// HintMode is defined and exported from bloomHints.ts to avoid circular deps.

export interface BloomHintBudgetInput {
  /** Total number of slots in the blueprint. */
  slotCount: number;
  /** Assessment time window in minutes. */
  timeMinutes: number;
  /** Highest Bloom level in the blueprint depth band. */
  depthCeiling: BloomLevel;
  /** Student level from UAR. */
  studentLevel: "remedial" | "standard" | "honors" | "ap";
  /**
   * Fraction of slots whose generated Bloom level mismatched the intended
   * level in the previous run (0–1). Pass 0 on first run.
   */
  bloomDriftRate: number;
  /**
   * Writer trust score (0–10). Lower = more prescriptions needed.
   * A neutral-good writer starts around 7.
   */
  trustScore: number;
  /**
   * Rewrite count from the immediately preceding run.
   * Used for the rewrite-instability safeguard.
   */
  previousRunRewriteCount: number;
}

export interface BloomHintBudgetOutput {
  hintMode: HintMode;
  riskScore: number;
  trace: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloom ordering
// ─────────────────────────────────────────────────────────────────────────────

const BLOOM_ORDER: BloomLevel[] = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
];

function bloomIdx(level: BloomLevel): number {
  return BLOOM_ORDER.indexOf(level);
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level state — persists between runs (in-process memory)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * When true, +2 is added to riskScore on the next call (one-shot).
 * Set by the adaptive reinforcement loop after a high-drift run.
 */
let _nextRunHintBoost = false;

/** Expose so the pipeline can read it for logging. */
export function isNextRunHintBoostActive(): boolean {
  return _nextRunHintBoost;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Compute Risk Score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the raw risk score BEFORE any module-level boost is applied.
 * The caller (runBloomHintBudget) applies the boost.
 */
export function computeRiskScore(
  input: Omit<BloomHintBudgetInput, "previousRunRewriteCount">,
  trace: string[]
): number {
  let score = 0;

  // 1️⃣ Ceiling Risk
  if (bloomIdx(input.depthCeiling) >= bloomIdx("analyze")) {
    score += 2;
    trace.push(`+2 ceiling risk: depthCeiling="${input.depthCeiling}" >= analyze`);
  }
  if (bloomIdx(input.depthCeiling) >= bloomIdx("evaluate")) {
    score += 1;
    trace.push(`+1 ceiling risk bonus: depthCeiling="${input.depthCeiling}" >= evaluate`);
  }

  // 2️⃣ Drift Risk
  if (input.bloomDriftRate >= 0.25) {
    score += 2;
    trace.push(`+2 drift risk: driftRate=${(input.bloomDriftRate * 100).toFixed(0)}% >= 25%`);
  }
  if (input.bloomDriftRate >= 0.5) {
    score += 2;
    trace.push(`+2 drift risk bonus: driftRate=${(input.bloomDriftRate * 100).toFixed(0)}% >= 50%`);
  }

  // 3️⃣ Student Rigor Boost
  if (input.studentLevel === "honors" || input.studentLevel === "ap") {
    score += 1;
    trace.push(`+1 student rigor: level="${input.studentLevel}"`);
  }

  // 4️⃣ Slot Pressure Penalty
  if (input.slotCount >= 9) {
    score -= 2;
    trace.push(`-2 slot pressure: slotCount=${input.slotCount} >= 9`);
  }
  if (input.slotCount >= 12) {
    score -= 2;
    trace.push(`-2 slot pressure bonus: slotCount=${input.slotCount} >= 12`);
  }

  // 5️⃣ Time Compression Penalty
  if (input.timeMinutes < 15) {
    score -= 2;
    trace.push(`-2 time compression: timeMinutes=${input.timeMinutes} < 15`);
  }
  if (input.timeMinutes < 10) {
    score -= 2;
    trace.push(`-2 time compression bonus: timeMinutes=${input.timeMinutes} < 10`);
  }

  // 6️⃣ Trust Dampener
  if (input.trustScore >= 7) {
    score -= 1;
    trace.push(`-1 trust dampener: trustScore=${input.trustScore} >= 7`);
  }
  if (input.trustScore >= 9) {
    score -= 1;
    trace.push(`-1 trust dampener bonus: trustScore=${input.trustScore} >= 9`);
  }

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Select Hint Mode
// ─────────────────────────────────────────────────────────────────────────────

export function selectHintMode(riskScore: number): HintMode {
  if (riskScore <= 0) return "MINIMAL";
  if (riskScore <= 3) return "STANDARD";
  return "FULL";
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Per-Slot Selective Verbosity
// All type definitions and helpers have been moved to bloomHints.ts to avoid
// circular imports.  They are re-exported above for external consumers.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Token Safety Guard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thresholds in characters (estimatedTokens = charCount / 4).
 * slotCount >= 10 → 600 tokens → 2400 chars
 * otherwise       → 900 tokens → 3600 chars
 */
function tokenBudgetThresholdChars(slotCount: number): number {
  return slotCount >= 10 ? 2400 : 3600;
}

/**
 * Downgrade mode by one tier if estimated character budget is exceeded.
 * Returns the (possibly downgraded) mode and appends to trace.
 */
export function applyTokenSafetyGuard(
  hintBlock: string,
  currentMode: HintMode,
  slotCount: number,
  trace: string[]
): HintMode {
  const threshold = tokenBudgetThresholdChars(slotCount);
  if (hintBlock.length <= threshold) return currentMode;

  let downgraded: HintMode;
  if (currentMode === "FULL")     downgraded = "STANDARD";
  else if (currentMode === "STANDARD") downgraded = "MINIMAL";
  else                            return currentMode; // already MINIMAL

  trace.push(
    `HintMode downgraded ${currentMode} → ${downgraded} due to token pressure ` +
    `(${hintBlock.length} chars > ${threshold} char budget for ${slotCount} slots)`
  );

  return downgraded;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — Rewrite Stability Safeguard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Force MINIMAL when slotCount >= 10 AND previous rewrite count exceeds
 * 50% of slots (persistent high-rewrite = instability under too much scaffolding).
 */
export function checkRewriteStability(
  slotCount: number,
  previousRunRewriteCount: number,
  trace: string[]
): boolean {
  if (slotCount < 10) return false;
  const threshold = Math.ceil(slotCount * 0.5);
  if (previousRunRewriteCount <= threshold) return false;

  trace.push(
    `HintMode forced to MINIMAL due to rewrite instability ` +
    `(${previousRunRewriteCount} rewrites > ${threshold} threshold for ${slotCount} slots)`
  );
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — Adaptive Reinforcement Loop (call AFTER run)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call this AFTER a run completes, passing the observed drift rate.
 * If drift > 0.5, schedules a +2 riskScore boost for the next run only.
 *
 * @returns Summary string for logging.
 */
export function applyAdaptiveDriftBoost(driftRate: number): string {
  if (driftRate > 0.5) {
    _nextRunHintBoost = true;
    return `[BloomHintBudget] Adaptive boost scheduled: driftRate=${(driftRate * 100).toFixed(0)}% > 50% → +2 riskScore next run`;
  }
  return `[BloomHintBudget] No adaptive boost needed (driftRate=${(driftRate * 100).toFixed(0)}%)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run all 6 algorithm steps and return the final hint mode.
 *
 * NOTE: Call applyTokenSafetyGuard() AFTER building the actual hint strings
 * (since we don't have them yet here), then call applyAdaptiveDriftBoost()
 * AFTER the run completes with the measured driftRate.
 */
export function runBloomHintBudget(
  input: BloomHintBudgetInput,
  /** Pre-built hint block (full verbosity) for token estimation. Pass "" to skip guard here. */
  tentativeHintBlock = ""
): BloomHintBudgetOutput {
  const trace: string[] = [];

  // Step 1 — Risk score
  let riskScore = computeRiskScore(input, trace);

  // Step 6 (deferred boost from previous run)
  if (_nextRunHintBoost) {
    riskScore += 2;
    _nextRunHintBoost = false;
    trace.push(`+2 adaptive reinforcement boost (one-shot, from high-drift previous run)`);
  }

  trace.push(`riskScore = ${riskScore}`);

  // Step 2 — Select mode
  let hintMode = selectHintMode(riskScore);
  trace.push(`HintMode selected: ${hintMode} (riskScore=${riskScore})`);

  // Step 5 — Rewrite instability override (takes precedence over everything)
  const forceMinimal = checkRewriteStability(
    input.slotCount,
    input.previousRunRewriteCount,
    trace
  );
  if (forceMinimal) {
    hintMode = "MINIMAL";
    trace.push(`HintMode forced to MINIMAL due to rewrite instability`);
  }

  // Step 4 — Token safety guard (if hint block provided)
  if (tentativeHintBlock.length > 0) {
    hintMode = applyTokenSafetyGuard(tentativeHintBlock, hintMode, input.slotCount, trace);
  }

  return { hintMode, riskScore, trace };
}
