import { supabaseRest } from "../../../lib/supabase";
import { analyzeRegisteredDocument, buildDocumentCollectionAnalysis, groupFragments } from "./analysis";
import { withPreferredContentHash } from "./contentHash";
import { buildInstructionalUnitOverrideId, getProblemOverride } from "../teacherFeedback";
import {
	addDocumentToSession,
	buildDefaultCollectionAnalysis,
	getAnalyzedDocument,
	getAnalyzedDocumentsForSession,
	getCollectionAnalysis,
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
import type { AnalyzedDocument, DocumentCollectionAnalysis, InstructionalUnit } from "../schema/semantic";

const SESSIONS_TABLE = "prism_v4_sessions";
const DOCUMENTS_TABLE = "prism_v4_documents";
const ANALYZED_DOCUMENTS_TABLE = "prism_v4_analyzed_documents";
const COLLECTION_ANALYSES_TABLE = "prism_v4_collection_analyses";
const SESSION_SNAPSHOTS_TABLE = "prism_v4_session_snapshots";
const INTENT_PRODUCTS_TABLE = "prism_v4_intent_products";

export interface PrismSessionContext {
	session: DocumentSession;
	registeredDocuments: RegisteredDocument[];
	analyzedDocuments: AnalyzedDocument[];
	collectionAnalysis: DocumentCollectionAnalysis;
	sourceFileNames: Record<string, string>;
	groupedUnits: InstructionalUnit[];
}

export interface PrismDocumentAnalysisTarget {
	sessionId: string | null;
	registeredDocument: RegisteredDocument;
	analyzedDocument: AnalyzedDocument | null;
}

export interface PrismSessionSnapshotDocument {
	documentId: string;
	sourceFileName: string;
	sourceMimeType: string;
	createdAt: string;
	canonicalDocument?: RegisteredDocument["canonicalDocument"];
	azureExtract?: RegisteredDocument["azureExtract"];
}

export interface PersistedPrismSessionContext {
	session: DocumentSession;
	registeredDocuments: PrismSessionSnapshotDocument[];
	analyzedDocuments: AnalyzedDocument[];
	collectionAnalysis: DocumentCollectionAnalysis;
	sourceFileNames: Record<string, string>;
}

export interface PrismSessionSnapshot {
	sessionId: string;
	context: PersistedPrismSessionContext;
	createdAt: string;
}

const prismSessionContextCache = new Map<string, Promise<PrismSessionContext | null>>();
const prismSessionSnapshotStore = new Map<string, PrismSessionSnapshot>();
const staleCollectionAnalysisSessions = new Set<string>();
let prismSessionSnapshotsSupported = true;

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

type SessionSnapshotRow = {
	session_id: string;
	snapshot_json: PersistedPrismSessionContext;
	created_at: string;
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

function isMissingSnapshotTableError(error: unknown) {
	const message = String(error instanceof Error ? error.message : error).toLowerCase();
	return message.includes("pgrst205")
		|| (message.includes("schema cache") && message.includes(SESSION_SNAPSHOTS_TABLE))
		|| message.includes(`could not find the table 'public.${SESSION_SNAPSHOTS_TABLE}'`)
		// 42703: undefined_column — migration not yet applied; table schema is out of date
		|| message.includes("42703")
		// 23502: not_null_violation — old `snapshot` column exists without a default; migration pending
		|| (message.includes("23502") && message.includes(SESSION_SNAPSHOTS_TABLE));
}

function disablePersistedSnapshots(error: unknown) {
	if (!isMissingSnapshotTableError(error)) {
		throw error;
	}
	if (prismSessionSnapshotsSupported) {
		console.warn(`[registryStore] ${SESSION_SNAPSHOTS_TABLE} missing in Supabase schema cache; falling back to in-memory snapshots.`);
	}
	prismSessionSnapshotsSupported = false;
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

function hasSameDocumentIds(left: string[], right: string[]) {
	if (left.length !== right.length) {
		return false;
	}
	const leftSet = new Set(left);
	return right.every((value) => leftSet.has(value));
}

function shouldRebuildCollectionAnalysis(
	session: DocumentSession,
	analyzedDocuments: AnalyzedDocument[],
	analysis: DocumentCollectionAnalysis | null,
) {
	if (staleCollectionAnalysisSessions.has(session.sessionId)) {
		return true;
	}

	if (!analysis) {
		return true;
	}

	if (!hasSameDocumentIds(session.documentIds, analysis.documentIds)) {
		return true;
	}

	return analyzedDocuments.some((document) => document.updatedAt > analysis.updatedAt);
}

function invalidatePrismSessionContext(sessionId: string | null | undefined) {
	if (!sessionId) {
		return;
	}
	prismSessionContextCache.delete(sessionId);
}

function markCollectionAnalysisStale(sessionId: string | null | undefined) {
	if (!sessionId) {
		return;
	}
	staleCollectionAnalysisSessions.add(sessionId);
}

function clearCollectionAnalysisStale(sessionId: string | null | undefined) {
	if (!sessionId) {
		return;
	}
	staleCollectionAnalysisSessions.delete(sessionId);
}

function defaultDocumentRoles(documentIds: string[]) {
	return Object.fromEntries(documentIds.map((documentId) => [documentId, ["unknown"] as DocumentRole[]]));
}

function defaultSessionRoles(documentIds: string[]) {
	return Object.fromEntries(documentIds.map((documentId) => [documentId, ["source-material"] as SessionRole[]]));
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

function serializePrismSessionContext(context: PrismSessionContext): PersistedPrismSessionContext {
	return {
		session: context.session,
		registeredDocuments: context.registeredDocuments.map((document) => ({
			documentId: document.documentId,
			sourceFileName: document.sourceFileName,
			sourceMimeType: document.sourceMimeType,
			createdAt: document.createdAt,
			canonicalDocument: document.canonicalDocument,
			azureExtract: document.azureExtract,
		})),
		analyzedDocuments: context.analyzedDocuments,
		collectionAnalysis: context.collectionAnalysis,
		sourceFileNames: context.sourceFileNames,
	};
}

function buildBasePrismSessionContext(baseContext: {
	session: DocumentSession;
	registeredDocuments: Array<PersistedPrismSessionContext["registeredDocuments"][number] | RegisteredDocument>;
	analyzedDocuments: AnalyzedDocument[];
	collectionAnalysis: DocumentCollectionAnalysis;
	sourceFileNames: Record<string, string>;
}): PrismSessionContext {
	return {
		session: baseContext.session,
		registeredDocuments: baseContext.registeredDocuments.map((document) => ({ ...document })),
		analyzedDocuments: baseContext.analyzedDocuments,
		collectionAnalysis: baseContext.collectionAnalysis,
		sourceFileNames: baseContext.sourceFileNames,
		groupedUnits: groupFragments(baseContext.analyzedDocuments.flatMap((document) => document.fragments)),
	};
}

function restorePrismSessionContext(snapshotContext: PersistedPrismSessionContext): PrismSessionContext {
	return buildBasePrismSessionContext(snapshotContext);
}

function toInstructionalUnitConcepts(concepts: Record<string, number>) {
	return Object.entries(concepts)
		.filter(([, weight]) => typeof weight === "number" && Number.isFinite(weight) && weight > 0)
		.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
		.map(([concept]) => concept);
}

function deriveInstructionalUnitTitle(unit: InstructionalUnit, concepts: string[]) {
	const learningTargetTitle = unit.learningTargets[0]?.trim();
	if (learningTargetTitle) {
		return learningTargetTitle;
	}
	if (concepts.length === 0) {
		return undefined;
	}
	return `Instructional Unit: ${concepts.slice(0, 2).join(", ")}`;
}

async function applyInstructionalUnitOverrides(context: PrismSessionContext): Promise<PrismSessionContext> {
	if (context.groupedUnits.length === 0) {
		return context;
	}

	const groupedUnits = await Promise.all(context.groupedUnits.map(async (unit) => {
		const override = await getProblemOverride(buildInstructionalUnitOverrideId(context.session.sessionId, unit.unitId));
		if (!override || !Object.prototype.hasOwnProperty.call(override, "concepts") || !override.concepts) {
			return unit;
		}

		const concepts = toInstructionalUnitConcepts(override.concepts);
		return {
			...unit,
			concepts,
			title: deriveInstructionalUnitTitle(unit, concepts),
		};
	}));

	return {
		...context,
		groupedUnits,
	};
}

function applyPrismSessionContextToRegistry(context: PrismSessionContext) {
	upsertDocumentSession({
		sessionId: context.session.sessionId,
		documentIds: context.session.documentIds,
		documentRoles: context.session.documentRoles,
		sessionRoles: context.session.sessionRoles,
		createdAt: context.session.createdAt,
	});

	for (const document of context.registeredDocuments) {
		const existing = getRegisteredDocument(document.documentId);
		saveRegisteredDocument({
			...existing,
			...document,
		});
	}

	for (const analyzedDocument of context.analyzedDocuments) {
		saveAnalyzedDocument(analyzedDocument);
	}

	saveCollectionAnalysis(context.collectionAnalysis);
	clearCollectionAnalysisStale(context.session.sessionId);
}

function fromSessionSnapshotRow(row: SessionSnapshotRow): PrismSessionSnapshot {
	return {
		sessionId: row.session_id,
		context: row.snapshot_json,
		createdAt: row.created_at,
	};
}

async function updateDocumentSessionIds(sessionId: string, documentIds: string[]) {
	if (!canUseSupabase() || documentIds.length === 0) {
		return;
	}

	const filterValue = `in.(${documentIds.join(",")})`;
	await Promise.all([
		supabaseRest(DOCUMENTS_TABLE, {
			method: "PATCH",
			filters: { document_id: filterValue },
			body: { session_id: sessionId },
			prefer: "return=minimal",
		}),
		supabaseRest(ANALYZED_DOCUMENTS_TABLE, {
			method: "PATCH",
			filters: { document_id: filterValue },
			body: { session_id: sessionId },
			prefer: "return=minimal",
		}),
	]);
}

export async function savePrismSessionSnapshot(sessionId: string, context: PrismSessionContext) {
	const snapshot: PrismSessionSnapshot = {
		sessionId,
		context: serializePrismSessionContext(context),
		createdAt: now(),
	};

	if (!canUseSupabase()) {
		prismSessionSnapshotStore.set(sessionId, snapshot);
		return snapshot;
	}

	if (!prismSessionSnapshotsSupported) {
		prismSessionSnapshotStore.set(sessionId, snapshot);
		return snapshot;
	}

	try {
		await supabaseRest(SESSION_SNAPSHOTS_TABLE, {
			method: "POST",
			body: {
				session_id: snapshot.sessionId,
				snapshot_json: snapshot.context,
				created_at: snapshot.createdAt,
			},
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	} catch (error) {
		disablePersistedSnapshots(error);
		prismSessionSnapshotStore.set(sessionId, snapshot);
	}

	return snapshot;
}

export async function loadPrismSessionSnapshot(sessionId: string): Promise<PrismSessionSnapshot | null> {
	if (!canUseSupabase()) {
		return prismSessionSnapshotStore.get(sessionId) ?? null;
	}

	if (!prismSessionSnapshotsSupported) {
		return prismSessionSnapshotStore.get(sessionId) ?? null;
	}

	try {
		const rows = await supabaseRest(SESSION_SNAPSHOTS_TABLE, {
			select: "session_id,snapshot_json,created_at",
			filters: { session_id: `eq.${sessionId}` },
		});
		const row = Array.isArray(rows) ? rows[0] as SessionSnapshotRow | undefined : undefined;
		return row ? fromSessionSnapshotRow(row) : null;
	} catch (error) {
		disablePersistedSnapshots(error);
		return prismSessionSnapshotStore.get(sessionId) ?? null;
	}
}

export async function invalidatePrismSessionSnapshot(sessionId: string | null | undefined) {
	if (!sessionId) {
		return;
	}
	prismSessionSnapshotStore.delete(sessionId);

	if (!canUseSupabase()) {
		return;
	}

	if (!prismSessionSnapshotsSupported) {
		return;
	}

	try {
		await supabaseRest(SESSION_SNAPSHOTS_TABLE, {
			method: "DELETE",
			filters: { session_id: `eq.${sessionId}` },
			prefer: "return=minimal",
		});
	} catch (error) {
		disablePersistedSnapshots(error);
	}
}

export async function registerDocumentsStore(entries: Array<{ sourceFileName: string; sourceMimeType: string; rawBinary?: Buffer; canonicalDocument?: RegisteredDocument["canonicalDocument"]; azureExtract?: RegisteredDocument["azureExtract"] }>, sessionId: string | null = null) {
	if (!canUseSupabase()) {
		const registered = registerDocuments(entries);
		markCollectionAnalysisStale(sessionId);
		invalidatePrismSessionContext(sessionId);
		await invalidatePrismSessionSnapshot(sessionId);
		return registered;
	}

	const createdAt = now();
	const registered: RegisteredDocument[] = entries.map((entry) => ({
		documentId: createId("doc"),
		sourceFileName: entry.sourceFileName,
		sourceMimeType: entry.sourceMimeType,
		createdAt,
		rawBinary: entry.rawBinary,
		canonicalDocument: entry.canonicalDocument,
		azureExtract: entry.azureExtract,
	}));

	await supabaseRest(DOCUMENTS_TABLE, {
		method: "POST",
		body: registered.map((document) => toDocumentRow(document, sessionId)),
		prefer: "resolution=merge-duplicates,return=minimal",
	});
	markCollectionAnalysisStale(sessionId);
	invalidatePrismSessionContext(sessionId);
	await invalidatePrismSessionSnapshot(sessionId);

	return registered;
}

export async function getDocumentSessionStore(sessionId: string) {
	if (!canUseSupabase()) {
		return getDocumentSession(sessionId);
	}

	const rows = await supabaseRest(SESSIONS_TABLE, {
		select: "session_id,document_ids,document_roles,session_roles,created_at,updated_at",
		filters: { session_id: `eq.${sessionId}` },
	});
	const row = Array.isArray(rows) ? rows[0] as SessionRow | undefined : undefined;
	return row ? fromSessionRow(row) : null;
}

export async function createDocumentSessionStore(documentIds: string[], sessionId = createId("session")) {
	if (!canUseSupabase()) {
		const created = upsertDocumentSession({
			sessionId,
			documentIds,
			documentRoles: defaultDocumentRoles(documentIds),
			sessionRoles: defaultSessionRoles(documentIds),
		});
		markCollectionAnalysisStale(sessionId);
		invalidatePrismSessionContext(sessionId);
		await invalidatePrismSessionSnapshot(sessionId);
		return created;
	}

	const session: DocumentSession = {
		sessionId,
		documentIds,
		documentRoles: defaultDocumentRoles(documentIds),
		sessionRoles: defaultSessionRoles(documentIds),
		createdAt: now(),
		updatedAt: now(),
	};

	await supabaseRest(SESSIONS_TABLE, {
		method: "POST",
		body: toSessionRow(session),
		prefer: "resolution=merge-duplicates,return=minimal",
	});
	await updateDocumentSessionIds(sessionId, documentIds);
	markCollectionAnalysisStale(sessionId);
	invalidatePrismSessionContext(sessionId);
	await invalidatePrismSessionSnapshot(sessionId);
	return session;
}

export async function ensureSessionDocumentsStore(sessionId: string, documentIds: string[]) {
	if (!canUseSupabase()) {
		const existing = getDocumentSession(sessionId);
		if (!existing) {
			const created = upsertDocumentSession({
				sessionId,
				documentIds,
				documentRoles: defaultDocumentRoles(documentIds),
				sessionRoles: defaultSessionRoles(documentIds),
			});
			markCollectionAnalysisStale(sessionId);
			invalidatePrismSessionContext(sessionId);
			await invalidatePrismSessionSnapshot(sessionId);
			return created;
		}

		let current = existing;
		for (const documentId of documentIds) {
			current = addDocumentToSession(sessionId, documentId) ?? current;
		}
		markCollectionAnalysisStale(sessionId);
		invalidatePrismSessionContext(sessionId);
		await invalidatePrismSessionSnapshot(sessionId);
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

	await supabaseRest(SESSIONS_TABLE, {
		method: "POST",
		body: toSessionRow(nextSession),
		prefer: "resolution=merge-duplicates,return=minimal",
	});
	await updateDocumentSessionIds(sessionId, documentIds);
	markCollectionAnalysisStale(sessionId);
	invalidatePrismSessionContext(sessionId);
	await invalidatePrismSessionSnapshot(sessionId);
	return nextSession;
}

export async function upsertDocumentSessionStore(session: Omit<DocumentSession, "createdAt" | "updatedAt"> & Partial<Pick<DocumentSession, "createdAt">>) {
	if (!canUseSupabase()) {
		const updated = upsertDocumentSession(session);
		markCollectionAnalysisStale(session.sessionId);
		invalidatePrismSessionContext(session.sessionId);
		await invalidatePrismSessionSnapshot(session.sessionId);
		return updated;
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

	await supabaseRest(SESSIONS_TABLE, {
		method: "POST",
		body: toSessionRow(nextSession),
		prefer: "resolution=merge-duplicates,return=minimal",
	});
	await updateDocumentSessionIds(nextSession.sessionId, nextSession.documentIds);
	markCollectionAnalysisStale(nextSession.sessionId);
	invalidatePrismSessionContext(nextSession.sessionId);
	await invalidatePrismSessionSnapshot(nextSession.sessionId);
	return nextSession;
}

async function loadRegisteredDocumentStore(documentId: string) {
	if (!canUseSupabase()) {
		return getRegisteredDocument(documentId);
	}

	const rows = await supabaseRest(DOCUMENTS_TABLE, {
		select: "document_id,session_id,source_file_name,source_mime_type,created_at,raw_binary_base64,canonical_document,azure_extract",
		filters: { document_id: `eq.${documentId}` },
	});
	const row = Array.isArray(rows) ? rows[0] as DocumentRow | undefined : undefined;
	return row ? fromDocumentRow(row) : null;
}

async function loadDocumentSessionIdStore(documentId: string) {
	if (!canUseSupabase()) {
		return null;
	}

	const rows = await supabaseRest(DOCUMENTS_TABLE, {
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

	const rows = await supabaseRest(DOCUMENTS_TABLE, {
		select: "document_id,session_id,source_file_name,source_mime_type,created_at,raw_binary_base64,canonical_document,azure_extract",
		filters: { session_id: `eq.${sessionId}`, order: "created_at.asc" },
	});
	return ((rows as DocumentRow[] | null) ?? []).map((row) => fromDocumentRow(row));
}

async function loadAnalyzedDocumentStore(documentId: string) {
	if (!canUseSupabase()) {
		const analyzed = getAnalyzedDocument(documentId);
		return analyzed ? withPreferredContentHash(analyzed) : null;
	}

	const rows = await supabaseRest(ANALYZED_DOCUMENTS_TABLE, {
		select: "document_id,session_id,analyzed_document,updated_at",
		filters: { document_id: `eq.${documentId}` },
	});
	const row = Array.isArray(rows) ? rows[0] as AnalyzedDocumentRow | undefined : undefined;
	return row?.analyzed_document ? withPreferredContentHash(row.analyzed_document) : null;
}

export async function loadPrismDocumentAnalysisTarget(documentId: string, sessionId?: string | null): Promise<PrismDocumentAnalysisTarget | null> {
	const resolvedSessionId = sessionId ?? await loadDocumentSessionIdStore(documentId);

	if (resolvedSessionId) {
		const context = await loadPrismSessionContextCached(resolvedSessionId);
		if (context) {
			const registeredDocument = context.registeredDocuments.find((document) => document.documentId === documentId) ?? null;
			if (registeredDocument) {
				const analyzedDocument = context.analyzedDocuments.find((document) => document.document.id === documentId) ?? null;
				return {
					sessionId: resolvedSessionId,
					registeredDocument,
					analyzedDocument,
				};
			}
		}

		const fallbackSessionId = await loadDocumentSessionIdStore(documentId);
		if (fallbackSessionId && fallbackSessionId !== resolvedSessionId) {
			const fallbackContext = await loadPrismSessionContextCached(fallbackSessionId);
			if (fallbackContext) {
				const registeredDocument = fallbackContext.registeredDocuments.find((document) => document.documentId === documentId) ?? null;
				if (registeredDocument) {
					const analyzedDocument = fallbackContext.analyzedDocuments.find((document) => document.document.id === documentId) ?? null;
					return {
						sessionId: fallbackSessionId,
						registeredDocument,
						analyzedDocument,
					};
				}
			}
		}
	}

	const registeredDocument = await loadRegisteredDocumentStore(documentId);
	if (!registeredDocument) {
		return null;
	}

	return {
		sessionId: null,
		registeredDocument,
		analyzedDocument: await loadAnalyzedDocumentStore(documentId),
	};
}

export async function getAnalyzedDocumentsForSessionStore(sessionId: string) {
	if (!canUseSupabase()) {
		return getAnalyzedDocumentsForSession(sessionId).map((document) => withPreferredContentHash(document));
	}

	const rows = await supabaseRest(ANALYZED_DOCUMENTS_TABLE, {
		select: "document_id,session_id,analyzed_document,updated_at",
		filters: { session_id: `eq.${sessionId}`, order: "updated_at.asc" },
	});
	return ((rows as AnalyzedDocumentRow[] | null) ?? []).map((row) => withPreferredContentHash(row.analyzed_document));
}

export async function saveAnalyzedDocumentStore(
	analyzedDocument: AnalyzedDocument,
	sessionId: string | null,
	options: { invalidateSessionCache?: boolean; invalidateSnapshot?: boolean } = {},
) {
	const invalidateSessionCache = options.invalidateSessionCache ?? true;
	const invalidateSnapshot = options.invalidateSnapshot ?? true;
	const normalized = withPreferredContentHash(analyzedDocument);

	if (!canUseSupabase()) {
		const saved = saveAnalyzedDocument(normalized);
		markCollectionAnalysisStale(sessionId);
		if (invalidateSessionCache) {
			invalidatePrismSessionContext(sessionId);
		}
		if (invalidateSnapshot) {
			await invalidatePrismSessionSnapshot(sessionId);
		}
		return saved;
	}

	await supabaseRest(ANALYZED_DOCUMENTS_TABLE, {
		method: "POST",
		body: {
			document_id: normalized.document.id,
			session_id: sessionId,
			analyzed_document: normalized,
			updated_at: normalized.updatedAt,
		},
		prefer: "resolution=merge-duplicates,return=minimal",
	});

	await supabaseRest(DOCUMENTS_TABLE, {
		method: "PATCH",
		filters: { document_id: `eq.${normalized.document.id}` },
		body: { canonical_document: normalized.document },
		prefer: "return=minimal",
	});
	markCollectionAnalysisStale(sessionId);
	if (invalidateSessionCache) {
		invalidatePrismSessionContext(sessionId);
	}
	if (invalidateSnapshot) {
		await invalidatePrismSessionSnapshot(sessionId);
	}

	return normalized;
}

export async function saveCollectionAnalysisStore(
	analysis: DocumentCollectionAnalysis,
	options: { invalidateSessionCache?: boolean; invalidateSnapshot?: boolean } = {},
) {
	const invalidateSessionCache = options.invalidateSessionCache ?? true;
	const invalidateSnapshot = options.invalidateSnapshot ?? true;

	if (!canUseSupabase()) {
		const saved = saveCollectionAnalysis(analysis);
		clearCollectionAnalysisStale(analysis.sessionId);
		if (invalidateSessionCache) {
			invalidatePrismSessionContext(analysis.sessionId);
		}
		if (invalidateSnapshot) {
			await invalidatePrismSessionSnapshot(analysis.sessionId);
		}
		return saved;
	}

	await supabaseRest(COLLECTION_ANALYSES_TABLE, {
		method: "POST",
		body: {
			session_id: analysis.sessionId,
			analysis,
			updated_at: analysis.updatedAt,
		},
		prefer: "resolution=merge-duplicates,return=minimal",
	});
	clearCollectionAnalysisStale(analysis.sessionId);
	if (invalidateSessionCache) {
		invalidatePrismSessionContext(analysis.sessionId);
	}
	if (invalidateSnapshot) {
		await invalidatePrismSessionSnapshot(analysis.sessionId);
	}

	return analysis;
}

export async function getCollectionAnalysisStore(sessionId: string) {
	if (!canUseSupabase()) {
		return null;
	}

	const rows = await supabaseRest(COLLECTION_ANALYSES_TABLE, {
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

	await supabaseRest(INTENT_PRODUCTS_TABLE, {
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

	const rows = await supabaseRest(INTENT_PRODUCTS_TABLE, {
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

	const rows = await supabaseRest(INTENT_PRODUCTS_TABLE, {
		select: "product_id,session_id,intent_type,document_ids,product_type,schema_version,payload,created_at",
		filters: { session_id: `eq.${sessionId}`, order: "created_at.desc" },
	});
	return ((rows as IntentProductRow[] | null) ?? []).map((row) => fromIntentProductRow(row));
}

async function loadBasePrismSessionContext(sessionId: string): Promise<PrismSessionContext | null> {
	const start = Date.now();
	const session = await getDocumentSessionStore(sessionId);
	if (!session) {
		return null;
	}

	const [registeredDocuments, storedAnalyzedDocuments, storedCollectionAnalysis] = await Promise.all([
		getSessionDocumentsStore(sessionId),
		getAnalyzedDocumentsForSessionStore(sessionId),
		getCollectionAnalysisStore(sessionId),
	]);

	upsertDocumentSession({
		sessionId: session.sessionId,
		documentIds: session.documentIds,
		documentRoles: session.documentRoles,
		sessionRoles: session.sessionRoles,
		createdAt: session.createdAt,
	});

	for (const document of registeredDocuments) {
		saveRegisteredDocument(document);
	}

	for (const analyzedDocument of storedAnalyzedDocuments) {
		saveAnalyzedDocument(analyzedDocument);
	}

	const analyzedDocumentsById = new Map(storedAnalyzedDocuments.map((analyzedDocument) => [analyzedDocument.document.id, analyzedDocument]));
	const missingDocuments = registeredDocuments.filter((document) => !analyzedDocumentsById.has(document.documentId));

	const analyzedDocuments = [...storedAnalyzedDocuments];
	if (missingDocuments.length > 0) {
		const generatedAnalyses = await Promise.all(missingDocuments.map(async (document) => {
			const analyzedDocument = await analyzeRegisteredDocument({
				documentId: document.documentId,
				sourceFileName: document.sourceFileName,
				sourceMimeType: document.sourceMimeType,
				rawBinary: document.rawBinary,
				azureExtract: document.azureExtract,
				canonicalDocument: document.canonicalDocument,
			});
			const saved = saveAnalyzedDocument(analyzedDocument);
			await saveAnalyzedDocumentStore(saved, sessionId, { invalidateSessionCache: false, invalidateSnapshot: false });
			return saved;
		}));
		analyzedDocuments.push(...generatedAnalyses);
	}

	const existingCollectionAnalysis = storedCollectionAnalysis ?? getCollectionAnalysis(sessionId);
	let collectionAnalysis = shouldRebuildCollectionAnalysis(session, analyzedDocuments, existingCollectionAnalysis)
		? buildDocumentCollectionAnalysis(sessionId) ?? buildDefaultCollectionAnalysis(sessionId)
		: existingCollectionAnalysis;

	if (!collectionAnalysis) {
		throw new Error(`Collection analysis could not be built for session ${sessionId}`);
	}

	if (!existingCollectionAnalysis || existingCollectionAnalysis.updatedAt !== collectionAnalysis.updatedAt) {
		collectionAnalysis = await saveCollectionAnalysisStore(collectionAnalysis, { invalidateSessionCache: false, invalidateSnapshot: false });
	} else {
		clearCollectionAnalysisStale(sessionId);
	}

	const sourceFileNames = Object.fromEntries(registeredDocuments.map((document) => [document.documentId, document.sourceFileName]));

	console.log("loadPrismSessionContext", {
		sessionId,
		duration: Date.now() - start,
		docCount: registeredDocuments.length,
		analyzedCount: analyzedDocuments.length,
		conceptCount: Object.keys(collectionAnalysis.conceptToDocumentMap).length,
	});

	return buildBasePrismSessionContext({
		session,
		registeredDocuments,
		analyzedDocuments,
		collectionAnalysis,
		sourceFileNames,
	});
}

export async function loadPrismSessionContext(sessionId: string): Promise<PrismSessionContext | null> {
	const context = await loadBasePrismSessionContext(sessionId);
	if (!context) {
		return null;
	}
	return applyInstructionalUnitOverrides(context);
}

export function loadPrismSessionContextCached(sessionId: string): Promise<PrismSessionContext | null> {
	if (!prismSessionContextCache.has(sessionId)) {
		prismSessionContextCache.set(sessionId, (async () => {
			const snapshot = await loadPrismSessionSnapshot(sessionId);
			if (snapshot) {
				const context = restorePrismSessionContext(snapshot.context);
				applyPrismSessionContextToRegistry(context);
				return context;
			}

			const context = await loadBasePrismSessionContext(sessionId);
			if (context) {
				await savePrismSessionSnapshot(sessionId, context);
			}
			return context;
		})());
	}

	return prismSessionContextCache.get(sessionId)!.then((context) => {
		if (!context) {
			return null;
		}
		return applyInstructionalUnitOverrides(context);
	});
}

export function resetPrismSessionContextCache() {
	prismSessionContextCache.clear();
	staleCollectionAnalysisSessions.clear();
}

export function resetPrismSessionSnapshotStore() {
	prismSessionSnapshotStore.clear();
	prismSessionSnapshotsSupported = true;
}

