import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { IncomingMessage } from "http";

import { supabaseAdmin, supabaseRest } from "../../../lib/supabase";
import { analyzeRegisteredDocument } from "../../../src/prism-v4/documents/analysis";
import {
	createDocumentSessionStore,
	ensureSessionDocumentsStore,
	registerDocumentsStore,
	saveAnalyzedDocumentStore,
} from "../../../src/prism-v4/documents/registryStore";
import { ingestDocument } from "../../../src/prism-v4/ingestion/ingestDocument";

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

function getClientIp(req: VercelRequest): string {
	const forwarded = req.headers["x-forwarded-for"];
	const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "";
	const ip = raw.split(",")[0].trim();
	return ip || "unknown";
}

async function getDailyUsageCount(userId: string, date: string): Promise<number> {
	try {
		const rows = await supabaseRest("user_daily_usage", {
			method: "GET",
			select: "count",
			filters: { "user_id": `eq.${userId}`, "date": `eq.${date}` },
		});
		if (Array.isArray(rows) && rows.length > 0) {
			return rows[0].count as number;
		}
		return 0;
	} catch {
		// If the table doesn't exist yet, don't block the upload
		return 0;
	}
}

async function incrementDailyUsage(userId: string, date: string): Promise<void> {
	try {
		const { url, key } = supabaseAdmin();
		await fetch(`${url}/rest/v1/rpc/increment_daily_usage`, {
			method: "POST",
			headers: {
				apikey: key,
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ uid: userId, d: date }),
		});
	} catch {
		// Non-fatal — don't block the response if increment fails
	}
}

const DAILY_DOCUMENT_LIMIT = 5;

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const userId = getClientIp(req);
	const today = new Date().toISOString().slice(0, 10);
	const usageCount = await getDailyUsageCount(userId, today);
	if (usageCount >= DAILY_DOCUMENT_LIMIT) {
		return res.status(429).json({
			error: `Daily upload limit of ${DAILY_DOCUMENT_LIMIT} documents reached. Please try again tomorrow.`,
		});
	}

	try {
		const headers = req.headers ?? {};
		const contentType = getSingleHeaderValue(headers["content-type"]) ?? "application/octet-stream";
		const fileName = getSingleHeaderValue(headers["x-file-name"]);
		const requestedSessionId = getSingleHeaderValue(headers["x-session-id"]);
		if (contentType.includes("application/json") || typeof req.body !== "undefined") {
		const payload = parseBody(req.body ?? {});
		const documents = (payload.documents ?? []).filter((entry) => entry.sourceFileName && entry.sourceMimeType);
		if (documents.length === 0) {
			return res.status(400).json({ error: "documents must contain at least one sourceFileName/sourceMimeType pair" });
		}

		const registered = await registerDocumentsStore(documents as Array<{ sourceFileName: string; sourceMimeType: string; azureExtract?: { fileName: string; content: string; pages: Array<{ pageNumber: number; text: string }>; paragraphs?: Array<{ text: string; pageNumber: number; role?: string }>; tables?: Array<{ rowCount: number; columnCount: number; pageNumber?: number; cells: Array<{ rowIndex: number; columnIndex: number; text: string }> }>; readingOrder?: string[] } }>);
		const session = payload.createSession === false
			? null
			: requestedSessionId
				? await ensureSessionDocumentsStore(requestedSessionId, registered.map((entry) => entry.documentId))
				: await createDocumentSessionStore(registered.map((entry) => entry.documentId));

		await incrementDailyUsage(userId, today);
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

		const [registered] = await registerDocumentsStore([{ sourceFileName: fileName, sourceMimeType: contentType, rawBinary: buffer }], requestedSessionId ?? null);
		const session = requestedSessionId
			? await ensureSessionDocumentsStore(requestedSessionId, [registered.documentId])
			: await createDocumentSessionStore([registered.documentId]);

		// Analyze inline while the binary is available in this invocation.
		// Vercel serverless functions are stateless — the in-memory registry is
		// not shared across invocations, so a separate /analyze call in a
		// subsequent request would always return 404 "Document not found".
		const analyzedDocument = await analyzeRegisteredDocument({
			documentId: registered.documentId,
			sourceFileName: registered.sourceFileName,
			sourceMimeType: registered.sourceMimeType,
			rawBinary: buffer,
		});
		await saveAnalyzedDocumentStore(analyzedDocument, session.sessionId);

		// Run unified ingestion pipeline: classifies doc type, persists items,
		// sections, and analysis.  Fire-and-forget — never blocks upload response.
		ingestDocument({
			source:           "teacher-upload",
			documentId:       registered.documentId,
			analyzedDocument: analyzedDocument,
		}).catch((err) =>
			console.warn("[upload] ingestDocument failed (non-fatal):", err instanceof Error ? err.message : err),
		);

		await incrementDailyUsage(userId, today);

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
