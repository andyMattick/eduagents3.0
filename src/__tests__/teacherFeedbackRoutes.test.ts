import { afterEach, describe, expect, it, vi } from "vitest";

import teacherFeedbackHandler from "../../api/v4/teacher-feedback";
import teacherFeedbackByProblemHandler from "../../api/v4/teacher-feedback/[canonicalProblemId]";
import teacherTemplatesHandler from "../../api/v4/teacher-feedback/templates";
import problemOverridesHandler from "../../api/v4/problem-overrides/[canonicalProblemId]";
import { resetTeacherFeedbackState } from "../prism-v4/teacherFeedback";

function createResponse() {
	const res: any = {};
	res.headers = {};
	res.setHeader = vi.fn().mockImplementation((key: string, value: string) => {
		res.headers[key] = value;
	});
	res.status = vi.fn().mockImplementation((code: number) => {
		res.statusCode = code;
		return res;
	});
	res.json = vi.fn().mockImplementation((body: unknown) => {
		res.body = body;
		return res;
	});
	return res;
}

describe("teacher feedback routes", () => {
	afterEach(() => {
		resetTeacherFeedbackState();
	});

	it("accepts feedback, exposes feedback history, exposes templates, and deletes overrides", async () => {
		const postReq: any = {
			method: "POST",
			body: {
				teacherId: "teacher-1",
				documentId: "doc-1",
				canonicalProblemId: "doc-1::p1",
				target: "bloom",
				aiValue: "understand",
				teacherValue: "evaluate",
				evidence: { text: "anomalous phrase" },
			},
		};
		const postRes = createResponse();

		await teacherFeedbackHandler(postReq, postRes);

		expect(postRes.status).toHaveBeenCalledWith(200);
		expect(postRes.body.feedback.canonicalProblemId).toBe("doc-1::p1");

		const getFeedbackReq: any = { method: "GET", query: { canonicalProblemId: "doc-1::p1" } };
		const getFeedbackRes = createResponse();
		await teacherFeedbackByProblemHandler(getFeedbackReq, getFeedbackRes);
		expect(getFeedbackRes.status).toHaveBeenCalledWith(200);
		expect(getFeedbackRes.body.feedback).toHaveLength(1);

		const getTemplatesReq: any = { method: "GET", query: { subject: "general", domain: "general" } };
		const getTemplatesRes = createResponse();
		await teacherTemplatesHandler(getTemplatesReq, getTemplatesRes);
		expect(getTemplatesRes.status).toHaveBeenCalledWith(200);
		expect(getTemplatesRes.body.templates.length).toBeGreaterThan(0);

		const getOverrideReq: any = { method: "GET", query: { canonicalProblemId: "doc-1::p1" } };
		const getOverrideRes = createResponse();
		await problemOverridesHandler(getOverrideReq, getOverrideRes);
		expect(getOverrideRes.status).toHaveBeenCalledWith(200);
		expect(getOverrideRes.body.overrides.overrideVersion).toBe(1);

		const deleteOverrideReq: any = { method: "DELETE", query: { canonicalProblemId: "doc-1::p1" } };
		const deleteOverrideRes = createResponse();
		await problemOverridesHandler(deleteOverrideReq, deleteOverrideRes);
		expect(deleteOverrideRes.status).toHaveBeenCalledWith(200);
		expect(deleteOverrideRes.body).toEqual({ deleted: true });

		const getAfterDeleteRes = createResponse();
		await problemOverridesHandler(getOverrideReq, getAfterDeleteRes);
		expect(getAfterDeleteRes.status).toHaveBeenCalledWith(200);
		expect(getAfterDeleteRes.body.overrides).toBeNull();
	});

	it("returns 400 for invalid overrides", async () => {
		const req: any = {
			method: "POST",
			body: {
				teacherId: "teacher-1",
				documentId: "doc-1",
				canonicalProblemId: "doc-1::p1",
				target: "difficulty",
				aiValue: 0.2,
				teacherValue: 9,
			},
		};
		const res = createResponse();

		await teacherFeedbackHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.body.error).toContain("difficulty must be in [0,1]");
	});

	it("accepts instructional-unit scoped feedback and stores it under the derived override id", async () => {
		const req: any = {
			method: "POST",
			body: {
				teacherId: "teacher-1",
				documentId: "session-1",
				sessionId: "session-1",
				unitId: "unit-abc",
				scope: "instructional-unit",
				target: "concepts",
				aiValue: { fractions: 1 },
				teacherValue: { ratios: 1 },
			},
		};
		const res = createResponse();

		await teacherFeedbackHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.body.feedback.canonicalProblemId).toBe("session-1::instructional-unit::unit-abc");
	});
});