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

// api/rewrite/report-bad.ts
var runtime = "nodejs";
function getSingleHeaderValue(header) {
  if (Array.isArray(header))
    return header[0] ?? "";
  return header ?? "";
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function resolveActor(req, body) {
  const forwarded = getSingleHeaderValue(req.headers["x-forwarded-for"]);
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const claimedFromHeader = getSingleHeaderValue(req.headers["x-user-id"]) || getSingleHeaderValue(req.headers["x-teacher-id"]);
  const claimedFromBody = typeof body.userId === "string" ? body.userId : "";
  const candidate = claimedFromHeader || claimedFromBody;
  const userId = isUuid(candidate) ? candidate : null;
  return {
    actorKey: userId ?? `ip:${ip}`,
    userId
  };
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-teacher-id");
  if (req.method === "OPTIONS")
    return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }
  const payload = body ?? {};
  if (!payload.rewritten) {
    return res.status(400).json({ error: "rewritten is required" });
  }
  const teacherInput = payload.teacherInput?.trim() ?? "";
  const expectedOutput = payload.expectedOutput?.trim() ?? "";
  const whatWasWrong = payload.whatWasWrong?.trim() ?? "";
  if (!teacherInput || !expectedOutput || !whatWasWrong) {
    return res.status(400).json({ error: "teacherInput, expectedOutput, and whatWasWrong are required" });
  }
  const normalizedReason = payload.reason?.trim() || [
    `Teacher Input: ${teacherInput}`,
    `Expected Output: ${expectedOutput}`,
    `What Was Wrong: ${whatWasWrong}`,
    payload.additionalContext?.trim() ? `Additional Context: ${payload.additionalContext.trim()}` : ""
  ].filter(Boolean).join("\n\n");
  const actor = resolveActor(req, payload);
  try {
    await supabaseRest("bad_rewrite_reports", {
      method: "POST",
      body: {
        actor_key: actor.actorKey,
        user_id: actor.userId,
        section_id: payload.sectionId ?? null,
        original: payload.original ?? null,
        rewritten: payload.rewritten,
        reason: normalizedReason,
        teacher_input: teacherInput,
        expected_output: expectedOutput,
        what_was_wrong: whatWasWrong,
        additional_context: payload.additionalContext?.trim() || null
      }
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to save report" });
  }
}
export {
  handler as default,
  runtime
};
