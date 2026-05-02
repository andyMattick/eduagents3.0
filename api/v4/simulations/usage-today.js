import {
  getSingleHeaderValue,
  getSimulationLimitForTier,
  isUuid,
  normalizeTier,
  parseBooleanHeader,
  supabaseRest,
  todayIsoDate,
} from "../admin/shared.js";

export const runtime = "nodejs";

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

async function getDailySimulationUsage(actorKey, date) {
  try {
    const rows = await supabaseRest("user_daily_simulations", {
      method: "GET",
      select: "simulations_run,tier",
      filters: {
        actor_key: `eq.${actorKey}`,
        usage_date: `eq.${date}`,
      },
    });

    if (Array.isArray(rows) && rows.length > 0) {
      return {
        simulationsRun: Number(rows[0]?.simulations_run ?? 0),
        tier: normalizeTier(rows[0]?.tier),
      };
    }
  } catch {
    // best effort
  }

  return { simulationsRun: 0, tier: "free" };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const actor = resolveActor(req);
  const date = todayIsoDate();
  const usage = await getDailySimulationUsage(actor.actorKey, date);
  const tierFromHeader = normalizeTier(getSingleHeaderValue(req.headers["x-user-tier"]));
  const tier = usage.tier === "free" && tierFromHeader !== "free" ? tierFromHeader : usage.tier;
  const maxSimulationsPerDay = getSimulationLimitForTier(tier);
  const adminOverride = parseBooleanHeader(req.headers["x-admin-override"]);

  return res.status(200).json({
    actorKey: actor.actorKey,
    userId: actor.userId,
    date,
    tier,
    simulationsRun: Math.max(0, Number(usage.simulationsRun || 0)),
    maxSimulationsPerDay,
    remainingSimulations: adminOverride ? null : Math.max(0, maxSimulationsPerDay - Math.max(0, Number(usage.simulationsRun || 0))),
    adminOverride,
  });
}
