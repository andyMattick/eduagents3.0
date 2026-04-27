import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "crypto";

import { supabaseRest } from "../../../../lib/supabase";

export const runtime = "nodejs";

type StructureItemPayload = {
  id: string;
  itemNumber: number | null;
  logicalLabel: string;
  groupId: number;
  isParent: boolean;
  partIndex: number;
  text: string;
  type: "mc" | "free_response" | "multipart_parent" | "multipart_child" | "other" | "ignore";
  confidence?: number;
};

function resolveDocumentId(req: VercelRequest): string | null {
  const value = Array.isArray(req.query.documentId) ? req.query.documentId[0] : req.query.documentId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseBody(body: unknown): { items?: StructureItemPayload[] } {
  if (typeof body !== "string") {
    return (body ?? {}) as { items?: StructureItemPayload[] };
  }
  return JSON.parse(body) as { items?: StructureItemPayload[] };
}

function getSingleHeaderValue(header: string | string[] | undefined): string | null {
  if (!header) {
    return null;
  }
  return Array.isArray(header) ? header[0] ?? null : header;
}

function getClientIp(req: VercelRequest): string {
  const forwarded = getSingleHeaderValue(req.headers["x-forwarded-for"]);
  const first = (forwarded ?? "").split(",")[0]?.trim();
  return first || "unknown";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveActor(req: VercelRequest): { actorKey: string; userId: string | null } {
  const userIdHeader = getSingleHeaderValue(req.headers["x-user-id"]);
  if (userIdHeader && isUuid(userIdHeader)) {
    return { actorKey: userIdHeader, userId: userIdHeader };
  }
  return { actorKey: getClientIp(req), userId: null };
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

async function logStructureCorrectionEvent(params: {
  req: VercelRequest;
  documentId: string;
  received: number;
  updated: number;
  beforeSnapshot: Array<{ id: string; structure: unknown }>;
  afterSnapshot: Array<{ id: string; structure: unknown }>;
}): Promise<void> {
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
          after_hash: sha256(params.afterSnapshot),
        },
      },
      prefer: "return=minimal",
    });
  } catch {
    // Non-fatal observability write.
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const documentId = resolveDocumentId(req);
  if (!documentId) {
    return res.status(400).json({ error: "documentId is required" });
  }

  try {
    const payload = parseBody(req.body);
    const items = payload.items ?? [];

    const existingRows = await supabaseRest("v4_items", {
      method: "GET",
      select: "id,metadata",
      filters: {
        document_id: `eq.${documentId}`,
      },
    }) as Array<{ id: string; metadata?: Record<string, unknown> }>;

    const byId = new Map(existingRows.map((row) => [row.id, row]));
    const beforeSnapshot = existingRows.map((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      const phaseB = (metadata.phaseB ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        structure: (phaseB.structure ?? null) as unknown,
      };
    });

    let updated = 0;
    for (const item of items) {
      const existing = byId.get(item.id);
      if (!existing) {
        continue;
      }

      const metadata = (existing.metadata ?? {}) as Record<string, unknown>;
      const phaseB = (metadata.phaseB ?? {}) as Record<string, unknown>;
      const structure = (phaseB.structure ?? {}) as Record<string, unknown>;

      const nextMetadata: Record<string, unknown> = {
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
            reviewedAt: new Date().toISOString(),
          },
        },
      };

      await supabaseRest("v4_items", {
        method: "PATCH",
        filters: {
          id: `eq.${item.id}`,
          document_id: `eq.${documentId}`,
        },
        body: {
          metadata: nextMetadata,
        },
        prefer: "return=minimal",
      });
      updated += 1;
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
        confidence: item.confidence ?? null,
      },
    }));

    await logStructureCorrectionEvent({
      req,
      documentId,
      received: items.length,
      updated,
      beforeSnapshot,
      afterSnapshot,
    });

    return res.status(200).json({
      documentId,
      updated,
      received: items.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to save structure" });
  }
}
