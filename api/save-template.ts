import { VercelRequest, VercelResponse } from "@vercel/node";
import { saveTemplate } from "../src/pipeline/persistence/saveTemplate";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(200).json({});
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { teacherId, template } = req.body ?? {};
    if (!teacherId || !template) {
      return res.status(400).json({ error: "teacherId and template are required" });
    }

    await saveTemplate(teacherId, template);

    Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("[api/save-template] Failed:", error);
    return res.status(500).json({
      error: "saveTemplate failed",
      message: error?.message ?? "Unknown error",
    });
  }
}
