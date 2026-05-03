import { assertAdmin, runtime, supabaseRest } from "./shared.js";

export { runtime };

function readQueryValue(req, key) {
  const value = Array.isArray(req.query[key]) ? req.query[key][0] : req.query[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function buildCreatedAtUpperBound(dateTo) {
  return `${dateTo}T23:59:59.999Z`;
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

  const severity = readQueryValue(req, "severity");
  const dateFrom = readQueryValue(req, "dateFrom");
  const dateTo = readQueryValue(req, "dateTo");
  const classId = readQueryValue(req, "classId");
  const userId = readQueryValue(req, "userId");
  const resolved = readQueryValue(req, "resolved");

  try {
    const createdAtFilter = dateFrom && dateTo
      ? { and: `(created_at.gte.${dateFrom}T00:00:00.000Z,created_at.lte.${buildCreatedAtUpperBound(dateTo)})` }
      : dateFrom
      ? { created_at: `gte.${dateFrom}T00:00:00.000Z` }
      : dateTo
      ? { created_at: `lte.${buildCreatedAtUpperBound(dateTo)}` }
      : {};

    const filters = {
      order: "resolved.asc,created_at.desc",
      ...(severity ? { severity: `eq.${severity}` } : {}),
      ...createdAtFilter,
      ...(classId ? { class_id: `eq.${classId}` } : {}),
      ...(userId ? { user_id: `eq.${userId}` } : {}),
      ...(resolved === "true" || resolved === "false" ? { resolved: `eq.${resolved}` } : {}),
    };

    const rows = await supabaseRest("simulation_reviews", {
      method: "GET",
      select: "id,simulation_id,class_id,document_id,user_id,severity,message,created_at,resolved,resolved_at",
      filters,
      timeoutMs: 12000,
    }).catch(() => []);

    const classIds = Array.from(new Set((rows ?? []).map((row) => row.class_id).filter(Boolean)));
    let classNameById = new Map();
    if (classIds.length > 0) {
      const classRows = await supabaseRest("classes", {
        method: "GET",
        select: "id,name",
        filters: {
          id: `in.(${classIds.join(",")})`,
        },
      }).catch(() => []);
      classNameById = new Map((classRows ?? []).map((row) => [row.id, row.name ?? null]));
    }

    return res.status(200).json({
      reviews: (rows ?? []).map((row) => ({
        id: row.id,
        simulationId: row.simulation_id,
        classId: row.class_id,
        className: classNameById.get(row.class_id) ?? null,
        documentId: row.document_id,
        userId: row.user_id,
        severity: row.severity,
        message: row.message,
        createdAt: row.created_at,
        resolved: Boolean(row.resolved),
        resolvedAt: row.resolved_at ?? null,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load simulation reviews" });
  }
}