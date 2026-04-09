import { describe, expect, it } from "vitest";

import statusHandler from "../../api/v4/documents/status";

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
	return res;
}

describe("v4 documents status route", () => {
	it("rejects non-GET methods", async () => {
		const req: any = { method: "POST", query: {} };
		const res = createResponse();
		await statusHandler(req, res);
		expect(res.statusCode).toBe(405);
	});

	it("requires documentId", async () => {
		const req: any = { method: "GET", query: {} };
		const res = createResponse();
		await statusHandler(req, res);
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toBe("documentId is required");
	});

	it("returns status envelope for a document id", async () => {
		const req: any = { method: "GET", query: { documentId: "doc-status-test" } };
		const res = createResponse();
		await statusHandler(req, res);
		expect(res.statusCode).toBe(200);
		expect(res.body.documentId).toBe("doc-status-test");
		expect(typeof res.body.items).toBe("number");
		expect(typeof res.body.sections).toBe("number");
		expect(typeof res.body.analysis).toBe("boolean");
	});
});
