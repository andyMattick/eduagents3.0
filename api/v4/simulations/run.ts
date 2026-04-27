import type { VercelRequest, VercelResponse } from "@vercel/node";

import { normalizeItemsPhaseB } from "../../../src/simulation/phase-b";
import { runPhaseCSimulation } from "../../../src/simulation/phase-c";

export const runtime = "nodejs";

type RunMode = "class";

type UnifiedRunPayload = {
  classId?: string;
  documentId?: string;
  selectedProfileIds?: string[];
  mode?: RunMode;
};

function parseBody(body: unknown): UnifiedRunPayload {
  if (typeof body !== "string") {
    return (body ?? {}) as UnifiedRunPayload;
  }
  return JSON.parse(body) as UnifiedRunPayload;
}

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = parseBody(req.body);
    const mode = payload.mode ?? "class";

    if (!payload.classId || !payload.documentId) {
      return res.status(400).json({ error: "classId and documentId are required" });
    }

    if (mode !== "class") {
      return res.status(400).json({ error: "mode must be class" });
    }

    const phaseB = await normalizeItemsPhaseB(payload.documentId);
    if (phaseB.items.length === 0) {
      return res.status(404).json({ error: "No document items found for documentId" });
    }

    const result = await runPhaseCSimulation({
      classId: payload.classId,
      documentId: payload.documentId,
      items: phaseB.items,
      selectedProfileIds: payload.selectedProfileIds ?? [],
    });

    return res.status(201).json({
      simulationId: result.simulationRun.id,
      classId: result.simulationRun.classId,
      documentId: result.simulationRun.documentId,
      createdAt: result.simulationRun.createdAt,
      resultCount: result.resultCount,
      mode,
      selectedProfileIds: payload.selectedProfileIds ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation run failed";
    if (
      message === "Class not found"
      || message === "Synthetic students not found for class"
      || message === "No document items found for documentId"
    ) {
      return res.status(404).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
}
