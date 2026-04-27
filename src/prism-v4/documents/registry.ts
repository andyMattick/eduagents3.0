import type { DocumentSession } from "../schema/domain";
import type { BuiltIntentType, IntentPayloadByType, IntentProduct, IntentRequest } from "../schema/integration";
import type { AnalyzedDocument, CanonicalDocument, DocumentCollectionAnalysis } from "../schema/semantic";
import { withPreferredContentHash } from "./contentHash";

export interface RegisteredDocument {
	documentId: string;
	sourceFileName: string;
	sourceMimeType: string;
	createdAt: string;
	rawBinary?: Buffer;
	canonicalDocument?: CanonicalDocument;
	azureExtract?: {
		fileName: string;
		content: string;
		pages: { pageNumber: number; text: string }[];
		paragraphs?: { text: string; pageNumber: number; role?: string }[];
		tables?: {
			rowCount: number;
			columnCount: number;
			pageNumber?: number;
			cells: {
				rowIndex: number;
				columnIndex: number;
				text: string;
			}[];
		}[];
		readingOrder?: string[];
	};
}

const documents = new Map<string, RegisteredDocument>();
const analyzedDocuments = new Map<string, AnalyzedDocument>();
const sessions = new Map<string, DocumentSession>();
const collectionAnalyses = new Map<string, DocumentCollectionAnalysis>();
const intentProducts = new Map<string, IntentProduct>();

