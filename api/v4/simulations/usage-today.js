import {
  parseBooleanHeader,
  todayIsoDate,
} from "../admin/shared.js";
import { DAILY_SIMULATION_LIMIT, getDailySimulationUsage, resolveUsageUserId } from "../usage/shared.js";

export const runtime = "nodejs";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = resolveUsageUserId(req);
  const date = todayIsoDate();
  const usage = await getDailySimulationUsage(userId, date);
  const adminOverride = parseBooleanHeader(req.headers["x-admin-override"]);

  return res.status(200).json({
    userId,
    date,
    simulationsRun: usage.simulationsRun,
    maxSimulationsPerDay: DAILY_SIMULATION_LIMIT,
    remainingSimulations: adminOverride ? null : usage.remainingSimulations,
    adminOverride,
  });
}
