import { supabaseRest } from "../../../lib/supabase";
import { analyzeRegisteredDocument, buildDocumentCollectionAnalysis, groupFragments } from "./analysis";
import { canonicalDocumentToAzureExtract } from "./analysis/canonicalize";
import { withPreferredContentHash } from "./contentHash";
import { buildInstructionalUnitOverrideId, getProblemOverride } from "../teacherFeedback";
import { segmentParentBlockWithLLM } from "../segmentation/llmSegmentation";
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
import type { DocumentResourceLink, DocumentSession, DocumentRole, SessionRole } from "../schema/domain";
import type { BuiltIntentType, IntentPayloadByType, IntentProduct, IntentRequest } from "../schema/integration";
import type { AnalyzedDocument, DocumentCollectionAnalysis, InstructionalUnit } from "../schema/semantic";
import type { CanonicalDocument, CanonicalItem } from "../schema/semantic";
import type {
	BlueprintArtifact,
	BlueprintArtifactStatus,
	BlueprintVersionArtifact,
	BlueprintVersionEditorContext,
	BlueprintVersionLineage,
	TeacherStudioOutputArtifact,
	TeacherStudioOutputStatus,
	TeacherStudioSessionEnvelope,
	TeacherStudioTarget,
	TeacherStudioOutputType,
} from "../studio/artifacts";

const SESSIONS_TABLE = "prism_v4_sessions";
const DOCUMENTS_TABLE = "prism_v4_documents";
const ANALYZED_DOCUMENTS_TABLE = "prism_v4_analyzed_documents";
const COLLECTION_ANALYSES_TABLE = "prism_v4_collection_analyses";
const SESSION_SNAPSHOTS_TABLE = "prism_v4_session_snapshots";
const INTENT_PRODUCTS_TABLE = "prism_v4_intent_products";
const BLUEPRINTS_TABLE = "prism_v4_blueprints";
const BLUEPRINT_VERSIONS_TABLE = "prism_v4_blueprint_versions";
const STUDIO_OUTPUTS_TABLE = "prism_v4_outputs";
const DOCUMENT_RESOURCE_LINKS_TABLE = "v4_document_resource_links";

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
const studioSessionEnvelopeExtrasStore = new Map<string, {
	activeBlueprintId?: string;
	activeTarget?: TeacherStudioTarget;
	outputIds: string[];
	studioStateVersion: number;
}>();
const studioBlueprintStore = new Map<string, BlueprintArtifact>();
const studioBlueprintVersionsStore = new Map<string, Map<number, BlueprintVersionArtifact>>();
const studioOutputsStore = new Map<string, TeacherStudioOutputArtifact>();
let prismSessionSnapshotsSupported = true;
let studioSessionColumnsSupported = true;
let studioBlueprintsSupported = true;
let studioBlueprintVersionsSupported = true;
let studioOutputsSupported = true;

const BLOOMS_KEYWORDS = {
	create: ["create", "design", "construct", "develop", "formulate", "compose", "invent", "generate", "produce", "plan", "build", "propose"],
	evaluate: ["evaluate", "justify", "critique", "argue", "assess", "defend", "support", "judge", "recommend", "prioritize", "verify", "validate", "debate"],
	analyze: ["analyze", "differentiate", "categorize", "examine", "investigate", "organize", "structure", "attribute", "diagram", "map", "inspect", "compare", "contrast"],
	apply: ["apply", "use", "solve", "compute", "calculate", "demonstrate", "perform", "execute", "implement", "operate", "model", "show", "carry out", "find"],
	understand: ["explain", "summarize", "describe", "interpret", "classify", "paraphrase", "outline", "discuss", "report", "restate", "illustrate", "state", "name"],
	remember: ["identify", "list", "define", "recall", "label", "match", "select", "recognize", "repeat", "choose", "underline", "point", "circle", "highlight"],
} as const;

function inferBloom(text: string): { level: number; label: string } {
	const lower = text.toLowerCase();
	const hit = (keywords: readonly string[]) => keywords.some((keyword) => lower.includes(keyword));

	if (hit(BLOOMS_KEYWORDS.create)) return { level: 6, label: "Create" };
	if (hit(BLOOMS_KEYWORDS.evaluate)) return { level: 5, label: "Evaluate" };
	if (hit(BLOOMS_KEYWORDS.analyze)) return { level: 4, label: "Analyze" };
	if (hit(BLOOMS_KEYWORDS.apply)) return { level: 3, label: "Apply" };
	if (hit(BLOOMS_KEYWORDS.understand)) return { level: 2, label: "Understand" };
	if (hit(BLOOMS_KEYWORDS.remember)) return { level: 1, label: "Remember" };
	return { level: 2, label: "Understand" };
}


async function buildCanonicalItems(document: CanonicalDocument): Promise<CanonicalItem[]> {
	const paragraphs = [...document.nodes]
		.filter((n) => n.nodeType === "paragraph")
		.sort((a, b) => a.orderIndex - b.orderIndex);

	if (paragraphs.length === 0) {
		return [];
	}

	// Group paragraph nodes into numbered parent blocks
	type ParentBlock = { idGuess: string; lines: string[] };
	const blocks: ParentBlock[] = [];
	let current: ParentBlock | null = null;

	for (const p of paragraphs) {
		const text = (p.normalizedText ?? p.text ?? "").trim();
		if (!text) continue;
		const m = text.match(/^([0-9]+)\./);
		if (m) {
			if (current) blocks.push(current);
			current = { idGuess: m[1], lines: [text] };
		} else if (current) {
			current.lines.push(text);
		}
	}
	if (current) blocks.push(current);

	if (blocks.length === 0) {
		return [];
	}

	const items: CanonicalItem[] = [];

	for (let index = 0; index < blocks.length; index++) {
		const block = blocks[index];
		const blockText = block.lines.join("\n");

		console.log(`[buildCanonicalItems] block ${index + 1}/${blocks.length} — sending to OpenAI:\n"""\n${blockText}\n"""`);

		const segmented = await segmentParentBlockWithLLM(blockText);
		console.log(`[buildCanonicalItems] block ${index + 1} — OpenAI response:`, JSON.stringify(segmented));

		const numericId = block.idGuess || String(index + 1);
		const itemId = `item-${numericId}`;

		const subItems = segmented.subItems.map((sub) => {
			const subBloom = inferBloom(sub.text);
			return {
				id: `${itemId}${sub.letter}`,
				label: `${sub.letter})`,
				text: sub.text,
				bloomLevel: subBloom.level,
				bloomLabel: subBloom.label,
				subSubParts: [] as { label: string; text: string }[],
			};
		});

		const itemBloom = inferBloom([segmented.parent, ...subItems.map((sub) => sub.text)].join(" "));
		const canonicalItem: CanonicalItem = {
			id: itemId,
			label: `${numericId}.`,
			stem: segmented.parent,
			bloomLevel: itemBloom.level,
			bloomLabel: itemBloom.label,
			subItems,
		};
		console.log(`[buildCanonicalItems] block ${index + 1} — final CanonicalItem:`, JSON.stringify(canonicalItem));
		items.push(canonicalItem);
	}

	return items;
}

