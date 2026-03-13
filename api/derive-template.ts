import { VercelRequest, VercelResponse } from "@vercel/node";
import { create } from "../src/pipeline/orchestrator/create";
import { DeriveTemplateRequest } from "../src/pipeline/contracts/UnifiedAssessmentRequest";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).json({});
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body as DeriveTemplateRequest;

    if (!Array.isArray(payload.examples) || payload.examples.length === 0) {
      return res.status(400).json({ error: "examples must be a non-empty array" });
    }

    const result = await create(payload as any);

    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[api/derive-template] Failed:", error);
    return res.status(500).json({
      error: "deriveTemplate failed",
      message: error?.message ?? "Unknown error",
    });
  }
}
