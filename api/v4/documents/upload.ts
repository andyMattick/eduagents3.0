import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { IncomingMessage } from "http";

import { analyzeRegisteredDocument } from "../../../src/prism-v4/documents/analysis";
import { createDocumentSession, registerDocuments, saveAnalyzedDocument } from "../../../src/prism-v4/documents/registry";

export const runtime = "nodejs";
export const config = {
	api: {
		bodyParser: false,
	},
};

function getSingleHeaderValue(header: string | string[] | undefined) {
	return Array.isArray(header) ? header[0] : header;
}

async function readRequestBody(req: IncomingMessage & { arrayBuffer?: () => Promise<ArrayBuffer> }) {
	if (typeof req.arrayBuffer === "function") {
		return Buffer.from(await req.arrayBuffer());
	}

	return new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer | string) => {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
		});
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}

function parseBody(body: unknown) {
	if (typeof body !== "string") {
		return body as {
			documents?: Array<{
				sourceFileName?: string;
				sourceMimeType?: string;
				azureExtract?: {
					fileName: string;
					content: string;
					pages: Array<{ pageNumber: number; text: string }>;
					paragraphs?: Array<{ text: string; pageNumber: number; role?: string }>;
					tables?: Array<{
						rowCount: number;
						columnCount: number;
						pageNumber?: number;
						cells: Array<{ rowIndex: number; columnIndex: number; text: string }>;
					}>;
					readingOrder?: string[];
				};
			}>;
			createSession?: boolean;
		};
	}

	return JSON.parse(body) as {
		documents?: Array<{
			sourceFileName?: string;
			sourceMimeType?: string;
			azureExtract?: {
				fileName: string;
				content: string;
				pages: Array<{ pageNumber: number; text: string }>;
				paragraphs?: Array<{ text: string; pageNumber: number; role?: string }>;
				tables?: Array<{
					rowCount: number;
					columnCount: number;
					pageNumber?: number;
					cells: Array<{ rowIndex: number; columnIndex: number; text: string }>;
				}>;
				readingOrder?: string[];
			};
		}>;
		createSession?: boolean;
	};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const headers = req.headers ?? {};
		const contentType = getSingleHeaderValue(headers["content-type"]) ?? "application/octet-stream";
		const fileName = getSingleHeaderValue(headers["x-file-name"]);
		if (contentType.includes("application/json") || typeof req.body !== "undefined") {
		const payload = parseBody(req.body ?? {});
		const documents = (payload.documents ?? []).filter((entry) => entry.sourceFileName && entry.sourceMimeType);
		if (documents.length === 0) {
			return res.status(400).json({ error: "documents must contain at least one sourceFileName/sourceMimeType pair" });
		}

		const registered = registerDocuments(documents as Array<{ sourceFileName: string; sourceMimeType: string; azureExtract?: { fileName: string; content: string; pages: Array<{ pageNumber: number; text: string }>; paragraphs?: Array<{ text: string; pageNumber: number; role?: string }>; tables?: Array<{ rowCount: number; columnCount: number; pageNumber?: number; cells: Array<{ rowIndex: number; columnIndex: number; text: string }> }>; readingOrder?: string[] } }>);
		const session = payload.createSession === false ? null : createDocumentSession(registered.map((entry) => entry.documentId));

		return res.status(200).json({
			documentIds: registered.map((entry) => entry.documentId),
			sessionId: session?.sessionId ?? null,
			registered,
		});
		}

		if (!fileName) {
			return res.status(400).json({ error: "x-file-name header is required for binary upload" });
		}

		const allowedMimeTypes = new Set([
			"application/pdf",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
			"application/msword",
		]);
		if (!allowedMimeTypes.has(contentType)) {
			return res.status(400).json({ error: "Unsupported file type. Allowed types: PDF, DOCX, PPTX." });
		}

		const buffer = await readRequestBody(req as IncomingMessage & { arrayBuffer?: () => Promise<ArrayBuffer> });
		if (buffer.byteLength === 0) {
			return res.status(400).json({ error: "Request body is empty." });
		}

		const [registered] = registerDocuments([{ sourceFileName: fileName, sourceMimeType: contentType, rawBinary: buffer }]);
		const session = createDocumentSession([registered.documentId]);

		// Analyze inline while the binary is available in this invocation.
		// Vercel serverless functions are stateless — the in-memory registry is
		// not shared across invocations, so a separate /analyze call in a
		// subsequent request would always return 404 "Document not found".
		const analyzedDocument = saveAnalyzedDocument(
			await analyzeRegisteredDocument({
				documentId: registered.documentId,
				sourceFileName: registered.sourceFileName,
				sourceMimeType: registered.sourceMimeType,
				rawBinary: buffer,
			}),
		);

		return res.status(200).json({
			documentId: registered.documentId,
			documentIds: [registered.documentId],
			sessionId: session.sessionId,
			registered: [
				{
					documentId: registered.documentId,
					sourceFileName: registered.sourceFileName,
					sourceMimeType: registered.sourceMimeType,
					createdAt: registered.createdAt,
				},
			],
			analyzedDocument,
		});
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Upload registration failed" });
	}
}