type SessionRow = {
	session_id: string;
	document_ids: string[];
	document_roles: Record<string, DocumentRole[]>;
	session_roles: Record<string, SessionRole[]>;
	active_blueprint_id?: string | null;
	active_target?: TeacherStudioTarget | null;
	output_ids?: string[] | null;
	studio_state_version?: number | null;
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
	/** UUID of the authenticated teacher who created the document. */
	owner_id: string | null;
	/** Whether the document is publicly visible to all teachers. */
	is_public: boolean;
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

type DocumentResourceLinkRow = {
	session_id: string;
	document_id: string;
	resource_document_id: string;
	resource_type: DocumentResourceLink["resourceType"];
	content_text?: string | null;
	created_at?: string;
	updated_at?: string;
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

type BlueprintRow = {
	blueprint_id: string;
	session_id: string;
	analysis_session_id: string;
	teacher_id: string | null;
	unit_id: string | null;
	active_version: number;
	status: BlueprintArtifactStatus;
	created_at: string;
	updated_at: string;
};

type BlueprintVersionRow = {
	blueprint_id: string;
	version: number;
	analysis_snapshot: BlueprintVersionArtifact["analysisSnapshot"] | null;
	blueprint_json: BlueprintVersionArtifact["blueprint"];
	editor_context: BlueprintVersionEditorContext | null;
	lineage: BlueprintVersionLineage | null;
	created_at: string;
};

type StudioOutputRow = {
	output_id: string;
	session_id: string;
	blueprint_id: string;
	blueprint_version: number;
	output_type: TeacherStudioOutputType;
	target_type: TeacherStudioOutputArtifact["targetType"] | null;
	target_id: string | null;
	teacher_id: string | null;
	unit_id: string | null;
	options: Record<string, unknown>;
	payload: TeacherStudioOutputArtifact["payload"];
	render_model: TeacherStudioOutputArtifact["renderModel"];
	status: TeacherStudioOutputStatus;
	created_at: string;
	updated_at: string;
};

function canUseSupabase() {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		return false;
	}

	// Ignore placeholder env values like "your_supabase_url_here".
	if (!/^https?:\/\//i.test(url)) {
		return false;
	}

	return typeof window === "undefined";
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
		console.warn(`[registryStore] ${SESSION_SNAPSHOTS_TABLE} missing in Supabase schema cache; falling back to in-memory snapshots. Run supabase/prism_v4_session_snapshots_migration.sql and reload PostgREST schema cache.`);
	}
	prismSessionSnapshotsSupported = false;
}

function isMissingStudioSchemaError(error: unknown, token: string) {
	const message = String(error instanceof Error ? error.message : error).toLowerCase();
	return message.includes("pgrst205")
		|| message.includes("42703")
		|| message.includes("42p01")
		|| (message.includes("schema cache") && message.includes(token.toLowerCase()))
		|| message.includes(`could not find the table 'public.${token.toLowerCase()}'`)
		|| message.includes(token.toLowerCase());
}

function disableStudioSessionColumns(error: unknown) {
	if (!isMissingStudioSchemaError(error, "active_blueprint_id") && !isMissingStudioSchemaError(error, SESSIONS_TABLE)) {
		throw error;
	}
	if (studioSessionColumnsSupported) {
		console.warn(`[registryStore] Studio session columns missing in Supabase schema cache; falling back to base session envelope.`);
	}
	studioSessionColumnsSupported = false;
}

function disableStudioBlueprints(error: unknown) {
	if (!isMissingStudioSchemaError(error, BLUEPRINTS_TABLE)) {
		throw error;
	}
	if (studioBlueprintsSupported) {
		console.warn(`[registryStore] ${BLUEPRINTS_TABLE} missing in Supabase schema cache; falling back to in-memory Studio blueprints.`);
	}
	studioBlueprintsSupported = false;
	studioBlueprintVersionsSupported = false;
}

function disableStudioBlueprintVersions(error: unknown) {
	if (!isMissingStudioSchemaError(error, BLUEPRINT_VERSIONS_TABLE)) {
		throw error;
	}
	if (studioBlueprintVersionsSupported) {
		console.warn(`[registryStore] ${BLUEPRINT_VERSIONS_TABLE} missing in Supabase schema cache; falling back to in-memory Studio blueprint versions.`);
	}
	studioBlueprintVersionsSupported = false;
}

function disableStudioOutputs(error: unknown) {
	if (!isMissingStudioSchemaError(error, STUDIO_OUTPUTS_TABLE)) {
		throw error;
	}
	if (studioOutputsSupported) {
		console.warn(`[registryStore] ${STUDIO_OUTPUTS_TABLE} missing in Supabase schema cache; falling back to in-memory Studio outputs.`);
	}
	studioOutputsSupported = false;
}

