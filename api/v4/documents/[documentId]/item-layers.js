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

function suffixForPartIndex(partIndex) {
  if (!Number.isFinite(partIndex) || partIndex <= 0) return "a";
  let value = Math.floor(partIndex);
  let suffix = "";
  while (value > 0) {
    const offset = (value - 1) % 26;
    suffix = String.fromCharCode(97 + offset) + suffix;
    value = Math.floor((value - 1) / 26);
  }
  return suffix;
}

function parseCanonicalItemNumber(canonicalItem, fallbackNumber) {
  if (typeof canonicalItem?.itemNumber === "number" && Number.isFinite(canonicalItem.itemNumber)) {
    return canonicalItem.itemNumber;
  }
  const label = typeof canonicalItem?.label === "string" ? canonicalItem.label.trim() : "";
  const match = label.match(/^(\d+)/);
  if (match?.[1]) {
    return Number(match[1]);
  }
  return fallbackNumber;
}

function readCanonicalItems(documentRow) {
  const canonicalDocument = documentRow?.canonical_document;
  const items = canonicalDocument?.items;
  return Array.isArray(items) ? items : [];
}

function buildInferredChildren(items, canonicalItems) {
  if (!Array.isArray(items) || items.length === 0 || !Array.isArray(canonicalItems) || canonicalItems.length === 0) {
    return [];
  }

  const existingChildKeys = new Set(
    items
      .filter((item) => (item.partIndex ?? 0) > 0 || item.isParent === false)
      .map((item) => `${String(item.groupId ?? "")}:${Number(item.partIndex ?? 0)}`)
  );

  const parentsByItemNumber = new Map();
  for (const item of items) {
    if ((item.partIndex ?? 0) > 0 || item.isParent === false) continue;
    if (typeof item.itemNumber === "number" && Number.isFinite(item.itemNumber)) {
      parentsByItemNumber.set(item.itemNumber, item);
    }
  }

  const inferred = [];
  canonicalItems.forEach((canonicalItem, canonicalIndex) => {
    const itemNumber = parseCanonicalItemNumber(canonicalItem, canonicalIndex + 1);
    const parent = parentsByItemNumber.get(itemNumber);
    if (!parent) return;

    const subItems = Array.isArray(canonicalItem?.subItems) ? canonicalItem.subItems : [];
    if (subItems.length === 0) return;

    const baseGroup = String(parent.groupId ?? parent.itemNumber ?? itemNumber);
    subItems.forEach((subItem, subIndex) => {
      const text = typeof subItem?.text === "string" ? subItem.text.trim() : "";
      if (!text) return;

      const candidatePartIndex = Number.isFinite(Number(subItem?.partIndex)) && Number(subItem.partIndex) > 0
        ? Number(subItem.partIndex)
        : subIndex + 1;
      const key = `${baseGroup}:${candidatePartIndex}`;
      if (existingChildKeys.has(key)) return;

      const explicitLabel = typeof subItem?.label === "string" && subItem.label.trim().length > 0
        ? subItem.label.trim()
        : null;

      inferred.push({
        id: `${parent.id}::inferred-part-${candidatePartIndex}`,
        itemNumber: parent.itemNumber,
        type: parent.type,
        logicalLabel: explicitLabel ?? `${baseGroup}${suffixForPartIndex(candidatePartIndex)}`,
        groupId: baseGroup,
        partIndex: candidatePartIndex,
        isParent: false,
        inferredFromParent: true,
        stem: text,
        metadata: {
          base: parent.metadata?.base ?? null,
          answerKey: parent.metadata?.answerKey ?? null,
          worked: parent.metadata?.worked ?? null,
          rubric: parent.metadata?.rubric ?? null,
          prep: parent.metadata?.prep ?? null,
          final: parent.metadata?.final ?? null,
        },
      });
      existingChildKeys.add(key);
    });
  });

  return inferred;
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
    const baseItems = (Array.isArray(rows) ? rows : []).map((row) => {
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
    const documentRows = await supabaseRest("prism_v4_documents", {
      select: "canonical_document",
      filters: { document_id: `eq.${documentId}`, limit: "1" }
    });
    const canonicalItems = readCanonicalItems(Array.isArray(documentRows) ? documentRows[0] : null);
    const inferredChildren = buildInferredChildren(baseItems, canonicalItems);
    const items = [...baseItems, ...inferredChildren].sort((left, right) => {
      const leftNumber = typeof left.itemNumber === "number" && Number.isFinite(left.itemNumber) ? left.itemNumber : Number.MAX_SAFE_INTEGER;
      const rightNumber = typeof right.itemNumber === "number" && Number.isFinite(right.itemNumber) ? right.itemNumber : Number.MAX_SAFE_INTEGER;
      if (leftNumber !== rightNumber) return leftNumber - rightNumber;
      const leftPart = typeof left.partIndex === "number" && Number.isFinite(left.partIndex) ? left.partIndex : 0;
      const rightPart = typeof right.partIndex === "number" && Number.isFinite(right.partIndex) ? right.partIndex : 0;
      if (leftPart !== rightPart) return leftPart - rightPart;
      return String(left.logicalLabel ?? "").localeCompare(String(right.logicalLabel ?? ""), undefined, { numeric: true });
    });
    return res.status(200).json({ documentId, items });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to load item layers";
    console.error("[item-layers] error:", msg);
    return res.status(500).json({ error: msg });
  }
}
export { handler as default, runtime };
