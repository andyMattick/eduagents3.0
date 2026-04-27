import type { VercelRequest, VercelResponse } from "@vercel/node";

import { getTeacherFingerprint, saveTeacherFingerprint } from "../../../../src/prism-v4/teacherFeedback";
import {
	buildTeacherFingerprintFromModel,
	buildTeacherFingerprintModel,
	mergeTeacherFingerprintModel,
	type TeacherFingerprintModel,
} from "../../../../src/prism-v4/session";

export const runtime = "nodejs";

function resolveTeacherId(req: VercelRequest) {
	const teacherId = Array.isArray(req.query.teacherId) ? req.query.teacherId[0] : req.query.teacherId;
	return typeof teacherId === "string" && teacherId.trim().length > 0 ? teacherId.trim() : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const teacherId = resolveTeacherId(req);
	if (!teacherId) {
		return res.status(400).json({ error: "teacherId is required" });
	}

	const current = await getTeacherFingerprint(teacherId);
	const currentModel = buildTeacherFingerprintModel(current, teacherId);

	if (req.method === "GET") {
		return res.status(200).json({ teacherId, fingerprint: currentModel });
	}

	if (req.method !== "PATCH") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const patch = typeof req.body === "string" ? JSON.parse(req.body) as Partial<TeacherFingerprintModel> : (req.body ?? {}) as Partial<TeacherFingerprintModel>;
		const nextModel = mergeTeacherFingerprintModel(currentModel, patch);
		const nextFingerprint = buildTeacherFingerprintFromModel({
			teacherId,
			model: nextModel,
			current,
		});
		await saveTeacherFingerprint(nextFingerprint);
		return res.status(200).json({ teacherId, fingerprint: buildTeacherFingerprintModel(nextFingerprint, teacherId) });
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Teacher fingerprint update failed",
		});
	}
}