function canUseStudioSessionColumns() {
	return canUseSupabase() && studioSessionColumnsSupported;
}

function canUseStudioBlueprints() {
	return canUseSupabase() && studioBlueprintsSupported;
}

function canUseStudioBlueprintVersions() {
	return canUseSupabase() && studioBlueprintVersionsSupported;
}

function canUseStudioOutputs() {
	return canUseSupabase() && studioOutputsSupported;
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

function buildDefaultStudioSessionEnvelope(session: DocumentSession): TeacherStudioSessionEnvelope {
	const extras = studioSessionEnvelopeExtrasStore.get(session.sessionId);
	return {
		sessionId: session.sessionId,
		documentIds: session.documentIds,
		activeBlueprintId: extras?.activeBlueprintId,
		activeTarget: extras?.activeTarget,
		outputIds: extras?.outputIds ?? [],
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
		studioStateVersion: extras?.studioStateVersion ?? 1,
	};
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
		resourceLinks: [],
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function normalizeResourceLinks(resourceLinks: DocumentSession["resourceLinks"] | undefined): DocumentResourceLink[] {
	if (!Array.isArray(resourceLinks)) {
		return [];
	}

	const seen = new Set<string>();
	const normalized: DocumentResourceLink[] = [];
	for (const link of resourceLinks) {
		if (!link?.documentId || !link?.resourceDocumentId || !link?.resourceType) {
			continue;
		}

		const key = `${link.documentId}:${link.resourceDocumentId}:${link.resourceType}`;
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		normalized.push({
			documentId: link.documentId,
			resourceDocumentId: link.resourceDocumentId,
			resourceType: link.resourceType,
			contentText: typeof link.contentText === "string" ? link.contentText : undefined,
		});
	}

	return normalized;
}

function toDocumentResourceLinkRows(sessionId: string, resourceLinks: DocumentResourceLink[]): DocumentResourceLinkRow[] {
	return resourceLinks.map((link) => ({
		session_id: sessionId,
		document_id: link.documentId,
		resource_document_id: link.resourceDocumentId,
		resource_type: link.resourceType,
		content_text: link.contentText ?? null,
	}));
}

function fromDocumentResourceLinkRow(row: DocumentResourceLinkRow): DocumentResourceLink {
	return {
		documentId: row.document_id,
		resourceDocumentId: row.resource_document_id,
		resourceType: row.resource_type,
		contentText: typeof row.content_text === "string" ? row.content_text : undefined,
	};
}

function flattenAzureTables(azureExtract: DocumentRow["azure_extract"] | undefined | null): string {
	const tables = azureExtract?.tables;
	if (!Array.isArray(tables) || tables.length === 0) {
		return "";
	}

	const sections: string[] = [];
	for (const table of tables) {
		const cells = Array.isArray(table?.cells) ? table.cells : [];
		if (cells.length === 0) {
			continue;
		}

		const rowIndexes = Array.from(new Set(cells
			.map((cell) => (typeof cell?.rowIndex === "number" ? cell.rowIndex : -1))
			.filter((index) => index >= 0)))
			.sort((a, b) => a - b);

		if (rowIndexes.length === 0) {
			continue;
		}

		const lines: string[] = [];
		for (const rowIndex of rowIndexes) {
			const rowCells = cells
				.filter((cell) => cell?.rowIndex === rowIndex)
				.sort((left, right) => (left?.columnIndex ?? 0) - (right?.columnIndex ?? 0));
			const rowText = rowCells
				.map((cell) => (typeof cell?.content === "string" ? cell.content : ""))
				.map((value) => value.trim())
				.filter((value) => value.length > 0)
				.join(" | ");
			if (rowText.length > 0) {
				lines.push(rowText);
			}
		}

		if (lines.length > 0) {
			sections.push(lines.join("\n"));
		}
	}

	return sections.join("\n\n");
}

function normalizeResourceDocumentText(rawText: string): string {
	if (rawText.trim().length === 0) {
		return "";
	}

	const normalized = rawText
		.replace(/\r\n?/g, "\n")
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\u00a0/g, " ");

	const lines = normalized.split("\n");
	const cleaned: string[] = [];
	let previousWasBlank = true;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.length === 0) {
			if (!previousWasBlank) {
				cleaned.push("");
			}
			previousWasBlank = true;
			continue;
		}

		const letters = (trimmed.match(/[A-Za-z]/g) ?? []).length;
		const symbols = (trimmed.match(/[^A-Za-z0-9\s]/g) ?? []).length;
		if (letters === 0 && symbols > 6) {
			continue;
		}
		if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(trimmed)) {
			continue;
		}

		cleaned.push(trimmed);
		previousWasBlank = false;
	}

	const compacted = cleaned.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.replace(/[ \t]{2,}/g, " ")
		.trim();

	return compacted;
}

function extractResourceDocumentText(document: Pick<DocumentRow, "canonical_document" | "azure_extract">): string {
	const nodes = document.canonical_document?.nodes;
	if (Array.isArray(nodes) && nodes.length > 0) {
		const text = nodes
			.map((node) => node?.normalizedText ?? node?.text ?? "")
			.filter(Boolean)
			.join("\n");
		if (text.trim().length > 0) {
			return normalizeResourceDocumentText(text);
		}
	}

	const azureSections: string[] = [];
	if (typeof document.azure_extract?.content === "string" && document.azure_extract.content.trim().length > 0) {
		azureSections.push(document.azure_extract.content);
	}

	const paragraphs = document.azure_extract?.paragraphs;
	if (Array.isArray(paragraphs) && paragraphs.length > 0) {
		const paragraphText = paragraphs.map((paragraph) => paragraph?.text ?? "").filter(Boolean).join("\n\n");
		if (paragraphText.trim().length > 0) {
			azureSections.push(paragraphText);
		}
	}

	const pages = document.azure_extract?.pages;
	if (Array.isArray(pages) && pages.length > 0) {
		const pageText = pages.map((page) => page?.text ?? "").filter(Boolean).join("\n\n");
		if (pageText.trim().length > 0) {
			azureSections.push(pageText);
		}
	}

	const tableText = flattenAzureTables(document.azure_extract);
	if (tableText.trim().length > 0) {
		azureSections.push(tableText);
	}

	if (azureSections.length > 0) {
		return normalizeResourceDocumentText(azureSections.join("\n\n"));
	}

	return "";
}

