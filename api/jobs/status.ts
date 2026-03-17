/**
 * /api/jobs/status — Check job status + retrieve output
 *
 * GET ?id=<job-uuid>
 * Returns { id, status, output, error, created_at, updated_at }
 *
 * Requires Authorization header (Supabase JWT).
 */
import { authenticateUser } from "../../lib/auth";
import { supabaseRest } from "../../lib/supabase";

export const runtime = "nodejs";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Auth
    const auth = await authenticateUser(req.headers.authorization);
    if ("error" in auth) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const jobId = req.query?.id;
    if (!jobId) {
      return res.status(400).json({ error: "Missing query parameter: id" });
    }

    // Fetch job (scoped to user)
    const rows = await supabaseRest("jobs", {
      select: "id,type,status,output,error,created_at,updated_at",
      filters: {
        id: `eq.${jobId}`,
        user_id: `eq.${auth.userId}`,
      },
    });

    const job = Array.isArray(rows) ? rows[0] : null;
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.status(200).json(job);
  } catch (err: any) {
    console.error("jobs/status error:", err);
    return res.status(500).json({ error: err.message });
  }
}
