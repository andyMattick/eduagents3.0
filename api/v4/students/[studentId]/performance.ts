import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getStudentPerformanceProfile, listStudentAssessmentEvents } from "../../../../src/prism-v4/studentPerformance";
import { buildStudentProfileView } from "../../../../src/prism-v4/session";

export const runtime = "nodejs";

function resolveStudentId(req: VercelRequest) {
	const studentId = Array.isArray(req.query.studentId) ? req.query.studentId[0] : req.query.studentId;
	return typeof studentId === "string" && studentId.trim().length > 0 ? studentId.trim() : null;
}

function resolveUnitId(req: VercelRequest) {
	const unitId = Array.isArray(req.query.unitId) ? req.query.unitId[0] : req.query.unitId;
	return typeof unitId === "string" && unitId.trim().length > 0 ? unitId.trim() : undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const studentId = resolveStudentId(req);
	if (!studentId) {
		return res.status(400).json({ error: "studentId is required" });
	}

	const unitId = resolveUnitId(req);
	const profile = await getStudentPerformanceProfile(studentId, unitId);
	if (!profile) {
		return res.status(404).json({ error: "Student performance profile not found" });
	}

	const events = await listStudentAssessmentEvents(studentId, unitId);
	return res.status(200).json(buildStudentProfileView({ profile, events }));
}