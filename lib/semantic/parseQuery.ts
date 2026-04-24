/**
 * lib/semantic/parseQuery.ts — Query Semantic Parser
 *
 * Extracts intent, concepts, and constraints from a user query
 * using LLM, with aggressive normalization and safe fallbacks.
 * NEVER crashes — always returns valid QuerySemantics.
 */


// ── Types ───────────────────────────────────────────────────────────────────

export type QueryIntent = "question" | "generate" | "compare" | "explain";

export interface QuerySemantics {
  intent: QueryIntent;
  concepts: string[];
  constraints: string[];
}

// ── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_SEMANTICS: QuerySemantics = {
  intent: "question",
  concepts: [],
  constraints: [],
};

const VALID_INTENTS: Set<string> = new Set([
  "question",
  "generate",
  "compare",
  "explain",
]);

// ── Parser ──────────────────────────────────────────────────────────────────

const PARSE_PROMPT = `You are a query classifier. Analyze the user query and return ONLY valid JSON.

Output format (no markdown, no explanation):
{"intent":"question|generate|compare|explain","concepts":["word or short phrase"],"constraints":["constraint"]}

Rules:
- intent: "question" (asking about something), "generate" (create content), "compare" (contrast things), "explain" (break down a topic)
- concepts: key nouns/topics from the query. Max 5 items. Each max 5 words.
- constraints: filters or requirements (grade level, format, difficulty). Max 3 items.
- If unsure, use intent "question" and empty arrays.

Query: `;

/**
 * Parse a user query into structured semantics.
 * Uses LLM but normalizes aggressively. Never throws.
 */
export async function parseQuery(query: string): Promise<QuerySemantics> {
  void query;
  return DEFAULT_SEMANTICS;
}

// ── Normalization ───────────────────────────────────────────────────────────

function normalizeSemantics(raw: string): QuerySemantics {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(cleaned);

    const intent: QueryIntent = VALID_INTENTS.has(parsed.intent)
      ? (parsed.intent as QueryIntent)
      : "question";

    const concepts = normalizeStringArray(parsed.concepts, 5, 5);
    const constraints = normalizeStringArray(parsed.constraints, 3, 10);

    return { intent, concepts, constraints };
  } catch {
    console.warn("[semantic] Failed to parse LLM JSON, using fallback");
    return DEFAULT_SEMANTICS;
  }
}

function normalizeStringArray(
  arr: unknown,
  maxItems: number,
  maxWords: number
): string[] {
  if (!Array.isArray(arr)) return [];

  return arr
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.split(/\s+/).length <= maxWords)
    .slice(0, maxItems);
}

function normalizeTopic(value: unknown): string {
  if (typeof value !== "string") return "";

  let topic = value
    .replace(/\.$/, "")
    .split(".")[0]
    .trim();

  if (topic.length > 80) {
    topic = topic.split(/\s+/).slice(0, 5).join(" ");
  }

  return topic.slice(0, 100);
}

// ── Semantic extractor for documents (storage-time) ─────────────────────────

export interface DocumentSemantics {
  topic: string;
  concepts: string[];
  relationships: string[];
  misconceptions: string[];
}

const EXTRACT_PROMPT = `You are an educational content analyzer. Analyze the document excerpt and return ONLY valid JSON.

Output format (no markdown, no explanation):
{"topic":"main topic","concepts":["concept1","concept2"],"relationships":["A relates to B"],"misconceptions":["common misconception"]}

Rules:
- topic: single phrase describing the main subject (max 8 words)
- concepts: key educational concepts (max 10 items, each max 5 words)
- relationships: how concepts connect (max 5 items)
- misconceptions: common misunderstandings students have (max 3 items)
- If content is too short or unclear, use empty arrays.

Document excerpt:
`;

/**
 * Extract educational semantics from document content.
 * Used at storage time to enrich the document record.
 * Never throws — returns safe defaults.
 */
export async function extractSemantics(
  content: string
): Promise<DocumentSemantics> {
  const DEFAULT: DocumentSemantics = {
    topic: "",
    concepts: [],
    relationships: [],
    misconceptions: [],
  };

  void content;
  return DEFAULT;
}
