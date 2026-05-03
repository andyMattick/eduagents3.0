import { assertAdmin, runtime, supabaseRest, todayIsoDate } from "./shared.js";

function parseBody(body) {
  if (typeof body === "string") {
    return JSON.parse(body || "{}");
  }
  return body ?? {};
}

export { runtime };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    assertAdmin(req);
  } catch (error) {
    return res.status(403).json({ error: error instanceof Error ? error.message : "Forbidden" });
  }

  const payload = parseBody(req.body);
  const userId = typeof payload?.userId === "string" ? payload.userId.trim() : "";
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const date = todayIsoDate();
  try {
    await supabaseRest("user_daily_simulations", {
      method: "DELETE",
      filters: {
        user_id: `eq.${userId}`,
        date: `eq.${date}`,
      },
      prefer: "return=minimal",
    });

    return res.status(200).json({ ok: true, userId, date, reset: "simulation" });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Reset failed" });
  }
}
