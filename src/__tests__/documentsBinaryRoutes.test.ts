import express from "express";
import JSZip from "jszip";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runAzureExtractionMock } = vi.hoisted(() => ({
	runAzureExtractionMock: vi.fn(),
}));

vi.mock("../prism-v4/ingestion/azure/azureExtractor", () => ({
	runAzureExtraction: runAzureExtractionMock,
}));

import analyzeHandler from "../../api/v4/documents/analyze";
import intentHandler from "../../api/v4/documents/intent";
import sessionAnalysisHandler from "../../api/v4/documents/session/[sessionId]/analysis";
import sessionHandler from "../../api/v4/documents/session";
import uploadHandler from "../../api/v4/documents/upload";
import { resetDocumentRegistryState } from "../prism-v4/documents/registry";

function createApp() {
	const app = express();
	app.post("/api/v4/documents/upload", (req, res) => uploadHandler(req as any, res as any));
	app.post("/api/v4/documents/analyze", express.json(), (req, res) => analyzeHandler(req as any, res as any));
	app.post("/api/v4/documents/session", express.json(), (req, res) => sessionHandler(req as any, res as any));
	app.get("/api/v4/documents/session/:sessionId/analysis", (req, res) => sessionAnalysisHandler(req as any, res as any));
	app.post("/api/v4/documents/intent", express.json(), (req, res) => intentHandler(req as any, res as any));
	return app;
}

