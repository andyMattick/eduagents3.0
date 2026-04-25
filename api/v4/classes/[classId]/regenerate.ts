import type { VercelRequest, VercelResponse } from "@vercel/node";

import { regenerateClassStudents } from "../../../../src/simulation/phase-c";
import type { RegenerateStudentsInput } from "../../../../src/simulation/phase-c";

export const runtime = "nodejs";

function parseBody(body: unknown) {
  if (typeof body !== "string") {
    return body as Partial<RegenerateStudentsInput>;
  }
  return JSON.parse(body) as Partial<RegenerateStudentsInput>;
}

function resolveClassId(req: VercelRequest): string | null {
  const value = Array.isArray(req.query.classId) ? req.query.classId[0] : req.query.classId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const classId = resolveClassId(req);
  if (!classId) {
    return res.status(400).json({ error: "classId is required" });
  }

  try {
    const payload = parseBody(req.body ?? {});
    const students = await regenerateClassStudents({
      classId,
      studentCount: payload.studentCount,
      seed: payload.seed,
    });

    return res.status(200).json({ classId, students, studentCount: students.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Regeneration failed";
    if (message === "Class not found") {
      return res.status(404).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
}
