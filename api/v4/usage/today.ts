"use strict";
/* Bundled by esbuild — do not edit */

// lib/supabase.ts
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
    prefer
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
  const res = await fetch(reqUrl.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : void 0
  });
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

// api/v4/usage/today.ts
var runtime = "nodejs";
var DAILY_TOKEN_LIMIT = 25e3;
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "";
  const ip = raw.split(",")[0].trim();
  return ip || "unknown";
}
function getSingleHeaderValue(header) {
  return Array.isArray(header) ? header[0] ?? "" : header ?? "";
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function resolveActorKey(req) {
  const userId = getSingleHeaderValue(req.headers["x-user-id"]);
  if (userId && isUuid(userId))
    return userId;
  return getClientIp(req);
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id");
  if (req.method === "OPTIONS")
    return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });
  const userId = resolveActorKey(req);
  const today = new Date().toISOString().slice(0, 10);
  try {
    const usageRows = await supabaseRest("user_daily_usage", {
      method: "GET",
      select: "tokens_used",
      filters: { actor_key: `eq.${userId}`, usage_date: `eq.${today}` }
    }).catch(() => null);
    const usageCount = Array.isArray(usageRows) && usageRows.length > 0 ? Number(usageRows[0].tokens_used ?? 0) : 0;
    if (Array.isArray(usageRows) && usageRows.length > 0) {
    }
    const legacyRows = await supabaseRest("user_daily_tokens", {
      method: "GET",
      select: "tokens_used",
      filters: { actor_key: `eq.${userId}`, date: `eq.${today}` }
    }).catch(() => null);
    const legacyCount = Array.isArray(legacyRows) && legacyRows.length > 0 ? Number(legacyRows[0].tokens_used ?? 0) : 0;
    const count = Math.max(usageCount, legacyCount);
    return res.status(200).json({ count, limit: DAILY_TOKEN_LIMIT });
  } catch {
    return res.status(200).json({ count: 0, limit: DAILY_TOKEN_LIMIT });
  }
}
export {
  handler as default,
  runtime
};
