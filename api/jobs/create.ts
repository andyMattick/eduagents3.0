/**
 * /api/jobs/create — Create a new async job
 *
 * POST { type, input }
 * Returns { jobId }
 *
 * Requires Authorization header (Supabase JWT).
 */
import { authenticateUser } from "../../lib/auth";
import { supabaseRest } from "../../lib/supabase";

export const runtime = "nodejs";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Auth
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }

    // Parse body
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    const { type, input } = body || {};
    if (!type) {
      return res.status(400).json({ error: "Missing required field: type" });
    }

    // Insert job
    const rows = await supabaseRest("jobs", {
      method: "POST",
      body: {
        user_id: auth.userId,
        type,
        status: "pending",
        input: input || {},
      },
      prefer: "return=representation",
      select: "id",
    });

    const jobId = Array.isArray(rows) ? rows[0]?.id : rows?.id;

    return res.status(201).json({ jobId });
  } catch (err: any) {
    console.error("jobs/create error:", err);
    return res.status(500).json({ error: err.message });
  }
}
