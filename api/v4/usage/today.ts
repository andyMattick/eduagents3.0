/**
 * GET /api/v4/usage/today — Returns daily document usage for the current IP.
 *
 * Returns { count: number, limit: number }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseRest } from "../../../lib/supabase";

export const runtime = "nodejs";

const DAILY_DOCUMENT_LIMIT = 5;

function getClientIp(req: VercelRequest): string {
	const forwarded = req.headers["x-forwarded-for"];
	const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "";
	const ip = raw.split(",")[0].trim();
	return ip || "unknown";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

	if (req.method === "OPTIONS") return res.status(200).end();
	if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

	const userId = getClientIp(req);
	const today = new Date().toISOString().slice(0, 10);

	try {
		const rows = await supabaseRest("user_daily_usage", {
			method: "GET",
			select: "count",
			filters: { user_id: `eq.${userId}`, date: `eq.${today}` },
		});
		const count = Array.isArray(rows) && rows.length > 0 ? (rows[0].count as number) : 0;
		return res.status(200).json({ count, limit: DAILY_DOCUMENT_LIMIT });
	} catch {
		// If table doesn't exist yet, return 0 — don't block the UI
		return res.status(200).json({ count: 0, limit: DAILY_DOCUMENT_LIMIT });
	}
}
