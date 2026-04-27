import { afterEach, describe, expect, it } from "vitest";

import submitStudentPortalDocumentHandler from "../../api/v4/student-portal/documents/submit";
import { getDocumentSession, getSessionDocuments, resetDocumentRegistryState } from "../prism-v4/documents/registry";

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

describe("student portal document submit route", () => {
	afterEach(() => {
		resetDocumentRegistryState();
	});

	it("registers and ingests student-submitted text into the session", async () => {
		const req: any = {
			method: "POST",
			body: {
				sessionId: "session-student-1",
				text: "1. Solve 2 + 2.\n\n2. Explain your strategy.",
				metadata: {
					sourceFileName: "student-entry.txt",
					submittedBy: "student",
				},
			},
		};
		const res = createResponse();

		await submitStudentPortalDocumentHandler(req, res);

		expect(res.statusCode).toBe(200);
		expect(res.body.documentId).toBeTypeOf("string");
		expect(res.body.sessionId).toBe("session-student-1");
		if (res.body.ingestion) {
			expect(["problem", "notes", "mixed"]).toContain(res.body.ingestion.docType);
		}
		const session = getDocumentSession("session-student-1");
		expect(session?.documentIds).toContain(res.body.documentId);

		const documents = getSessionDocuments("session-student-1");
		expect(documents).toHaveLength(1);
		expect(documents[0]?.sourceFileName).toBe("student-entry.txt");
	});

	it("rejects missing required fields", async () => {
		const req: any = {
			method: "POST",
			body: {
				sessionId: "session-student-2",
				text: "",
			},
		};
		const res = createResponse();

		await submitStudentPortalDocumentHandler(req, res);

		expect(res.statusCode).toBe(400);
		expect(res.body.error).toBe("text is required");
	});
});
