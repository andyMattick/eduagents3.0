import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertBackendStartupEnv } from "../../../lib/envGuard";
import { resolveActor, callGeminiMetered, isTokenLimitError, sendTokenLimitResponse } from "../../../lib/tokenGate";
import type {
  AssessmentItem,
  ConceptMatchIntelRequest,
  ConceptMatchIntelResponse,
  ConceptStat,
  PrepConceptStat,
  ConceptCoverage,
} from "../../../src/prism-v4/schema/domain/ConceptMatch";

export const runtime = "nodejs";

assertBackendStartupEnv(
  ["SUPABASE_URL", "SUPABASE_ANON_KEY", ["GOOGLE_API_KEY", "GEMINI_API_KEY"]],
  "api/v4/concept-match/intel"
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/* ── Phase 1: Test concept profile ── */

function buildTestConceptStatsFromTags(items: AssessmentItem[]): {
  stats: Record<string, ConceptStat>;
  testDifficulty: number;
} {
  const stats: Record<string, ConceptStat> = {};
  // Map lowercase → first-seen display label so we preserve original casing
  const displayKey: Record<string, string> = {};
  let totalDifficulty = 0;

  for (const item of items) {
    const diff = item.tags?.difficulty ?? 3;
    totalDifficulty += diff;
    const concepts = item.tags?.concepts ?? [];
    for (const concept of concepts) {
      const norm = concept.toLowerCase().trim();
      if (!norm) continue;
      // Use first-seen casing as the canonical display key
      if (!displayKey[norm]) displayKey[norm] = concept.trim();
      const key = displayKey[norm];
      if (!stats[key]) {
        stats[key] = { count: 0, difficulties: [], avgDifficulty: 0, questionNumbers: [] };
      }
      stats[key].count += 1;
      stats[key].difficulties.push(diff);
      stats[key].questionNumbers.push(item.itemNumber);
    }
  }

  for (const key of Object.keys(stats)) {
    const s = stats[key];
    s.avgDifficulty = s.difficulties.length > 0
      ? Math.round((s.difficulties.reduce((a, b) => a + b, 0) / s.difficulties.length) * 100) / 100
      : 3;
  }

  const testDifficulty = items.length > 0
    ? Math.round((totalDifficulty / items.length) * 100) / 100
    : 3;

  return { stats, testDifficulty };
}

const TEST_EXTRACTION_PROMPT = `You are a curriculum analyst. Extract concepts and difficulty from each test question below.
For each question, identify:
- concepts: array of concept names (short, lowercase)
- difficulty: 1–5 (1=recall, 2=understand, 3=apply, 4=analyze, 5=create/evaluate)

Return JSON ONLY (no markdown fences):
{
  "items": [
    { "itemNumber": <number>, "concepts": ["..."], "difficulty": <number 1-5> }
  ]
}

QUESTIONS:
`;

async function buildTestConceptStatsFromLLM(
  items: AssessmentItem[],
  callLLM: (prompt: string) => Promise<string>
): Promise<{
  stats: Record<string, ConceptStat>;
  testDifficulty: number;
  enrichedItems: AssessmentItem[];
}> {
  const questionsText = items
    .map((i) => `Q${i.itemNumber}: ${i.rawText}`)
    .join("\n")
    .slice(0, 4000);

  const raw = await callLLM(TEST_EXTRACTION_PROMPT + questionsText);

  let parsed: { items: Array<{ itemNumber: number; concepts: string[]; difficulty: number }> };
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { stats: {}, testDifficulty: 3, enrichedItems: items };
  }

  // Merge LLM results back onto items
  const llmMap = new Map(parsed.items.map((i) => [i.itemNumber, i]));
  const enrichedItems: AssessmentItem[] = items.map((item) => {
    const llm = llmMap.get(item.itemNumber);
    return {
      ...item,
      tags: {
        concepts: llm?.concepts ?? [],
        difficulty: llm?.difficulty ?? 3,
      },
    };
  });

  const result = buildTestConceptStatsFromTags(enrichedItems);
  return { ...result, enrichedItems };
}

/* ── Phase 2: Prep concept profile (LLM-assisted extraction) ── */

