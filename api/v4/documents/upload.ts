import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { IncomingMessage } from "http";

import { assertBackendStartupEnv } from "../../../lib/envGuard";
import { supabaseRest } from "../../../lib/supabase";
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

assertBackendStartupEnv([
	"SUPABASE_URL",
	"SUPABASE_ANON_KEY",
], "api/v4/documents/upload");

function getSingleHeaderValue(header: string | string[] | undefined) {
	return Array.isArray(header) ? header[0] : header;
}

function parseBooleanHeader(header: string | string[] | undefined): boolean {
	const value = getSingleHeaderValue(header);
	if (!value) {
		return false;
	}
	const normalized = value.trim().toLowerCase();
	return normalized === "1" || normalized === "true" || normalized === "yes";
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

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveActor(req: VercelRequest): { actorKey: string; userId: string | null } {
	const userIdHeader = getSingleHeaderValue(req.headers["x-user-id"]);
	if (userIdHeader && isUuid(userIdHeader)) {
		return {
			actorKey: userIdHeader,
			userId: userIdHeader,
		};
	}
	return {
		actorKey: getClientIp(req),
		userId: null,
	};
}

async function getDailyUsageCount(userId: string, date: string): Promise<number> {
	try {
		const rows = await supabaseRest("user_daily_tokens", {
			method: "GET",
			select: "tokens_used",
			filters: { actor_key: `eq.${userId}`, date: `eq.${date}` },
		});
		if (Array.isArray(rows) && rows.length > 0) {
			return rows[0].tokens_used as number;
		}
		return 0;
	} catch {
		// If the table doesn't exist yet, don't block the upload
		return 0;
	}
}

function estimateTokensFromText(value: string): number {
	if (!value) return 0;
	return Math.max(1, Math.ceil(value.length / 4));
}

async function logTokenUsageEvent(params: {
	actorKey: string;
	userId: string | null;
	sessionId?: string | null;
	documentId?: string | null;
	stage: string;
	tokens: number;
	metadata?: Record<string, unknown>;
}): Promise<void> {
	if (!Number.isFinite(params.tokens) || params.tokens <= 0) return;
	try {
		await supabaseRest("token_usage_events", {
			method: "POST",
			body: {
				actor_key: params.actorKey,
				user_id: params.userId,
				session_id: params.sessionId ?? null,
				document_id: params.documentId ?? null,
				stage: params.stage,
				endpoint: "/api/v4/documents/upload",
				tokens: Math.max(1, Math.round(params.tokens)),
				billed: false,
				metadata: params.metadata ?? {},
			},
		});
	} catch {
		// Non-fatal logging
	}
}

const DAILY_TOKEN_LIMIT = 25_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const actor = resolveActor(req);
	const today = new Date().toISOString().slice(0, 10);
	const usageCount = await getDailyUsageCount(actor.actorKey, today);
	if (usageCount >= DAILY_TOKEN_LIMIT) {
		return res.status(429).json({
			error: `Daily token limit of ${DAILY_TOKEN_LIMIT} reached. Please try again tomorrow.`,
		});
	}

	try {
		const headers = req.headers ?? {};
		const contentType = getSingleHeaderValue(headers["content-type"]);
			if (!contentType || typeof contentType !== "string") {
			return res.status(400).json({ error: "Missing or invalid content-type header" });
			}

		const normalizedContentType = contentType.trim().toLowerCase();
		const isJsonPayload = normalizedContentType.includes("application/json");

		const fileName = getSingleHeaderValue(headers["x-file-name"]);
		const requestedSessionId = getSingleHeaderValue(headers["x-session-id"]);
		const forceNewSession = parseBooleanHeader(headers["x-force-new-session"]);
		const resolvedSessionId = forceNewSession ? null : requestedSessionId;
		if (isJsonPayload) {
		const payload = parseBody(req.body ?? {});
		const documents = (payload.documents ?? []).filter((entry) => entry.sourceFileName && entry.sourceMimeType);
		if (documents.length === 0) {
			return res.status(400).json({ error: "documents must contain at least one sourceFileName/sourceMimeType pair" });
		}

		const registered = await registerDocumentsStore(documents as Array<{ sourceFileName: string; sourceMimeType: string; azureExtract?: { fileName: string; content: string; pages: Array<{ pageNumber: number; text: string }>; paragraphs?: Array<{ text: string; pageNumber: number; role?: string }>; tables?: Array<{ rowCount: number; columnCount: number; pageNumber?: number; cells: Array<{ rowIndex: number; columnIndex: number; text: string }> }>; readingOrder?: string[] } }>);
		const session = payload.createSession === false
			? null
			: resolvedSessionId
				? await ensureSessionDocumentsStore(resolvedSessionId, registered.map((entry) => entry.documentId))
				: await createDocumentSessionStore(registered.map((entry) => entry.documentId));

		for (let index = 0; index < registered.length; index++) {
			const doc = documents[index];
			const reg = registered[index];
			const estimatedTokens = estimateTokensFromText(doc?.azureExtract?.content ?? `${doc?.sourceFileName ?? ""} ${doc?.sourceMimeType ?? ""}`);
			await logTokenUsageEvent({
				actorKey: actor.actorKey,
				userId: actor.userId,
				sessionId: session?.sessionId ?? null,
				documentId: reg?.documentId ?? null,
				stage: "upload_register_estimate",
				tokens: estimatedTokens,
				metadata: {
					source_file_name: doc?.sourceFileName ?? null,
					source_mime_type: doc?.sourceMimeType ?? null,
				},
			});
		}

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
		if (!allowedMimeTypes.has(normalizedContentType)) {
			return res.status(400).json({ error: "Unsupported file type. Allowed types: PDF, DOCX, PPTX." });
		}
		let buffer: Buffer;
		try {
			buffer = await readRequestBody(req);
		}
			catch (err) {
			return res.status(400).json({ error: "Failed to read request body as binary data." });
		}
		const [registered] = await registerDocumentsStore([{ sourceFileName: fileName, sourceMimeType: normalizedContentType, rawBinary: buffer }], resolvedSessionId ?? null);
		const session = resolvedSessionId
			? await ensureSessionDocumentsStore(resolvedSessionId, [registered.documentId])
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

		// Run unified ingestion pipeline after successful analysis.
		// Non-blocking to keep upload latency low.
		ingestDocument({
			source:           "teacher-upload",
			documentId:       registered.documentId,
			analyzedDocument: analyzedDocument,
		}).catch((err) =>
			console.warn("[upload] ingestDocument failed (non-fatal):", err instanceof Error ? err.message : err),
		);

		await logTokenUsageEvent({
			actorKey: actor.actorKey,
			userId: actor.userId,
			sessionId: session.sessionId,
			documentId: registered.documentId,
			stage: "upload_binary_estimate",
			tokens: Math.max(1, Math.ceil(buffer.length / 4)),
			metadata: {
				source_file_name: registered.sourceFileName,
				source_mime_type: registered.sourceMimeType,
				binary_bytes: buffer.length,
			},
		});

		return res.status(200).json({
			documentId: registered.documentId,
			documentIds: [registered.documentId],
			sessionId: session.sessionId,
			ingestion: { queued: true },
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
