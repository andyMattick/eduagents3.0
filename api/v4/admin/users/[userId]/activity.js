import { assertAdmin, runtime, supabaseRest } from "../../shared.js";

export { runtime };

function resolveUserId(req) {
  const value = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    assertAdmin(req);
  } catch (error) {
    return res.status(403).json({ error: error instanceof Error ? error.message : "Forbidden" });
  }

  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const [events, uploads, simulations] = await Promise.all([
      supabaseRest("system_events", {
        method: "GET",
        select: "id,event_type,event_payload,created_at",
        filters: {
          user_id: `eq.${userId}`,
          order: "created_at.desc",
          limit: "200",
        },
      }).catch(() => []),
      supabaseRest("user_daily_uploads", {
        method: "GET",
        select: "date,pages_uploaded",
        filters: {
          user_id: `eq.${userId}`,
          order: "date.desc",
          limit: "30",
        },
      }).catch(() => []),
      supabaseRest("user_daily_simulations", {
        method: "GET",
        select: "date,simulations_run",
        filters: {
          user_id: `eq.${userId}`,
          order: "date.desc",
          limit: "30",
        },
      }).catch(() => []),
    ]);

    return res.status(200).json({
      userId,
      events: Array.isArray(events) ? events : [],
      uploadUsage: Array.isArray(uploads) ? uploads : [],
      simulationUsage: Array.isArray(simulations) ? simulations : [],
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load user activity" });
  }
}
