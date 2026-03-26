import { supabaseRest } from "../../../lib/supabase";
import {
	addDocumentToSession,
	createDocumentSession,
	getAnalyzedDocument,
	getAnalyzedDocumentsForSession,
	getDocumentSession,
	getIntentProduct,
	getRegisteredDocument,
	getSessionDocuments,
	listIntentProductsForSession,
	registerDocuments,
	saveAnalyzedDocument,
	saveCollectionAnalysis,
	saveIntentProduct,
	saveRegisteredDocument,
	upsertDocumentSession,
	type RegisteredDocument,
} from "./registry";
import type { DocumentSession, DocumentRole, SessionRole } from "../schema/domain";
import type { BuiltIntentType, IntentPayloadByType, IntentProduct, IntentRequest } from "../schema/integration";
import type { AnalyzedDocument, DocumentCollectionAnalysis } from "../schema/semantic";

type SessionRow = {
	session_id: string;
	document_ids: string[];
	document_roles: Record<string, DocumentRole[]>;
	session_roles: Record<string, SessionRole[]>;
	created_at: string;
	updated_at: string;
};

type DocumentRow = {
	document_id: string;
	session_id: string | null;
	source_file_name: string;
	source_mime_type: string;
	created_at: string;
	raw_binary_base64: string | null;
	canonical_document: RegisteredDocument["canonicalDocument"] | null;
	azure_extract: RegisteredDocument["azureExtract"] | null;
};

type AnalyzedDocumentRow = {
	document_id: string;
	session_id: string | null;
	analyzed_document: AnalyzedDocument;
	updated_at: string;
};

type CollectionAnalysisRow = {
	session_id: string;
	analysis: DocumentCollectionAnalysis;
	updated_at: string;
};

type IntentProductRow = {
	product_id: string;
	session_id: string;
	intent_type: IntentProduct["intentType"];
	document_ids: string[];
	product_type: string;
	schema_version: string;
	payload: IntentProduct["payload"];
	created_at: string;
};

