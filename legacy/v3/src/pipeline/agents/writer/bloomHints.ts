/**
 * bloomHints.ts
 *
 * Per-slot Bloom intent hints injected into the Writer prompt.
 *
 * Beyond just labelling a slot "cognitiveDemand: analyze", the Writer receives:
 *   - The primary action verb(s) expected at that level
 *   - A concrete question-starter example appropriate for the question type
 *   - A "structure note" describing the expected depth of response
 *
 * This dramatically reduces Bloom drift because the LLM has a worked example
 * to anchor on, not just a category label.
 */

export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export interface BloomHint {
  level: BloomLevel;
  questionType: string;
  /** Primary verbs the question stem MUST contain at least one of. */
  primaryVerbs: string[];
  /** Ready-to-use question opener example (domain-agnostic). */
  exampleStarter: string;
  /** One sentence on the expected cognitive structure of the answer. */
  structureNote: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hint table
// ─────────────────────────────────────────────────────────────────────────────

const BLOOM_HINTS: BloomHint[] = [
  // ── remember ──────────────────────────────────────────────────────────────
  {
    level: "remember",
    questionType: "multipleChoice",
    primaryVerbs: ["identify", "recall", "name", "which", "what is"],
    exampleStarter: "Which term describes…?",
    structureNote: "Single factual answer; no explanation required.",
  },
  {
    level: "remember",
    questionType: "shortAnswer",
    primaryVerbs: ["define", "list", "state", "name"],
    exampleStarter: "List two characteristics of…",
    structureNote: "Recall only — a one-sentence or bullet-point response is expected.",
  },
  {
    level: "remember",
    questionType: "fillInTheBlank",
    primaryVerbs: ["identify", "recall", "name"],
    exampleStarter: "The process by which _____ occurs is called…",
    structureNote: "Single missing term recalled from memory.",
  },
  {
    level: "remember",
    questionType: "trueFalse",
    primaryVerbs: ["identify", "recall"],
    exampleStarter: "True or False: The…",
    structureNote: "Binary factual judgment with no reasoning required.",
  },
  {
    level: "remember",
    questionType: "matching",
    primaryVerbs: ["match", "identify", "label"],
    exampleStarter: "Match each term to its definition.",
    structureNote: "Term-to-definition or symbol-to-meaning pairing.",
  },
  {
    level: "remember",
    questionType: "constructedResponse",
    primaryVerbs: ["define", "list", "state"],
    exampleStarter: "Define the following terms in your own words:",
    structureNote: "Short definitions or enumeration; no analysis needed.",
  },

  // ── understand ────────────────────────────────────────────────────────────
  {
    level: "understand",
    questionType: "multipleChoice",
    primaryVerbs: ["explain", "describe", "why", "how does", "what does"],
    exampleStarter: "Which best explains why…?",
    structureNote: "Answer requires understanding a concept, not just naming it.",
  },
  {
    level: "understand",
    questionType: "shortAnswer",
    primaryVerbs: ["explain", "describe", "summarize", "interpret"],
    exampleStarter: "Explain why… in your own words.",
    structureNote: "2–3 sentence paraphrase or causal explanation expected.",
  },
  {
    level: "understand",
    questionType: "constructedResponse",
    primaryVerbs: ["explain", "describe", "summarize", "interpret"],
    exampleStarter: "Describe how… and explain why it is significant.",
    structureNote: "A paragraph showing conceptual understanding; examples help.",
  },
  {
    level: "understand",
    questionType: "trueFalse",
    primaryVerbs: ["explain", "why"],
    exampleStarter: "True or False: …because…",
    structureNote: "Statement tests conceptual understanding, not bare fact.",
  },
  {
    level: "understand",
    questionType: "fillInTheBlank",
    primaryVerbs: ["explain", "describe", "summarize"],
    exampleStarter: "The reason _____ happens is that…",
    structureNote: "Fill in a causal or conceptual phrase, not just a label.",
  },
  {
    level: "understand",
    questionType: "matching",
    primaryVerbs: ["describe", "explain", "classify"],
    exampleStarter: "Match each concept to the statement that best describes it.",
    structureNote: "Pairs test comprehension of meaning, not just vocabulary.",
  },

  // ── apply ─────────────────────────────────────────────────────────────────
  {
    level: "apply",
    questionType: "multipleChoice",
    primaryVerbs: ["calculate", "solve", "find", "use", "compute", "determine"],
    exampleStarter: "Calculate the… given that…",
    structureNote: "Requires executing a known procedure on new numbers or context.",
  },
  {
    level: "apply",
    questionType: "shortAnswer",
    primaryVerbs: ["solve", "calculate", "use", "demonstrate", "show how"],
    exampleStarter: "Solve the following problem and show your work:",
    structureNote: "Show procedural steps; a numeric or single-outcome answer expected.",
  },
  {
    level: "apply",
    questionType: "constructedResponse",
    primaryVerbs: ["apply", "use", "demonstrate", "show how", "carry out"],
    exampleStarter: "Using the method of…, demonstrate how to…",
    structureNote: "Multi-step worked solution; shows transfer of a procedure.",
  },
  {
    level: "apply",
    questionType: "fillInTheBlank",
    primaryVerbs: ["calculate", "find", "determine", "compute"],
    exampleStarter: "After applying the formula, the result is _____.",
    structureNote: "Blank is a computed value, not a recalled term.",
  },
  {
    level: "apply",
    questionType: "ordering",
    primaryVerbs: ["sequence", "perform", "carry out", "apply"],
    exampleStarter: "Place the steps of… in the correct order.",
    structureNote: "Sequencing a known procedure in the correct operational order.",
  },

  // ── analyze ───────────────────────────────────────────────────────────────
  {
    level: "analyze",
    questionType: "multipleChoice",
    primaryVerbs: ["compare", "contrast", "identify the error", "distinguish", "examine"],
    exampleStarter: "Compare… and… — which statement correctly identifies the difference?",
    structureNote: "Options require discriminating between related concepts or identifying an error.",
  },
  {
    level: "analyze",
    questionType: "shortAnswer",
    primaryVerbs: ["compare", "contrast", "examine", "analyze", "distinguish"],
    exampleStarter: "Compare… and… by identifying two key differences.",
    structureNote: "Structured comparison or error-detection with explicit reasoning.",
  },
  {
    level: "analyze",
    questionType: "constructedResponse",
    primaryVerbs: ["analyze", "compare", "examine", "trace", "break down", "identify the relationship"],
    exampleStarter: "Analyze the relationship between… and… using specific evidence.",
    structureNote: "Extended response deconstructing a concept, process, or argument.",
  },
  {
    level: "analyze",
    questionType: "trueFalse",
    primaryVerbs: ["analyze", "compare", "examine"],
    exampleStarter: "True or False: When comparing… to…, the key difference is that…",
    structureNote: "Statement encodes a structural comparison that requires analysis.",
  },
  {
    level: "analyze",
    questionType: "multipleChoice",
    primaryVerbs: ["infer", "both", "neither", "trace"],
    exampleStarter: "Based on the data, what can be inferred about…?",
    structureNote: "Requires inferential reasoning across two or more facts.",
  },

  // ── evaluate ──────────────────────────────────────────────────────────────
  {
    level: "evaluate",
    questionType: "multipleChoice",
    primaryVerbs: ["justify", "assess", "judge", "which is best", "defend"],
    exampleStarter: "Which approach is most effective for…, and why?",
    structureNote: "Options encode value judgments; best answer requires defensible reasoning.",
  },
  {
    level: "evaluate",
    questionType: "shortAnswer",
    primaryVerbs: ["justify", "defend", "argue", "assess", "evaluate"],
    exampleStarter: "Justify why… would be the most appropriate approach to…",
    structureNote: "Reasoned position with supporting evidence required; one correct answer exists.",
  },
  {
    level: "evaluate",
    questionType: "constructedResponse",
    primaryVerbs: ["evaluate", "critique", "defend", "assess", "argue", "support"],
    exampleStarter: "Evaluate the claim that… Use evidence to support or refute this position.",
    structureNote: "Argumentative paragraph — position + 2–3 pieces of evidence + conclusion.",
  },
  {
    level: "evaluate",
    questionType: "trueFalse",
    primaryVerbs: ["judge", "assess", "defend"],
    exampleStarter: "True or False: The best solution to… is… because…",
    structureNote: "Statement encodes an evaluative judgment; students must assess validity.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the best-matching hint for a given level + question type.
 * Falls back to first hint for that level if no exact type match exists.
 */
// ─────────────────────────────────────────────────────────────────────────────
// Hint Mode types (exported so bloomHintBudget.ts can re-use without circular dep)
// ─────────────────────────────────────────────────────────────────────────────

export type HintMode = "MINIMAL" | "STANDARD" | "FULL";

export type DemandTier = "low" | "apply" | "high";

export function demandTier(level: BloomLevel): DemandTier {
  if (level === "remember" || level === "understand") return "low";
  if (level === "apply") return "apply";
  return "high"; // analyze, evaluate, create
}

export interface SlotHintComponents {
  includeLabel: true;
  includeVerbs: boolean;
  verbCount: number;       // 0 = all, 1 = first only
  includeExample: boolean;
  includeStructureNote: boolean;
}

/**
 * Per-slot verbosity decision table.
 *
 * | tier   | MINIMAL   | STANDARD         | FULL                          |
 * |--------|-----------|------------------|-------------------------------|
 * | low    | label     | label + 1 verb   | label (no extra scaffolding)  |
 * | apply  | label     | label + verbs    | label + verbs + structure     |
 * | high   | label+1v  | label + verbs    | label + verbs + example + str |
 */
export function slotHintComponents(
  tier: DemandTier,
  mode: HintMode
): SlotHintComponents {
  const base: SlotHintComponents = {
    includeLabel: true,
    includeVerbs: false,
    verbCount: 0,
    includeExample: false,
    includeStructureNote: false,
  };
  if (tier === "low") {
    if (mode === "MINIMAL") return { ...base };
    if (mode === "STANDARD") return { ...base, includeVerbs: true, verbCount: 1 };
    return { ...base }; // FULL — no extra scaffolding for low-demand
  }
  if (tier === "apply") {
    if (mode === "MINIMAL") return { ...base };
    if (mode === "STANDARD") return { ...base, includeVerbs: true, verbCount: 0 };
    return { ...base, includeVerbs: true, verbCount: 0, includeStructureNote: true }; // FULL
  }
  // high (analyze, evaluate, create)
  if (mode === "MINIMAL") return { ...base, includeVerbs: true, verbCount: 1 };
  if (mode === "STANDARD") return { ...base, includeVerbs: true, verbCount: 0 };
  return { ...base, includeVerbs: true, verbCount: 0, includeExample: true, includeStructureNote: true }; // FULL
}

/**
 * Mode-aware hint formatter. Replaces the always-FULL `formatBloomHintDirective`
 * for slot-specific rendering inside the Writer prompt.
 */
export function formatBloomHintForMode(
  hint: BloomHint,
  mode: HintMode,
  level: BloomLevel
): string {
  const tier = demandTier(level);
  const cfg = slotHintComponents(tier, mode);
  let out = `[Bloom intent: ${hint.level.toUpperCase()}]`;
  if (cfg.includeVerbs) {
    const verbs = cfg.verbCount > 0
      ? hint.primaryVerbs.slice(0, cfg.verbCount)
      : hint.primaryVerbs.slice(0, 3);
    out += ` Verbs: ${verbs.join(", ")}.`;
  }
  if (cfg.includeExample) {
    out += ` Example opener: "${hint.exampleStarter}"`;
  }
  if (cfg.includeStructureNote) {
    out += ` Structure: ${hint.structureNote}`;
  }
  return out;
}

export function getBloomHint(
  level: BloomLevel,
  questionType: string
): BloomHint | null {
  // Exact match first
  const exact = BLOOM_HINTS.find(
    h => h.level === level && h.questionType === questionType
  );
  if (exact) return exact;

  // Level-only fallback
  return BLOOM_HINTS.find(h => h.level === level) ?? null;
}

/**
 * Format a bloom hint as an inline prompt directive for the Writer.
 * Returns a compact single-line string suitable for inclusion per slot.
 */
export function formatBloomHintDirective(hint: BloomHint): string {
  return (
    `[Bloom intent: ${hint.level.toUpperCase()}] ` +
    `Verbs to use: ${hint.primaryVerbs.slice(0, 3).join(", ")}. ` +
    `Example opener: "${hint.exampleStarter}" ` +
    `Structure: ${hint.structureNote}`
  );
}

/**
 * Return per-slot bloom hint directives for the given slot list.
 * Pass `hintMode` to use the mode-aware (budgeted) formatter.
 * Defaults to FULL (always-full legacy behaviour) when omitted.
 */
export function buildBloomHintDirectives(
  slots: Array<{ id: string; cognitiveDemand?: string | null; questionType: string }>,
  hintMode: HintMode = "FULL"
): Array<{ slotId: string; directive: string }> {
  return slots.map(slot => {
    const level = (slot.cognitiveDemand ?? "understand") as BloomLevel;
    const hint = getBloomHint(level, slot.questionType);
    const directive = hint
      ? formatBloomHintForMode(hint, hintMode, level)
      : `[Bloom intent: ${level.toUpperCase()}] Use verbs appropriate for ${level}-level thinking.`;
    return { slotId: slot.id, directive };
  });
}
