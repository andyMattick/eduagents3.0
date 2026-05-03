"use strict";
/* Bundled by esbuild — do not edit */

// api/jobs/create.ts
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
var runtime = "nodejs";
async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }
    let body = req.body;
    if (typeof body === "string")
      body = JSON.parse(body);
    const { type, input } = body || {};
    if (!type) {
      return res.status(400).json({ error: "Missing required field: type" });
    }
    const rows = await supabaseRest("jobs", {
      method: "POST",
      body: {
        user_id: auth.userId,
        type,
        status: "pending",
        input: input || {}
      },
      prefer: "return=representation",
      select: "id"
    });
    const jobId = Array.isArray(rows) ? rows[0]?.id : rows?.id;
    return res.status(201).json({ jobId });
  } catch (err) {
    console.error("jobs/create error:", err);
    return res.status(500).json({ error: err.message });
  }
}
export {
  handler as default,
  runtime
};
