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
  const classId = typeof payload.classId === "string" ? payload.classId.trim() : "";
  const assessmentId = typeof payload.assessmentId === "string" ? payload.assessmentId.trim() : "";
  const reviewText = typeof payload.reviewText === "string" ? payload.reviewText.trim() : "";
  const severity = typeof payload.severity === "string" ? payload.severity.trim().toLowerCase() : "medium";

  if (!classId || !assessmentId || !reviewText) {
    return res.status(400).json({ error: "classId, assessmentId, and reviewText are required" });
  }

  const actor = resolveActor(req);

  try {
    await supabaseRest("system_events", {
      method: "POST",
      body: {
        user_id: actor.userId,
        actor_key: actor.actorKey,
        event_type: "review",
        event_payload: {
          classId,
          assessmentId,
          reviewText,
          severity,
        },
      },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to submit review" });
  }
}
