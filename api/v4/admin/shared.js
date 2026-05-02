export const runtime = "nodejs";

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }
  return { url, key };
}

export async function supabaseRest(table, options = {}) {
  const { url, key } = supabaseAdmin();
  const {
    method = "GET",
    select,
    filters = {},
    body,
    prefer,
    timeoutMs = 8000,
  } = options;

  const reqUrl = new URL(`${url}/rest/v1/${table}`);
  if (select) reqUrl.searchParams.set("select", select);
  for (const [k, v] of Object.entries(filters)) {
    reqUrl.searchParams.set(k, v);
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(reqUrl.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
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

export function getSingleHeaderValue(header) {
  return Array.isArray(header) ? header[0] ?? "" : header ?? "";
}

export function parseBooleanHeader(value) {
  const normalized = String(getSingleHeaderValue(value)).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function assertAdmin(req) {
  const explicit = parseBooleanHeader(req.headers["x-admin-override"]);
  if (explicit) return;

  const allowlist = String(process.env.ADMIN_USER_ALLOWLIST ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const headerUser = getSingleHeaderValue(req.headers["x-user-id"]) || getSingleHeaderValue(req.headers["x-auth-user-id"]);
  if (headerUser && allowlist.includes(headerUser)) {
    return;
  }

  throw new Error("Admin privileges required");
}

export function normalizeTier(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "school") return "school";
  if (normalized === "teacher") return "teacher";
  return "free";
}

export function getSimulationLimitForTier(tier) {
  if (tier === "school") {
    const configured = Number(process.env.MAX_SIMULATIONS_PER_DAY_SCHOOL);
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 100;
  }
  if (tier === "teacher") {
    const configured = Number(process.env.MAX_SIMULATIONS_PER_DAY_TEACHER);
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 50;
  }
  const configured = Number(process.env.MAX_SIMULATIONS_PER_DAY_FREE);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 10;
}
