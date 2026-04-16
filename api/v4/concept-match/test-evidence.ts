import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { TestEvidenceResponse } from "../../../src/prism-v4/schema/domain/ConceptMatch";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * GET /api/v4/concept-match/test-evidence?concept=...
 *
 * Returns assessment items filtered by a specific concept.
 * Items are passed via the request body (POST fallback) or query-encoded.
 * Since GET with body is non-standard, this accepts POST as well.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") return res.status(200).json({});
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const concept = (
      (req.query.concept as string) ?? ""
    ).toLowerCase().trim();

    if (!concept) {
      return res.status(400).json({ error: "Missing required query param: concept" });
    }

    // Items arrive via POST body (the client sends the assessment context)
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const items: Array<{
      itemNumber: number;
      rawText: string;
      tags?: { concepts?: string[]; difficulty?: number };
    }> = body.items ?? [];

    const matched = items
      .filter((item) =>
        (item.tags?.concepts ?? []).some(
          (c: string) => c.toLowerCase().trim() === concept
        )
      )
      .map((item) => ({
        itemNumber: item.itemNumber,
        rawText: item.rawText,
        difficulty: item.tags?.difficulty ?? 3,
        concepts: item.tags?.concepts ?? [],
      }));

    const response: TestEvidenceResponse = {
      concept,
      items: matched,
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error("[concept-match/test-evidence] Error:", err);
    return res.status(500).json({
      error: "Test evidence lookup failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
