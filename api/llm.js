"use strict";
/* Bundled by esbuild — do not edit */

// api/llm.ts
async function authenticateUser(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Missing or malformed Authorization header.", status: 401 };
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Supabase env vars missing.", status: 500 };
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey
      }
    });
    if (!res.ok) {
      return { error: "Invalid or expired session.", status: 401 };
    }
    const user = await res.json();
    return user?.id ? { userId: user.id } : { error: "User not found.", status: 401 };
  } catch (err) {
    console.error("Auth error:", err);
    return { error: "Auth verification failed.", status: 500 };
  }
}
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
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }
  return { url, key };
}
function buildStubEmbedding(text, dims = 64) {
  const vector = new Array(dims).fill(0);
  const input = text || "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    vector[i % dims] += code % 97 / 97;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / norm;
    }
  }
  return vector;
}
async function embedText(text) {
  return buildStubEmbedding(text);
}
async function retrieveRelevantChunks({
  query,
  userId,
  matchCount = 10
}) {
  try {
    const embedding = await embedText(query);
    const { url, key } = supabaseAdmin();
    const rpcRes = await fetch(`${url}/rest/v1/rpc/match_chunks`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query_embedding: `[${embedding.join(",")}]`,
        p_user_id: userId,
        match_count: matchCount
      })
    });
    if (!rpcRes.ok) {
      console.warn("RAG retrieval failed:", await rpcRes.text());
      return [];
    }
    const data = await rpcRes.json() ?? [];
    if (!data.length) {
      console.warn("[RAG] No chunks found \u2014 fallback mode");
    }
    return data.map((d) => ({
      content: d.content,
      similarity: d.similarity,
      score: d.similarity,
      conceptMatches: []
    }));
  } catch (err) {
    console.warn("[RAG] Retrieval fallback mode:", err);
    return [];
  }
}
var CONCEPT_BOOST = 0.15;
function rankChunks(chunks, semantics) {
  if (chunks.length === 0)
    return [];
  const concepts = semantics.concepts;
  const scored = chunks.map((chunk) => {
    const lower = chunk.content.toLowerCase();
    const matches = concepts.filter((c) => lower.includes(c.toLowerCase()));
    const boost = matches.length > 0 ? CONCEPT_BOOST * matches.length : 0;
    return {
      ...chunk,
      score: chunk.similarity + boost,
      conceptMatches: matches
    };
  });
  const filtered = scored.filter((c) => c.conceptMatches.length > 0);
  const final = filtered.length > 0 ? filtered : scored;
  return final.sort((a, b) => b.score - a.score);
}
var MAX_CONTEXT_CHARS = 3e3;
function selectTopChunks(chunks, maxChars = MAX_CONTEXT_CHARS) {
  let total = 0;
  const selected = [];
  for (const chunk of chunks) {
    if (total + chunk.content.length > maxChars)
      break;
    selected.push(chunk.content);
    total += chunk.content.length;
  }
  return selected;
}
function buildRAGPrompt(chunks, userPrompt, semantics) {
  if (chunks.length === 0)
    return userPrompt;
  const contextBlock = chunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n");
  const conceptsBlock = semantics && semantics.concepts.length > 0 ? `
--- KNOWN CONCEPTS ---
${semantics.concepts.join(", ")}
` : "";
  return `You are an expert educational assistant.

--- CONTEXT ---
${contextBlock}
${conceptsBlock}
--- INSTRUCTIONS ---
Use ONLY the context above to answer the task.
If the answer is not clearly in the context, say:
"I don't have enough information from the document."
Do NOT make up information. Do NOT go beyond what the context states.

--- TASK ---
${userPrompt}`;
}
var DEFAULT_SEMANTICS = {
  intent: "question",
  concepts: [],
  constraints: []
};
async function parseQuery(query) {
  return DEFAULT_SEMANTICS;
}
var INTENT_TO_SKILLS = {
  question: ["remember", "understand"],
  generate: ["understand", "apply"],
  compare: ["analyze", "evaluate"],
  explain: ["understand", "analyze"]
};
var TYPE_FOR_SKILL = {
  remember: "multiple_choice",
  understand: "short_answer",
  apply: "short_answer",
  analyze: "open_ended",
  evaluate: "open_ended",
  create: "open_ended"
};
function buildBlueprint({
  semantics,
  documentSemantics,
  intent
}) {
  const topic = documentSemantics?.topic || semantics.concepts[0] || extractTopicFromIntent(intent);
  const skills = INTENT_TO_SKILLS[semantics.intent] ?? ["understand"];
  const queryConcepts = semantics.concepts.slice(0, 5);
  const docConcepts = (documentSemantics?.concepts ?? []).slice(0, 5);
  const concepts = dedup([...queryConcepts, ...docConcepts]).slice(0, 6);
  if (concepts.length === 0) {
    const fallback = extractTopicFromIntent(intent);
    if (fallback)
      concepts.push(fallback);
  }
  const questionPlan = concepts.map((concept, i) => {
    const skill = skills[i % skills.length];
    return {
      type: TYPE_FOR_SKILL[skill],
      skill,
      concept
    };
  });
  const misconceptions = documentSemantics?.misconceptions ?? [];
  return {
    topic,
    skills,
    concepts,
    questionPlan,
    misconceptions
  };
}
function buildBlueprintPrompt(blueprint, contextChunks, userPrompt) {
  const blueprintBlock = JSON.stringify(blueprint, null, 2);
  const contextBlock = contextChunks.length > 0 ? contextChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n") : "(no document context available)";
  return `You are an expert educational assessment generator.

--- BLUEPRINT ---
${blueprintBlock}

--- CONTEXT ---
${contextBlock}

--- INSTRUCTIONS ---
Follow the blueprint EXACTLY.
- Generate one question for each item in questionPlan.
- Use ONLY concepts listed in the blueprint.
- Use the context to ground your questions in real content.
- If misconceptions are listed, include at least one distractor based on them.
- Do NOT invent concepts outside the blueprint.
- If you cannot generate a question for a concept from the context, say so explicitly.
- Match the question type (multiple_choice, short_answer, true_false, open_ended) precisely.

--- TASK ---
${userPrompt}`;
}
function extractTopicFromIntent(intent) {
  const cleaned = intent.replace(/^(generate|create|make|build|write|explain|compare)\s+/i, "").replace(/^(questions?|assessment|quiz|test)\s+(about|on|for)\s+/i, "").trim();
  const words = cleaned.split(/\s+/).slice(0, 5);
  return words.join(" ").toLowerCase() || "general";
}
function dedup(arr) {
  const seen = /* @__PURE__ */ new Set();
  return arr.filter((item) => {
    const lower = item.toLowerCase();
    if (seen.has(lower))
      return false;
    seen.add(lower);
    return true;
  });
}
function validateOutput(output, blueprint) {
  const lower = output.toLowerCase();
  const missingConcepts = blueprint.concepts.filter((c) => !lower.includes(c.toLowerCase()));
  const typeKeywords = {
    multiple_choice: ["a)", "b)", "c)", "a.", "b.", "c.", "(a)", "(b)", "(c)"],
    short_answer: ["short answer", "briefly", "explain", "describe", "answer:"],
    true_false: ["true or false", "true/false", "t/f"],
    open_ended: ["discuss", "analyze", "evaluate", "essay", "open"]
  };
  const requiredTypes = new Set(blueprint.questionPlan.map((q) => q.type));
  const missingTypes = [...requiredTypes].filter((type) => {
    const keywords = typeKeywords[type] ?? [];
    return !keywords.some((kw) => lower.includes(kw));
  });
  const totalChecks = blueprint.concepts.length + requiredTypes.size;
  const passedChecks = totalChecks - missingConcepts.length - missingTypes.length;
  const score = totalChecks > 0 ? passedChecks / totalChecks : 1;
  return {
    valid: missingConcepts.length === 0 && missingTypes.length === 0,
    missingConcepts,
    missingTypes,
    score
  };
}
function buildCorrectionPrompt(originalOutput, validation, blueprint) {
  const fixes = [];
  if (validation.missingConcepts.length > 0) {
    fixes.push(`Missing concepts that MUST appear: ${validation.missingConcepts.join(", ")}`);
  }
  if (validation.missingTypes.length > 0) {
    fixes.push(`Missing question types: ${validation.missingTypes.join(", ")}`);
  }
  return `Your previous output did not fully follow the blueprint.

--- PREVIOUS OUTPUT ---
${originalOutput.slice(0, 2e3)}

--- REQUIRED CORRECTIONS ---
${fixes.join("\n")}

--- BLUEPRINT (reference) ---
${JSON.stringify(blueprint, null, 2)}

--- INSTRUCTIONS ---
Revise the output to include ALL missing concepts and question types.
Keep everything that was correct. Only fix what's missing.`;
}
var runtime = "nodejs";
assertBackendStartupEnv([
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY"
], "api/llm");
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var FREE_DAILY_LIMIT = 5;
async function checkDailyLimit(userId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !apiKey) {
    return { error: "Usage check misconfigured.", status: 500 };
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  try {
    const url = new URL(`${supabaseUrl}/rest/v1/teacher_assessment_history`);
    url.searchParams.set("select", "id");
    url.searchParams.set("teacher_id", `eq.${userId}`);
    url.searchParams.set("created_at", `gte.${today.toISOString()}`);
    const res = await fetch(url.toString(), {
      method: "HEAD",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Prefer: "count=exact"
      }
    });
    const countHeader = res.headers.get("content-range");
    const total = countHeader ? parseInt(countHeader.split("/").pop() || "0", 10) : 0;
    if (total >= FREE_DAILY_LIMIT) {
      return {
        error: `Daily limit reached (${FREE_DAILY_LIMIT}/${FREE_DAILY_LIMIT}).`,
        status: 429
      };
    }
    return { allowed: true };
  } catch (err) {
    console.error("Usage check error:", err);
    return { error: "Usage check failed.", status: 500 };
  }
}
async function handler(req, res) {
  try {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    if (req.method === "OPTIONS")
      return res.status(200).end();
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    return res.status(410).json({
      error: "LLM endpoint disabled",
      message: "This deployment is configured for Azure Document Intelligence only."
    });
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }
    const { model, prompt, temperature, maxOutputTokens, isGateCall, useRAG, useBlueprint } = body || {};
    if (!model || !prompt) {
      return res.status(400).json({ error: "Missing required fields: model, prompt" });
    }
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }
    if (isGateCall) {
      const limit = await checkDailyLimit(auth.userId);
      if ("error" in limit) {
        return res.status(limit.status).json({ error: limit.error });
      }
    }
    let finalPrompt = prompt;
    let pipelineLog = null;
    const shouldUseRAG = useRAG || useBlueprint;
    if (shouldUseRAG) {
      try {
        const querySem = await parseQuery(prompt);
        const chunks = await retrieveRelevantChunks({
          query: prompt,
          userId: auth.userId,
          matchCount: 10
        });
        const ranked = rankChunks(chunks, querySem);
        const selected = selectTopChunks(ranked);
        let blueprint = null;
        if (useBlueprint) {
          blueprint = buildBlueprint({
            semantics: querySem,
            intent: prompt
          });
          finalPrompt = buildBlueprintPrompt(blueprint, selected, prompt);
        } else {
          finalPrompt = buildRAGPrompt(selected, prompt, querySem);
        }
        console.log("[PIPELINE]", {
          useRAG: shouldUseRAG,
          useBlueprint: !!useBlueprint,
          chunksUsed: selected.length,
          concepts: querySem?.concepts
        });
        pipelineLog = {
          mode: useBlueprint ? "blueprint" : "rag",
          query: prompt.slice(0, 200),
          querySemantics: querySem,
          ...blueprint ? { blueprint } : {},
          retrievedChunks: chunks.length,
          filteredChunks: ranked.length,
          finalChunks: selected.length,
          scores: ranked.slice(0, 5).map((c) => ({
            score: Math.round(c.score * 1e3) / 1e3,
            similarity: Math.round(c.similarity * 1e3) / 1e3,
            conceptMatches: c.conceptMatches
          })),
          finalPromptLength: finalPrompt.length
        };
        console.info("[PIPELINE]", JSON.stringify(pipelineLog));
      } catch (pipeErr) {
        console.warn("[PIPELINE] Failed, falling back to direct prompt:", pipeErr);
      }
    }
    let text = "LLM endpoint disabled";
    let validation = null;
    if (useBlueprint && pipelineLog?.blueprint) {
      const bp = pipelineLog.blueprint;
      validation = validateOutput(text, bp);
      if (!validation.valid) {
        console.info("[BLUEPRINT] Validation failed, retrying:", {
          missingConcepts: validation.missingConcepts,
          missingTypes: validation.missingTypes,
          score: validation.score
        });
        try {
          const correctionPrompt = buildCorrectionPrompt(text, validation, bp);
          validation = validateOutput(text, bp);
        } catch (retryErr) {
          console.warn("[BLUEPRINT] Retry failed, using original output:", retryErr);
        }
      }
    }
    return res.status(200).json({
      text,
      ...pipelineLog ? { _pipeline: pipelineLog } : {},
      ...validation ? { _validation: validation } : {}
    });
  } catch (err) {
    console.error("LLM API crash:", err);
    return res.status(500).json({
      error: "Internal server error",
      detail: process.env.NODE_ENV === "development" ? err.message : void 0
    });
  }
}
export {
  handler as default,
  runtime
};