function buildPrepExtractionPrompt(testConceptLabels: string[]): string {
  const anchorSection = testConceptLabels.length
    ? `
IMPORTANT: The test covers these specific concepts:
${testConceptLabels.map((c) => `  - ${c}`).join("\n")}

When the prep material covers one of these concepts, use the EXACT concept name from the list above.
Only introduce a new concept name if the prep material covers something truly not on this list.
`
    : "";

  return `You are a curriculum analyst. Extract concepts from the following teacher preparation material.
For each concept, determine:
- how many times it appears (notes references + question references)
- estimated difficulty for each occurrence (1 = recall, 2 = understand, 3 = apply, 4 = analyze, 5 = create/evaluate)
  - plain notes/definitions → 1–2
  - worked examples → 2–3
  - practice questions → same estimator as test items
${anchorSection}
Return JSON ONLY (no markdown fences):
{
  "concepts": {
    "<concept_name>": {
      "count": <number>,
      "difficulties": [<number>, ...]
    }
  },
  "overallDifficulty": <number 1-5>
}

MATERIAL:
`;
}

async function buildPrepConceptStats(
  rawText: string,
  testConceptLabels: string[],
  callLLM: (prompt: string) => Promise<string>
): Promise<{
  stats: Record<string, PrepConceptStat>;
  prepDifficulty: number;
}> {
  const prompt = buildPrepExtractionPrompt(testConceptLabels) + rawText.slice(0, 6000);
  const raw = await callLLM(prompt);

  let parsed: {
    concepts: Record<string, { count: number; difficulties: number[] }>;
    overallDifficulty: number;
  };

  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { stats: {}, prepDifficulty: 3 };
  }

  const stats: Record<string, PrepConceptStat> = {};

  for (const [concept, data] of Object.entries(parsed.concepts ?? {})) {
    const key = concept.trim(); // preserve LLM casing — anchored prompt reuses test concept labels
    if (!key) continue;
    const difficulties = Array.isArray(data.difficulties) ? data.difficulties : [];
    stats[key] = {
      count: typeof data.count === "number" ? data.count : difficulties.length,
      difficulties,
      avgDifficulty: difficulties.length > 0
        ? Math.round((difficulties.reduce((a, b) => a + b, 0) / difficulties.length) * 100) / 100
        : 2,
    };
  }

  return {
    stats,
    prepDifficulty: typeof parsed.overallDifficulty === "number" ? parsed.overallDifficulty : 3,
  };
}

/* ── Phase 3: Coverage summary ── */

function buildConceptCoverage(
  testStats: Record<string, ConceptStat>,
  prepStats: Record<string, PrepConceptStat>
): ConceptCoverage {
  const covered: string[] = [];
  const tooEasy: string[] = [];
  const missing: string[] = [];
  const tooFewTimes: string[] = [];

  // Build a lowercase → value lookup for prep stats so matching is case-insensitive
  const prepLookup = new Map<string, PrepConceptStat>();
  for (const [key, value] of Object.entries(prepStats)) {
    prepLookup.set(key.toLowerCase(), value);
  }

  for (const concept of Object.keys(testStats)) {
    const prep = prepLookup.get(concept.toLowerCase());
    if (!prep) {
      missing.push(concept);
      continue;
    }

    const testAvg = testStats[concept].avgDifficulty;
    const prepAvg = prep.avgDifficulty;

    if (testAvg - prepAvg > 0.5) {
      tooEasy.push(concept);
    } else {
      covered.push(concept);
    }

    if (prep.count < testStats[concept].count * 0.5) {
      tooFewTimes.push(concept);
    }
  }

  return { covered, tooEasy, missing, tooFewTimes };
}

/* ── Phase 4: Teacher summary (TEST-centric) ── */

