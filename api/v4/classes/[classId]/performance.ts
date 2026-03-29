import type { VercelRequest, VercelResponse } from "@vercel/node";

import { buildClassProfileView } from "../../../../src/prism-v4/session";
import { getStudentPerformanceProfile, listStudentIdsForClass } from "../../../../src/prism-v4/studentPerformance";

export const runtime = "nodejs";

function resolveClassId(req: VercelRequest) {
	const classId = Array.isArray(req.query.classId) ? req.query.classId[0] : req.query.classId;
	return typeof classId === "string" && classId.trim().length > 0 ? classId.trim() : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const classId = resolveClassId(req);
	if (!classId) {
		return res.status(400).json({ error: "classId is required" });
	}

	const studentIds = await listStudentIdsForClass(classId);
	if (studentIds.length === 0) {
		return res.status(404).json({ error: "Class roster not found" });
	}

	const studentProfiles = (await Promise.all(studentIds.map((studentId) => getStudentPerformanceProfile(studentId))))
		.filter((profile): profile is NonNullable<Awaited<ReturnType<typeof getStudentPerformanceProfile>>> => Boolean(profile));

	return res.status(200).json({
		classProfile: buildClassProfileView({
			classId,
			studentProfiles,
		}),
	});
}