/**
 * lib/tokenGate.ts — Shared token-budget enforcement for all LLM-calling endpoints.
 *
 * Provides:
 *  - resolveActor(req)          — extract actor key + userId from request headers
 *  - getDailyUsage(actorKey)    — current day's token count
 *  - checkTokenBudget(actorKey) — pre-flight check; throws TOKEN_LIMIT_REACHED
 *  - incrementTokens(...)       — post-call increment via Supabase RPC
 *  - callGeminiMetered(...)     — drop-in for callGemini that enforces + increments
 */

import type { VercelRequest } from "@vercel/node";
import { callGeminiDetailed, type GeminiCallMetadata, type GeminiUsageMetadata } from "./gemini";
import { supabaseAdmin, supabaseRest } from "./supabase";

// ── Constants ────────────────────────────────────────────────────────────────

export const DAILY_TOKEN_LIMIT = 25_000;

export const TOKEN_LIMIT_ERROR = "TOKEN_LIMIT_REACHED" as const;

// ── Actor resolution ─────────────────────────────────────────────────────────

function getSingleHeader(header: string | string[] | undefined): string {
  return Array.isArray(header) ? (header[0] ?? "") : (header ?? "");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function resolveActor(req: VercelRequest): { actorKey: string; userId: string | null } {
  const forwarded = getSingleHeader(req.headers["x-forwarded-for"]);
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const claimed =
    getSingleHeader(req.headers["x-user-id"]) ||
    getSingleHeader(req.headers["x-teacher-id"]);
  const userId = isUuid(claimed) ? claimed : null;
  return { actorKey: userId ?? `ip:${ip}`, userId };
}

// ── Read daily usage ─────────────────────────────────────────────────────────

export async function getDailyUsage(actorKey: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const tokenRows = await supabaseRest("user_daily_tokens", {
    method: "GET",
    select: "tokens_used",
    filters: { actor_key: `eq.${actorKey}`, date: `eq.${today}` },
  }).catch(() => null);

  const tokenCount =
    Array.isArray(tokenRows) && tokenRows.length > 0
      ? Number((tokenRows[0] as { tokens_used?: number }).tokens_used ?? 0)
      : 0;

  // Also check the legacy table in case migration drift applies
  const legacyRows = await supabaseRest("user_daily_usage", {
    method: "GET",
    select: "tokens_used",
    filters: { actor_key: `eq.${actorKey}`, usage_date: `eq.${today}` },
  }).catch(() => null);

  const legacyCount =
    Array.isArray(legacyRows) && legacyRows.length > 0
      ? Number((legacyRows[0] as { tokens_used?: number }).tokens_used ?? 0)
      : 0;

  return Math.max(tokenCount, legacyCount);
}

// ── Pre-flight check ─────────────────────────────────────────────────────────

export class TokenLimitError extends Error {
  code = TOKEN_LIMIT_ERROR;
  remaining: number;
  limit: number;

  constructor(used: number, limit: number) {
    super(`Daily token limit of ${limit.toLocaleString()} reached (${used.toLocaleString()} used). Please try again tomorrow.`);
    this.remaining = Math.max(0, limit - used);
    this.limit = limit;
  }
}

/**
 * Throws TokenLimitError if the actor has exceeded their daily budget.
 * Call this BEFORE running an LLM call.
 */
export async function checkTokenBudget(actorKey: string): Promise<void> {
  const used = await getDailyUsage(actorKey);
  if (used >= DAILY_TOKEN_LIMIT) {
    throw new TokenLimitError(used, DAILY_TOKEN_LIMIT);
  }
}

// ── Increment after LLM call ─────────────────────────────────────────────────

export async function incrementTokens(
  actorKey: string,
  userId: string | null,
  tokens: number,
): Promise<void> {
  if (!Number.isFinite(tokens) || tokens <= 0) return;
  if (!actorKey || actorKey === "ip:unknown") {
    // No identifiable actor — skip accounting to prevent orphan anonymous rows.
    console.warn("[tokenGate] incrementTokens called with unresolvable actor, skipping");
    return;
  }
  try {
    const { url, key } = supabaseAdmin();
    await fetch(`${url}/rest/v1/rpc/increment_token_usage`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_actor_key: actorKey,
        p_tokens: Math.max(1, Math.round(tokens)),
        p_user_id: userId,
      }),
    });
  } catch {
    // Non-fatal — don't block the user if the increment fails.
    console.warn("[tokenGate] increment_token_usage RPC failed (non-fatal)");
  }
}

// ── Metered Gemini wrapper ───────────────────────────────────────────────────

export type MeteredResult = {
  text: string;
  tokensUsed: number;
  usageMetadata?: GeminiUsageMetadata;
};

/**
 * Drop-in replacement for callGemini that:
 *  1) checks the daily budget
 *  2) calls callGeminiDetailed (captures usage metadata)
 *  3) increments the daily counter
 *  4) returns the text + token count
 */
export async function callGeminiMetered(
  actor: { actorKey: string; userId: string | null },
  args: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    metadata?: GeminiCallMetadata;
  },
): Promise<MeteredResult> {
  await checkTokenBudget(actor.actorKey);

  const result = await callGeminiDetailed({
    model: args.model ?? "gemini-2.0-flash",
    prompt: args.prompt,
    temperature: args.temperature ?? 0.3,
    maxOutputTokens: args.maxOutputTokens ?? 2000,
    metadata: args.metadata,
  });

  const tokensUsed =
    result.usageMetadata?.totalTokenCount ??
    (result.usageMetadata?.promptTokenCount ?? 0) +
      (result.usageMetadata?.candidatesTokenCount ?? 0);

  await incrementTokens(actor.actorKey, actor.userId, tokensUsed);

  return { text: result.text, tokensUsed, usageMetadata: result.usageMetadata };
}

// ── Helpers for endpoint error responses ─────────────────────────────────────

/**
 * Returns true if the error is a TokenLimitError (use in catch blocks).
 */
export function isTokenLimitError(err: unknown): err is TokenLimitError {
  return err instanceof TokenLimitError;
}

/**
 * Standard 429 response for token limit errors.
 */
export function sendTokenLimitResponse(res: { status: (code: number) => any; json?: any }, err: TokenLimitError) {
  const respond = res.status(429);
  if (typeof respond.json === "function") {
    return respond.json({
      error: err.message,
      code: TOKEN_LIMIT_ERROR,
      remaining: err.remaining,
      limit: err.limit,
    });
  }
  return respond;
}