function buildSummaryPrompt(
  testStats: Record<string, ConceptStat>,
  prepStats: Record<string, PrepConceptStat>,
  coverage: ConceptCoverage
): string {
  const testProfile = Object.entries(testStats)
    .map(([c, s]) => `  - ${c}: appears ${s.count}x, avg difficulty ${s.avgDifficulty}`)
    .join("\n") || "  (none)";

  const prepProfile = Object.entries(prepStats)
    .map(([c, s]) => `  - ${c}: appears ${s.count}x, avg difficulty ${s.avgDifficulty}`)
    .join("\n") || "  (none)";

  const coverageSummary = [
    coverage.covered.length ? `Covered well: ${coverage.covered.join(", ")}` : "",
    coverage.tooEasy.length ? `Covered but too easy: ${coverage.tooEasy.join(", ")}` : "",
    coverage.missing.length ? `Not covered: ${coverage.missing.join(", ")}` : "",
    coverage.tooFewTimes.length ? `Covered too few times: ${coverage.tooFewTimes.join(", ")}` : "",
  ].filter(Boolean).join("\n  ") || "  (no coverage data)";

  return `You are generating a teacher-facing summary of how well the PREP document prepares students for the TEST.

You MUST base your summary ONLY on the TEST concepts, the PREP coverage of those TEST concepts, and the difficulty alignment between PREP and TEST.

DO NOT describe the PREP document in isolation.
DO NOT summarize PREP topics unless directly comparing them to TEST concepts.
DO NOT invent concepts or topics not present in the TEST.

TEST CONCEPT PROFILE
${testProfile}

PREP COVERAGE PROFILE
${prepProfile}

COVERAGE SUMMARY
  ${coverageSummary}

Write a concise, teacher-friendly narrative (3–5 sentences) that answers:
1. What concepts the TEST actually assesses.
2. Which of those concepts PREP covers well.
3. Which concepts PREP covers but at too low a difficulty.
4. Which concepts PREP does not cover at all.
5. What PREP needs to add or strengthen to fully prepare students.

Keep the tone factual, actionable, and focused on TEST → PREP alignment.
Return plain text only — no JSON, no markdown formatting.`;
}

/* ── Handler ── */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") return res.status(200).json({});
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body: ConceptMatchIntelRequest =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!body.prep?.rawText || !body.assessment?.items?.length) {
      return res.status(400).json({ error: "Missing prep.rawText or assessment.items" });
    }

    const actor = resolveActor(req);

    const callLLM = async (prompt: string) => {
      const result = await callGeminiMetered(actor, {
        prompt,
        temperature: 0.3,
        maxOutputTokens: 2000,
      });
      return result.text;
    };

    // Phase 1: Test concept profile
    const hasTaggedItems = body.assessment.items.some(
      (i) => i.tags?.concepts?.length
    );

    let testConceptStats: Record<string, ConceptStat>;
    let testDifficulty: number;
    let enrichedItems = body.assessment.items;

    if (hasTaggedItems) {
      const result = buildTestConceptStatsFromTags(body.assessment.items);
      testConceptStats = result.stats;
      testDifficulty = result.testDifficulty;
    } else {
      // Items don't have concept tags — use LLM to extract
      const result = await buildTestConceptStatsFromLLM(body.assessment.items, callLLM);
      testConceptStats = result.stats;
      testDifficulty = result.testDifficulty;
      enrichedItems = result.enrichedItems;
    }

    // Phase 2: Prep concept profile (LLM, anchored to test concept labels)
    const { stats: prepConceptStats, prepDifficulty } = await buildPrepConceptStats(
      body.prep.rawText,
      Object.keys(testConceptStats),
      callLLM
    );

    // Phase 3: Coverage summary
    const conceptCoverage = buildConceptCoverage(testConceptStats, prepConceptStats);

    // Phase 4: TEST-centric teacher summary
    let teacherSummary: string | undefined;
    try {
      teacherSummary = await callLLM(
        buildSummaryPrompt(testConceptStats, prepConceptStats, conceptCoverage)
      );
    } catch {
      // Non-fatal: summary is optional, coverage data still returned
    }

    const response: ConceptMatchIntelResponse = {
      prepDifficulty,
      testDifficulty,
      testConceptStats,
      prepConceptStats,
      conceptCoverage,
      teacherSummary,
    };

    // Include enriched items (with LLM-extracted concepts) for evidence modal
    return res.status(200).json({ ...response, enrichedItems });
  } catch (err) {
    if (isTokenLimitError(err)) {
      return sendTokenLimitResponse(res, err);
    }
    console.error("[concept-match/intel] Error:", err);
    return res.status(500).json({
      error: "Concept match analysis failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
