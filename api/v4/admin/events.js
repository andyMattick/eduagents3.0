import { assertAdmin, runtime, supabaseRest } from "./shared.js";

export { runtime };

function readQuery(req, key) {
  const value = Array.isArray(req.query?.[key]) ? req.query[key][0] : req.query?.[key];
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

  const type = readQuery(req, "type");
  const userId = readQuery(req, "userId");
  const dateFrom = readQuery(req, "dateFrom");
  const dateTo = readQuery(req, "dateTo");

  const filters = {
    order: "created_at.desc",
    limit: "500",
    ...(type ? { event_type: `eq.${type}` } : {}),
    ...(userId ? { user_id: `eq.${userId}` } : {}),
    ...(dateFrom ? { created_at: `gte.${dateFrom}` } : {}),
  };

  try {
    const rows = await supabaseRest("system_events", {
      method: "GET",
      select: "id,user_id,actor_key,event_type,event_payload,created_at",
      filters,
    });

    let data = Array.isArray(rows) ? rows : [];
    if (dateTo) {
      const end = new Date(dateTo).getTime();
      data = data.filter((row) => new Date(row.created_at).getTime() <= end);
    }

    return res.status(200).json({ events: data });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load events" });
  }
}
