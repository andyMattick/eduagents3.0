/**
 * /api/llm — Controlled Intelligence Pipeline (Vercel Serverless)
 *
 * Three modes:
 *   1. Direct: prompt → LLM (useRAG=false, useBlueprint=false)
 *   2. RAG:    prompt → semantics → retrieval → ranking → LLM (useRAG=true)
 *   3. Blueprint: prompt → semantics → retrieval → blueprint → LLM → validate (useBlueprint=true)
 *
 * Blueprint mode is the full intelligence system:
 *   query understanding → hybrid retrieval → blueprint planning →
 *   controlled generation → output verification → optional retry
 */

import { authenticateUser } from "../lib/auth";
import { callGemini } from "../lib/gemini";
import {
  retrieveRelevantChunks,
  rankChunks,
  selectTopChunks,
  buildRAGPrompt,
} from "../lib/rag";
import { parseQuery } from "../lib/semantic/parseQuery";
import { buildBlueprint, buildBlueprintPrompt } from "../lib/blueprint/buildBlueprint";
import { validateOutput, buildCorrectionPrompt } from "../lib/blueprint/validateOutput";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const FREE_DAILY_LIMIT = 5;

// ── Usage check ──────────────────────────────────────────────────────────

async function checkDailyLimit(userId: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

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
        Prefer: "count=exact",
      },
    });

    const countHeader = res.headers.get("content-range");
    const total = countHeader
      ? parseInt(countHeader.split("/").pop() || "0", 10)
      : 0;

    if (total >= FREE_DAILY_LIMIT) {
      return {
        error: `Daily limit reached (${FREE_DAILY_LIMIT}/${FREE_DAILY_LIMIT}).`,
        status: 429,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error("Usage check error:", err);
    return { error: "Usage check failed.", status: 500 };
  }
}

// ── Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  try {
    // CORS
    Object.entries(CORS_HEADERS).forEach(([k, v]) =>
      res.setHeader(k, v)
    );

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ SAFE BODY PARSING
    let body: any = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const { model, prompt, temperature, maxOutputTokens, isGateCall, useRAG, useBlueprint } =
      body || {};

    if (!model || !prompt) {
      return res
        .status(400)
        .json({ error: "Missing required fields: model, prompt" });
    }

    // 1. Auth
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }

    // 2. Rate limit
    if (isGateCall) {
      const limit = await checkDailyLimit(auth.userId);
      if ("error" in limit) {
        return res.status(limit.status).json({ error: limit.error });
      }
    }

    // 3. Intelligence pipeline
    let finalPrompt = prompt;
    let pipelineLog: Record<string, unknown> | null = null;

    const shouldUseRAG = useRAG || useBlueprint;

    if (shouldUseRAG) {
      try {
        // Step 1 — Parse query semantics
        const querySem = await parseQuery(prompt);

        // Step 2 — Vector retrieval
        const chunks = await retrieveRelevantChunks({
          query: prompt,
          userId: auth.userId,
          matchCount: 10,
        });

        // Step 3 — Hybrid ranking (semantic filter + concept boost)
        const ranked = rankChunks(chunks, querySem);

        // Step 4 — Context selection (token control)
        const selected = selectTopChunks(ranked);

        // Step 5 — Build prompt (blueprint or RAG)
        let blueprint = null;
        if (useBlueprint) {
          blueprint = buildBlueprint({
            semantics: querySem,
            intent: prompt,
          });
          finalPrompt = buildBlueprintPrompt(blueprint, selected, prompt);
        } else {
          finalPrompt = buildRAGPrompt(selected, prompt, querySem);
        }

        // Mandatory logging
        console.log("[PIPELINE]", {
          useRAG: shouldUseRAG,
          useBlueprint: !!useBlueprint,
          chunksUsed: selected.length,
          concepts: querySem?.concepts,
        });

        pipelineLog = {
          mode: useBlueprint ? "blueprint" : "rag",
          query: prompt.slice(0, 200),
          querySemantics: querySem,
          ...(blueprint ? { blueprint } : {}),
          retrievedChunks: chunks.length,
          filteredChunks: ranked.length,
          finalChunks: selected.length,
          scores: ranked.slice(0, 5).map((c) => ({
            score: Math.round(c.score * 1000) / 1000,
            similarity: Math.round(c.similarity * 1000) / 1000,
            conceptMatches: c.conceptMatches,
          })),
          finalPromptLength: finalPrompt.length,
        };
        console.info("[PIPELINE]", JSON.stringify(pipelineLog));
      } catch (pipeErr) {
        console.warn("[PIPELINE] Failed, falling back to direct prompt:", pipeErr);
        // Graceful degradation: use original prompt
      }
    }

    // 4. Gemini call
    let text = await callGemini({
      model,
      prompt: finalPrompt,
      temperature,
      maxOutputTokens,
    });

    // 5. Blueprint validation + retry (only in blueprint mode)
    let validation = null;
    if (useBlueprint && pipelineLog?.blueprint) {
      const bp = pipelineLog.blueprint as import("../lib/blueprint/buildBlueprint").Blueprint;
      validation = validateOutput(text, bp);

      if (!validation.valid) {
        console.info("[BLUEPRINT] Validation failed, retrying:", {
          missingConcepts: validation.missingConcepts,
          missingTypes: validation.missingTypes,
          score: validation.score,
        });

        try {
          const correctionPrompt = buildCorrectionPrompt(text, validation, bp);
          text = await callGemini({
            model,
            prompt: correctionPrompt,
            temperature,
            maxOutputTokens,
          });

          // Re-validate after correction
          validation = validateOutput(text, bp);
        } catch (retryErr) {
          console.warn("[BLUEPRINT] Retry failed, using original output:", retryErr);
        }
      }
    }

    return res.status(200).json({
      text,
      ...(pipelineLog ? { _pipeline: pipelineLog } : {}),
      ...(validation ? { _validation: validation } : {}),
    });

  } catch (err: any) {
    console.error("LLM API crash:", err);
    return res.status(500).json({
      error: "Internal server error",
      detail:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}