import type { DocumentSession } from "../schema/domain";
import type { BuiltIntentType, IntentPayloadByType, IntentProduct, IntentRequest } from "../schema/integration";
import type { AnalyzedDocument, CanonicalDocument, DocumentCollectionAnalysis } from "../schema/semantic";

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
	analyzedDocuments.set(analyzedDocument.document.id, analyzedDocument);
	const existing = documents.get(analyzedDocument.document.id);
	if (existing) {
		documents.set(analyzedDocument.document.id, {
			...existing,
			canonicalDocument: analyzedDocument.document,
		});
	}
	return analyzedDocument;
}

export function getAnalyzedDocument(documentId: string) {
	return analyzedDocuments.get(documentId) ?? null;
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
		},
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
