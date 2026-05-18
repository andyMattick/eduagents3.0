/* Item-layers route — returns v4_items metadata layers for the Ingestion Layer Visualizer */
function readItemStructure(metadata, itemNumber) {
  const structure = metadata?.phaseB?.structure;
  if (!structure || typeof structure !== "object") {
    return {
      logicalLabel: typeof itemNumber === "number" ? String(itemNumber) : null,
      groupId: typeof itemNumber === "number" ? String(itemNumber) : null,
      partIndex: 0,
      isParent: true,
    };
  }

  const rawGroupId = structure.groupId;
  const normalizedGroupId = typeof rawGroupId === "string" || typeof rawGroupId === "number"
    ? String(rawGroupId)
    : (typeof itemNumber === "number" ? String(itemNumber) : null);

  return {
    logicalLabel: typeof structure.logicalLabel === "string" && structure.logicalLabel.trim().length > 0
      ? structure.logicalLabel.trim()
      : (typeof itemNumber === "number" ? String(itemNumber) : null),
    groupId: normalizedGroupId,
    partIndex: typeof structure.partIndex === "number" && Number.isFinite(structure.partIndex) ? structure.partIndex : 0,
    isParent: structure.isParent !== false,
  };
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
  const { select, filters = {}, timeoutMs = 8000 } = options;
  const reqUrl = new URL(`${url}/rest/v1/${table}`);
  if (select) reqUrl.searchParams.set("select", select);
  for (const [k, v] of Object.entries(filters)) {
    reqUrl.searchParams.set(k, v);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(reqUrl.toString(), {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase GET ${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}
var runtime = "nodejs";
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-auth-user-id");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const documentId = Array.isArray(req.query.documentId) ? req.query.documentId[0] : req.query.documentId;
  if (!documentId) return res.status(400).json({ error: "documentId is required" });
  try {
    const rows = await supabaseRest("v4_items", {
      select: "id,item_number,type,stem,metadata",
      filters: { document_id: `eq.${documentId}`, order: "item_number.asc" }
    });
    const items = (Array.isArray(rows) ? rows : []).map((row) => ({
      const structure = readItemStructure(row.metadata, row.item_number);
      return {
      id: row.id,
      itemNumber: row.item_number,
      type: row.type,
      logicalLabel: structure.logicalLabel,
      groupId: structure.groupId,
      partIndex: structure.partIndex,
      isParent: structure.isParent,
      stem: row.stem,
      metadata: {
        base: row.metadata?.base ?? null,
        answerKey: row.metadata?.answerKey ?? null,
        worked: row.metadata?.worked ?? null,
        rubric: row.metadata?.rubric ?? null,
        prep: row.metadata?.prep ?? null,
        final: row.metadata?.final ?? null
      }
    };
    });
    return res.status(200).json({ documentId, items });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to load item layers";
    console.error("[item-layers] error:", msg);
    return res.status(500).json({ error: msg });
  }
}
export { handler as default, runtime };
