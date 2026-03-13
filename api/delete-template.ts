import { VercelRequest, VercelResponse } from "@vercel/node";
import { deleteTemplate } from "../src/pipeline/persistence/deleteTemplate";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(200).json({});
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { teacherId, templateId } = req.body ?? {};
    if (!teacherId || !templateId) {
      return res.status(400).json({ error: "teacherId and templateId are required" });
    }

    await deleteTemplate(String(teacherId), String(templateId));

    Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("[api/delete-template] Failed:", error);
    return res.status(500).json({
      error: "deleteTemplate failed",
      message: error?.message ?? "Unknown error",
    });
  }
}
