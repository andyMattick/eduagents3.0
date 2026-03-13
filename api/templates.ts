import { VercelRequest, VercelResponse } from "@vercel/node";
import { getAllProblemTypesForTeacher } from "../src/pipeline/schema/templates/problemTypes";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(200).json({});
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const teacherId = String(req.query.teacherId ?? "").trim();
    if (!teacherId) {
      return res.status(400).json({ error: "teacherId is required" });
    }

    const merged = await getAllProblemTypesForTeacher(teacherId);
    const system = Object.values(merged.system ?? {}).map((entry: any) => ({
      id: entry.id,
      label: entry.label,
      itemType: entry.itemType,
      defaultIntent: entry.defaultIntent,
      defaultDifficulty: entry.defaultDifficulty,
      configurableFields: entry.configurableFields ?? {},
    }));

    Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(200).json({
      system,
      teacher: merged.teacher ?? [],
    });
  } catch (error: any) {
    console.error("[api/templates] Failed:", error);
    return res.status(500).json({
      error: "templates listing failed",
      message: error?.message ?? "Unknown error",
    });
  }
}

export async function getTemplates(teacherId: string) {
  const res = await fetch(`/api/templates?teacherId=${teacherId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  if (!res.ok) {
    throw new Error(`Failed to load templates: ${res.statusText}`);
  }

  return res.json(); // { system: [...], teacher: [...] }
}
