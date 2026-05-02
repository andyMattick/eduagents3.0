/* Bundled by esbuild - hand-authored JS route */

import { supabaseRest } from "../../../lib/supabase";

export const runtime = "nodejs";

function getSingleHeaderValue(header) {
  return Array.isArray(header) ? header[0] : header;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "";
  const ip = raw.split(",")[0].trim();
  return ip || "unknown";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveActor(req) {
  const userIdHeader = getSingleHeaderValue(req.headers["x-user-id"]) ?? getSingleHeaderValue(req.headers["x-auth-user-id"]);
  if (userIdHeader && isUuid(userIdHeader)) {
    return {
      actorKey: userIdHeader,
      userId: userIdHeader,
    };
  }
  return {
    actorKey: getClientIp(req),
    userId: null,
  };
}

function normalizeTier(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "school") return "school";
  if (normalized === "teacher") return "teacher";
  return "free";
}

function getMaxPagesPerDay(tier) {
  if (tier === "school") {
    const configured = Number(process.env.MAX_PAGES_PER_DAY_SCHOOL);
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 500;
  }
  if (tier === "teacher") {
    const configured = Number(process.env.MAX_PAGES_PER_DAY_TEACHER);
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 100;
  }
  const configured = Number(process.env.MAX_PAGES_PER_DAY_FREE);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 25;
}

async function getDailyUploadedPages(actorKey, date) {
  try {
    const rows = await supabaseRest("user_daily_usage", {
      method: "GET",
      select: "pages_uploaded,tier",
      filters: {
        actor_key: `eq.${actorKey}`,
        usage_date: `eq.${date}`,
      },
    });

    if (Array.isArray(rows) && rows.length > 0) {
      const pagesUploaded = Number(rows[0]?.pages_uploaded);
      return {
        pagesUploaded: Number.isFinite(pagesUploaded) ? Math.max(0, Math.round(pagesUploaded)) : 0,
        tier: normalizeTier(rows[0]?.tier),
      };
    }
  } catch {
    // Best-effort usage panel; never hard-fail UI.
  }

  return {
    pagesUploaded: 0,
    tier: "free",
  };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const actor = resolveActor(req);
  const today = new Date().toISOString().slice(0, 10);
  const { pagesUploaded, tier } = await getDailyUploadedPages(actor.actorKey, today);
  const maxPagesPerDay = getMaxPagesPerDay(tier);

  return res.status(200).json({
    actorKey: actor.actorKey,
    userId: actor.userId,
    date: today,
    tier,
    pagesUploaded,
    maxPagesPerDay,
    remainingPages: Math.max(0, maxPagesPerDay - pagesUploaded),
  });
}