async function withResourceContentText(resourceLinks: DocumentResourceLink[]): Promise<DocumentResourceLink[]> {
	const resourceIds = Array.from(new Set(resourceLinks
		.map((link) => link.resourceDocumentId)
		.filter((id) => typeof id === "string" && id.trim().length > 0)));

	if (resourceIds.length === 0) {
		return resourceLinks;
	}

	const escapedIds = resourceIds.map((id) => `"${id}"`).join(",");
	const documents = await supabaseRest(DOCUMENTS_TABLE, {
		select: "document_id,canonical_document,azure_extract",
		filters: {
			document_id: `in.(${escapedIds})`,
		},
	}) as DocumentRow[];

	const contentByDocumentId = new Map<string, string>();
	for (const document of documents ?? []) {
		contentByDocumentId.set(document.document_id, extractResourceDocumentText(document));
	}

	return resourceLinks.map((link) => {
		const raw = contentByDocumentId.get(link.resourceDocumentId) ?? link.contentText ?? "";
		const normalized = typeof raw === "string" ? raw.trim() : "";
		if (link.resourceType === "prep-doc" && normalized.length === 0) {
			throw new Error(`Prep-doc ingestion failed: empty content_text (${link.resourceDocumentId})`);
		}

		return {
			...link,
			contentText: normalized.length > 0 ? normalized : undefined,
		};
	});
}

