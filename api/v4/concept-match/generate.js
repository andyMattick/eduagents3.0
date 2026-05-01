"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/concept-match/generate.ts
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
var runtime = "nodejs";
assertBackendStartupEnv(["SUPABASE_URL", "SUPABASE_ANON_KEY"], "api/v4/concept-match/generate");
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function buildDeltas(actions) {
  return actions.map((a) => {
    let description = "";
    switch (a.action) {
      case "removeQuestions":
        description = `Remove questions ${(a.questionNumbers ?? []).join(", ")} (concept: ${a.concept})`;
        break;
      case "addToReview":
        description = `Add "${a.concept}" to review materials`;
        break;
      case "lowerDifficulty":
        description = `Lower difficulty of ${a.target} items for "${a.concept}"`;
        break;
      case "raiseDifficulty":
        description = `Raise difficulty of ${a.target} items for "${a.concept}"`;
        break;
      case "addExample":
        description = `Add example for "${a.concept}" in prep`;
        break;
      case "flagAiMissedConcept":
        description = `Teacher flagged missed concept: "${a.concept}"${a.comment ? ` \u2014 ${a.comment}` : ""}`;
        break;
      case "flagDifficultyIncorrect":
        description = `Teacher flagged incorrect difficulty for "${a.concept}"${a.comment ? ` \u2014 ${a.comment}` : ""}`;
        break;
      default:
        description = `${a.action} on "${a.concept}" (${a.target})`;
    }
    return { target: a.target, description };
  });
}
function buildReviewPrompt(prepText, actions, items) {
  const addConcepts = actions.filter((a) => a.action === "addToReview").map((a) => a.concept);
  const raiseConcepts = actions.filter((a) => a.target === "prep" && a.action === "raiseDifficulty").map((a) => a.concept);
  const addExamples = actions.filter((a) => a.action === "addExample").map((a) => a.concept);
  return `You are a curriculum specialist generating an updated review document.

ORIGINAL PREP MATERIAL:
${prepText.slice(0, 4e3)}

TEST QUESTIONS (for reference):
${items.map((i) => `Q${i.itemNumber}: ${i.rawText}`).join("\n").slice(0, 2e3)}

TEACHER REQUESTS:
${addConcepts.length ? `- Add coverage for: ${addConcepts.join(", ")}` : ""}
${raiseConcepts.length ? `- Increase difficulty for: ${raiseConcepts.join(", ")}` : ""}
${addExamples.length ? `- Add examples for: ${addExamples.join(", ")}` : ""}

Generate an updated review document that incorporates these changes.
Return JSON ONLY (no markdown fences):
{
  "review_sections": [
    { "title": "...", "explanation": "...", "example": "..." }
  ],
  "summary": "..."
}`;
}
function buildTestPrompt(currentItems, actions) {
  const removedNums = new Set(actions.filter((a) => a.action === "removeQuestions").flatMap((a) => a.questionNumbers ?? []));
  const lowerConcepts = actions.filter((a) => a.target === "test" && a.action === "lowerDifficulty").map((a) => a.concept);
  const raiseConcepts = actions.filter((a) => a.target === "test" && a.action === "raiseDifficulty").map((a) => a.concept);
  const kept = currentItems.filter((i) => !removedNums.has(i.itemNumber));
  return `You are a curriculum specialist generating an updated test.

CURRENT TEST ITEMS (after removals):
${kept.map((i) => `Q${i.itemNumber}: ${i.rawText} [difficulty: ${i.tags?.difficulty ?? 3}, concepts: ${(i.tags?.concepts ?? []).join(", ")}]`).join("\n").slice(0, 3e3)}

TEACHER REQUESTS:
${removedNums.size ? `- Removed questions: ${[...removedNums].join(", ")}` : ""}
${lowerConcepts.length ? `- Lower difficulty for concepts: ${lowerConcepts.join(", ")}` : ""}
${raiseConcepts.length ? `- Raise difficulty for concepts: ${raiseConcepts.join(", ")}` : ""}

Renumber the kept items sequentially. Apply difficulty adjustments as requested. If items were removed, generate replacement items of appropriate difficulty to maintain test length.

Return JSON ONLY (no markdown fences):
{
  "test_items": [
    { "question_number": 1, "question_text": "...", "answer": "...", "explanation": "..." }
  ],
  "test_summary": "..."
}`;
}
async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS")
    return res.status(200).json({});
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  return res.status(410).json({
    error: "LLM endpoint disabled",
    message: "Concept-match generation is disabled while LLM purge is active."
  });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body.teacherActions?.length) {
      return res.status(400).json({ error: "No teacher actions provided" });
    }
    if (!body.generate?.review && !body.generate?.test) {
      return res.status(400).json({ error: "Must request at least one of: review, test" });
    }
    const actor = resolveActor(req);
    const callLLM = async (prompt) => {
      throw new Error("LLM provider is disabled");
    };
    const deltas = buildDeltas(body.teacherActions);
    const response = {
      deltas,
      original: {},
      updated: {}
    };
    if (body.generate.review) {
      const reviewPrompt = buildReviewPrompt(body.prep.rawText, body.teacherActions, body.assessment.items);
      const reviewRaw = await callLLM(reviewPrompt);
      try {
        const cleaned = reviewRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const reviewResult = JSON.parse(cleaned);
        response.reviewResult = reviewResult;
      } catch {
        deltas.push({ target: "prep", description: "Review generation produced non-parseable output" });
      }
    }
    if (body.generate.test) {
      const testPrompt = buildTestPrompt(body.assessment.items, body.teacherActions);
      const testRaw = await callLLM(testPrompt);
      try {
        const cleaned = testRaw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const testResult = JSON.parse(cleaned);
        response.testResult = testResult;
      } catch {
        deltas.push({ target: "test", description: "Test generation produced non-parseable output" });
      }
    }
    const usedAfter = await getDailyUsage(actor.actorKey).catch(() => 0);
    const tokenUsage = { used: usedAfter, remaining: Math.max(0, DAILY_TOKEN_LIMIT - usedAfter), limit: DAILY_TOKEN_LIMIT };
    return res.status(200).json({ ...response, tokenUsage });
  } catch (err) {
    if (isTokenLimitError(err)) {
      return sendTokenLimitResponse(res, err);
    }
    console.error("[concept-match/generate] Error:", err);
    return res.status(500).json({
      error: "Generation failed",
      detail: err instanceof Error ? err.message : String(err)
    });
  }
}
export {
  handler as default,
  runtime
};
