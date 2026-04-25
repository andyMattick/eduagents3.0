import type { VercelRequest, VercelResponse } from "@vercel/node";

import { runPhaseCSimulation } from "../../../src/simulation/phase-c";
import type { RunSimulationInput } from "../../../src/simulation/phase-c";

export const runtime = "nodejs";

function parseBody(body: unknown) {
  if (typeof body !== "string") {
    return body as Partial<RunSimulationInput>;
  }
  return JSON.parse(body) as Partial<RunSimulationInput>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = parseBody(req.body ?? {});
    if (!payload.classId || !payload.documentId) {
      return res.status(400).json({ error: "classId and documentId are required" });
    }

    const result = await runPhaseCSimulation({
      classId: payload.classId,
      documentId: payload.documentId,
    });

    return res.status(201).json({
      simulationId: result.simulationRun.id,
      classId: result.simulationRun.classId,
      documentId: result.simulationRun.documentId,
      createdAt: result.simulationRun.createdAt,
      resultCount: result.resultCount,
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
