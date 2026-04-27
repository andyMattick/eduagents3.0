/**
 * GET /api/v4/usage/today — Returns daily token usage for the current actor.
 *
 * Returns { count: number, limit: number }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseRest } from "../../../lib/supabase";

export const runtime = "nodejs";

const DAILY_TOKEN_LIMIT = 25_000;

function getClientIp(req: VercelRequest): string {
	const forwarded = req.headers["x-forwarded-for"];
	const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "";
	const ip = raw.split(",")[0].trim();
	return ip || "unknown";
}

function getSingleHeaderValue(header: string | string[] | undefined): string {
	return Array.isArray(header) ? (header[0] ?? "") : (header ?? "");
}

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveActorKey(req: VercelRequest): string {
	const userId = getSingleHeaderValue(req.headers["x-user-id"]);
	if (userId && isUuid(userId)) return userId;
	return getClientIp(req);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id");

	if (req.method === "OPTIONS") return res.status(200).end();
	if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

	const userId = resolveActorKey(req);
	const today = new Date().toISOString().slice(0, 10);

	try {
		const usageRows = await supabaseRest("user_daily_usage", {
			method: "GET",
			select: "tokens_used",
			filters: { actor_key: `eq.${userId}`, usage_date: `eq.${today}` },
		}).catch(() => null);
		const usageCount = Array.isArray(usageRows) && usageRows.length > 0
			? Number((usageRows[0] as { tokens_used?: number }).tokens_used ?? 0)
			: 0;

		if (Array.isArray(usageRows) && usageRows.length > 0) {
			// Keep checking legacy table too to avoid under-reporting during migration drift.
		}

		const legacyRows = await supabaseRest("user_daily_tokens", {
			method: "GET",
			select: "tokens_used",
			filters: { actor_key: `eq.${userId}`, date: `eq.${today}` },
		}).catch(() => null);
		const legacyCount = Array.isArray(legacyRows) && legacyRows.length > 0
			? Number((legacyRows[0] as { tokens_used?: number }).tokens_used ?? 0)
			: 0;

		const count = Math.max(usageCount, legacyCount);
		return res.status(200).json({ count, limit: DAILY_TOKEN_LIMIT });
	} catch {
		// If table doesn't exist yet, return 0 — don't block the UI
		return res.status(200).json({ count: 0, limit: DAILY_TOKEN_LIMIT });
	}
}