function canUseSupabase() {
	return typeof window === "undefined"
		&& Boolean(process.env.SUPABASE_URL)
		&& Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function createId(prefix: string) {
	if (typeof globalThis.crypto?.randomUUID === "function") {
		return `${prefix}-${globalThis.crypto.randomUUID()}`;
	}

	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function now() {
	return new Date().toISOString();
}

function unique(values: string[]) {
	return [...new Set(values)];
}

function defaultDocumentRoles(documentIds: string[]) {
	return Object.fromEntries(documentIds.map((documentId) => [documentId, ["unknown"] satisfies DocumentRole[]]));
}

function defaultSessionRoles(documentIds: string[]) {
	return Object.fromEntries(documentIds.map((documentId) => [documentId, ["source-material"] satisfies SessionRole[]]));
}

function toSessionRow(session: DocumentSession): SessionRow {
	return {
		session_id: session.sessionId,
		document_ids: session.documentIds,
		document_roles: session.documentRoles,
		session_roles: session.sessionRoles,
		created_at: session.createdAt,
		updated_at: session.updatedAt,
	};
}

function fromSessionRow(row: SessionRow): DocumentSession {
	return {
		sessionId: row.session_id,
		documentIds: row.document_ids ?? [],
		documentRoles: row.document_roles ?? {},
		sessionRoles: row.session_roles ?? {},
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function toDocumentRow(document: RegisteredDocument, sessionId: string | null): DocumentRow {
	return {
		document_id: document.documentId,
		session_id: sessionId,
		source_file_name: document.sourceFileName,
		source_mime_type: document.sourceMimeType,
		created_at: document.createdAt,
		raw_binary_base64: document.rawBinary ? document.rawBinary.toString("base64") : null,
		canonical_document: document.canonicalDocument ?? null,
		azure_extract: document.azureExtract ?? null,
	};
	}

function fromDocumentRow(row: DocumentRow): RegisteredDocument {
	return {
		documentId: row.document_id,
		sourceFileName: row.source_file_name,
		sourceMimeType: row.source_mime_type,
		createdAt: row.created_at,
		rawBinary: row.raw_binary_base64 ? Buffer.from(row.raw_binary_base64, "base64") : undefined,
		canonicalDocument: row.canonical_document ?? undefined,
		azureExtract: row.azure_extract ?? undefined,
	};
}

function fromIntentProductRow(row: IntentProductRow): IntentProduct {
	return {
		productId: row.product_id,
		sessionId: row.session_id,
		intentType: row.intent_type,
		documentIds: row.document_ids ?? [],
		productType: row.product_type,
		schemaVersion: row.schema_version,
		payload: row.payload,
		createdAt: row.created_at,
	} as IntentProduct;
}

async function updateDocumentSessionIds(sessionId: string, documentIds: string[]) {
	if (!canUseSupabase() || documentIds.length === 0) {
		return;
	}

	const filterValue = `in.(${documentIds.join(",")})`;
	await Promise.all([
		supabaseRest("v4_documents", {
			method: "PATCH",
			filters: { document_id: filterValue },
			body: { session_id: sessionId },
			prefer: "return=minimal",
		}),
		supabaseRest("v4_analyzed_documents", {
			method: "PATCH",
			filters: { document_id: filterValue },
			body: { session_id: sessionId },
			prefer: "return=minimal",
		}),
	]);
}

export async function registerDocumentsStore(entries: Array<{ sourceFileName: string; sourceMimeType: string; rawBinary?: Buffer; canonicalDocument?: RegisteredDocument["canonicalDocument"]; azureExtract?: RegisteredDocument["azureExtract"] }>, sessionId: string | null = null) {
	if (!canUseSupabase()) {
		return registerDocuments(entries);
	}

	const createdAt = now();
	const registered = entries.map((entry) => ({
		documentId: createId("doc"),
		sourceFileName: entry.sourceFileName,
		sourceMimeType: entry.sourceMimeType,
		createdAt,
		rawBinary: entry.rawBinary,
		canonicalDocument: entry.canonicalDocument,
		azureExtract: entry.azureExtract,
	}) satisfies RegisteredDocument);

	await supabaseRest("v4_documents", {
		method: "POST",
		body: registered.map((document) => toDocumentRow(document, sessionId)),
		prefer: "resolution=merge-duplicates,return=minimal",
	});

	return registered;
}

export async function getDocumentSessionStore(sessionId: string) {
	if (!canUseSupabase()) {
		return getDocumentSession(sessionId);
	}

	const rows = await supabaseRest("v4_sessions", {
		select: "session_id,document_ids,document_roles,session_roles,created_at,updated_at",
		filters: { session_id: `eq.${sessionId}` },
	});
	const row = Array.isArray(rows) ? rows[0] as SessionRow | undefined : undefined;
	return row ? fromSessionRow(row) : null;
}

export async function createDocumentSessionStore(documentIds: string[], sessionId = createId("session")) {
	if (!canUseSupabase()) {
		return upsertDocumentSession({
			sessionId,
			documentIds,
			documentRoles: defaultDocumentRoles(documentIds),
			sessionRoles: defaultSessionRoles(documentIds),
		});
	}

	const session: DocumentSession = {
		sessionId,
		documentIds,
		documentRoles: defaultDocumentRoles(documentIds),
		sessionRoles: defaultSessionRoles(documentIds),
		createdAt: now(),
		updatedAt: now(),
	};

	await supabaseRest("v4_sessions", {
		method: "POST",
		body: toSessionRow(session),
		prefer: "resolution=merge-duplicates,return=minimal",
	});
	await updateDocumentSessionIds(sessionId, documentIds);
	return session;
}

export async function ensureSessionDocumentsStore(sessionId: string, documentIds: string[]) {
	if (!canUseSupabase()) {
		const existing = getDocumentSession(sessionId);
		if (!existing) {
			return upsertDocumentSession({
				sessionId,
				documentIds,
				documentRoles: defaultDocumentRoles(documentIds),
				sessionRoles: defaultSessionRoles(documentIds),
			});
		}

		let current = existing;
		for (const documentId of documentIds) {
			current = addDocumentToSession(sessionId, documentId) ?? current;
		}
		return current;
	}

	const existing = await getDocumentSessionStore(sessionId);
	if (!existing) {
		return createDocumentSessionStore(documentIds, sessionId);
	}

	const mergedDocumentIds = unique([...existing.documentIds, ...documentIds]);
	const nextSession: DocumentSession = {
		...existing,
		documentIds: mergedDocumentIds,
		documentRoles: {
			...defaultDocumentRoles(mergedDocumentIds),
			...existing.documentRoles,
		},
		sessionRoles: {
			...defaultSessionRoles(mergedDocumentIds),
			...existing.sessionRoles,
		},
		updatedAt: now(),
	};

	await supabaseRest("v4_sessions", {
		method: "POST",
		body: toSessionRow(nextSession),
		prefer: "resolution=merge-duplicates,return=minimal",
	});
	await updateDocumentSessionIds(sessionId, documentIds);
	return nextSession;
}

export async function upsertDocumentSessionStore(session: Omit<DocumentSession, "createdAt" | "updatedAt"> & Partial<Pick<DocumentSession, "createdAt">>) {
	if (!canUseSupabase()) {
		return upsertDocumentSession(session);
	}

	const existing = await getDocumentSessionStore(session.sessionId);
	const nextSession: DocumentSession = {
		sessionId: session.sessionId,
		documentIds: session.documentIds,
		documentRoles: session.documentRoles,
		sessionRoles: session.sessionRoles,
		createdAt: existing?.createdAt ?? session.createdAt ?? now(),
		updatedAt: now(),
	};

	await supabaseRest("v4_sessions", {
		method: "POST",
		body: toSessionRow(nextSession),
		prefer: "resolution=merge-duplicates,return=minimal",
	});
	await updateDocumentSessionIds(nextSession.sessionId, nextSession.documentIds);
	return nextSession;
}

export async function getRegisteredDocumentStore(documentId: string) {
	if (!canUseSupabase()) {
		return getRegisteredDocument(documentId);
	}

	const rows = await supabaseRest("v4_documents", {
		select: "document_id,session_id,source_file_name,source_mime_type,created_at,raw_binary_base64,canonical_document,azure_extract",
		filters: { document_id: `eq.${documentId}` },
	});
	const row = Array.isArray(rows) ? rows[0] as DocumentRow | undefined : undefined;
	return row ? fromDocumentRow(row) : null;
}

export async function getDocumentSessionIdStore(documentId: string) {
	if (!canUseSupabase()) {
		return null;
	}

	const rows = await supabaseRest("v4_documents", {
		select: "document_id,session_id",
		filters: { document_id: `eq.${documentId}` },
	});
	const row = Array.isArray(rows) ? rows[0] as Pick<DocumentRow, "document_id" | "session_id"> | undefined : undefined;
	return row?.session_id ?? null;
}

export async function getSessionDocumentsStore(sessionId: string) {
	if (!canUseSupabase()) {
		return getSessionDocuments(sessionId);
	}

	const rows = await supabaseRest("v4_documents", {
		select: "document_id,session_id,source_file_name,source_mime_type,created_at,raw_binary_base64,canonical_document,azure_extract",
		filters: { session_id: `eq.${sessionId}`, order: "created_at.asc" },
	});
	return ((rows as DocumentRow[] | null) ?? []).map((row) => fromDocumentRow(row));
}

export async function getAnalyzedDocumentStore(documentId: string) {
	if (!canUseSupabase()) {
		return getAnalyzedDocument(documentId);
	}

	const rows = await supabaseRest("v4_analyzed_documents", {
		select: "document_id,session_id,analyzed_document,updated_at",
		filters: { document_id: `eq.${documentId}` },
	});
	const row = Array.isArray(rows) ? rows[0] as AnalyzedDocumentRow | undefined : undefined;
	return row?.analyzed_document ?? null;
}

export async function getAnalyzedDocumentsForSessionStore(sessionId: string) {
	if (!canUseSupabase()) {
		return getAnalyzedDocumentsForSession(sessionId);
	}

	const rows = await supabaseRest("v4_analyzed_documents", {
		select: "document_id,session_id,analyzed_document,updated_at",
		filters: { session_id: `eq.${sessionId}`, order: "updated_at.asc" },
	});
	return ((rows as AnalyzedDocumentRow[] | null) ?? []).map((row) => row.analyzed_document);
}

export async function saveAnalyzedDocumentStore(analyzedDocument: AnalyzedDocument, sessionId: string | null) {
	if (!canUseSupabase()) {
		return saveAnalyzedDocument(analyzedDocument);
	}

	await supabaseRest("v4_analyzed_documents", {
		method: "POST",
		body: {
			document_id: analyzedDocument.document.id,
			session_id: sessionId,
			analyzed_document: analyzedDocument,
			updated_at: analyzedDocument.updatedAt,
		},
		prefer: "resolution=merge-duplicates,return=minimal",
	});

	await supabaseRest("v4_documents", {
		method: "PATCH",
		filters: { document_id: `eq.${analyzedDocument.document.id}` },
		body: { canonical_document: analyzedDocument.document },
		prefer: "return=minimal",
	});

	return analyzedDocument;
}

export async function saveCollectionAnalysisStore(analysis: DocumentCollectionAnalysis) {
	if (!canUseSupabase()) {
		return saveCollectionAnalysis(analysis);
	}

	await supabaseRest("v4_collection_analyses", {
		method: "POST",
		body: {
			session_id: analysis.sessionId,
			analysis,
			updated_at: analysis.updatedAt,
		},
		prefer: "resolution=merge-duplicates,return=minimal",
	});

	return analysis;
}

export async function getCollectionAnalysisStore(sessionId: string) {
	if (!canUseSupabase()) {
		return null;
	}

	const rows = await supabaseRest("v4_collection_analyses", {
		select: "session_id,analysis,updated_at",
		filters: { session_id: `eq.${sessionId}` },
	});
	const row = Array.isArray(rows) ? rows[0] as CollectionAnalysisRow | undefined : undefined;
	return row?.analysis ?? null;
}

export async function saveIntentProductStore<T extends BuiltIntentType>(request: IntentRequest & { intentType: T }, payload: IntentPayloadByType[T], schemaVersion = "wave3-v1") {
	if (!canUseSupabase()) {
		return saveIntentProduct(request, payload, schemaVersion);
	}

	const product: IntentProduct<T> = {
		sessionId: request.sessionId,
		intentType: request.intentType,
		documentIds: request.documentIds,
		productId: createId("product"),
		productType: request.intentType,
		schemaVersion,
		payload,
		createdAt: now(),
	};

	await supabaseRest("v4_intent_products", {
		method: "POST",
		body: {
			product_id: product.productId,
			session_id: product.sessionId,
			intent_type: product.intentType,
			document_ids: product.documentIds,
			product_type: product.productType,
			schema_version: product.schemaVersion,
			payload: product.payload,
			created_at: product.createdAt,
		},
		prefer: "return=minimal",
	});

	return product;
}

export async function getIntentProductStore(productId: string) {
	if (!canUseSupabase()) {
		return getIntentProduct(productId);
	}

	const rows = await supabaseRest("v4_intent_products", {
		select: "product_id,session_id,intent_type,document_ids,product_type,schema_version,payload,created_at",
		filters: { product_id: `eq.${productId}` },
	});
	const row = Array.isArray(rows) ? rows[0] as IntentProductRow | undefined : undefined;
	return row ? fromIntentProductRow(row) : null;
}

export async function listIntentProductsForSessionStore(sessionId: string) {
	if (!canUseSupabase()) {
		return listIntentProductsForSession(sessionId);
	}

	const rows = await supabaseRest("v4_intent_products", {
		select: "product_id,session_id,intent_type,document_ids,product_type,schema_version,payload,created_at",
		filters: { session_id: `eq.${sessionId}`, order: "created_at.desc" },
	});
	return ((rows as IntentProductRow[] | null) ?? []).map((row) => fromIntentProductRow(row));
}

export async function hydrateSessionToRegistryStore(sessionId: string) {
	const session = await getDocumentSessionStore(sessionId);
	if (!session) {
		return null;
	}

	const [documents, analyzedDocuments] = await Promise.all([
		getSessionDocumentsStore(sessionId),
		getAnalyzedDocumentsForSessionStore(sessionId),
	]);

	upsertDocumentSession({
		sessionId: session.sessionId,
		documentIds: session.documentIds,
		documentRoles: session.documentRoles,
		sessionRoles: session.sessionRoles,
		createdAt: session.createdAt,
	});

	for (const document of documents) {
		saveRegisteredDocument(document);
	}

	for (const analyzedDocument of analyzedDocuments) {
		saveAnalyzedDocument(analyzedDocument);
	}

	return {
		session,
		documents,
		analyzedDocuments,
	};
}