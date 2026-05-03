"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/concept-match/intel.ts
function hasValue(source, key) {
  const value = source[key];
  return Boolean(value && value.trim().length > 0);
}
function requirementLabel(requirement) {
  if (typeof requirement === "string") {
    return requirement;
  }
  return requirement.join(" | ");
}
function assertRequiredEnvKeys(requiredKeys, source, scope) {
  const missing = requiredKeys.filter((requirement) => {
    if (typeof requirement === "string") {
      return !hasValue(source, requirement);
    }
    return !requirement.some((key) => hasValue(source, key));
  });
  if (missing.length === 0) {
    return;
  }
  const missingLabels = missing.map(requirementLabel);
  const message = `Server cannot start (${scope}). Missing environment variables: ${missingLabels.join(", ")}`;
  console.error("Missing required environment variables:", missingLabels.join(", "));
  throw new Error(message);
}
function assertBackendStartupEnv(requiredKeys, scope) {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  assertRequiredEnvKeys(requiredKeys, process.env, scope);
}
function createConcurrencyLimit(concurrency) {
  let running = 0;
  const queue = [];
  function run(task) {
    return new Promise((resolve, reject) => {
      const attempt = () => {
        running++;
        task().then((value) => {
          running--;
          resolve(value);
          next();
        }, (err) => {
          running--;
          reject(err);
          next();
        });
      };
      if (running < concurrency) {
        attempt();
      } else {
        queue.push(attempt);
      }
    });
  }
  function next() {
    if (queue.length > 0 && running < concurrency) {
      const task = queue.shift();
      task();
    }
  }
  return run;
}
var providerLimit = createConcurrencyLimit(1);
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }
  return { url, key };
}
async function supabaseRest(table, options = {}) {
  const { url, key } = supabaseAdmin();
  const {
    method = "GET",
    select,
    filters = {},
    body,
    prefer,
    timeoutMs = 8e3
  } = options;
  const reqUrl = new URL(`${url}/rest/v1/${table}`);
  if (select)
    reqUrl.searchParams.set("select", select);
  for (const [k, v] of Object.entries(filters)) {
    reqUrl.searchParams.set(k, v);
  }
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  if (prefer)
    headers["Prefer"] = prefer;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => { controller.abort(); }, timeoutMs);
  let res;
  try {
    res = await fetch(reqUrl.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const timeoutError = new Error(`Supabase REST ${method} ${table} timed out after ${timeoutMs}ms`);
      timeoutError.code = "timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase REST ${method} ${table} failed (${res.status}): ${text}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return null;
}
var DAILY_TOKEN_LIMIT = 25e3;
var TOKEN_LIMIT_ERROR = "TOKEN_LIMIT_REACHED";
function getSingleHeader(header) {
  return Array.isArray(header) ? header[0] ?? "" : header ?? "";
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function resolveActor(req) {
  const forwarded = getSingleHeader(req.headers["x-forwarded-for"]);
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const claimed = getSingleHeader(req.headers["x-user-id"]) || getSingleHeader(req.headers["x-teacher-id"]);
  const userId = isUuid(claimed) ? claimed : null;
  return { actorKey: userId ?? `ip:${ip}`, userId };
}
async function getDailyUsage(actorKey) {
  const today = new Date().toISOString().slice(0, 10);
  const tokenRows = await supabaseRest("user_daily_tokens", {
    method: "GET",
    select: "tokens_used",
    filters: { actor_key: `eq.${actorKey}`, date: `eq.${today}` }
  }).catch(() => null);
  const tokenCount = Array.isArray(tokenRows) && tokenRows.length > 0 ? Number(tokenRows[0].tokens_used ?? 0) : 0;
  const legacyRows = await supabaseRest("user_daily_usage", {
    method: "GET",
    select: "tokens_used",
    filters: { actor_key: `eq.${actorKey}`, usage_date: `eq.${today}` }
  }).catch(() => null);
  const legacyCount = Array.isArray(legacyRows) && legacyRows.length > 0 ? Number(legacyRows[0].tokens_used ?? 0) : 0;
  return Math.max(tokenCount, legacyCount);
}
var TokenLimitError = class extends Error {
  code = TOKEN_LIMIT_ERROR;
  remaining;
  limit;
  constructor(used, limit) {
    super(`Daily token limit of ${limit.toLocaleString()} reached (${used.toLocaleString()} used). Please try again tomorrow.`);
    this.remaining = Math.max(0, limit - used);
    this.limit = limit;
  }
};
function isTokenLimitError(err) {
  return err instanceof TokenLimitError;
}
function sendTokenLimitResponse(res, err) {
  const respond = res.status(429);
  if (typeof respond.json === "function") {
    return respond.json({
      error: err.message,
      code: TOKEN_LIMIT_ERROR,
      remaining: err.remaining,
      limit: err.limit
    });
  }
  return respond;
}
async function batchEmbedConcepts(concepts) {
  if (concepts.length === 0)
    return [];
  return concepts.map((concept) => {
    const dims = 48;
    const vector = new Array(dims).fill(0);
    for (let i = 0; i < concept.length; i++) {
      vector[i % dims] += concept.charCodeAt(i) % 89 / 89;
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return norm > 0 ? vector.map((value) => value / norm) : vector;
  });
}
function cosineSimilarity(a, b) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length)
    return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
function clusterEmbeddings(concepts, embeddings, threshold = 0.88) {
  const assigned = new Array(concepts.length).fill(false);
  const clusters = [];
  const hasEmbeddings = embeddings.some((e) => e.length > 0);
  if (!hasEmbeddings) {
    const byLower = /* @__PURE__ */ new Map();
    for (const c of concepts) {
      const key = c.toLowerCase().trim();
      if (!byLower.has(key))
        byLower.set(key, []);
      byLower.get(key).push(c);
    }
    return Array.from(byLower.values());
  }
  for (let i = 0; i < concepts.length; i++) {
    if (assigned[i])
      continue;
    const cluster = [concepts[i]];
    assigned[i] = true;
    for (let j = i + 1; j < concepts.length; j++) {
      if (assigned[j])
        continue;
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      if (sim >= threshold) {
        cluster.push(concepts[j]);
        assigned[j] = true;
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}
async function canonicalizeCluster(cluster, callLLM) {
  if (cluster.length === 1)
    return cluster[0].trim();
  const prompt = `You are a curriculum terminology specialist.
Below is a group of concept names that all refer to the same underlying topic.
Pick ONE canonical label \u2014 preferably the most precise, grade-appropriate, and standard curriculum term.
If none is ideal, compose a clean, concise label.

Concept variants:
${cluster.map((c) => `  - ${c}`).join("\n")}

Return ONLY the canonical concept name \u2014 no explanation, no punctuation, no extra text.`;
  try {
    const result = await callLLM(prompt);
    const cleaned = result.trim().replace(/^["']|["']$/g, "").trim();
    return cleaned || cluster[0].trim();
  } catch {
    return cluster[0].trim();
  }
}
async function normalizeConcepts(rawConcepts, callLLM) {
  if (rawConcepts.length === 0) {
    return { canonicalMap: {}, canonicalLabels: [] };
  }
  const seenLower = /* @__PURE__ */ new Map();
  for (const c of rawConcepts) {
    const key = c.toLowerCase().trim();
    if (key && !seenLower.has(key))
      seenLower.set(key, c.trim());
  }
  const uniqueConcepts = Array.from(seenLower.values());
  const embeddings = await batchEmbedConcepts(uniqueConcepts);
  const clusters = clusterEmbeddings(uniqueConcepts, embeddings);
  const canonicalLabels = [];
  const rawToCanonical = {};
  for (const cluster of clusters) {
    const canonical = await canonicalizeCluster(cluster, callLLM);
    canonicalLabels.push(canonical);
    for (const variant of cluster) {
      rawToCanonical[variant] = canonical;
      rawToCanonical[variant.toLowerCase().trim()] = canonical;
    }
  }
  const canonicalMap = {};
  for (const raw of rawConcepts) {
    const key = raw.toLowerCase().trim();
    canonicalMap[raw] = rawToCanonical[raw] ?? rawToCanonical[key] ?? raw;
  }
  return { canonicalMap, canonicalLabels };
}
var runtime = "nodejs";
assertBackendStartupEnv(["SUPABASE_URL", "SUPABASE_ANON_KEY"], "api/v4/concept-match/intel");
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function buildTestConceptStatsFromTags(items) {
  const stats = {};
  const displayKey = {};
  let totalDifficulty = 0;
  for (const item of items) {
    const diff = item.tags?.difficulty ?? 3;
    totalDifficulty += diff;
    const concepts = item.tags?.concepts ?? [];
    for (const concept of concepts) {
      const norm = concept.toLowerCase().trim();
      if (!norm)
        continue;
      if (!displayKey[norm])
        displayKey[norm] = concept.trim();
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
    s.avgDifficulty = s.difficulties.length > 0 ? Math.round(s.difficulties.reduce((a, b) => a + b, 0) / s.difficulties.length * 100) / 100 : 3;
  }
  const testDifficulty = items.length > 0 ? Math.round(totalDifficulty / items.length * 100) / 100 : 3;
  return { stats, testDifficulty };
}
var TEST_EXTRACTION_PROMPT = `You are a curriculum analyst. Extract concepts and difficulty from each test question below.
For each question, identify:
- concepts: array of concept names (short, lowercase)
- difficulty: 1\u20135 (1=recall, 2=understand, 3=apply, 4=analyze, 5=create/evaluate)

Return JSON ONLY (no markdown fences):
{
  "items": [
    { "itemNumber": <number>, "concepts": ["..."], "difficulty": <number 1-5> }
  ]
}

QUESTIONS:
`;
async function buildTestConceptStatsFromLLM(items, callLLM) {
  const questionsText = items.map((i) => `Q${i.itemNumber}: ${i.rawText}`).join("\n").slice(0, 4e3);
  const raw = await callLLM(TEST_EXTRACTION_PROMPT + questionsText);
  let parsed;
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { stats: {}, testDifficulty: 3, enrichedItems: items };
  }
  const llmMap = new Map(parsed.items.map((i) => [i.itemNumber, i]));
  const enrichedItems = items.map((item) => {
    const llm = llmMap.get(item.itemNumber);
    return {
      ...item,
      tags: {
        concepts: llm?.concepts ?? [],
        difficulty: llm?.difficulty ?? 3
      }
    };
  });
  const result = buildTestConceptStatsFromTags(enrichedItems);
  return { ...result, enrichedItems };
}
function buildPrepExtractionPrompt(testConceptLabels) {
  const anchorSection = testConceptLabels.length ? `
IMPORTANT: The test covers these specific concepts:
${testConceptLabels.map((c) => `  - ${c}`).join("\n")}

When the prep material covers one of these concepts, use the EXACT concept name from the list above.
Only introduce a new concept name if the prep material covers something truly not on this list.
` : "";
  return `You are a curriculum analyst. Extract concepts from the following teacher preparation material.
For each concept, determine:
- how many times it appears (notes references + question references)
- estimated difficulty for each occurrence (1 = recall, 2 = understand, 3 = apply, 4 = analyze, 5 = create/evaluate)
  - plain notes/definitions \u2192 1\u20132
  - worked examples \u2192 2\u20133
  - practice questions \u2192 same estimator as test items
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
async function buildPrepConceptStats(rawText, testConceptLabels, callLLM) {
  const prompt = buildPrepExtractionPrompt(testConceptLabels) + rawText.slice(0, 6e3);
  const raw = await callLLM(prompt);
  let parsed;
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { stats: {}, prepDifficulty: 3 };
  }
  const stats = {};
  for (const [concept, data] of Object.entries(parsed.concepts ?? {})) {
    const key = concept.trim();
    if (!key)
      continue;
    const difficulties = Array.isArray(data.difficulties) ? data.difficulties : [];
    stats[key] = {
      count: typeof data.count === "number" ? data.count : difficulties.length,
      difficulties,
      avgDifficulty: difficulties.length > 0 ? Math.round(difficulties.reduce((a, b) => a + b, 0) / difficulties.length * 100) / 100 : 2
    };
  }
  return {
    stats,
    prepDifficulty: typeof parsed.overallDifficulty === "number" ? parsed.overallDifficulty : 3
  };
}
function buildConceptCoverage(testStats, prepStats) {
  const covered = [];
  const tooEasy = [];
  const missing = [];
  const tooFewTimes = [];
  const prepLookup = /* @__PURE__ */ new Map();
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
function buildSummaryPrompt(testStats, prepStats, coverage) {
  const testProfile = Object.entries(testStats).map(([c, s]) => `  - ${c}: appears ${s.count}x, avg difficulty ${s.avgDifficulty}`).join("\n") || "  (none)";
  const prepProfile = Object.entries(prepStats).map(([c, s]) => `  - ${c}: appears ${s.count}x, avg difficulty ${s.avgDifficulty}`).join("\n") || "  (none)";
  const coverageSummary = [
    coverage.covered.length ? `Covered well: ${coverage.covered.join(", ")}` : "",
    coverage.tooEasy.length ? `Covered but too easy: ${coverage.tooEasy.join(", ")}` : "",
    coverage.missing.length ? `Not covered: ${coverage.missing.join(", ")}` : "",
    coverage.tooFewTimes.length ? `Covered too few times: ${coverage.tooFewTimes.join(", ")}` : ""
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

Write a concise, teacher-friendly narrative (3\u20135 sentences) that answers:
1. What concepts the TEST actually assesses.
2. Which of those concepts PREP covers well.
3. Which concepts PREP covers but at too low a difficulty.
4. Which concepts PREP does not cover at all.
5. What PREP needs to add or strengthen to fully prepare students.

Keep the tone factual, actionable, and focused on TEST \u2192 PREP alignment.
Return plain text only \u2014 no JSON, no markdown formatting.`;
}
async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS")
    return res.status(200).json({});
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  return res.status(410).json({
    error: "LLM endpoint disabled",
    message: "Concept-match intelligence is disabled while LLM purge is active."
  });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body.prep?.rawText || !body.assessment?.items?.length) {
      return res.status(400).json({ error: "Missing prep.rawText or assessment.items" });
    }
    const actor = resolveActor(req);
    const callLLM = async (prompt) => {
      throw new Error("LLM provider is disabled");
    };
    const hasTaggedItems = body.assessment.items.some((i) => i.tags?.concepts?.length);
    let testConceptStats;
    let testDifficulty;
    let enrichedItems = body.assessment.items;
    if (hasTaggedItems) {
      const result = buildTestConceptStatsFromTags(body.assessment.items);
      testConceptStats = result.stats;
      testDifficulty = result.testDifficulty;
      enrichedItems = body.assessment.items;
    } else {
      const result = await buildTestConceptStatsFromLLM(body.assessment.items, callLLM);
      testConceptStats = result.stats;
      testDifficulty = result.testDifficulty;
      enrichedItems = result.enrichedItems;
    }
    const rawTestConcepts = enrichedItems.flatMap((item) => item.tags?.concepts ?? []);
    let canonicalMap = {};
    let canonicalLabels = [];
    try {
      const normResult = await normalizeConcepts(rawTestConcepts, callLLM);
      canonicalMap = normResult.canonicalMap;
      canonicalLabels = normResult.canonicalLabels;
    } catch {
      canonicalLabels = Object.keys(testConceptStats);
    }
    const cmAssessmentItems = enrichedItems.map((item) => ({
      ...item,
      tags: {
        ...item.tags,
        concepts: (item.tags?.concepts ?? []).map((c) => canonicalMap[c] ?? canonicalMap[c.toLowerCase().trim()] ?? c),
        difficulty: item.tags?.difficulty
      }
    }));
    const canonicalResult = buildTestConceptStatsFromTags(cmAssessmentItems);
    testConceptStats = canonicalResult.stats;
    testDifficulty = canonicalResult.testDifficulty;
    const testConceptLabels = canonicalLabels.length ? canonicalLabels : Object.keys(testConceptStats);
    const { stats: prepConceptStats, prepDifficulty } = await buildPrepConceptStats(body.prep.rawText, testConceptLabels, callLLM);
    const conceptCoverage = buildConceptCoverage(testConceptStats, prepConceptStats);
    let teacherSummary;
    try {
      teacherSummary = await callLLM(buildSummaryPrompt(testConceptStats, prepConceptStats, conceptCoverage));
    } catch {
    }
    const response = {
      prepDifficulty,
      testDifficulty,
      testConceptStats,
      prepConceptStats,
      conceptCoverage,
      teacherSummary
    };
    const usedAfter = await getDailyUsage(actor.actorKey).catch(() => 0);
    const tokenUsage = { used: usedAfter, remaining: Math.max(0, DAILY_TOKEN_LIMIT - usedAfter), limit: DAILY_TOKEN_LIMIT };
    return res.status(200).json({ ...response, enrichedItems: cmAssessmentItems, tokenUsage });
  } catch (err) {
    if (isTokenLimitError(err)) {
      return sendTokenLimitResponse(res, err);
    }
    console.error("[concept-match/intel] Error:", err);
    return res.status(500).json({
      error: "Concept match analysis failed",
      detail: err instanceof Error ? err.message : String(err)
    });
  }
}
export {
  handler as default,
  runtime
};
