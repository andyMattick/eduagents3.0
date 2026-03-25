/**
 * Feasibility Layer — estimates whether a topic has enough conceptual surface
 * area to support the requested number of unique assessment items.
 *
 * Runs inside the Architect, after questionCount is determined but before
 * slots are built. Can auto-reduce slot count to prevent Writer overload
 * (the "slot_27" class of failures).
 *
 * Approach:
 *   1. Deterministic signals — tokenise topic + details + docs, extract unique
 *      concept terms and bigrams.
 *   2. Topic expansion factor — accounts for LLM world-knowledge expanding
 *      thin topics into implicit sub-concepts.
 *   3. Question-type diversity — each additional type lets the same concept be
 *      assessed differently.
 *   4. Document boost — uploaded source content adds assessable material.
 *   5. Bloom depth divisor — higher cognitive levels need more conceptual depth
 *      per question, shrinking effective surface.
 *   6. Load ratio — compare requested slots to estimated surface.
 *   7. Auto-adjust or warn.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConceptProfile {
  /** Unique non-stopword tokens found in topic + details + docs. */
  uniqueTerms: string[];
  /** Adjacent non-stopword pairs (compound concepts like "expected value"). */
  bigramConcepts: string[];
  /** Token count from topic string alone. */
  topicTokenCount: number;
  /** Token count from additionalDetails string. */
  detailsTokenCount: number;
  /** Token count from uploaded source documents. */
  documentTokenCount: number;
  /** Final estimated concept count (unique terms + bigram bonus + expansion). */
  estimatedConceptCount: number;
}

export interface FeasibilityReport {
  /** Overall score 0–100 (higher = more feasible). */
  feasibilityScore: number;
  /** requestedSlots / conceptualSurface — the core overload metric. */
  loadRatio: number;
  /** Estimated max unique slots the topic comfortably supports. */
  conceptualSurfaceScore: number;
  /** Risk classification. */
  riskLevel: "safe" | "caution" | "high" | "overload";
  /** Recommended slot range for quality generation. */
  recommendedSlotRange: { min: number; max: number };
  /** True when topic is thin but Bloom ceiling is high (analyze+). */
  bloomRisk: boolean;
  /** Human-readable warnings for the teacher / blueprint. */
  warnings: string[];
  /** Non-null when auto-reduction was applied (overload only). */
  adjustedQuestionCount: number | null;
  /** Raw concept extraction data (useful for debugging / trace). */
  conceptProfile: ConceptProfile;
  /**
   * Non-null when a canonically complex/mature literary work is paired with
   * a primary-grade target audience. This should block generation and force
   * explicit teacher confirmation before proceeding.
   */
  gradeTextWarning: string | null;
}

// ── Tuning constants ─────────────────────────────────────────────────────────

/** Each additional question type lets a concept be assessed differently. */
const TYPE_DIVERSITY_FACTOR = 0.3;

/** LLM world-knowledge floor — even a one-word topic has implicit sub-concepts. */
const IMPLICIT_CONCEPT_FLOOR = 5;

/** Expansion factor for LLM's ability to generate sub-concepts from stated ones. */
const TOPIC_EXPANSION_FACTOR = 1.5;

/** Max fraction of surface to use when auto-adjusting (leave headroom). */
const AUTO_ADJUST_HEADROOM = 0.85;

/** Document token threshold for max boost. */
const DOC_TOKEN_SATURATION = 2000;

/** Max additional boost from uploaded documents. */
const DOC_BOOST_MAX = 0.5;

// ── Load ratio thresholds ────────────────────────────────────────────────────
const THRESHOLD_SAFE    = 1.0;
const THRESHOLD_CAUTION = 1.5;
const THRESHOLD_HIGH    = 2.0;
// > 2.0 → overload

