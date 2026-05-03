/* Bundled by esbuild - hand-authored JS route */

import { DAILY_PAGE_LIMIT, getDailyUploadUsage, resolveUsageUserId } from "../usage/shared.js";

export const runtime = "nodejs";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = resolveUsageUserId(req);
  const today = new Date().toISOString().slice(0, 10);
  const usage = await getDailyUploadUsage(userId, today);

  return res.status(200).json({
    userId,
    date: today,
    pagesUploaded: usage.pagesUploaded,
    maxPagesPerDay: DAILY_PAGE_LIMIT,
    remainingPages: usage.remainingPages,
  });
}
