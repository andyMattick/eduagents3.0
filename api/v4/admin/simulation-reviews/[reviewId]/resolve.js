import { assertAdmin, runtime, supabaseRest } from "../../shared.js";

export { runtime };

function resolveReviewId(req) {
  const value = Array.isArray(req.query.reviewId) ? req.query.reviewId[0] : req.query.reviewId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    assertAdmin(req);
  } catch (error) {
    return res.status(403).json({ error: error instanceof Error ? error.message : "Forbidden" });
  }

  const reviewId = resolveReviewId(req);
  if (!reviewId) {
    return res.status(400).json({ error: "reviewId is required" });
  }

  try {
    await supabaseRest("simulation_reviews", {
      method: "PATCH",
      filters: {
        id: `eq.${reviewId}`,
      },
      body: {
        resolved: true,
        resolved_at: new Date().toISOString(),
      },
      prefer: "return=minimal",
    });

    return res.status(200).json({ ok: true, reviewId });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to resolve review" });
  }
}