// ── Stopwords (function words only — verbs/nouns that could carry domain ────
//    meaning in an educational context are deliberately excluded)
const STOPWORDS = new Set([
  // articles
  "a", "an", "the",
  // prepositions
  "in", "on", "at", "to", "for", "of", "with", "by", "from", "about",
  "up", "out", "into", "over", "after", "before", "between", "under",
  "through", "during", "without", "within", "along", "across", "behind",
  "beyond", "upon", "toward", "towards",
  // conjunctions
  "and", "or", "but", "so", "if", "then", "as", "than", "because",
  "while", "although", "unless", "since", "until", "nor", "yet",
  // pronouns
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
  "us", "them", "my", "your", "his", "its", "our", "their", "mine",
  "yours", "hers", "ours", "theirs", "this", "that", "these", "those",
  "what", "which", "who", "whom", "whose", "how", "when", "where", "why",
  // auxiliaries / modals
  "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having",
  "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "shall", "can",
  "must", "need", "ought",
  // common adverbs / determiners
  "not", "no", "only", "very", "just", "also", "too", "each", "every",
  "both", "few", "more", "most", "some", "any", "all", "such",
  "here", "there", "now", "still", "again", "even", "really", "well",
  "much", "many", "often", "always", "never", "already", "quite",
  // filler / structural
  "etc", "e.g", "i.e", "like", "also", "however", "therefore",
  "thus", "hence", "furthermore", "moreover", "please", "using",
  "used", "especially",
]);

// ── Bloom depth weight — higher Bloom = fewer sustainable slots per concept ─
const BLOOM_DEPTH_WEIGHT: Record<string, number> = {
  remember:   1.0,
  understand: 1.0,
  apply:      1.1,
  analyze:    1.3,
  evaluate:   1.5,
  create:     1.8,
};

const BLOOM_ORDER = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Tokenise text into lowercase words, stripping punctuation. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/** Remove stopwords and return unique concept terms (order preserved). */
function extractUniqueTerms(tokens: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of tokens) {
    if (!STOPWORDS.has(t) && !seen.has(t)) {
      seen.add(t);
      result.push(t);
    }
  }
  return result;
}

/** Extract unique bigrams from adjacent non-stopword tokens. */
function extractBigrams(tokens: string[]): string[] {
  const filtered = tokens.filter(t => !STOPWORDS.has(t) && t.length > 2);
  const bigrams = new Set<string>();
  for (let i = 0; i < filtered.length - 1; i++) {
    bigrams.add(`${filtered[i]} ${filtered[i + 1]}`);
  }
  return [...bigrams];
}

/** Count comma- or semicolon-separated items in text (teachers often list sub-topics). */
function countExplicitListItems(text: string): number {
  // "fractions, decimals, percentages" → 3 items
  const lists = text.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2);
  // Only count as a "list" if there are at least 2 items
  return lists.length >= 2 ? lists.length : 0;
}

// ── Core functions ───────────────────────────────────────────────────────────

/**
 * Extract a concept profile from the teacher's topic, additional details,
 * and any uploaded source documents.
 */
export function extractConceptProfile(
  topic: string | null,
  additionalDetails: string | null,
  sourceDocuments?: Array<{ content: string }> | null
): ConceptProfile {
  const topicText   = topic ?? "";
  const detailsText = additionalDetails ?? "";
  const docText     = (sourceDocuments ?? []).map(d => d.content).join(" ");

  const allText     = [topicText, detailsText, docText].join(" ").trim();
  const tokens      = tokenize(allText);
  const uniqueTerms = extractUniqueTerms(tokens);
  const bigramConcepts = extractBigrams(tokens);

  // Count explicit list items in topic and details (comma/semicolon lists)
  const listItemCount = countExplicitListItems(topicText) +
                        countExplicitListItems(detailsText);

  // Bigram bonus: bigrams represent compound concepts like "binary search",
  // "expected value", "civil war". Cap at half the unique term count to
  // avoid double-counting.
  const bigramBonus = Math.min(bigramConcepts.length, Math.ceil(uniqueTerms.length * 0.5));

  // List bonus: explicit teacher-listed sub-topics that may not add new
  // unique tokens but signal broader conceptual intent
  const listBonus = Math.max(0, listItemCount - uniqueTerms.length);

  // Raw concept count
  const rawConcepts = uniqueTerms.length + bigramBonus + listBonus;

  // Topic expansion: LLM world-knowledge can generate sub-concepts from
  // stated concepts. This factor tapers as the teacher provides more detail.
  const expanded = Math.round(rawConcepts * TOPIC_EXPANSION_FACTOR);

  // Floor: any stated topic has at least IMPLICIT_CONCEPT_FLOOR addressable concepts
  const estimatedConceptCount = Math.max(IMPLICIT_CONCEPT_FLOOR, expanded);

  return {
    uniqueTerms,
    bigramConcepts,
    topicTokenCount:    tokenize(topicText).length,
    detailsTokenCount:  tokenize(detailsText).length,
    documentTokenCount: tokenize(docText).length,
    estimatedConceptCount,
  };
}

