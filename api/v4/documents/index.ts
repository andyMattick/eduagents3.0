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

// api/v4/documents/index.ts
var runtime = "nodejs";
async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const rows = await supabaseRest("prism_v4_documents", {
      method: "GET",
      select: "document_id,source_file_name,created_at",
      filters: {
        order: "created_at.desc",
        limit: "100"
      }
    });
    const documents = (rows ?? []).map((row) => ({
      documentId: row.document_id,
      sourceFileName: row.source_file_name ?? row.document_id,
      createdAt: row.created_at
    }));
    return res.status(200).json({ documents });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list documents" });
  }
}
export {
  handler as default,
  runtime
};
