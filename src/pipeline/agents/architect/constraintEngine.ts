/**
 * constraintEngine.ts
 *
 * Semantic, prioritized constraint arbitration for the Architect agent.
 *
 * Phases:
 *   1. Classify  — tag raw free-text constraints with type + priority
 *   2. Conflict  — detect and resolve conflicting constraints (lower-priority dropped/softened)
 *   3. Translate — map meta-language phrases into explicit structural knobs
 */

import type { CognitiveProcess } from "@/pipeline/contracts/BlueprintPlanV3_2";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantic category for a single parsed constraint.
 *
 * | type       | examples                                          |
 * |------------|---------------------------------------------------|
 * | time       | "must fit in 30 minutes", "no more than 10 items" |
 * | safety     | "no sensitive content", "school-appropriate"      |
 * | structural | "all multiple-choice", "exactly 5 questions"       |
 * | content    | "only cover unit 3", "align to chapter 4"         |
 * | grading    | "easy to grade", "make grading quick"             |
 * | meta       | "more rigorous", "higher-order", "simpler"        |
 * | style      | "use formal tone", "avoid jargon"                |
 */
export type ConstraintType =
  | "time"
  | "safety"
  | "structural"
  | "content"
  | "grading"
  | "meta"
  | "style";

/**
 * Numeric priority — higher wins in a conflict. Schema:
 *   time (100) > safety (80) > structural (60) > content (40) > grading (30) > meta (20) > style (10)
 */
export const PRIORITY_SCHEMA: Record<ConstraintType, number> = {
  time:       100,
  safety:      80,
  structural:  60,
  content:     40,
  grading:     30,
  meta:        20,
  style:       10,
};

export interface ClassifiedConstraint {
  /** Original text fragment that triggered this constraint. */
  sourceText: string;

  /** Semantic category. */
  type: ConstraintType;

  /** Numeric priority (from PRIORITY_SCHEMA — may be boosted per-rule). */
  priority: number;

  /**
   * Whether this constraint survived conflict resolution.
   * `true` = active, `false` = dropped, `"softened"` = relaxed form applied.
   */
  resolved: true | false | "softened";

  /**
   * Optional human-readable note explaining why the constraint was
   * dropped or softened during conflict resolution.
   */
  resolutionNote?: string;
}

/**
 * Structural knobs derived by translating meta-language phrases.
 * These are merged into the Architect's deterministic planning step.
 */
export interface DerivedStructuralConstraints {
  // ── Bloom adjustments ────────────────────────────────────────────────────
  /** Override the Bloom depth ceiling (e.g. raise to "evaluate" for rigor). */
  raiseBloomCeiling?: CognitiveProcess;
  /** Absolute cap on Bloom level (e.g. cap at "apply" for quick-grade). */
  capBloomAt?: CognitiveProcess;
  /** Additive deltas applied to the base cognitive distribution fractions. */
  bloomBoost?: Partial<Record<CognitiveProcess, number>>;

  // ── Question-type adjustments ─────────────────────────────────────────────
  /** Prefer MC-heavy mix (grading efficiency). */
  preferMultipleChoice?: boolean;
  /** Actively reduce constructed-response and open-ended slots. */
  reduceConstructedResponse?: boolean;
  /** Reduce short-answer slots (also helps grading speed). */
  reduceShortAnswer?: boolean;
  /** Allow only short answers — no multi-sentence paragraphs. */
  clampAnswerLength?: boolean;

  // ── Slot surgery ──────────────────────────────────────────────────────────
  /** Inject N additional "analyze" slots into the blueprint. */
  addAnalyzeSlots?: number;
  /** Inject N additional "apply" slots. */
  addApplySlots?: number;

