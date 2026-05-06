import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import sessionHandler from "../../api/v4/documents/session";
import { resetDocumentRegistryState } from "../prism-v4/documents/registry";

function createResponse() {
	const res: any = {};
	res.status = (code: number) => {
		res.statusCode = code;
		return res;
	};
	res.json = (body: unknown) => {
		res.body = body;
		return res;
	};
	res.setHeader = () => res;
	return res;
}

describe("document session resource links", () => {
	beforeEach(() => {
		vi.stubEnv("SUPABASE_URL", "");
		vi.stubEnv("SUPABASE_ANON_KEY", "");
		vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
	});

	afterEach(() => {
		resetDocumentRegistryState();
		vi.unstubAllEnvs();
	});

	it("round-trips explicit companion document links through the session route", async () => {
		const sessionId = "session-resource-links";
		const postReq: any = {
			method: "POST",
			body: {
				sessionId,
				documentIds: ["doc-assessment", "doc-answer-key", "doc-worked-solution"],
				documentRoles: {
					"doc-assessment": ["test"],
					"doc-answer-key": ["answer-key"],
					"doc-worked-solution": ["worked-solution"],
				},
				sessionRoles: {
					"doc-assessment": ["target-assessment"],
					"doc-answer-key": ["unit-member"],
					"doc-worked-solution": ["unit-member"],
				},
				resourceLinks: [
					{
						documentId: "doc-assessment",
						resourceDocumentId: "doc-answer-key",
						resourceType: "answer-key",
					},
					{
						documentId: "doc-assessment",
						resourceDocumentId: "doc-worked-solution",
						resourceType: "worked-solution",
					},
				],
			},
		};

		const postRes = createResponse();
		await sessionHandler(postReq, postRes);

		expect(postRes.statusCode).toBe(200);
		expect(postRes.body.resourceLinks).toEqual([
			{
				documentId: "doc-assessment",
				resourceDocumentId: "doc-answer-key",
				resourceType: "answer-key",
			},
			{
				documentId: "doc-assessment",
				resourceDocumentId: "doc-worked-solution",
				resourceType: "worked-solution",
			},
		]);

		const getRes = createResponse();
		await sessionHandler({ method: "GET", query: { sessionId } } as any, getRes);

		expect(getRes.statusCode).toBe(200);
		expect(getRes.body.session.resourceLinks).toEqual(postRes.body.resourceLinks);
	});
});