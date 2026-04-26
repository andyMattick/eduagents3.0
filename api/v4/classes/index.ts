import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createClassWithSyntheticStudents, listClasses } from "../../../src/simulation/phase-c";
import type { CreateClassInput, ProfilePercentages } from "../../../src/simulation/phase-c";

export const runtime = "nodejs";

function parseBody(body: unknown) {
  if (typeof body !== "string") {
    return body as Partial<{
      className: string;
      classLevel: CreateClassInput["level"];
      gradeBand?: CreateClassInput["gradeBand"];
      profilePercentages: ProfilePercentages;
      studentCount?: number;
      seed?: string;
      schoolYear?: string;
    }>;
  }
  return JSON.parse(body) as Partial<{
    className: string;
    classLevel: CreateClassInput["level"];
    gradeBand?: CreateClassInput["gradeBand"];
    profilePercentages: ProfilePercentages;
    studentCount?: number;
    seed?: string;
    schoolYear?: string;
  }>;
}

function parseTeacherId(req: VercelRequest): string | undefined {
  const value = req.headers?.["x-user-id"];
  const single = Array.isArray(value) ? value[0] : value;
  return typeof single === "string" && single.trim().length > 0 ? single.trim() : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const teacherId = parseTeacherId(req);
      const classes = await listClasses(teacherId);
      return res.status(200).json({ classes });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Class listing failed" });
    }
  }

  if (req.method === "POST") {
    try {
      const payload = parseBody(req.body ?? {});
      if (!payload.className || !payload.classLevel || !payload.profilePercentages) {
        return res.status(400).json({ error: "className, classLevel, and profilePercentages are required" });
      }

      const teacherId = parseTeacherId(req);
      const result = await createClassWithSyntheticStudents({
        teacherId,
        name: payload.className,
        level: payload.classLevel,
        gradeBand: payload.gradeBand,
        schoolYear: payload.schoolYear,
        studentCount: payload.studentCount,
        seed: payload.seed,
        profilePercentages: payload.profilePercentages,
      });

      return res.status(201).json({
        class: result.classRecord,
        students: result.students,
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Class creation failed" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
