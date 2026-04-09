/**
 * lib/supabase.ts — Server-side Supabase admin client
 *
 * Uses the service role key for server-side operations that bypass RLS
 * (e.g., job processing, usage counting). Falls back to the anon key
 * when the service role key is not available.
 */

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set");
  }

  return { url, key };
}

export function hasSupabaseServiceRoleCredentials(): boolean {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return false;
  }
  return /^https?:\/\//i.test(url);
}

/**
 * Thin wrapper around the Supabase REST API for server-side use.
 * Avoids pulling in the full @supabase/supabase-js package in API routes.
 */
export async function supabaseRest(
  table: string,
  options: {
    method?: string;
    select?: string;
    filters?: Record<string, string>;
    body?: unknown;
    prefer?: string;
    single?: boolean;
  } = {}
) {
  const { url, key } = supabaseAdmin();
  const {
    method = "GET",
    select,
    filters = {},
    body,
    prefer,
  } = options;

  const reqUrl = new URL(`${url}/rest/v1/${table}`);
  if (select) reqUrl.searchParams.set("select", select);
  for (const [k, v] of Object.entries(filters)) {
    reqUrl.searchParams.set(k, v);
  }

  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers["Prefer"] = prefer;

  const res = await fetch(reqUrl.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
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