  // ── Trace ─────────────────────────────────────────────────────────────────
  /** The active constraints that were translated into these knobs. */
  sourceConstraints: ClassifiedConstraint[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 — Constraint Classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pattern table: each entry describes one recognisable phrase family.
 * Patterns are tested against a lower-cased version of the source text.
 */
const CONSTRAINT_PATTERNS: Array<{
  pattern: RegExp;
  type: ConstraintType;
  /** Optional priority override; defaults to PRIORITY_SCHEMA[type]. */
  priorityOverride?: number;
}> = [
  // ── time ──────────────────────────────────────────────────────────────────
  { pattern: /\b(fit[s]? in|finish in|must take|no more than|within|under)\b.*\b(min|minute|second|hour)\b/i, type: "time" },
  { pattern: /\btime[d]? assessment\b/i, type: "time" },
  { pattern: /\bclocked?\b/i, type: "time" },

  // ── safety ────────────────────────────────────────────────────────────────
  { pattern: /\b(no sensitive|school.?appropriate|age.?appropriate|safe content|avoid (violence|mature|graphic|explicit))\b/i, type: "safety", priorityOverride: 90 },
  { pattern: /\bno trick questions?\b/i, type: "safety" },
  { pattern: /\bavoid (offensive|inappropriate|sensitive)\b/i, type: "safety", priorityOverride: 90 },

  // ── structural ────────────────────────────────────────────────────────────
  { pattern: /\b(all|only|use only|purely)\b.*(multiple.?choice|mc|true.?false|matching|fill.?in)\b/i, type: "structural" },
  { pattern: /\bexactly \d+ (question|item|probl)\b/i, type: "structural" },
  { pattern: /\b(\d+) (question|item|probl)\b/i, type: "structural" },
  { pattern: /\bquestion count\b/i, type: "structural" },
  { pattern: /\bbreak (up|down) multi.?part\b/i, type: "structural" },
  { pattern: /\bno (part [a-z]|sub.?question)\b/i, type: "structural" },

  // ── content ───────────────────────────────────────────────────────────────
  { pattern: /\b(only cover|focus on|align to|based on|limit to|restrict to)\b.*\b(unit|chapter|lesson|topic|standard)\b/i, type: "content" },
  { pattern: /\bdo not include\b/i, type: "content" },
  { pattern: /\buse (only|just) (the )?source\b/i, type: "content" },
  { pattern: /\bmust include\b/i, type: "content" },

  // ── grading ───────────────────────────────────────────────────────────────
  { pattern: /\b(easy|quick|fast(er)?|simpl[ei]r?) (to )?grad(e|ing)\b/i, type: "grading" },
  { pattern: /\bmake grading (quick|easy|fast)\b/i, type: "grading" },
  { pattern: /\b(objective|auto.?grad(e|able)|auto.?scor)\b/i, type: "grading" },
  { pattern: /\b(fewer|less|no) (constructed.?response|open.?ended|essay|long.?answer)\b/i, type: "grading" },
  { pattern: /\bshorter (answers?|responses?)\b/i, type: "grading" },
  { pattern: /\bminimize (grading|marking) time\b/i, type: "grading" },

  // ── meta ──────────────────────────────────────────────────────────────────
  { pattern: /\b(more rigorous|increase rigor|rigorous assessment)\b/i, type: "meta" },
  { pattern: /\bhigher.?order(ed)? (thinking|question|level)?\b/i, type: "meta" },
  { pattern: /\b(push|raise|elevate) (bloom|thinking|cognitive|complexity)\b/i, type: "meta" },
  { pattern: /\b(more challenging|more difficult|increase difficult|harder)\b/i, type: "meta" },
  { pattern: /\b(simpler|simplify|more (accessible|basic)|reduce difficult|easier)\b/i, type: "meta" },
  { pattern: /\blower (bloom|cognitive|level|demand)\b/i, type: "meta" },
  { pattern: /\banalyze.?level|synthesis.?level|evaluation.?level\b/i, type: "meta" },
  { pattern: /\bremember.?level|recall.?level|understand.?level\b/i, type: "meta" },

  // ── style ─────────────────────────────────────────────────────────────────
  { pattern: /\b(formal|academic|professional) tone\b/i, type: "style" },
  { pattern: /\b(avoid|no) (jargon|slang|colloqui)\b/i, type: "style" },
  { pattern: /\buse (simple|plain|clear) language\b/i, type: "style" },
  { pattern: /\bkid.?friendly\b/i, type: "style" },
];

/**
 * Split source text into sentence-like fragments for finer-grained matching.
 */
function fragmentize(text: string): string[] {
  return text
    .split(/[.,;:\n!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);
}

/**
 * Classify all constraint phrases found in the given free-text block.
 *
 * @param sourceText  - any teacher-supplied free text (additionalDetails, notes, etc.)
 * @returns Array of ClassifiedConstraint objects (all start as `resolved: true`)
 */
export function classifyConstraints(sourceText: string): ClassifiedConstraint[] {
  if (!sourceText?.trim()) return [];

  const fragments = fragmentize(sourceText);
  const results: ClassifiedConstraint[] = [];
  const seen = new Set<string>(); // deduplicate by (fragment + type)

  for (const fragment of fragments) {
    for (const { pattern, type, priorityOverride } of CONSTRAINT_PATTERNS) {
      if (pattern.test(fragment)) {
        const key = `${fragment.toLowerCase()}::${type}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            sourceText: fragment,
            type,
            priority: priorityOverride ?? PRIORITY_SCHEMA[type],
            resolved: true,
          });
        }
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 — Conflict Detection & Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conflict rule: two constraint types are in conflict when they pull in
 * opposite directions.  We encode this as a set of (typeA, typeB, reason) tuples.
 */
const CONFLICT_RULES: Array<{
  typeA: ConstraintType;
  typeB: ConstraintType;
  dimension: string;
}> = [
  // "more rigorous" (meta) vs "easy to grade" (grading) — bloom vs question type
  { typeA: "meta",       typeB: "grading",    dimension: "bloom-vs-gradability" },
  // "more rigorous" (meta) vs "time" — pushing bloom up may blow the clock
  { typeA: "meta",       typeB: "time",       dimension: "bloom-vs-time" },
  // "structural: only MC" vs "meta: higher order" — MC limits deep thinking
  { typeA: "structural", typeB: "meta",       dimension: "question-type-vs-bloom" },
  // "grading: fewer CR" vs "structural: use CR" — explicit contradictions
  { typeA: "grading",    typeB: "structural", dimension: "cr-count-conflict" },
];

type ConflictPair = { a: ClassifiedConstraint; b: ClassifiedConstraint; dimension: string };

/**
 * Find any pairs of constraints that conflict with each other.
 */
export function detectConstraintConflicts(
  constraints: ClassifiedConstraint[]
): ConflictPair[] {
  const conflicts: ConflictPair[] = [];

  for (const rule of CONFLICT_RULES) {
    const aList = constraints.filter(c => c.type === rule.typeA && c.resolved === true);
    const bList = constraints.filter(c => c.type === rule.typeB && c.resolved === true);

    for (const a of aList) {
      for (const b of bList) {
        conflicts.push({ a, b, dimension: rule.dimension });
      }
    }
  }

  return conflicts;
}

/**
 * Resolution strategy:
 *  - Higher-priority constraint wins (stays `true`).
 *  - Lower-priority constraint is `"softened"` when the gap is small (< 30),
 *    or fully `dropped` (false) when the gap is large (≥ 30).
 *
 * Mutates `resolved` and `resolutionNote` on the input constraints in-place,
 * then returns the same array for convenience.
 */
export function resolveConstraintConflicts(
  constraints: ClassifiedConstraint[]
): ClassifiedConstraint[] {
  const conflicts = detectConstraintConflicts(constraints);

  for (const { a, b, dimension } of conflicts) {
    const [winner, loser] =
      a.priority >= b.priority ? [a, b] : [b, a];

    const gap = winner.priority - loser.priority;
    const action: false | "softened" = gap >= 30 ? false : "softened";

    loser.resolved = action;
    loser.resolutionNote =
      action === "softened"
        ? `Softened (priority ${loser.priority}) in favour of "${winner.sourceText}" ` +
          `(priority ${winner.priority}, dimension: ${dimension})`
        : `Dropped (priority ${loser.priority}) — overridden by "${winner.sourceText}" ` +
          `(priority ${winner.priority}, dimension: ${dimension})`;
  }

  return constraints;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 — Meta → Structural Translation
// ─────────────────────────────────────────────────────────────────────────────

/** Ordered Bloom levels for range arithmetic. */
const BLOOM_ORDER: CognitiveProcess[] = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
];

function bloomIndex(level: CognitiveProcess): number {
  return BLOOM_ORDER.indexOf(level);
}

function bloomAt(index: number): CognitiveProcess {
  return BLOOM_ORDER[Math.min(Math.max(index, 0), BLOOM_ORDER.length - 1)];
}

/**
 * Map active meta/grading constraints to explicit structural knobs.
 *
 * Only constraints with `resolved === true | "softened"` are considered.
 * Dropped constraints are ignored.
 */
export function translateMetaToStructural(
  constraints: ClassifiedConstraint[],
  currentCeiling: CognitiveProcess = "understand"
): DerivedStructuralConstraints {
  const active = constraints.filter(c => c.resolved !== false);
  const result: DerivedStructuralConstraints = { sourceConstraints: active };

  for (const c of active) {
    const text = c.sourceText.toLowerCase();

    // ── "more rigorous" / "higher-order" / "more challenging" ──────────────
    if (
      c.type === "meta" &&
      /more rigorous|higher.?order|increase rigor|rigorous assessment|more challenging|more difficult|harder|push bloom|raise bloom|elevate/i.test(text)
    ) {
      // Raise ceiling by 2 Bloom levels (capped at "evaluate")
      const currentIdx = bloomIndex(currentCeiling);
      const targetIdx = Math.min(currentIdx + 2, BLOOM_ORDER.length - 1);
      const newCeiling = bloomAt(targetIdx);

      // Only update if it's actually higher
      if (!result.raiseBloomCeiling || bloomIndex(result.raiseBloomCeiling) < targetIdx) {
        result.raiseBloomCeiling = newCeiling;
      }

      // Boost analyze + evaluate distribution
      result.bloomBoost = {
        ...result.bloomBoost,
        analyze: (result.bloomBoost?.analyze ?? 0) + 0.15,
        evaluate: (result.bloomBoost?.evaluate ?? 0) + 0.08,
      };

      // Request additional analyze/apply slots
      result.addAnalyzeSlots = (result.addAnalyzeSlots ?? 0) + 1;
      result.addApplySlots   = (result.addApplySlots   ?? 0) + 1;
    }

    // ── "simpler" / "lower bloom" / "more accessible" ──────────────────────
    if (
      c.type === "meta" &&
      /simpl(er|ify)|more (accessible|basic)|reduce difficult|easier|lower (bloom|cognitive|level)/i.test(text)
    ) {
      // Cap Bloom at "apply" and remove any existing raise
      result.capBloomAt = "apply";
      delete result.raiseBloomCeiling;
      result.bloomBoost = {
        ...result.bloomBoost,
        remember:   (result.bloomBoost?.remember   ?? 0) + 0.10,
        understand: (result.bloomBoost?.understand ?? 0) + 0.10,
        analyze:    Math.min((result.bloomBoost?.analyze   ?? 0) - 0.10, 0),
        evaluate:   Math.min((result.bloomBoost?.evaluate  ?? 0) - 0.10, 0),
      };
    }

    // ── "make grading quick" / "easy to grade" / "objective" ───────────────
    if (
      c.type === "grading" &&
      /easy|quick|fast(er)?|simpl(er|ify)|objective|auto.?grad|fewer|less|shorter|minimize/i.test(text)
    ) {
      result.preferMultipleChoice       = true;
      result.reduceConstructedResponse  = true;

      // If text specifically calls out short answer, also reduce those
      if (/short(er)? (answer|response)|shorter answer/i.test(text)) {
        result.reduceShortAnswer  = true;
        result.clampAnswerLength  = true;
      }

      // Grading efficiency softens deep Bloom (softened, not dropped)
      if (!result.capBloomAt) {
        result.capBloomAt = "apply"; // don't demand evaluate under grading pressure
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 — Convenience pipeline
// ─────────────────────────────────────────────────────────────────────────────

export interface ConstraintEngineOutput {
  /** All detected constraints before conflict resolution. */
  classifiedConstraints: ClassifiedConstraint[];
  /** Constraints after conflict resolution (some may be dropped/softened). */
  resolvedConstraints: ClassifiedConstraint[];
  /** Structural knobs derived from active meta/grading constraints. */
  derivedStructuralConstraints: DerivedStructuralConstraints;
}

/**
 * Single entry-point: classify → resolve → translate.
 *
 * @param sourceText     Free text from teacher (additionalDetails, notes, etc.)
 * @param currentCeiling Current Bloom ceiling from deterministic planning
 *                       (used to compute relative raises).
 */
export function runConstraintEngine(
  sourceText: string,
  currentCeiling: CognitiveProcess = "understand"
): ConstraintEngineOutput {
  const classifiedConstraints = classifyConstraints(sourceText);
  const resolvedConstraints   = resolveConstraintConflicts([...classifiedConstraints]);
  const derivedStructuralConstraints = translateMetaToStructural(
    resolvedConstraints,
    currentCeiling
  );

  return {
    classifiedConstraints,
    resolvedConstraints,
    derivedStructuralConstraints,
  };
}
