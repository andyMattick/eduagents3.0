import { afterEach, describe, expect, it } from "vitest";

import analyzeHandler from "../../api/v4/documents/analyze";
import intentHandler from "../../api/v4/documents/intent";
import sessionAnalysisHandler from "../../api/v4/documents/session/[sessionId]/analysis";
import sessionHandler from "../../api/v4/documents/session";
import uploadHandler from "../../api/v4/documents/upload";
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

describe("v4 documents routes", () => {
	afterEach(() => {
		resetDocumentRegistryState();
	});

	it("registers uploaded documents and creates a session by default", async () => {
		const req: any = {
			method: "POST",
			body: {
				documents: [{ sourceFileName: "sample.pdf", sourceMimeType: "application/pdf", azureExtract: { fileName: "sample.pdf", content: "1. Solve 2 + 2.", pages: [{ pageNumber: 1, text: "1. Solve 2 + 2." }], paragraphs: [{ text: "1. Solve 2 + 2.", pageNumber: 1 }], tables: [], readingOrder: ["1. Solve 2 + 2."] } }],
			},
		};
		const res = createResponse();

		await uploadHandler(req, res);

		expect(res.statusCode).toBe(200);
		expect(res.body.documentIds).toHaveLength(1);
		expect(res.body.sessionId).toMatch(/^session-/);
		expect(res.body.registered[0].sourceFileName).toBe("sample.pdf");
		expect(res.body.registered[0].azureExtract.content).toContain("Solve 2 + 2");
	});

	it("builds and persists an analyzed document from uploaded canonical source data", async () => {
		const uploadReq: any = {
			method: "POST",
			body: {
				documents: [{ sourceFileName: "sample.pdf", sourceMimeType: "application/pdf", azureExtract: { fileName: "sample.pdf", content: "1. Solve 2 + 2.\nExplain your reasoning.", pages: [{ pageNumber: 1, text: "1. Solve 2 + 2. Explain your reasoning." }], paragraphs: [{ text: "1. Solve 2 + 2.", pageNumber: 1 }, { text: "Explain your reasoning.", pageNumber: 1 }], tables: [], readingOrder: ["1. Solve 2 + 2.", "Explain your reasoning."] } }],
				createSession: false,
			},
		};
		const uploadRes = createResponse();
		await uploadHandler(uploadReq, uploadRes);
		const documentId = uploadRes.body.documentIds[0];

		const analyzeReq: any = { method: "POST", body: { documentId } };
		const analyzeRes = createResponse();
		await analyzeHandler(analyzeReq, analyzeRes);
		expect(analyzeRes.statusCode).toBe(200);
		expect(analyzeRes.body.status).toBe("ready");
		expect(analyzeRes.body.analyzedDocument.document.id).toBe(documentId);
		expect(analyzeRes.body.analyzedDocument.document.nodes.length).toBeGreaterThan(0);
		expect(analyzeRes.body.analyzedDocument.fragments.length).toBeGreaterThan(0);
		expect(analyzeRes.body.analyzedDocument.problems.length).toBeGreaterThan(0);
		expect(analyzeRes.body.analyzedDocument.problems[0].anchors.length).toBeGreaterThan(0);
		expect(analyzeRes.body.analyzedDocument.insights.problemCount).toBeGreaterThan(0);
	});

	it("upserts a session, returns collection analysis from analyzed docs, and persists a real intent product", async () => {
		const uploadReq: any = {
			method: "POST",
			body: {
				documents: [
					{ sourceFileName: "notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", azureExtract: { fileName: "notes.docx", content: "Example: Add fractions with common denominators.", pages: [{ pageNumber: 1, text: "Example: Add fractions with common denominators." }], paragraphs: [{ text: "Example: Add fractions with common denominators.", pageNumber: 1 }], tables: [], readingOrder: ["Example: Add fractions with common denominators."] } },
					{ sourceFileName: "quiz.pdf", sourceMimeType: "application/pdf", azureExtract: { fileName: "quiz.pdf", content: "1. Solve the fraction problem.", pages: [{ pageNumber: 1, text: "1. Solve the fraction problem." }], paragraphs: [{ text: "1. Solve the fraction problem.", pageNumber: 1 }], tables: [], readingOrder: ["1. Solve the fraction problem."] } },
				],
			},
		};
		const uploadRes = createResponse();
		await uploadHandler(uploadReq, uploadRes);

		const sessionId = uploadRes.body.sessionId;
		const documentIds = uploadRes.body.documentIds;

		for (const documentId of documentIds) {
			await analyzeHandler({ method: "POST", body: { documentId } } as any, createResponse());
		}

		const sessionReq: any = {
			method: "POST",
			body: {
				sessionId,
				documentIds,
				documentRoles: {
					[documentIds[0]]: ["notes"],
					[documentIds[1]]: ["test"],
				},
				sessionRoles: {
					[documentIds[0]]: ["source-material"],
					[documentIds[1]]: ["target-assessment"],
				},
			},
		};
		const sessionRes = createResponse();
		await sessionHandler(sessionReq, sessionRes);

		expect(sessionRes.statusCode).toBe(200);
		expect(sessionRes.body.documentRoles[documentIds[0]]).toEqual(["notes"]);
		expect(sessionRes.body.sessionRoles[documentIds[1]]).toEqual(["target-assessment"]);

		const analysisReq: any = { method: "GET", query: { sessionId } };
		const analysisRes = createResponse();
		await sessionAnalysisHandler(analysisReq, analysisRes);

		expect(analysisRes.statusCode).toBe(200);
		expect(analysisRes.body.analysis.sessionId).toBe(sessionId);
		expect(analysisRes.body.analysis.documentIds).toEqual(documentIds);
		expect(analysisRes.body.analysis.coverageSummary.totalConcepts).toBeGreaterThan(0);
		expect(Object.keys(analysisRes.body.analysis.conceptOverlap).length).toBeGreaterThan(0);
		expect(analysisRes.body.analysis.coverageSummary.perDocument[documentIds[0]].problemCount).toBeGreaterThanOrEqual(0);
		expect(analysisRes.body.analysis.documentSimilarity.length).toBeGreaterThan(0);
		expect(analysisRes.body.analysis.redundancy[documentIds[0]][0].otherDocumentId).toBe(documentIds[1]);
		expect(Object.values(analysisRes.body.analysis.conceptToDocumentMap).some((documentList: any) => Array.isArray(documentList) && documentList.length >= 2)).toBe(true);

		const intentReq: any = {
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "extract-problems",
				options: { focus: "fractions" },
			},
		};
		const intentRes = createResponse();
		await intentHandler(intentReq, intentRes);

		expect(intentRes.statusCode).toBe(200);
		expect(intentRes.body.productType).toBe("extract-problems");
		expect(intentRes.body.schemaVersion).toBe("wave3-v1");
		expect(intentRes.body.payload.kind).toBe("problem-extraction");
		expect(intentRes.body.payload.totalProblemCount).toBeGreaterThan(0);
		expect(intentRes.body.payload.problems.every((problem: any) => problem.sourceFileName)).toBe(true);

		const fetchProductRes = createResponse();
		await intentHandler({ method: "GET", query: { productId: intentRes.body.productId } } as any, fetchProductRes);

		expect(fetchProductRes.statusCode).toBe(200);
		expect(fetchProductRes.body.productId).toBe(intentRes.body.productId);
		expect(fetchProductRes.body.payload.kind).toBe("problem-extraction");

		const listProductsRes = createResponse();
		await intentHandler({ method: "GET", query: { sessionId } } as any, listProductsRes);

		expect(listProductsRes.statusCode).toBe(200);
		expect(listProductsRes.body.sessionId).toBe(sessionId);
		expect(listProductsRes.body.products).toHaveLength(1);
		expect(listProductsRes.body.products[0].productId).toBe(intentRes.body.productId);
	});

	it("auto-analyzes documents and builds typed Wave 3 products on demand", async () => {
		const uploadReq: any = {
			method: "POST",
			body: {
				documents: [
					{ sourceFileName: "notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", azureExtract: { fileName: "notes.docx", content: "Example: Add fractions with common denominators. Solve 1/2 + 1/4.", pages: [{ pageNumber: 1, text: "Example: Add fractions with common denominators. Solve 1/2 + 1/4." }], paragraphs: [{ text: "Example: Add fractions with common denominators.", pageNumber: 1 }, { text: "Solve 1/2 + 1/4.", pageNumber: 1 }], tables: [], readingOrder: ["Example: Add fractions with common denominators.", "Solve 1/2 + 1/4."] } },
					{ sourceFileName: "quiz.pdf", sourceMimeType: "application/pdf", azureExtract: { fileName: "quiz.pdf", content: "1. Solve the fraction problem. Explain your reasoning.", pages: [{ pageNumber: 1, text: "1. Solve the fraction problem. Explain your reasoning." }], paragraphs: [{ text: "1. Solve the fraction problem.", pageNumber: 1 }, { text: "Explain your reasoning.", pageNumber: 1 }], tables: [], readingOrder: ["1. Solve the fraction problem.", "Explain your reasoning."] } },
				],
			},
		};
		const uploadRes = createResponse();
		await uploadHandler(uploadReq, uploadRes);

		const sessionId = uploadRes.body.sessionId;
		const documentIds = uploadRes.body.documentIds;

		const reviewRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "build-review",
				options: { focus: "fraction", maxSections: 2 },
			},
		} as any, reviewRes);

		expect(reviewRes.statusCode).toBe(200);
		expect(reviewRes.body.payload.kind).toBe("review");
		expect(reviewRes.body.payload.sections.length).toBeGreaterThan(0);

		const testRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "build-test",
				options: { itemCount: 3 },
			},
		} as any, testRes);

		expect(testRes.statusCode).toBe(200);
		expect(testRes.body.payload.kind).toBe("test");
		expect(testRes.body.payload.totalItemCount).toBeGreaterThan(0);

		const summaryRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "summarize",
			},
		} as any, summaryRes);

		expect(summaryRes.statusCode).toBe(200);
		expect(summaryRes.body.payload.kind).toBe("summary");
		expect(summaryRes.body.payload.documents).toHaveLength(2);

		const conceptRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "extract-concepts",
			},
		} as any, conceptRes);

		expect(conceptRes.statusCode).toBe(200);
		expect(conceptRes.body.payload.kind).toBe("concept-extraction");
		expect(conceptRes.body.payload.totalConceptCount).toBeGreaterThan(0);

		const analysisRes = createResponse();
		await sessionAnalysisHandler({ method: "GET", query: { sessionId } } as any, analysisRes);

		expect(analysisRes.statusCode).toBe(200);
		expect(analysisRes.body.analysis.coverageSummary.totalConcepts).toBeGreaterThan(0);
	});

	it("builds Wave 5 instructional products and enforces single-vs-multi document intent constraints", async () => {
		const uploadReq: any = {
			method: "POST",
			body: {
				documents: [
					{ sourceFileName: "lesson.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", azureExtract: { fileName: "lesson.docx", content: "Learning objective: Add fractions with common denominators. Example: Solve 1/2 + 1/4. Remember to compare denominators before adding.", pages: [{ pageNumber: 1, text: "Learning objective: Add fractions with common denominators. Example: Solve 1/2 + 1/4. Remember to compare denominators before adding." }], paragraphs: [{ text: "Learning objective: Add fractions with common denominators.", pageNumber: 1 }, { text: "Example: Solve 1/2 + 1/4.", pageNumber: 1 }, { text: "Remember to compare denominators before adding.", pageNumber: 1 }], tables: [], readingOrder: ["Learning objective: Add fractions with common denominators.", "Example: Solve 1/2 + 1/4.", "Remember to compare denominators before adding."] } },
					{ sourceFileName: "practice.pdf", sourceMimeType: "application/pdf", azureExtract: { fileName: "practice.pdf", content: "1. Solve 3/6 + 1/6. Explain your reasoning.", pages: [{ pageNumber: 1, text: "1. Solve 3/6 + 1/6. Explain your reasoning." }], paragraphs: [{ text: "1. Solve 3/6 + 1/6.", pageNumber: 1 }, { text: "Explain your reasoning.", pageNumber: 1 }], tables: [], readingOrder: ["1. Solve 3/6 + 1/6.", "Explain your reasoning."] } },
					{ sourceFileName: "slides.pptx", sourceMimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", azureExtract: { fileName: "slides.pptx", content: "Warm-Up: Compare equivalent fractions on a number line.", pages: [{ pageNumber: 1, text: "Warm-Up: Compare equivalent fractions on a number line." }], paragraphs: [{ text: "Warm-Up: Compare equivalent fractions on a number line.", pageNumber: 1 }], tables: [], readingOrder: ["Warm-Up: Compare equivalent fractions on a number line."] } },
				],
			},
		};
		const uploadRes = createResponse();
		await uploadHandler(uploadReq, uploadRes);

		const sessionId = uploadRes.body.sessionId;
		const documentIds = uploadRes.body.documentIds;

		const lessonRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds: [documentIds[0]],
				intentType: "build-lesson",
			},
		} as any, lessonRes);

		expect(lessonRes.statusCode).toBe(200);
		expect(lessonRes.body.schemaVersion).toBe("wave5-v1");
		expect(lessonRes.body.payload.kind).toBe("lesson");
		expect(lessonRes.body.payload.warmUp.length).toBeGreaterThan(0);

		const unitRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "build-unit",
			},
		} as any, unitRes);

		expect(unitRes.statusCode).toBe(200);
		expect(unitRes.body.payload.kind).toBe("unit");
		expect(unitRes.body.payload.lessonSequence).toHaveLength(3);

		const mapRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "build-instructional-map",
			},
		} as any, mapRes);

		expect(mapRes.statusCode).toBe(200);
		expect(mapRes.body.payload.kind).toBe("instructional-map");
		expect(mapRes.body.payload.documentConceptAlignment).toHaveLength(3);

		const alignmentRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "curriculum-alignment",
			},
		} as any, alignmentRes);

		expect(alignmentRes.statusCode).toBe(200);
		expect(alignmentRes.body.payload.kind).toBe("curriculum-alignment");
		expect(alignmentRes.body.payload.standardsCoverage.length).toBeGreaterThan(0);

		const invalidLessonRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "build-lesson",
			},
		} as any, invalidLessonRes);

		expect(invalidLessonRes.statusCode).toBe(400);

		const listProductsRes = createResponse();
		await intentHandler({ method: "GET", query: { sessionId } } as any, listProductsRes);

		expect(listProductsRes.statusCode).toBe(200);
		expect(listProductsRes.body.products).toHaveLength(4);
	});

	it("builds Wave 4 multi-document products for three analyzed documents", async () => {
		const uploadReq: any = {
			method: "POST",
			body: {
				documents: [
					{ sourceFileName: "notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", azureExtract: { fileName: "notes.docx", content: "Example: Add fractions with common denominators. Solve 1/2 + 1/4.", pages: [{ pageNumber: 1, text: "Example: Add fractions with common denominators. Solve 1/2 + 1/4." }], paragraphs: [{ text: "Example: Add fractions with common denominators.", pageNumber: 1 }, { text: "Solve 1/2 + 1/4.", pageNumber: 1 }], tables: [], readingOrder: ["Example: Add fractions with common denominators.", "Solve 1/2 + 1/4."] } },
					{ sourceFileName: "quiz.pdf", sourceMimeType: "application/pdf", azureExtract: { fileName: "quiz.pdf", content: "1. Solve the fraction problem. Explain your reasoning.", pages: [{ pageNumber: 1, text: "1. Solve the fraction problem. Explain your reasoning." }], paragraphs: [{ text: "1. Solve the fraction problem.", pageNumber: 1 }, { text: "Explain your reasoning.", pageNumber: 1 }], tables: [], readingOrder: ["1. Solve the fraction problem.", "Explain your reasoning."] } },
					{ sourceFileName: "slides.pptx", sourceMimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", azureExtract: { fileName: "slides.pptx", content: "Warm-Up: Compare equivalent fractions using a number line.", pages: [{ pageNumber: 1, text: "Warm-Up: Compare equivalent fractions using a number line." }], paragraphs: [{ text: "Warm-Up: Compare equivalent fractions using a number line.", pageNumber: 1 }], tables: [], readingOrder: ["Warm-Up: Compare equivalent fractions using a number line."] } },
				],
			},
		};
		const uploadRes = createResponse();
		await uploadHandler(uploadReq, uploadRes);

		const sessionId = uploadRes.body.sessionId;
		const documentIds = uploadRes.body.documentIds;

		for (const documentId of documentIds) {
			await analyzeHandler({ method: "POST", body: { documentId } } as any, createResponse());
		}

		const sessionRes = createResponse();
		await sessionHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				documentRoles: {
					[documentIds[0]]: ["notes"],
					[documentIds[1]]: ["test"],
					[documentIds[2]]: ["slides"],
				},
				sessionRoles: {
					[documentIds[0]]: ["unit-member"],
					[documentIds[1]]: ["comparison-target"],
					[documentIds[2]]: ["unit-member"],
				},
			},
		} as any, sessionRes);

		expect(sessionRes.statusCode).toBe(200);

		const analysisRes = createResponse();
		await sessionAnalysisHandler({ method: "GET", query: { sessionId } } as any, analysisRes);

		expect(analysisRes.statusCode).toBe(200);
		expect(analysisRes.body.analysis.documentIds).toHaveLength(3);
		expect(Object.keys(analysisRes.body.analysis.coverageSummary.perDocument)).toHaveLength(3);
		expect(analysisRes.body.analysis.documentSimilarity.length).toBeGreaterThanOrEqual(3);

		const compareRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds: documentIds.slice(0, 2),
				intentType: "compare-documents",
				options: { focus: "fraction" },
			},
		} as any, compareRes);

		expect(compareRes.statusCode).toBe(200);
		expect(compareRes.body.schemaVersion).toBe("wave4-v1");
		expect(compareRes.body.payload.kind).toBe("compare-documents");
		expect(compareRes.body.payload.documents).toHaveLength(2);
		expect(compareRes.body.payload.sourceAnchors).toHaveLength(2);

		const mergeRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "merge-documents",
			},
		} as any, mergeRes);

		expect(mergeRes.statusCode).toBe(200);
		expect(mergeRes.body.payload.kind).toBe("merge-documents");
		expect(mergeRes.body.payload.mergedInsights.totalDocuments).toBe(3);
		expect(mergeRes.body.payload.mergedProblems.length).toBeGreaterThan(0);

		const sequenceRes = createResponse();
		await intentHandler({
			method: "POST",
			body: {
				sessionId,
				documentIds,
				intentType: "build-sequence",
			},
		} as any, sequenceRes);

		expect(sequenceRes.statusCode).toBe(200);
		expect(sequenceRes.body.payload.kind).toBe("sequence");
		expect(sequenceRes.body.payload.recommendedOrder).toHaveLength(3);
		expect(sequenceRes.body.payload.sourceAnchors).toHaveLength(3);

		const listProductsRes = createResponse();
		await intentHandler({ method: "GET", query: { sessionId } } as any, listProductsRes);

		expect(listProductsRes.statusCode).toBe(200);
		expect(listProductsRes.body.products).toHaveLength(3);
	});
});