/**
 * bloomClassifier.ts
 *
 * Shared Bloom-level detection utility.
 *
 * Both the Gatekeeper (for validation) and the bloom-alignment logger
 * (for writerBloom vs gatekeeperBloom comparison) use this module.
 *
 * classifyBloomLevel() returns the highest Bloom level whose verb list
 * matches the given prompt text, or null if nothing matches.
 *
 * classifyBloomLevelRange() returns the floor + ceiling of all matching
 * levels — useful when a question spans multiple cognitive demands.
 */

export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export const BLOOM_ORDER: BloomLevel[] = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
];

/** Bloom verb dictionary — same source-of-truth used by Gatekeeper checks. */
export const BLOOM_VERBS: Record<BloomLevel, string[]> = {
  remember: [
    "define", "identify", "recall", "list", "state", "name", "label",
    "match", "select", "what is", "what are", "which", "when", "who",
    "where", "how many", "first step", "step", "term", "represent",
    "stands for", "notation",
  ],
  understand: [
    "explain", "summarize", "describe", "interpret", "why",
    "how does", "what does", "what concept", "what mathematical",
    "what process", "paraphrase", "classify", "give an example",
    "difference between", "is necessary", "reason", "means", "tell",
  ],
  apply: [
    "solve", "use", "calculate", "apply", "add", "subtract",
    "multiply", "divide", "find", "compute", "evaluate",
    "determine", "simplify", "convert", "what is the sum",
    "what is the product", "what is the result", "complete",
    "perform", "carry out", "demonstrate", "given", "if",
  ],
  analyze: [
    "compare", "contrast", "categorize", "analyze", "analyse",
    "distinguish", "differentiate", "examine", "break down",
    "what relationship", "how are", "why does", "classify",
    "what pattern", "what effect", "infer", "both", "neither",
    "identify the error", "trace the steps",
  ],
  evaluate: [
    "justify", "critique", "evaluate", "assess", "judge",
    "defend", "argue", "which is best", "what would you recommend",
    "rate", "rank", "support", "do you agree", "is it better",
  ],
  create: [
    "design", "create", "construct", "generate", "compose",
    "produce", "write", "formulate", "develop", "plan",
  ],
};

/**
 * Returns the *highest* Bloom level whose verbs appear in the prompt.
 * Returns `null` when no bloom verbs are found at all.
 *
 * @param promptText   Question stem text (case-insensitive matching).
 * @param upToLevel    Optional ceiling — only tests levels ≤ this.
 */
export function classifyBloomLevel(
  promptText: string,
  upToLevel?: BloomLevel
): BloomLevel | null {
  const lower = promptText.toLowerCase();
  const ceiling = upToLevel ? BLOOM_ORDER.indexOf(upToLevel) : BLOOM_ORDER.length - 1;

  let highestMatch: BloomLevel | null = null;

  for (let i = 0; i <= ceiling; i++) {
    const level = BLOOM_ORDER[i];
    const verbs = BLOOM_VERBS[level];
    if (verbs.some(v => lower.includes(v))) {
      highestMatch = level;
    }
  }

  return highestMatch;
}

/**
 * Returns all Bloom levels whose verbs appear in the prompt.
 */
export function classifyBloomLevelRange(promptText: string): BloomLevel[] {
  const lower = promptText.toLowerCase();
  return BLOOM_ORDER.filter(level => BLOOM_VERBS[level].some(v => lower.includes(v)));
}

/**
 * Utility: compare two Bloom levels numerically.
 * Returns negative / zero / positive like Array.sort comparators.
 */
export function compareBloomLevels(a: BloomLevel, b: BloomLevel): number {
  return BLOOM_ORDER.indexOf(a) - BLOOM_ORDER.indexOf(b);
}

/**
 * Utility: check whether `detected` is at least as high as `intended`.
 * A question written at "analyze" level satisfies an "understand" slot.
 */
export function bloomMeets(detected: BloomLevel, intended: BloomLevel): boolean {
  return BLOOM_ORDER.indexOf(detected) >= BLOOM_ORDER.indexOf(intended);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloom alignment log types (shared by Gatekeeper logging + SCRIBE)
// ─────────────────────────────────────────────────────────────────────────────

export interface BloomAlignmentEntry {
  slotId: string;
  writerBloom:     BloomLevel;   // slot.cognitiveDemand (what Writer was asked for)
  gatekeeperBloom: BloomLevel | null; // highest Bloom detected in the generated prompt
  aligned: boolean;              // gatekeeperBloom >= writerBloom
  direction?: "over" | "under";  // only set when !aligned
}

export type BloomAlignmentLog = BloomAlignmentEntry[];

/**
 * Derive a BloomAlignmentEntry for one (slot, generatedItem) pair.
 */
export function computeBloomAlignment(
  slotId: string,
  writerBloom: BloomLevel,
  promptText: string
): BloomAlignmentEntry {
  const gatekeeperBloom = classifyBloomLevel(promptText);

  const writerIdx     = BLOOM_ORDER.indexOf(writerBloom);
  const detectedIdx   = gatekeeperBloom ? BLOOM_ORDER.indexOf(gatekeeperBloom) : -1;

  const aligned = gatekeeperBloom !== null && detectedIdx >= writerIdx;

  return {
    slotId,
    writerBloom,
    gatekeeperBloom,
    aligned,
    direction: aligned
      ? undefined
      : detectedIdx > writerIdx
        ? "over"   // question landed higher than intended
        : "under", // question landed lower than intended
  };
}
