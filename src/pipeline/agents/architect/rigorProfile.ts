/**
 * rigorProfile.ts
 *
 * Resolves a concrete Bloom depth band (depthFloor + depthCeiling) from:
 *   - studentLevel  ("remedial" | "standard" | "honors" | "ap")
 *   - assessmentType (bell ringer, exit ticket, quiz, test, etc.)
 *   - timeMinutes   (shorter tests can't support deep evaluation tasks)
 *   - metaConstraints (derived from the constraint engine — raiseBloomCeiling / capBloomAt)
 *
 * Design rules
 * ────────────
 * 1. Student-level anchors set the BASE band.
 * 2. Time penalty: assessments < 20 min cap the ceiling at "apply" (not enough
 *    time for sustained evaluation/synthesis tasks).  < 10 min caps at "understand".
 * 3. Assessment-type modifier: bell ringers / exit tickets always stay shallow.
 * 4. Constraint-engine overrides are applied last — they can only RAISE the
 *    ceiling (for "more rigorous") or LOWER it (for "simpler" / "easy to grade").
 *    A cap always wins over a raise — safety over ambition.
 */

import type { CognitiveProcess } from "@/pipeline/contracts/BlueprintPlanV3_2";
import type { DerivedStructuralConstraints } from "./constraintEngine";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RigorProfileInput {
  studentLevel: "remedial" | "standard" | "honors" | "ap";
  assessmentType: string;
  timeMinutes: number;
  /** Optional — derived structural constraints from the constraint engine. */
  derivedStructuralConstraints?: Pick<
    DerivedStructuralConstraints,
    "raiseBloomCeiling" | "capBloomAt"
  >;
}

export interface RigorProfileOutput {
  depthFloor: CognitiveProcess;
  depthCeiling: CognitiveProcess;
  /** Human-readable trace of which rules fired — useful for blueprint warnings. */
  trace: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BLOOM_ORDER: CognitiveProcess[] = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
];

function idx(level: CognitiveProcess): number {
  return BLOOM_ORDER.indexOf(level);
}

function clamp(levelIdx: number): CognitiveProcess {
  return BLOOM_ORDER[Math.min(Math.max(levelIdx, 0), BLOOM_ORDER.length - 1)];
}

/**
 * Base bands by student level.
 *
 * | level    | floor      | ceiling  | rationale                                     |
 * |----------|------------|----------|-----------------------------------------------|
 * | remedial | remember   | apply    | Build confidence with factual + procedural     |
 * | standard | understand | analyze  | Conceptual grasp + light analytical reasoning |
 * | honors   | apply      | evaluate | Consistent application + justification demands |
 * | ap       | analyze    | evaluate | Deep reasoning, cross-concept; evaluate = max  |
 */
const BASE_BAND: Record<
  RigorProfileInput["studentLevel"],
  { floor: CognitiveProcess; ceiling: CognitiveProcess }
> = {
  remedial: { floor: "remember",   ceiling: "apply"    },
  standard: { floor: "understand", ceiling: "analyze"  },
  honors:   { floor: "apply",      ceiling: "evaluate" },
  ap:       { floor: "analyze",    ceiling: "evaluate" },
};

/** Assessment types that must stay shallow regardless of level. */
const SHALLOW_ASSESSMENT_TYPES = new Set(["bellRinger", "exitTicket"]);

// ─────────────────────────────────────────────────────────────────────────────
// Resolver
// ─────────────────────────────────────────────────────────────────────────────

export function resolveRigorProfile(input: RigorProfileInput): RigorProfileOutput {
  const trace: string[] = [];
  const base = BASE_BAND[input.studentLevel] ?? BASE_BAND.standard;

  let floorIdx   = idx(base.floor);
  let ceilingIdx = idx(base.ceiling);

  trace.push(`Base band for ${input.studentLevel}: ${base.floor} → ${base.ceiling}`);

  // ── Rule 1: Shallow assessment type ──────────────────────────────────────
  if (SHALLOW_ASSESSMENT_TYPES.has(input.assessmentType)) {
    const newCeiling = "apply";
    if (ceilingIdx > idx(newCeiling)) {
      ceilingIdx = idx(newCeiling);
      trace.push(`Assessment type "${input.assessmentType}" caps ceiling at "${newCeiling}"`);
    }
    const newFloor = "remember";
    if (floorIdx > idx(newFloor)) {
      floorIdx = idx(newFloor);
      trace.push(`Assessment type "${input.assessmentType}" lowers floor to "${newFloor}"`);
    }
  }

  // ── Rule 2: Time penalty ──────────────────────────────────────────────────
  if (input.timeMinutes < 10) {
    const cap = "understand";
    if (ceilingIdx > idx(cap)) {
      ceilingIdx = idx(cap);
      trace.push(`Time < 10 min: ceiling capped at "${cap}"`);
    }
  } else if (input.timeMinutes < 20) {
    const cap = "apply";
    if (ceilingIdx > idx(cap)) {
      ceilingIdx = idx(cap);
      trace.push(`Time < 20 min: ceiling capped at "${cap}"`);
    }
  }

  // ── Rule 3: Constraint-engine overrides ──────────────────────────────────
  const cs = input.derivedStructuralConstraints;

  if (cs?.capBloomAt) {
    const capIdx = idx(cs.capBloomAt);
    if (ceilingIdx > capIdx) {
      ceilingIdx = capIdx;
      trace.push(`Constraint engine cap: ceiling → "${cs.capBloomAt}"`);
    }
    // Also floor must not exceed ceiling after cap
    if (floorIdx > ceilingIdx) {
      floorIdx = ceilingIdx;
      trace.push(`Floor forced down to match capped ceiling: "${clamp(ceilingIdx)}"`);
    }
  }

  if (cs?.raiseBloomCeiling && !cs.capBloomAt) {
    const raiseIdx = idx(cs.raiseBloomCeiling);
    if (raiseIdx > ceilingIdx) {
      ceilingIdx = raiseIdx;
      trace.push(`Constraint engine raise: ceiling → "${cs.raiseBloomCeiling}"`);
    }
  }

  // ── Invariant: floor ≤ ceiling ────────────────────────────────────────────
  if (floorIdx > ceilingIdx) {
    floorIdx = ceilingIdx;
    trace.push(`Invariant correction: floor clamped to ceiling "${clamp(ceilingIdx)}"`);
  }

  return {
    depthFloor:   clamp(floorIdx),
    depthCeiling: clamp(ceilingIdx),
    trace,
  };
}
