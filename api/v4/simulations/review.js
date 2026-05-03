import { getSingleHeaderValue, isUuid, supabaseRest } from "../admin/shared.js";

export const runtime = "nodejs";

function parseBody(body) {
  if (typeof body === "string") {
    return JSON.parse(body || "{}");
  }
  return body ?? {};
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "";
  const ip = raw.split(",")[0].trim();
  return ip || "unknown";
}

function resolveActor(req) {
  const userId = getSingleHeaderValue(req.headers["x-user-id"]) || getSingleHeaderValue(req.headers["x-auth-user-id"]);
  if (userId && isUuid(userId)) {
    return { actorKey: userId, userId };
  }
  return { actorKey: getClientIp(req), userId: null };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = parseBody(req.body);
  const simulationId = typeof payload.simulationId === "string" ? payload.simulationId.trim() : "";
  const classId = typeof payload.classId === "string" ? payload.classId.trim() : "";
  const documentId = typeof payload.documentId === "string" ? payload.documentId.trim() : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const simulationSnapshot = payload.simulationSnapshot && typeof payload.simulationSnapshot === "object" ? payload.simulationSnapshot : null;
  const severity = typeof payload.severity === "string" ? payload.severity.trim().toLowerCase() : "medium";

  if (!simulationId || !classId || !documentId || !message) {
    return res.status(400).json({ error: "simulationId, classId, documentId, and message are required" });
  }

  if (!["low", "medium", "high"].includes(severity)) {
    return res.status(400).json({ error: "severity must be low, medium, or high" });
  }

  const actor = resolveActor(req);
  if (!actor.userId) {
    return res.status(401).json({ error: "Authenticated user required" });
  }

  try {
    const runs = await supabaseRest("simulation_runs", {
      method: "GET",
      select: "id,class_id,document_id",
      filters: {
        id: `eq.${simulationId}`,
      },
    });
    const run = Array.isArray(runs) ? runs[0] : null;
    if (!run) {
      return res.status(404).json({ error: "Simulation not found" });
    }

    if (run.class_id !== classId || run.document_id !== documentId) {
      return res.status(400).json({ error: "Simulation identifiers do not match the current run" });
    }

    const inserted = await supabaseRest("simulation_reviews", {
      method: "POST",
      prefer: "return=representation",
      body: {
        simulation_id: simulationId,
        class_id: classId,
        document_id: documentId,
        user_id: actor.userId,
        severity,
        message,
        simulation_snapshot: simulationSnapshot,
      },
    });

    return res.status(200).json({ ok: true, reviewId: inserted?.[0]?.id ?? "" });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to submit review" });
  }
}
