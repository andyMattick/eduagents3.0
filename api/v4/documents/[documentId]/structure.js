"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/documents/[documentId]/structure.ts
import { createHash } from "crypto";
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
function resolveDocumentId(req) {
  const value = Array.isArray(req.query.documentId) ? req.query.documentId[0] : req.query.documentId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function parseBody(body) {
  if (typeof body !== "string") {
    return body ?? {};
  }
  return JSON.parse(body);
}
function getSingleHeaderValue(header) {
  if (!header) {
    return null;
  }
  return Array.isArray(header) ? header[0] ?? null : header;
}
function getClientIp(req) {
  const forwarded = getSingleHeaderValue(req.headers["x-forwarded-for"]);
  const first = (forwarded ?? "").split(",")[0]?.trim();
  return first || "unknown";
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function resolveActor(req) {
  const userIdHeader = getSingleHeaderValue(req.headers["x-user-id"]);
  if (userIdHeader && isUuid(userIdHeader)) {
    return { actorKey: userIdHeader, userId: userIdHeader };
  }
  return { actorKey: getClientIp(req), userId: null };
}
function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function normalizeStructureItem(item, fallbackIndex) {
  const text = typeof item?.text === "string" ? item.text.trim() : "";
  return {
    id: typeof item?.id === "string" && item.id.length > 0 ? item.id : null,
    itemNumber: typeof item?.itemNumber === "number" && Number.isFinite(item.itemNumber) ? item.itemNumber : fallbackIndex + 1,
    logicalLabel: typeof item?.logicalLabel === "string" && item.logicalLabel.trim().length > 0 ? item.logicalLabel.trim() : String(fallbackIndex + 1),
    groupId: typeof item?.groupId === "number" && Number.isFinite(item.groupId) ? item.groupId : fallbackIndex + 1,
    isParent: item?.isParent === true,
    partIndex: typeof item?.partIndex === "number" && Number.isFinite(item.partIndex) ? item.partIndex : 0,
    text,
    type: typeof item?.type === "string" && item.type.length > 0 ? item.type : "other",
    confidence: typeof item?.confidence === "number" && Number.isFinite(item.confidence) ? item.confidence : null
  };
}
async function logStructureCorrectionEvent(params) {
  const actor = resolveActor(params.req);
  try {
    await supabaseRest("token_usage_events", {
      method: "POST",
      body: {
        actor_key: actor.actorKey,
        user_id: actor.userId,
        session_id: null,
        document_id: params.documentId,
        stage: "phaseB_structure_correction",
        endpoint: "/api/v4/documents/[documentId]/structure",
        tokens: 0,
        billed: false,
        metadata: {
          event: "phaseB.structureCorrection",
          received_count: params.received,
          updated_count: params.updated,
          before_hash: sha256(params.beforeSnapshot),
          after_hash: sha256(params.afterSnapshot)
        }
      },
      prefer: "return=minimal"
    });
  } catch {
  }
}
async function invalidateDocumentSimulations(documentId) {
  const runRows = await supabaseRest("simulation_runs", {
    method: "GET",
    select: "id",
    filters: {
      document_id: `eq.${documentId}`
    }
  });
  const runIds = Array.isArray(runRows) ? runRows.map((row) => row.id).filter((value) => typeof value === "string" && value.length > 0) : [];
  if (runIds.length > 0) {
    await supabaseRest("simulation_results", {
      method: "DELETE",
      filters: {
        simulation_id: `in.(${runIds.join(",")})`
      },
      prefer: "return=minimal"
    });
  }
  await supabaseRest("simulation_runs", {
    method: "DELETE",
    filters: {
      document_id: `eq.${documentId}`
    },
    prefer: "return=minimal"
  });
  return runIds.length;
}
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const documentId = resolveDocumentId(req);
  if (!documentId) {
    return res.status(400).json({ error: "documentId is required" });
  }
  try {
    const payload = parseBody(req.body);
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeStructureItem).filter((item) => item.text.length > 0) : [];
    const existingRows = await supabaseRest("v4_items", {
      method: "GET",
      select: "id,item_number,type,stem,metadata,source_page_numbers",
      filters: {
        document_id: `eq.${documentId}`
      }
    });
    const byId = new Map(existingRows.map((row) => [row.id, row]));
    const matchedIds = new Set(items.map((item) => item.id).filter((value) => typeof value === "string" && value.length > 0));
    const beforeSnapshot = existingRows.map((row) => {
      const metadata = row.metadata ?? {};
      const phaseB = metadata.phaseB ?? {};
      return {
        id: row.id,
        structure: phaseB.structure ?? null
      };
    });
    let updated = 0;
    for (const item of items) {
      const existing = byId.get(item.id);
      const metadata = existing?.metadata ?? {};
      const phaseB = metadata.phaseB ?? {};
      const structure = phaseB.structure ?? {};
      const nextMetadata = {
        ...metadata,
        phaseB: {
          ...phaseB,
          structure: {
            ...structure,
            itemNumber: item.itemNumber,
            logicalLabel: item.logicalLabel,
            groupId: item.groupId,
            isParent: item.isParent,
            partIndex: item.partIndex,
            text: item.text,
            type: item.type,
            confidence: item.confidence ?? null,
            reviewedAt: new Date().toISOString()
          }
        }
      };
      if (existing) {
        await supabaseRest("v4_items", {
          method: "PATCH",
          filters: {
            id: `eq.${item.id}`,
            document_id: `eq.${documentId}`
          },
          body: {
            item_number: item.itemNumber,
            type: item.type,
            stem: item.text,
            metadata: nextMetadata
          },
          prefer: "return=minimal"
        });
      } else {
        await supabaseRest("v4_items", {
          method: "POST",
          body: {
            document_id: documentId,
            item_number: item.itemNumber,
            type: item.type,
            stem: item.text,
            choices: null,
            answer_key: null,
            metadata: nextMetadata,
            source_page_numbers: []
          },
          prefer: "return=minimal"
        });
      }
      updated += 1;
    }
    for (const row of existingRows) {
      if (!matchedIds.has(row.id)) {
        const metadata = row.metadata ?? {};
        const phaseB = metadata.phaseB ?? {};
        const structure = phaseB.structure ?? null;
        if (!structure || typeof structure !== "object" || typeof structure.reviewedAt !== "string" || structure.reviewedAt.length === 0) {
          continue;
        }
        await supabaseRest("v4_items", {
          method: "PATCH",
          filters: {
            id: `eq.${row.id}`,
            document_id: `eq.${documentId}`
          },
          body: {
            metadata: {
              ...metadata,
              phaseB: {
                ...phaseB,
                structure: {
                  ...structure,
                  type: "ignore",
                  reviewedAt: new Date().toISOString()
                }
              }
            }
          },
          prefer: "return=minimal"
        });
      }
    }
    const afterSnapshot = items.map((item) => ({
      id: item.id,
      structure: {
        itemNumber: item.itemNumber,
        logicalLabel: item.logicalLabel,
        groupId: item.groupId,
        isParent: item.isParent,
        partIndex: item.partIndex,
        text: item.text,
        type: item.type,
        confidence: item.confidence ?? null
      }
    }));
    const invalidatedSimulationRuns = await invalidateDocumentSimulations(documentId);
    await logStructureCorrectionEvent({
      req,
      documentId,
      received: items.length,
      updated,
      beforeSnapshot,
      afterSnapshot
    });
    return res.status(200).json({
      documentId,
      updated,
      received: items.length,
      invalidatedSimulationRuns
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to save structure" });
  }
}
export {
  handler as default,
  runtime
};