function toDocumentRow(document: RegisteredDocument, sessionId: string | null, ownerId: string | null = null): DocumentRow {
	return {
		document_id: document.documentId,
		session_id: sessionId,
		source_file_name: document.sourceFileName,
		source_mime_type: document.sourceMimeType,
		created_at: document.createdAt,
		raw_binary_base64: document.rawBinary ? document.rawBinary.toString("base64") : null,
		canonical_document: document.canonicalDocument ?? null,
		azure_extract: document.azureExtract ?? null,
		owner_id: ownerId,
		is_public: false,
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

function fromSessionRowToStudioEnvelope(row: SessionRow): TeacherStudioSessionEnvelope {
	return {
		sessionId: row.session_id,
		documentIds: row.document_ids ?? [],
		activeBlueprintId: row.active_blueprint_id ?? undefined,
		activeTarget: row.active_target ?? undefined,
		outputIds: row.output_ids ?? [],
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		studioStateVersion: row.studio_state_version ?? 1,
	};
}

function fromBlueprintRow(row: BlueprintRow): BlueprintArtifact {
	return {
		blueprintId: row.blueprint_id,
		sessionId: row.session_id,
		analysisSessionId: row.analysis_session_id,
		teacherId: row.teacher_id ?? undefined,
		unitId: row.unit_id ?? undefined,
		activeVersion: row.active_version,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function fromBlueprintVersionRow(row: BlueprintVersionRow): BlueprintVersionArtifact {
	return {
		blueprintId: row.blueprint_id,
		version: row.version,
		blueprint: row.blueprint_json,
		analysisSnapshot: row.analysis_snapshot ?? undefined,
		editorContext: row.editor_context ?? undefined,
		lineage: row.lineage ?? undefined,
		createdAt: row.created_at,
	};
}

function fromStudioOutputRow(row: StudioOutputRow): TeacherStudioOutputArtifact {
	return {
		outputId: row.output_id,
		sessionId: row.session_id,
		blueprintId: row.blueprint_id,
		blueprintVersion: row.blueprint_version,
		outputType: row.output_type,
		targetType: row.target_type ?? undefined,
		targetId: row.target_id ?? undefined,
		teacherId: row.teacher_id ?? undefined,
		unitId: row.unit_id ?? undefined,
		options: row.options ?? {},
		payload: row.payload,
		renderModel: row.render_model,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
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
		resourceLinks: context.session.resourceLinks,
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

function isDocumentResourceLinksSchemaError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	return error.message.includes("v4_document_resource_links") && (error.message.includes("42703") || error.message.includes("PGRST") || error.message.includes("does not exist"));
}

async function listDocumentResourceLinksStore(sessionId: string): Promise<DocumentResourceLink[]> {
	if (!canUseSupabase()) {
		return getDocumentSession(sessionId)?.resourceLinks ?? [];
	}

	let rows: DocumentResourceLinkRow[] | null;
	try {
		rows = await supabaseRest(DOCUMENT_RESOURCE_LINKS_TABLE, {
			select: "session_id,document_id,resource_document_id,resource_type,content_text",
			filters: { session_id: `eq.${sessionId}` },
		}) as DocumentResourceLinkRow[] | null;
	} catch (error) {
		if (!isDocumentResourceLinksSchemaError(error)) {
			throw error;
		}
		return [];
	}

	return (rows ?? []).map((row) => fromDocumentResourceLinkRow(row));
}

async function replaceDocumentResourceLinksStore(sessionId: string, resourceLinks: DocumentResourceLink[]) {
	if (!canUseSupabase()) {
		const existing = getDocumentSession(sessionId);
		if (!existing) {
			return;
		}

		upsertDocumentSession({
			...existing,
			resourceLinks,
			createdAt: existing.createdAt,
		});
		return;
	}

	try {
		await supabaseRest(DOCUMENT_RESOURCE_LINKS_TABLE, {
			method: "DELETE",
			filters: { session_id: `eq.${sessionId}` },
			prefer: "return=minimal",
		});
	} catch (error) {
		if (!isDocumentResourceLinksSchemaError(error)) {
			throw error;
		}
		return;
	}

	if (resourceLinks.length === 0) {
		return;
	}

	const linksWithContent = await withResourceContentText(resourceLinks);
	const missingPrepDocContent = linksWithContent.filter((link) => link.resourceType === "prep-doc" && (typeof link.contentText !== "string" || link.contentText.trim().length === 0));
	if (missingPrepDocContent.length > 0) {
		const missingIds = missingPrepDocContent.map((link) => link.resourceDocumentId).filter((id, index, all) => all.indexOf(id) === index);
		throw new Error(`Missing prep-doc content_text at ingestion for resource_document_id(s): ${missingIds.join(",")}`);
	}

	try {
		await supabaseRest(DOCUMENT_RESOURCE_LINKS_TABLE, {
			method: "POST",
			body: toDocumentResourceLinkRows(sessionId, linksWithContent),
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	} catch (error) {
		if (error instanceof Error && error.message.includes("content_text")) {
			if (resourceLinks.some((link) => link.resourceType === "prep-doc")) {
				throw new Error("Prep-doc ingestion failed: content_text column unavailable for v4_document_resource_links");
			}
			await supabaseRest(DOCUMENT_RESOURCE_LINKS_TABLE, {
				method: "POST",
				body: toDocumentResourceLinkRows(sessionId, resourceLinks).map((row) => {
					const { content_text, ...rest } = row;
					return rest;
				}),
				prefer: "resolution=merge-duplicates,return=minimal",
			});
			return;
		}
		if (!isDocumentResourceLinksSchemaError(error)) {
			throw error;
		}
	}
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

export async function registerDocumentsStore(
	entries: Array<{ sourceFileName: string; sourceMimeType: string; rawBinary?: Buffer; canonicalDocument?: RegisteredDocument["canonicalDocument"]; azureExtract?: RegisteredDocument["azureExtract"] }>,
	sessionId: string | null = null,
	ownerId: string | null = null,
) {
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
		body: registered.map((document) => toDocumentRow(document, sessionId, ownerId)),
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
	if (!row) {
		return null;
	}

	const resourceLinks = await listDocumentResourceLinksStore(sessionId);
	return {
		...fromSessionRow(row),
		resourceLinks,
	};
}

export async function createDocumentSessionStore(documentIds: string[], sessionId = createId("session")) {
	if (!canUseSupabase()) {
		const created = upsertDocumentSession({
			sessionId,
			documentIds,
			documentRoles: defaultDocumentRoles(documentIds),
			sessionRoles: defaultSessionRoles(documentIds),
			resourceLinks: [],
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
		resourceLinks: [],
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
				resourceLinks: [],
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
		resourceLinks: existing.resourceLinks ?? [],
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
		resourceLinks: normalizeResourceLinks(session.resourceLinks ?? existing?.resourceLinks),
		createdAt: existing?.createdAt ?? session.createdAt ?? now(),
		updatedAt: now(),
	};

	await supabaseRest(SESSIONS_TABLE, {
		method: "POST",
		body: toSessionRow(nextSession),
		prefer: "resolution=merge-duplicates,return=minimal",
	});
	await updateDocumentSessionIds(nextSession.sessionId, nextSession.documentIds);
	await replaceDocumentResourceLinksStore(nextSession.sessionId, nextSession.resourceLinks ?? []);
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
	const enrichedDocument: CanonicalDocument = {
		...analyzedDocument.document,
		items: await buildCanonicalItems(analyzedDocument.document),
	};
	const normalized = withPreferredContentHash({
		...analyzedDocument,
		document: enrichedDocument,
	});

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
		body: {
			canonical_document: normalized.document,
			// Derive and persist azure_extract so simulator routes always have structured text.
			// For PDF: already written during registerDocumentsStore (rawBinary path).
			// For DOCX/PPTX: analyzeRegisteredDocument builds azureExtract from canonical nodes,
			// but the original registration row has azure_extract=null. Writing it here fixes that.
			azure_extract: canonicalDocumentToAzureExtract(normalized.document),
		},
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

export async function getStudioSessionEnvelopeStore(sessionId: string) {
	if (!canUseStudioSessionColumns()) {
		const session = canUseSupabase()
			? await getDocumentSessionStore(sessionId)
			: getDocumentSession(sessionId);
		return session ? buildDefaultStudioSessionEnvelope(session) : null;
	}
	try {
		const rows = await supabaseRest(SESSIONS_TABLE, {
			select: "session_id,document_ids,active_blueprint_id,active_target,output_ids,studio_state_version,created_at,updated_at",
			filters: { session_id: `eq.${sessionId}` },
		});
		const row = Array.isArray(rows) ? rows[0] as SessionRow | undefined : undefined;
		return row ? fromSessionRowToStudioEnvelope(row) : null;
	} catch (error) {
		disableStudioSessionColumns(error);
		const session = await getDocumentSessionStore(sessionId);
		return session ? buildDefaultStudioSessionEnvelope(session) : null;
	}
}

export async function updateStudioSessionEnvelopeStore(
	sessionId: string,
	patch: {
		activeBlueprintId?: string | null;
		activeTarget?: TeacherStudioTarget | null;
		outputIds?: string[];
		studioStateVersion?: number;
	},
) {
	if (!canUseStudioSessionColumns()) {
		const session = canUseSupabase()
			? await getDocumentSessionStore(sessionId)
			: getDocumentSession(sessionId);
		if (!session) {
			return null;
		}
		const current = buildDefaultStudioSessionEnvelope(session);
		const next: TeacherStudioSessionEnvelope = {
			...current,
			activeBlueprintId: patch.activeBlueprintId === undefined ? current.activeBlueprintId : (patch.activeBlueprintId ?? undefined),
			activeTarget: patch.activeTarget === undefined ? current.activeTarget : (patch.activeTarget ?? undefined),
			outputIds: patch.outputIds ? unique(patch.outputIds) : current.outputIds,
			studioStateVersion: patch.studioStateVersion ?? current.studioStateVersion,
			updatedAt: now(),
		};
		studioSessionEnvelopeExtrasStore.set(sessionId, {
			activeBlueprintId: next.activeBlueprintId,
			activeTarget: next.activeTarget,
			outputIds: next.outputIds,
			studioStateVersion: next.studioStateVersion,
		});
		return next;
	}

	const body: Record<string, unknown> = { updated_at: now() };
	if (patch.activeBlueprintId !== undefined) {
		body.active_blueprint_id = patch.activeBlueprintId;
	}
	if (patch.activeTarget !== undefined) {
		body.active_target = patch.activeTarget ?? {};
	}
	if (patch.outputIds !== undefined) {
		body.output_ids = unique(patch.outputIds);
	}
	if (patch.studioStateVersion !== undefined) {
		body.studio_state_version = patch.studioStateVersion;
	}

	try {
		await supabaseRest(SESSIONS_TABLE, {
			method: "PATCH",
			filters: { session_id: `eq.${sessionId}` },
			body,
			prefer: "return=minimal",
		});
	} catch (error) {
		disableStudioSessionColumns(error);
		const session = getDocumentSession(sessionId);
		if (!session) {
			return null;
		}
		const current = buildDefaultStudioSessionEnvelope(session);
		const next: TeacherStudioSessionEnvelope = {
			...current,
			activeBlueprintId: patch.activeBlueprintId === undefined ? current.activeBlueprintId : (patch.activeBlueprintId ?? undefined),
			activeTarget: patch.activeTarget === undefined ? current.activeTarget : (patch.activeTarget ?? undefined),
			outputIds: patch.outputIds ? unique(patch.outputIds) : current.outputIds,
			studioStateVersion: patch.studioStateVersion ?? current.studioStateVersion,
			updatedAt: now(),
		};
		studioSessionEnvelopeExtrasStore.set(sessionId, {
			activeBlueprintId: next.activeBlueprintId,
			activeTarget: next.activeTarget,
			outputIds: next.outputIds,
			studioStateVersion: next.studioStateVersion,
		});
		return next;
	}

	return getStudioSessionEnvelopeStore(sessionId);
}

export async function setActiveBlueprintForSessionStore(sessionId: string, blueprintId: string | null) {
	return updateStudioSessionEnvelopeStore(sessionId, { activeBlueprintId: blueprintId });
}

export async function setActiveTargetForSessionStore(sessionId: string, target: TeacherStudioTarget | null) {
	return updateStudioSessionEnvelopeStore(sessionId, { activeTarget: target });
}

export async function appendOutputToSessionStore(sessionId: string, outputId: string) {
	const current = await getStudioSessionEnvelopeStore(sessionId);
	if (!current) {
		return null;
	}
	return updateStudioSessionEnvelopeStore(sessionId, {
		outputIds: unique([...current.outputIds, outputId]),
	});
}

export async function createBlueprintStore(args: {
	sessionId: string;
	analysisSessionId: string;
	teacherId?: string;
	unitId?: string;
	blueprintId?: string;
	activeVersion?: number;
	status?: BlueprintArtifactStatus;
}) {
	const blueprint: BlueprintArtifact = {
		blueprintId: args.blueprintId ?? createId("blueprint"),
		sessionId: args.sessionId,
		analysisSessionId: args.analysisSessionId,
		teacherId: args.teacherId,
		unitId: args.unitId,
		activeVersion: args.activeVersion ?? 1,
		status: args.status ?? "active",
		createdAt: now(),
		updatedAt: now(),
	};

	if (!canUseStudioBlueprints()) {
		studioBlueprintStore.set(blueprint.blueprintId, blueprint);
		await setActiveBlueprintForSessionStore(blueprint.sessionId, blueprint.blueprintId);
		return blueprint;
	}
	try {
		await supabaseRest(BLUEPRINTS_TABLE, {
			method: "POST",
			body: {
				blueprint_id: blueprint.blueprintId,
				session_id: blueprint.sessionId,
				analysis_session_id: blueprint.analysisSessionId,
				teacher_id: blueprint.teacherId ?? null,
				unit_id: blueprint.unitId ?? null,
				active_version: blueprint.activeVersion,
				status: blueprint.status,
				created_at: blueprint.createdAt,
				updated_at: blueprint.updatedAt,
			},
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	} catch (error) {
		disableStudioBlueprints(error);
		studioBlueprintStore.set(blueprint.blueprintId, blueprint);
		await setActiveBlueprintForSessionStore(blueprint.sessionId, blueprint.blueprintId);
		return blueprint;
	}

	await setActiveBlueprintForSessionStore(blueprint.sessionId, blueprint.blueprintId);
	return blueprint;
}

export async function getBlueprintStore(blueprintId: string) {
	if (!canUseStudioBlueprints()) {
		return studioBlueprintStore.get(blueprintId) ?? null;
	}
	try {
		const rows = await supabaseRest(BLUEPRINTS_TABLE, {
			select: "blueprint_id,session_id,analysis_session_id,teacher_id,unit_id,active_version,status,created_at,updated_at",
			filters: { blueprint_id: `eq.${blueprintId}` },
		});
		const row = Array.isArray(rows) ? rows[0] as BlueprintRow | undefined : undefined;
		return row ? fromBlueprintRow(row) : null;
	} catch (error) {
		disableStudioBlueprints(error);
		return studioBlueprintStore.get(blueprintId) ?? null;
	}
}

export async function listBlueprintsForSessionStore(sessionId: string) {
	if (!canUseStudioBlueprints()) {
		return [...studioBlueprintStore.values()]
			.filter((blueprint) => blueprint.sessionId === sessionId)
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
	}

	try {
		const rows = await supabaseRest(BLUEPRINTS_TABLE, {
			select: "blueprint_id,session_id,analysis_session_id,teacher_id,unit_id,active_version,status,created_at,updated_at",
			filters: { session_id: `eq.${sessionId}`, order: "updated_at.desc" },
		});
		return ((rows as BlueprintRow[] | null) ?? []).map((row) => fromBlueprintRow(row));
	} catch (error) {
		disableStudioBlueprints(error);
		return [...studioBlueprintStore.values()]
			.filter((blueprint) => blueprint.sessionId === sessionId)
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
	}
}

export async function getBlueprintVersionStore(blueprintId: string, version?: number) {
	if (!canUseStudioBlueprintVersions()) {
		const versions = studioBlueprintVersionsStore.get(blueprintId);
		if (!versions) {
			return null;
		}
		if (version !== undefined) {
			return versions.get(version) ?? null;
		}
		const blueprint = studioBlueprintStore.get(blueprintId);
		return blueprint ? (versions.get(blueprint.activeVersion) ?? null) : null;
	}

	const resolvedVersion = version ?? (await getBlueprintStore(blueprintId))?.activeVersion;
	if (resolvedVersion === undefined) {
		return null;
	}

	try {
		const rows = await supabaseRest(BLUEPRINT_VERSIONS_TABLE, {
			select: "blueprint_id,version,analysis_snapshot,blueprint_json,editor_context,lineage,created_at",
			filters: { blueprint_id: `eq.${blueprintId}`, version: `eq.${resolvedVersion}` },
		});
		const row = Array.isArray(rows) ? rows[0] as BlueprintVersionRow | undefined : undefined;
		return row ? fromBlueprintVersionRow(row) : null;
	} catch (error) {
		disableStudioBlueprintVersions(error);
		const versions = studioBlueprintVersionsStore.get(blueprintId);
		if (!versions) {
			return null;
		}
		return versions.get(resolvedVersion) ?? null;
	}
}

export async function saveBlueprintVersionStore(args: {
	blueprintId: string;
	blueprint: BlueprintVersionArtifact["blueprint"];
	analysisSnapshot?: BlueprintVersionArtifact["analysisSnapshot"];
	editorContext?: BlueprintVersionEditorContext;
	lineage?: BlueprintVersionLineage;
	version?: number;
	setActive?: boolean;
}) {
	const blueprintRecord = await getBlueprintStore(args.blueprintId);
	if (!blueprintRecord) {
		throw new Error(`Blueprint ${args.blueprintId} not found`);
	}

	const nextVersion = args.version ?? (blueprintRecord.activeVersion + 1);
	const saved: BlueprintVersionArtifact = {
		blueprintId: args.blueprintId,
		version: nextVersion,
		blueprint: args.blueprint,
		analysisSnapshot: args.analysisSnapshot,
		editorContext: args.editorContext,
		lineage: args.lineage,
		createdAt: now(),
	};

	if (!canUseStudioBlueprintVersions()) {
		const versions = studioBlueprintVersionsStore.get(args.blueprintId) ?? new Map<number, BlueprintVersionArtifact>();
		versions.set(saved.version, saved);
		studioBlueprintVersionsStore.set(args.blueprintId, versions);
		if (args.setActive !== false) {
			studioBlueprintStore.set(args.blueprintId, {
				...blueprintRecord,
				activeVersion: saved.version,
				updatedAt: now(),
			});
		}
		return saved;
	}

	try {
		await supabaseRest(BLUEPRINT_VERSIONS_TABLE, {
			method: "POST",
			body: {
				blueprint_id: saved.blueprintId,
				version: saved.version,
				analysis_snapshot: saved.analysisSnapshot ?? {},
				blueprint_json: saved.blueprint,
				editor_context: saved.editorContext ?? {},
				lineage: saved.lineage ?? {},
				created_at: saved.createdAt,
			},
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	} catch (error) {
		disableStudioBlueprintVersions(error);
		const versions = studioBlueprintVersionsStore.get(args.blueprintId) ?? new Map<number, BlueprintVersionArtifact>();
		versions.set(saved.version, saved);
		studioBlueprintVersionsStore.set(args.blueprintId, versions);
		if (args.setActive !== false) {
			studioBlueprintStore.set(args.blueprintId, {
				...blueprintRecord,
				activeVersion: saved.version,
				updatedAt: now(),
			});
		}
		return saved;
	}

	if (args.setActive !== false) {
		try {
			await supabaseRest(BLUEPRINTS_TABLE, {
				method: "PATCH",
				filters: { blueprint_id: `eq.${args.blueprintId}` },
				body: {
					active_version: saved.version,
					updated_at: now(),
				},
				prefer: "return=minimal",
			});
		} catch (error) {
			disableStudioBlueprints(error);
			studioBlueprintStore.set(args.blueprintId, {
				...blueprintRecord,
				activeVersion: saved.version,
				updatedAt: now(),
			});
		}
		await setActiveBlueprintForSessionStore(blueprintRecord.sessionId, blueprintRecord.blueprintId);
	}

	return saved;
}

export async function getStudioOutputStore(outputId: string) {
	if (!canUseStudioOutputs()) {
		return studioOutputsStore.get(outputId) ?? null;
	}
	try {
		const rows = await supabaseRest(STUDIO_OUTPUTS_TABLE, {
			select: "output_id,session_id,blueprint_id,blueprint_version,output_type,target_type,target_id,teacher_id,unit_id,options,payload,render_model,status,created_at,updated_at",
			filters: { output_id: `eq.${outputId}` },
		});
		const row = Array.isArray(rows) ? rows[0] as StudioOutputRow | undefined : undefined;
		return row ? fromStudioOutputRow(row) : null;
	} catch (error) {
		disableStudioOutputs(error);
		return studioOutputsStore.get(outputId) ?? null;
	}
}

export async function listStudioOutputsForSessionStore(sessionId: string) {
	if (!canUseStudioOutputs()) {
		return [...studioOutputsStore.values()]
			.filter((output) => output.sessionId === sessionId)
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
	}

	try {
		const rows = await supabaseRest(STUDIO_OUTPUTS_TABLE, {
			select: "output_id,session_id,blueprint_id,blueprint_version,output_type,target_type,target_id,teacher_id,unit_id,options,payload,render_model,status,created_at,updated_at",
			filters: { session_id: `eq.${sessionId}`, order: "created_at.desc" },
		});
		return ((rows as StudioOutputRow[] | null) ?? []).map((row) => fromStudioOutputRow(row));
	} catch (error) {
		disableStudioOutputs(error);
		return [...studioOutputsStore.values()]
			.filter((output) => output.sessionId === sessionId)
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
	}
}

export async function listStudioOutputsForBlueprintStore(blueprintId: string) {
	if (!canUseStudioOutputs()) {
		return [...studioOutputsStore.values()]
			.filter((output) => output.blueprintId === blueprintId)
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
	}

	try {
		const rows = await supabaseRest(STUDIO_OUTPUTS_TABLE, {
			select: "output_id,session_id,blueprint_id,blueprint_version,output_type,target_type,target_id,teacher_id,unit_id,options,payload,render_model,status,created_at,updated_at",
			filters: { blueprint_id: `eq.${blueprintId}`, order: "created_at.desc" },
		});
		return ((rows as StudioOutputRow[] | null) ?? []).map((row) => fromStudioOutputRow(row));
	} catch (error) {
		disableStudioOutputs(error);
		return [...studioOutputsStore.values()]
			.filter((output) => output.blueprintId === blueprintId)
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
	}
}

export async function saveStudioOutputStore(args: {
	sessionId: string;
	blueprintId: string;
	blueprintVersion: number;
	outputType: TeacherStudioOutputType;
	targetType?: TeacherStudioOutputArtifact["targetType"];
	targetId?: string;
	teacherId?: string;
	unitId?: string;
	options?: Record<string, unknown>;
	payload: TeacherStudioOutputArtifact["payload"];
	renderModel: TeacherStudioOutputArtifact["renderModel"];
	outputId?: string;
	status?: TeacherStudioOutputStatus;
}) {
	const createdAt = now();
	const output: TeacherStudioOutputArtifact = {
		outputId: args.outputId ?? createId("output"),
		sessionId: args.sessionId,
		blueprintId: args.blueprintId,
		blueprintVersion: args.blueprintVersion,
		outputType: args.outputType,
		targetType: args.targetType,
		targetId: args.targetId,
		teacherId: args.teacherId,
		unitId: args.unitId,
		options: args.options ?? {},
		payload: args.payload,
		renderModel: args.renderModel,
		status: args.status ?? "ready",
		createdAt,
		updatedAt: createdAt,
	};

	if (!canUseStudioOutputs()) {
		studioOutputsStore.set(output.outputId, output);
		await appendOutputToSessionStore(output.sessionId, output.outputId);
		return output;
	}
	try {
		await supabaseRest(STUDIO_OUTPUTS_TABLE, {
			method: "POST",
			body: {
				output_id: output.outputId,
				session_id: output.sessionId,
				blueprint_id: output.blueprintId,
				blueprint_version: output.blueprintVersion,
				output_type: output.outputType,
				target_type: output.targetType ?? null,
				target_id: output.targetId ?? null,
				teacher_id: output.teacherId ?? null,
				unit_id: output.unitId ?? null,
				options: output.options,
				payload: output.payload,
				render_model: output.renderModel,
				status: output.status,
				created_at: output.createdAt,
				updated_at: output.updatedAt,
			},
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	} catch (error) {
		disableStudioOutputs(error);
		studioOutputsStore.set(output.outputId, output);
		await appendOutputToSessionStore(output.sessionId, output.outputId);
		return output;
	}

	await appendOutputToSessionStore(output.sessionId, output.outputId);
	return output;
}

export async function markStudioOutputStaleStore(outputId: string) {
	if (!canUseStudioOutputs()) {
		const existing = studioOutputsStore.get(outputId);
		if (!existing) {
			return null;
		}
		const next = { ...existing, status: "stale" as const, updatedAt: now() };
		studioOutputsStore.set(outputId, next);
		return next;
	}

	try {
		await supabaseRest(STUDIO_OUTPUTS_TABLE, {
			method: "PATCH",
			filters: { output_id: `eq.${outputId}` },
			body: { status: "stale", updated_at: now() },
			prefer: "return=minimal",
		});
	} catch (error) {
		disableStudioOutputs(error);
		const existing = studioOutputsStore.get(outputId);
		if (!existing) {
			return null;
		}
		const next = { ...existing, status: "stale" as const, updatedAt: now() };
		studioOutputsStore.set(outputId, next);
		return next;
	}

	return getStudioOutputStore(outputId);
}

export async function updateStudioOutputStore(outputId: string, patch: {
	payload: TeacherStudioOutputArtifact["payload"];
	renderModel: TeacherStudioOutputArtifact["renderModel"];
}) {
	const updatedAt = now();

	if (!canUseStudioOutputs()) {
		const existing = studioOutputsStore.get(outputId);
		if (!existing) {
			return null;
		}
		const next = { ...existing, payload: patch.payload, renderModel: patch.renderModel, updatedAt };
		studioOutputsStore.set(outputId, next);
		return next;
	}

	try {
		await supabaseRest(STUDIO_OUTPUTS_TABLE, {
			method: "PATCH",
			filters: { output_id: `eq.${outputId}` },
			body: { payload: patch.payload, render_model: patch.renderModel, updated_at: updatedAt },
			prefer: "return=minimal",
		});
	} catch (error) {
		disableStudioOutputs(error);
		const existing = studioOutputsStore.get(outputId);
		if (!existing) {
			return null;
		}
		const next = { ...existing, payload: patch.payload, renderModel: patch.renderModel, updatedAt };
		studioOutputsStore.set(outputId, next);
		return next;
	}

	return getStudioOutputStore(outputId);
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

export function resetStudioRegistryState() {
	studioSessionEnvelopeExtrasStore.clear();
	studioBlueprintStore.clear();
	studioBlueprintVersionsStore.clear();
	studioOutputsStore.clear();
}

