import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
	buildAssessmentFingerprint,
	explainAssessmentFingerprintAlignment,
	getAssessmentFingerprint,
	getTeacherFingerprint,
	getUnitFingerprint,
	saveAssessmentFingerprint,
	updateAssessmentFingerprint,
} from "../../../src/prism-v4/teacherFeedback";
import type { TestProduct } from "../../../src/prism-v4/schema/integration";

export const runtime = "nodejs";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function getAssessmentId(req: VercelRequest) {
	const queryId = Array.isArray(req.query.assessmentId) ? req.query.assessmentId[0] : req.query.assessmentId;
	if (typeof queryId === "string" && queryId.trim().length > 0) {
		return queryId.trim();
	}
	const body = typeof req.body === "string" ? JSON.parse(req.body) as Record<string, unknown> : (req.body ?? {}) as Record<string, unknown>;
	return typeof body.assessmentId === "string" && body.assessmentId.trim().length > 0 ? body.assessmentId.trim() : null;
}

async function buildBlueprintResponse(assessmentId: string) {
	const assessment = await getAssessmentFingerprint(assessmentId);
	if (!assessment) {
		return null;
	}
	const teacher = await getTeacherFingerprint(assessment.teacherId);
	const unit = assessment.unitId ? await getUnitFingerprint(assessment.teacherId, assessment.unitId) : null;
	const explanation = teacher
		? explainAssessmentFingerprintAlignment({
			assessment,
			teacherFingerprint: teacher,
			unitFingerprint: unit,
		})
		: null;
	return {
		assessment,
		unit,
		teacher,
		explanation,
	};
}

function isTestProduct(value: unknown): value is TestProduct {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	return candidate.kind === "test" && Array.isArray(candidate.sections) && typeof candidate.totalItemCount === "number";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

	if (req.method === "OPTIONS") {
		return res.status(200).json({});
	}

	if (req.method === "GET") {
		const assessmentId = getAssessmentId(req);
		if (!assessmentId) {
			return res.status(400).json({ error: "assessmentId is required" });
		}
		const response = await buildBlueprintResponse(assessmentId);
		if (!response) {
			return res.status(404).json({ error: "Assessment fingerprint not found" });
		}
		return res.status(200).json(response);
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const body = typeof req.body === "string" ? JSON.parse(req.body) as Record<string, unknown> : (req.body ?? {}) as Record<string, unknown>;
		const assessmentId = typeof body.assessmentId === "string" && body.assessmentId.trim().length > 0 ? body.assessmentId.trim() : null;
		const teacherId = typeof body.teacherId === "string" && body.teacherId.trim().length > 0 ? body.teacherId.trim() : null;
		const unitId = typeof body.unitId === "string" && body.unitId.trim().length > 0 ? body.unitId.trim() : undefined;
		const product = isTestProduct(body.product) ? body.product : null;
		const edits = body.edits;
		if (!assessmentId || !edits || typeof edits !== "object") {
			return res.status(400).json({ error: "assessmentId and edits are required" });
		}

		if (product && teacherId) {
			await saveAssessmentFingerprint(buildAssessmentFingerprint({
				teacherId,
				assessmentId,
				unitId,
				product,
				sourceType: "generated",
			}));
		}

		const updated = await updateAssessmentFingerprint({
			assessmentId,
			edits: edits as Parameters<typeof updateAssessmentFingerprint>[0]["edits"],
		});
		if (!updated) {
			return res.status(404).json({ error: "Assessment fingerprint not found" });
		}

		const explanation = updated.teacher
			? explainAssessmentFingerprintAlignment({
				assessment: updated.assessment,
				teacherFingerprint: updated.teacher,
				unitFingerprint: updated.unit,
			})
			: null;

		return res.status(200).json({
			assessment: updated.assessment,
			unit: updated.unit,
			teacher: updated.teacher,
			explanation,
		});
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Assessment blueprint request failed",
		});
	}
}