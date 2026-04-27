"use strict";
/* Bundled by esbuild — do not edit */

// api/v4/concept-match/test-evidence.ts
var runtime = "nodejs";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS")
    return res.status(200).json({});
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const concept = (req.query.concept ?? "").toLowerCase().trim();
    if (!concept) {
      return res.status(400).json({ error: "Missing required query param: concept" });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const items = body.items ?? [];
    const matched = items.filter((item) => (item.tags?.concepts ?? []).some((c) => c.toLowerCase().trim() === concept)).map((item) => ({
      itemNumber: item.itemNumber,
      rawText: item.rawText,
      difficulty: item.tags?.difficulty ?? 3,
      concepts: item.tags?.concepts ?? []
    }));
    const response = {
      concept,
      items: matched
    };
    return res.status(200).json(response);
  } catch (err) {
    console.error("[concept-match/test-evidence] Error:", err);
    return res.status(500).json({
      error: "Test evidence lookup failed",
      detail: err instanceof Error ? err.message : String(err)
    });
  }
}
export {
  handler as default,
  runtime
};