/**
 * Estimate the conceptual surface area — how many unique, non-repetitive
 * assessment items the topic can realistically support.
 */
export function estimateConceptualSurface(
  profile: ConceptProfile,
  questionTypeCount: number,
  depthCeiling: string
): number {
  const { estimatedConceptCount, documentTokenCount } = profile;

  // Question type diversity: each additional type lets a concept be assessed
  // in a different format (MCQ about X, short answer about X, etc.)
  const typeMultiplier = 1 + Math.max(0, questionTypeCount - 1) * TYPE_DIVERSITY_FACTOR;

  // Document boost: uploaded content adds assessable material
  const docMultiplier = documentTokenCount > 0
    ? 1 + Math.min(documentTokenCount / DOC_TOKEN_SATURATION, 1.0) * DOC_BOOST_MAX
    : 1.0;

  // Bloom depth penalty: higher cognitive demands need more conceptual
  // depth per question, so the effective surface shrinks
  const depthWeight = BLOOM_DEPTH_WEIGHT[depthCeiling] ?? 1.0;

  const rawSurface = estimatedConceptCount * typeMultiplier * docMultiplier;

  // Divide by depth weight: deeper Bloom = fewer sustainable slots
  return Math.max(1, Math.round(rawSurface / depthWeight));
}

/**
 * Evaluate whether the requested question count is feasible given the
 * topic's conceptual surface area. Returns a structured report with
 * risk classification, warnings, and an optional auto-adjusted count.
 */
