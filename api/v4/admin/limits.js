import { runtime, assertAdmin } from "./shared.js";
import { DAILY_PAGE_LIMIT, DAILY_SIMULATION_LIMIT } from "../../../config/limits.js";

export { runtime };

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      assertAdmin(req);
      return res.status(200).json({
        dailyPageLimit: DAILY_PAGE_LIMIT,
        dailySimulationLimit: DAILY_SIMULATION_LIMIT,
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load limits" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