async function buildDocxBuffer() {
	const zip = new JSZip();
	zip.file(
		"word/document.xml",
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
		<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
		  <w:body>
		    <w:p><w:pPr><w:pStyle w:val="Heading1" /></w:pPr><w:r><w:t>Lesson Notes</w:t></w:r></w:p>
		    <w:p><w:r><w:t>Example: Add fractions with common denominators.</w:t></w:r></w:p>
		    <w:p><w:r><w:t>1. Solve 1/2 + 1/4.</w:t></w:r></w:p>
		    <w:tbl>
		      <w:tr><w:tc><w:p><w:r><w:t>Step</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Action</w:t></w:r></w:p></w:tc></w:tr>
		    </w:tbl>
		  </w:body>
		</w:document>`,
	);
	return zip.generateAsync({ type: "nodebuffer" });
}

async function buildPptxBuffer() {
	const zip = new JSZip();
	zip.file(
		"ppt/slides/slide1.xml",
		`<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
		  <p:cSld><p:spTree>
		    <p:sp><p:txBody>
		      <a:p><a:r><a:t>Warm-Up</a:t></a:r></a:p>
		      <a:p><a:pPr lvl="0" /><a:r><a:t>Solve 3x + 2 = 11.</a:t></a:r></a:p>
		    </p:txBody></p:sp>
		    <p:pic />
		  </p:spTree></p:cSld>
		</p:sld>`,
	);
	zip.file(
		"ppt/notesSlides/notesSlide1.xml",
		`<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
		  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Teacher note: review inverse operations.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
		</p:notes>`,
	);
	return zip.generateAsync({ type: "nodebuffer" });
}

describe("v4 documents binary routes", () => {
	afterEach(() => {
		resetDocumentRegistryState();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("uploads and analyzes a PDF binary document", async () => {
		runAzureExtractionMock.mockResolvedValue({
			content: "1. Solve the fraction problem.",
			pages: [{ pageNumber: 1, lines: [{ content: "1. Solve the fraction problem." }] }],
			paragraphs: [{ content: "1. Solve the fraction problem.", boundingRegions: [{ pageNumber: 1 }] }],
			tables: [],
		});

		const app = createApp();
		const uploadResponse = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/pdf")
			.set("x-file-name", "worksheet.pdf")
			.send(Buffer.from("%PDF-1.4 sample"));

		expect(uploadResponse.status).toBe(200);
		expect(uploadResponse.body.documentId).toMatch(/^doc-/);

		const analyzeResponse = await request(app)
			.post("/api/v4/documents/analyze")
			.send({ sessionId: uploadResponse.body.sessionId, documentId: uploadResponse.body.documentId });

		expect(analyzeResponse.status).toBe(200);
		expect(analyzeResponse.body.analyzedDocument.document.surfaces.length).toBeGreaterThan(0);
		expect(analyzeResponse.body.analyzedDocument.document.nodes.length).toBeGreaterThan(0);
		expect(analyzeResponse.body.analyzedDocument.fragments.some((fragment: any) => fragment.isInstructional)).toBe(true);
		expect(analyzeResponse.body.analyzedDocument.problems.length).toBeGreaterThan(0);
	});

	it("uploads and analyzes a DOCX binary document", async () => {
		const app = createApp();
		const uploadResponse = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
			.set("x-file-name", "lesson.docx")
			.send(await buildDocxBuffer());

		expect(uploadResponse.status).toBe(200);

		const analyzeResponse = await request(app)
			.post("/api/v4/documents/analyze")
			.send({ sessionId: uploadResponse.body.sessionId, documentId: uploadResponse.body.documentId });

		expect(analyzeResponse.status).toBe(200);
		expect(analyzeResponse.body.analyzedDocument.document.surfaces.length).toBe(1);
		expect(analyzeResponse.body.analyzedDocument.document.nodes.length).toBeGreaterThan(0);
		expect(analyzeResponse.body.analyzedDocument.fragments.some((fragment: any) => !fragment.isInstructional)).toBe(true);
		expect(analyzeResponse.body.analyzedDocument.problems.length).toBeGreaterThan(0);
		expect(analyzeResponse.body.analyzedDocument.problems[0].anchors.length).toBeGreaterThan(0);
	});

	it("uploads and analyzes a PPTX binary document", async () => {
		const app = createApp();
		const uploadResponse = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
			.set("x-file-name", "slides.pptx")
			.send(await buildPptxBuffer());

		expect(uploadResponse.status).toBe(200);

		const analyzeResponse = await request(app)
			.post("/api/v4/documents/analyze")
			.send({ sessionId: uploadResponse.body.sessionId, documentId: uploadResponse.body.documentId });

		expect(analyzeResponse.status).toBe(200);
		expect(analyzeResponse.body.analyzedDocument.document.surfaces.length).toBeGreaterThan(0);
		expect(analyzeResponse.body.analyzedDocument.document.nodes.some((node: any) => node.nodeType === "figure")).toBe(true);
		expect(analyzeResponse.body.analyzedDocument.fragments.some((fragment: any) => !fragment.isInstructional)).toBe(true);
		expect(analyzeResponse.body.analyzedDocument.problems.length).toBeGreaterThan(0);
	});

	it("forces a new session for isolated binary uploads even when x-session-id is provided", async () => {
		runAzureExtractionMock.mockResolvedValue({
			content: "1. Solve the fraction problem.",
			pages: [{ pageNumber: 1, lines: [{ content: "1. Solve the fraction problem." }] }],
			paragraphs: [{ content: "1. Solve the fraction problem.", boundingRegions: [{ pageNumber: 1 }] }],
			tables: [],
		});

		const app = createApp();
		const firstUpload = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/pdf")
			.set("x-file-name", "first.pdf")
			.send(Buffer.from("%PDF-1.4 first"));

		expect(firstUpload.status).toBe(200);

		const isolatedUpload = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/pdf")
			.set("x-file-name", "isolated.pdf")
			.set("x-session-id", firstUpload.body.sessionId)
			.set("x-force-new-session", "true")
			.send(Buffer.from("%PDF-1.4 isolated"));

		expect(isolatedUpload.status).toBe(200);
		expect(isolatedUpload.body.sessionId).not.toBe(firstUpload.body.sessionId);
		expect(isolatedUpload.body.registered).toHaveLength(1);
		expect(isolatedUpload.body.registered[0].sourceFileName).toBe("isolated.pdf");
	});

	it("builds Wave 4 collection analysis and intents across PDF, DOCX, and PPTX uploads", async () => {
		runAzureExtractionMock.mockResolvedValue({
			content: "1. Solve the fraction problem.",
			pages: [{ pageNumber: 1, lines: [{ content: "1. Solve the fraction problem." }] }],
			paragraphs: [{ content: "1. Solve the fraction problem.", boundingRegions: [{ pageNumber: 1 }] }],
			tables: [],
		});

		const app = createApp();
		const pdfUpload = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/pdf")
			.set("x-file-name", "worksheet.pdf")
			.send(Buffer.from("%PDF-1.4 sample"));
		const docxUpload = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
			.set("x-file-name", "lesson.docx")
			.send(await buildDocxBuffer());
		const pptxUpload = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
			.set("x-file-name", "slides.pptx")
			.send(await buildPptxBuffer());

		const documentIds = [pdfUpload.body.documentId, docxUpload.body.documentId, pptxUpload.body.documentId];

		for (const documentId of documentIds) {
			const analyzeResponse = await request(app)
				.post("/api/v4/documents/analyze")
				.send({ sessionId: pdfUpload.body.sessionId, documentId });
			expect(analyzeResponse.status).toBe(200);
		}

		const sessionId = docxUpload.body.sessionId;
		const sessionResponse = await request(app)
			.post("/api/v4/documents/session")
			.send({
				sessionId,
				documentIds,
				documentRoles: {
					[documentIds[0]]: ["worksheet"],
					[documentIds[1]]: ["notes"],
					[documentIds[2]]: ["slides"],
				},
				sessionRoles: {
					[documentIds[0]]: ["comparison-target"],
					[documentIds[1]]: ["unit-member"],
					[documentIds[2]]: ["unit-member"],
				},
			});

		expect(sessionResponse.status).toBe(200);

		const analysisResponse = await request(app)
			.get(`/api/v4/documents/session/${sessionId}/analysis`)
			.query({ sessionId });

		expect(analysisResponse.status).toBe(200);
		expect(analysisResponse.body.analysis.documentIds).toHaveLength(3);
		expect(analysisResponse.body.analysis.documentSimilarity.length).toBeGreaterThanOrEqual(3);
		expect(Object.keys(analysisResponse.body.analysis.coverageSummary.perDocument)).toHaveLength(3);

		const mergePairResponse = await request(app)
			.post("/api/v4/documents/intent")
			.send({ sessionId, documentIds: documentIds.slice(0, 2), intentType: "merge-documents" });
		expect(mergePairResponse.status).toBe(200);
		expect(mergePairResponse.body.payload.kind).toBe("merge-documents");

		const mergeResponse = await request(app)
			.post("/api/v4/documents/intent")
			.send({ sessionId, documentIds, intentType: "merge-documents" });
		expect(mergeResponse.status).toBe(200);
		expect(mergeResponse.body.payload.kind).toBe("merge-documents");

		const sequenceResponse = await request(app)
			.post("/api/v4/documents/intent")
			.send({ sessionId, documentIds, intentType: "build-sequence" });
		expect(sequenceResponse.status).toBe(200);
		expect(sequenceResponse.body.payload.kind).toBe("sequence");
	});

	it("builds Wave 5 instructional products across mixed-format uploads", async () => {
		runAzureExtractionMock.mockResolvedValue({
			content: "1. Solve the fraction problem.",
			pages: [{ pageNumber: 1, lines: [{ content: "1. Solve the fraction problem." }] }],
			paragraphs: [{ content: "1. Solve the fraction problem.", boundingRegions: [{ pageNumber: 1 }] }],
			tables: [],
		});

		const app = createApp();
		const pdfUpload = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/pdf")
			.set("x-file-name", "worksheet.pdf")
			.send(Buffer.from("%PDF-1.4 sample"));
		const docxUpload = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
			.set("x-file-name", "lesson.docx")
			.send(await buildDocxBuffer());
		const pptxUpload = await request(app)
			.post("/api/v4/documents/upload")
			.set("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
			.set("x-file-name", "slides.pptx")
			.send(await buildPptxBuffer());

		const documentIds = [pdfUpload.body.documentId, docxUpload.body.documentId, pptxUpload.body.documentId];
		const sessionId = docxUpload.body.sessionId;

		const sessionResponse = await request(app)
			.post("/api/v4/documents/session")
			.send({
				sessionId,
				documentIds,
				documentRoles: {
					[documentIds[0]]: ["worksheet"],
					[documentIds[1]]: ["notes"],
					[documentIds[2]]: ["slides"],
				},
				sessionRoles: {
					[documentIds[0]]: ["unit-member"],
					[documentIds[1]]: ["unit-member"],
					[documentIds[2]]: ["unit-member"],
				},
			});
		expect(sessionResponse.status).toBe(200);

		const lessonResponse = await request(app)
			.post("/api/v4/documents/intent")
			.send({ sessionId, documentIds: [docxUpload.body.documentId], intentType: "build-lesson" });
		expect(lessonResponse.status).toBe(200);
		expect(lessonResponse.body.payload.kind).toBe("lesson");

		const unitResponse = await request(app)
			.post("/api/v4/documents/intent")
			.send({ sessionId, documentIds, intentType: "build-unit" });
		expect(unitResponse.status).toBe(200);
		expect(unitResponse.body.payload.kind).toBe("unit");

		const mapResponse = await request(app)
			.post("/api/v4/documents/intent")
			.send({ sessionId, documentIds, intentType: "build-instructional-map" });
		expect(mapResponse.status).toBe(200);
		expect(mapResponse.body.payload.kind).toBe("instructional-map");

		const alignmentResponse = await request(app)
			.post("/api/v4/documents/intent")
			.send({ sessionId, documentIds, intentType: "curriculum-alignment" });
		expect(alignmentResponse.status).toBe(200);
		expect(alignmentResponse.body.payload.kind).toBe("curriculum-alignment");
	});
});