export function evaluateFeasibility({
  topic,
  additionalDetails,
  sourceDocuments,
  requestedSlotCount,
  questionTypes,
  depthFloor: _depthFloor,
  depthCeiling,
  pacingOverrides,
  assessmentDurationMinutes,
}: {
  topic: string | null;
  additionalDetails: string | null;
  sourceDocuments?: Array<{ content: string }> | null;
  requestedSlotCount: number;
  questionTypes: string[];
  depthFloor: string;
  depthCeiling: string;
  /**
   * Optional: real per-type pacing (seconds) from the teacher's profile.
   * When provided, an additional time-based load ratio is computed and
   * blended with the conceptual load ratio.
   */
  pacingOverrides?: Record<string, number> | null;
  /**
   * Optional: teacher's expected total duration for this assessment type.
   * Used with pacingOverrides to determine time-based overload.
   */
  assessmentDurationMinutes?: number | null;
}): FeasibilityReport {

  const profile      = extractConceptProfile(topic, additionalDetails, sourceDocuments);
  const uniqueTypeCount = new Set(questionTypes).size || 1;
  const surface      = estimateConceptualSurface(profile, uniqueTypeCount, depthCeiling);
  let   loadRatio    = requestedSlotCount / surface;

  // ── Profile-aware time-based load ratio ──────────────────────────────────
  // When pacing defaults are provided, compute a second load ratio based on
  // whether the requested slots actually fit in the expected duration.
  // The final loadRatio is the more pessimistic of the two.
  if (pacingOverrides && assessmentDurationMinutes && assessmentDurationMinutes > 0) {
    const types = questionTypes.length > 0 ? questionTypes : ["multipleChoice"];
    const avgPacingSeconds =
      types.reduce((sum, t) => sum + (pacingOverrides[t] ?? 60), 0) / types.length;
    const requiredSeconds   = requestedSlotCount * avgPacingSeconds;
    const availableSeconds  = assessmentDurationMinutes * 60;
    const timeLoadRatio     = requiredSeconds / availableSeconds;
    // Use whichever ratio is higher (more conservative)
    if (timeLoadRatio > loadRatio) {
      loadRatio = timeLoadRatio;
    }
  }

  // ── Risk level ────────────────────────────────────────────────────────
  let riskLevel: FeasibilityReport["riskLevel"];
  if      (loadRatio <= THRESHOLD_SAFE)    riskLevel = "safe";
  else if (loadRatio <= THRESHOLD_CAUTION) riskLevel = "caution";
  else if (loadRatio <= THRESHOLD_HIGH)    riskLevel = "high";
  else                                     riskLevel = "overload";

  // ── Feasibility score (0–100) ─────────────────────────────────────────
  let feasibilityScore: number;
  if (loadRatio <= THRESHOLD_SAFE) {
    // 80–100
    feasibilityScore = 80 + Math.round((THRESHOLD_SAFE - loadRatio) / THRESHOLD_SAFE * 20);
  } else if (loadRatio <= THRESHOLD_CAUTION) {
    // 60–79
    feasibilityScore = 60 + Math.round(
      (THRESHOLD_CAUTION - loadRatio) / (THRESHOLD_CAUTION - THRESHOLD_SAFE) * 19
    );
  } else if (loadRatio <= THRESHOLD_HIGH) {
    // 30–59
    feasibilityScore = 30 + Math.round(
      (THRESHOLD_HIGH - loadRatio) / (THRESHOLD_HIGH - THRESHOLD_CAUTION) * 29
    );
  } else {
    // 0–29
    feasibilityScore = Math.max(0, 30 - Math.round((loadRatio - THRESHOLD_HIGH) * 20));
  }
  feasibilityScore = Math.min(100, Math.max(0, feasibilityScore));

  // ── Bloom risk: narrow topic + high Bloom ceiling ─────────────────────
  const ceilingIdx = BLOOM_ORDER.indexOf(depthCeiling);
  const bloomRisk  = profile.estimatedConceptCount <= 8 && ceilingIdx >= 3;

  // ── Recommended slot range ────────────────────────────────────────────
  const recommendedMax = Math.max(1, Math.round(surface * AUTO_ADJUST_HEADROOM));
  const recommendedMin = Math.max(1, Math.round(surface * 0.5));

  // ── Warnings ──────────────────────────────────────────────────────────
  const warnings: string[] = [];

  if (riskLevel === "overload") {
    warnings.push(
      `Feasibility: This topic likely supports ${recommendedMin}–${recommendedMax} unique questions, ` +
      `but ${requestedSlotCount} were requested. Reducing to ${recommendedMax} to maintain quality.`
    );
  } else if (riskLevel === "high") {
    warnings.push(
      `Feasibility: This topic may not fully support ${requestedSlotCount} unique questions ` +
      `(estimated capacity: ~${recommendedMax}). Some repetition or drift is possible.`
    );
  } else if (riskLevel === "caution") {
    warnings.push(
      `Feasibility note: Topic density is moderate for ${requestedSlotCount} questions. ` +
      `Adding subtopics or details can improve variety.`
    );
  }

  if (bloomRisk) {
    warnings.push(
      `Bloom risk: The topic has limited conceptual depth for higher-order ("${depthCeiling}") questions. ` +
      `Consider adding more content detail or reducing the cognitive demand.`
    );
  }

  // Surface concept extraction stats so trace is debuggable
  if (riskLevel !== "safe") {
    warnings.push(
      `[Feasibility detail] ${profile.uniqueTerms.length} unique terms, ` +
      `${profile.bigramConcepts.length} bigrams, ` +
      `${profile.documentTokenCount} doc tokens → ` +
      `surface score ${surface}, load ratio ${Math.round(loadRatio * 100) / 100}.`
    );
  }

  // ── Auto-adjustment (overload only) ───────────────────────────────────
  let adjustedQuestionCount: number | null = null;
  if (riskLevel === "overload") {
    adjustedQuestionCount = Math.max(1, recommendedMax);
  }

  return {
    feasibilityScore,
    loadRatio:              Math.round(loadRatio * 100) / 100,
    conceptualSurfaceScore: surface,
    riskLevel,
    recommendedSlotRange:   { min: recommendedMin, max: recommendedMax },
    bloomRisk,
    warnings,
    adjustedQuestionCount,
    conceptProfile:         profile,
    // Populated downstream by runFeasibilityPrecheck (UI layer) and by the Architect.
    gradeTextWarning:       null,
  };
}