function createId(prefix: string) {
	if (typeof globalThis.crypto?.randomUUID === "function") {
		return `${prefix}-${globalThis.crypto.randomUUID()}`;
	}

	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function now() {
	return new Date().toISOString();
}

export function registerDocuments(entries: Array<{ sourceFileName: string; sourceMimeType: string; rawBinary?: Buffer; canonicalDocument?: CanonicalDocument; azureExtract?: RegisteredDocument["azureExtract"] }>) {
	const createdAt = now();
	const registered = entries.map((entry) => {
		const documentId = createId("doc");
		const record: RegisteredDocument = {
			documentId,
			sourceFileName: entry.sourceFileName,
			sourceMimeType: entry.sourceMimeType,
			createdAt,
			rawBinary: entry.rawBinary,
			canonicalDocument: entry.canonicalDocument,
			azureExtract: entry.azureExtract,
		};
		documents.set(documentId, record);
		return record;
	});

	return registered;
}

export function saveRegisteredDocument(record: RegisteredDocument) {
	documents.set(record.documentId, record);
	return record;
}

export function getRegisteredDocument(documentId: string) {
	return documents.get(documentId) ?? null;
}

export function saveAnalyzedDocument(analyzedDocument: AnalyzedDocument) {
	const normalized = withPreferredContentHash(analyzedDocument);
	analyzedDocuments.set(normalized.document.id, normalized);
	const existing = documents.get(analyzedDocument.document.id);
	if (existing) {
		documents.set(normalized.document.id, {
			...existing,
			canonicalDocument: normalized.document,
		});
	}
	return normalized;
}

export function getAnalyzedDocument(documentId: string) {
	return analyzedDocuments.get(documentId) ?? null;
}

export function getAnalyzedDocumentsForSession(sessionId: string) {
	const session = getDocumentSession(sessionId);
	if (!session) {
		return [];
	}

	return session.documentIds
		.map((documentId) => getAnalyzedDocument(documentId))
		.filter((document): document is NonNullable<ReturnType<typeof getAnalyzedDocument>> => Boolean(document));
}

export function upsertDocumentSession(session: Omit<DocumentSession, "createdAt" | "updatedAt"> & Partial<Pick<DocumentSession, "createdAt">>) {
	const existing = sessions.get(session.sessionId);
	const next: DocumentSession = {
		...session,
		createdAt: existing?.createdAt ?? session.createdAt ?? now(),
		updatedAt: now(),
	};
	sessions.set(next.sessionId, next);
	return next;
}

export function createDocumentSession(documentIds: string[]) {
	return upsertDocumentSession({
		sessionId: createId("session"),
		documentIds,
		documentRoles: Object.fromEntries(documentIds.map((documentId) => [documentId, ["unknown"]])),
		sessionRoles: Object.fromEntries(documentIds.map((documentId) => [documentId, ["source-material"]])),
	});
}

export function getDocumentSession(sessionId: string) {
	return sessions.get(sessionId) ?? null;
}

export function addDocumentToSession(sessionId: string, documentId: string) {
	const session = getDocumentSession(sessionId);
	if (!session) {
		return null;
	}

	if (session.documentIds.includes(documentId)) {
		return session;
	}

	return upsertDocumentSession({
		...session,
		documentIds: [...session.documentIds, documentId],
		documentRoles: {
			...session.documentRoles,
			[documentId]: session.documentRoles[documentId] ?? ["unknown"],
		},
		sessionRoles: {
			...session.sessionRoles,
			[documentId]: session.sessionRoles[documentId] ?? ["source-material"],
		},
		createdAt: session.createdAt,
	});
}

export function setDocumentRoles(sessionId: string, documentId: string, roles: DocumentSession["documentRoles"][string]) {
	const session = getDocumentSession(sessionId);
	if (!session || !session.documentIds.includes(documentId)) {
		return null;
	}

	return upsertDocumentSession({
		...session,
		documentRoles: {
			...session.documentRoles,
			[documentId]: roles.length > 0 ? roles : ["unknown"],
		},
		createdAt: session.createdAt,
	});
}

export function getSessionDocuments(sessionId: string) {
	const session = getDocumentSession(sessionId);
	if (!session) {
		return [];
	}

	return session.documentIds
		.map((documentId) => getRegisteredDocument(documentId))
		.filter((document): document is RegisteredDocument => Boolean(document));
}

export function saveCollectionAnalysis(analysis: DocumentCollectionAnalysis) {
	collectionAnalyses.set(analysis.sessionId, analysis);
	return analysis;
}

export function getCollectionAnalysis(sessionId: string) {
	return collectionAnalyses.get(sessionId) ?? null;
}

export function buildDefaultCollectionAnalysis(sessionId: string): DocumentCollectionAnalysis | null {
	const session = getDocumentSession(sessionId);
	if (!session) {
		return null;
	}

	const analysis: DocumentCollectionAnalysis = {
		sessionId,
		documentIds: session.documentIds,
		conceptOverlap: {},
		conceptGaps: [],
		difficultyProgression: {},
		representationProgression: {},
		redundancy: Object.fromEntries(session.documentIds.map((documentId) => [documentId, []])),
		coverageSummary: {
			totalConcepts: 0,
			docsPerConcept: {},
			perDocument: Object.fromEntries(session.documentIds.map((documentId) => [documentId, {
				documentId,
				conceptCount: 0,
				problemCount: 0,
				instructionalDensity: 0,
				representations: [],
				dominantDifficulty: "low",
			}])),
		},
		documentSimilarity: [],
		conceptToDocumentMap: {},
		updatedAt: now(),
	};

	return saveCollectionAnalysis(analysis);
}

export function saveIntentProduct<T extends BuiltIntentType>(request: IntentRequest & { intentType: T }, payload: IntentPayloadByType[T], schemaVersion = "wave3-v1") {
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
	intentProducts.set(product.productId, product);
	return product;
}

export function getIntentProduct(productId: string) {
	return intentProducts.get(productId) ?? null;
}

export function listIntentProductsForSession(sessionId: string) {
	return [...intentProducts.values()].filter((product) => product.sessionId === sessionId);
}

export function resetDocumentRegistryState() {
	documents.clear();
	analyzedDocuments.clear();
	sessions.clear();
	collectionAnalyses.clear();
	intentProducts.clear();
}
