/**
 * api/v4/simulator/shared.ts — Shared utilities for simulator routes
 *
 * Text retrieval: queries prism_v4_documents (already extracted during upload)
 * and flattens all canonical node text for a session.  Zero pipeline dependency —
 * we are only reading already-stored text, not re-processing anything.
 *
 * Profile formatting: turns a StudentProfile into an LLM-readable paragraph.
 *
 * Confusion model: multi-factor metric that goes beyond cognitive load alone.
 */

import { hasSupabaseServiceRoleCredentials, supabaseRest } from "../../../lib/supabase";
import { runSemanticPipeline } from "../../../src/prism-v4/semantic/pipeline/runSemanticPipeline";
import type { SimulationItem } from "../../../src/prism-v4/schema";
import type { AzureExtractResult, ProblemTagVector } from "../../../src/prism-v4/schema/semantic";
import type { StudentProfile } from "../../../src/types/simulator";
import { hybridSegmentWithDiagnostics } from "../../../src/prism-v4/semantic/segment/hybridSegmenter";
export type { AzureExtractLike } from "../../../src/prism-v4/semantic/segment/hybridSegmenter";

let warnedMissingServiceRoleForV4Writes = false;
let v4ItemsTableSupported = true;
let v4SectionsTableSupported = true;
let v4AnalysisTableSupported = true;

function isMissingTableSchemaCacheError(error: unknown, table: string): boolean {
	const message = String(error instanceof Error ? error.message : error).toLowerCase();
	return message.includes("pgrst205")
		|| (message.includes("schema cache") && message.includes(table.toLowerCase()))
		|| message.includes(`could not find the table 'public.${table.toLowerCase()}'`);
}

function disableV4Table(table: "v4_items" | "v4_sections" | "v4_analysis", error: unknown): boolean {
	if (!isMissingTableSchemaCacheError(error, table)) {
		return false;
	}

	if (table === "v4_items") {
		if (v4ItemsTableSupported) {
			console.warn(`[v4-ingestion] ${table} missing in Supabase schema cache; skipping item persistence. Run supabase/v4_schema_repair_migration.sql and reload PostgREST schema cache.`);
		}
		v4ItemsTableSupported = false;
	}

	if (table === "v4_sections") {
		if (v4SectionsTableSupported) {
			console.warn(`[v4-ingestion] ${table} missing in Supabase schema cache; skipping section persistence. Run supabase/v4_schema_repair_migration.sql and reload PostgREST schema cache.`);
		}
		v4SectionsTableSupported = false;
	}

	if (table === "v4_analysis") {
		if (v4AnalysisTableSupported) {
			console.warn(`[v4-ingestion] ${table} missing in Supabase schema cache; skipping analysis persistence. Run supabase/v4_schema_repair_migration.sql and reload PostgREST schema cache.`);
		}
		v4AnalysisTableSupported = false;
	}

	return true;
}

function canPersistV4IngestionWrites(): boolean {
	return typeof window === "undefined" && hasSupabaseServiceRoleCredentials();
}

function warnMissingServiceRoleForV4Writes(): void {
	if (warnedMissingServiceRoleForV4Writes) return;
	warnedMissingServiceRoleForV4Writes = true;
	console.warn("[v4-ingestion] SUPABASE_SERVICE_ROLE_KEY missing or invalid; skipping v4_* persistence writes. Set SUPABASE_SERVICE_ROLE_KEY to enable DB persistence.");
}

// ---------------------------------------------------------------------------
// Text retrieval
// ---------------------------------------------------------------------------

interface SupabaseDocumentRow {
	document_id: string;
	canonical_document: {
		nodes?: Array<{ text?: string; normalizedText?: string; nodeType?: string }>;
		paragraphs?: Array<{ text?: string }>;
	} | null;
	azure_extract: {
		content?: string;
		paragraphs?: Array<{ text?: string }>;
		pages?: Array<{ text?: string; pageNumber?: number }>;
	} | null;
	source_file_name: string | null;
}

/**
 * Fetch and flatten document text for every document belonging to `sessionId`.
 * Falls back through:  canonical_document.nodes → azure_extract.content → ""
 *
 * Returns the combined text (all docs joined with "\n\n---\n\n") and the
 * number of documents found.
 */
export async function fetchSessionText(sessionId: string): Promise<{ text: string; docCount: number }> {
	const { docCount, rows } = await _fetchSessionRows(sessionId);
	const docs: string[] = [];
	for (const row of rows) {
		const text = extractTextFromRow(row);
		if (text) docs.push(text);
	}
	return { text: docs.join("\n\n---\n\n"), docCount };
}

/**
 * Fetch documents for a session, returning both flattened text and the raw
 * azure_extract objects for hybrid segmentation.
 *
 * When a stored azure_extract is empty/null (common for DOCX uploaded before
 * the registryStore fix), synthesizes a best-effort extract from
 * canonical_document.nodes so segmentation always has text to work with.
 */
export async function fetchSessionDocuments(sessionId: string): Promise<{
	text: string;
	docCount: number;
	azureExtracts: Array<{ content?: string; paragraphs?: Array<{ text?: string }>; pages?: Array<{ text?: string; pageNumber?: number }> }>;
}> {
	const { docCount, rows } = await _fetchSessionRows(sessionId);
	const docs: string[] = [];
	const azureExtracts: ReturnType<typeof buildAzureExtractFromRow>[] = [];

	for (const row of rows) {
		const text = extractTextFromRow(row);
		if (text) docs.push(text);
		azureExtracts.push(buildAzureExtractFromRow(row));
	}

	return {
		text: docs.join("\n\n---\n\n"),
		docCount,
		azureExtracts,
	};
}

/**
 * Build the best available azure_extract from a document row.
 *
 * Priority:
 *   1. Stored azure_extract with content/paragraphs/pages
 *   2. Synthesized from canonical_document.nodes (DOCX fallback for old rows)
 *   3. Empty object (segmentText will handle gracefully)
 */
export function buildAzureExtractFromRow(row: {
	azure_extract: { content?: string; paragraphs?: Array<{ text?: string }>; pages?: Array<{ text?: string; pageNumber?: number }> } | null;
	canonical_document: { nodes?: Array<{ text?: string; normalizedText?: string; nodeType?: string }>; paragraphs?: Array<{ text?: string }> } | null;
}): { content?: string; paragraphs?: Array<{ text?: string }>; pages?: Array<{ text?: string; pageNumber?: number }> } {
	const ae = row.azure_extract;

	// Has usable stored extract?
	if (ae && (ae.content || ae.paragraphs?.length || ae.pages?.length)) {
		return ae;
	}

	// Synthesize from canonical nodes (DOCX / old rows)
	const nodes = row.canonical_document?.nodes;
	if (nodes && nodes.length > 0) {
		const texts = nodes
			.filter((n) => n.nodeType !== "tableRow" && n.nodeType !== "table" && n.nodeType !== "inline")
			.map((n) => n.text ?? n.normalizedText ?? "")
			.filter(Boolean);
		if (texts.length > 0) {
			console.log(`[buildAzureExtractFromRow] synthesizing azure extract from ${texts.length} canonical node(s) (azure_extract was empty)`);
			return {
				content: texts.join("\n\n"),
				paragraphs: texts.map((t) => ({ text: t })),
				pages: [{ text: texts.join("\n"), pageNumber: 1 }],
			};
		}
	}

	// Fallback: canonical paragraphs
	const paras = row.canonical_document?.paragraphs;
	if (paras && paras.length > 0) {
		const texts = paras.map((p) => p.text ?? "").filter(Boolean);
		if (texts.length > 0) {
			console.log(`[buildAzureExtractFromRow] synthesizing azure extract from ${texts.length} canonical paragraph(s)`);
			return {
				content: texts.join("\n\n"),
				paragraphs: texts.map((t) => ({ text: t })),
			};
		}
	}

	return {};
}

async function _fetchSessionRows(sessionId: string): Promise<{ rows: SupabaseDocumentRow[]; docCount: number }> {
	const rows = (await supabaseRest("prism_v4_documents", {
		select: "document_id,canonical_document,azure_extract,source_file_name",
		filters: { session_id: `eq.${sessionId}` },
	})) as SupabaseDocumentRow[] | null;

	return { rows: rows ?? [], docCount: (rows ?? []).length };
}

function extractTextFromRow(row: SupabaseDocumentRow): string {
	// Priority 1 — canonical document nodes
	const nodes = row.canonical_document?.nodes;
	if (nodes && nodes.length > 0) {
		return nodes
			.map((n) => n.text ?? n.normalizedText ?? "")
			.filter(Boolean)
			.join("\n");
	}

	// Priority 2 — Azure full-text extraction
	const azureContent = row.azure_extract?.content;
	if (azureContent) return azureContent;

	// Priority 3 — Azure paragraph list
	const paras = row.azure_extract?.paragraphs;
	if (paras && paras.length > 0) {
		return paras.map((p) => p.text ?? "").filter(Boolean).join("\n");
	}

	return "";
}

// ---------------------------------------------------------------------------
// Student profile → prompt string
// ---------------------------------------------------------------------------

export function formatStudentProfile(profile?: StudentProfile): string {
	const p: StudentProfile = profile ?? {
		confidence: "medium",
		anxietyLevel: "medium",
		pacingStyle: "steady",
		readingProfile: "average",
		attentionProfile: "average",
		mathBackground: "average",
	};

	const lines: string[] = [
		`- Confidence: ${p.confidence}`,
		`- Anxiety level: ${p.anxietyLevel}`,
		`- Pacing style: ${p.pacingStyle}`,
		`- Reading profile: ${p.readingProfile}`,
		`- Attention profile: ${p.attentionProfile}`,
		`- Math background: ${p.mathBackground}`,
	];

	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Two-part LLM response parser
// ---------------------------------------------------------------------------

/**
 * The simulator prompts instruct the LLM to return:
 *   1. NARRATIVE (teacher-friendly text)
 *   2. DATA (JSON ONLY, no commentary) { … }
 *
 * This parser uses a three-strategy cascade:
 *   1. Marker-based split — find "2. DATA" header, forward brace-match
 *   2. Reverse brace-match — find last "}", walk backwards to matching "{"
 *   3. First-to-last brute force — slice between first "{" and last "}"
 *
 * Code fences are stripped before any strategy runs.
 * Only returns data: null when no strategy produces valid JSON.
 */
export function parseSimulatorResponse(raw: string): { narrative: string; data: unknown } {
	if (!raw) return { narrative: "", data: null };
	console.log("RAW LLM OUTPUT:\n", raw);

	// Strip code fences (```json … ``` or ``` … ```)
	const cleaned = raw.replace(/```(?:json)?\s*\n?/gi, "");

	// --- Strategy 1: marker-based split (most reliable when LLM follows format) ---
	const dataSplitMatch = cleaned.match(/\n\s*2\.\s*DATA[^\n]*\n/i)
		?? cleaned.match(/\n\s*DATA\s*[\(\[]?JSON[^\n]*\n/i);

	if (dataSplitMatch && dataSplitMatch.index !== undefined) {
		const narrativePart = cleaned.slice(0, dataSplitMatch.index).trim();
		const dataPart = cleaned.slice(dataSplitMatch.index + dataSplitMatch[0].length);

		const jsonStart = dataPart.search(/[\[{]/);
		if (jsonStart !== -1) {
			const openChar = dataPart[jsonStart];
			const closeChar = openChar === "{" ? "}" : "]";
			let depth = 0;
			let end = -1;
			for (let i = jsonStart; i < dataPart.length; i++) {
				if (dataPart[i] === openChar) depth++;
				else if (dataPart[i] === closeChar) {
					depth--;
					if (depth === 0) { end = i + 1; break; }
				}
			}
			if (end !== -1) {
				try {
					return { narrative: narrativePart, data: JSON.parse(dataPart.slice(jsonStart, end)) };
				} catch { /* fall through to strategy 2 */ }
			}
		}
	}

	// --- Strategy 2: reverse brace-match from last "}" in full text ---
	// JSON is always at the end; walking backwards finds it even without a marker.
	const lastBrace = cleaned.lastIndexOf("}");
	if (lastBrace !== -1) {
		let depth = 0;
		let start = -1;
		for (let i = lastBrace; i >= 0; i--) {
			if (cleaned[i] === "}") depth++;
			if (cleaned[i] === "{") {
				depth--;
				if (depth === 0) { start = i; break; }
			}
		}
		if (start !== -1) {
			try {
				return {
					narrative: cleaned.slice(0, start).trim(),
					data: JSON.parse(cleaned.slice(start, lastBrace + 1)),
				};
			} catch { /* fall through to strategy 3 */ }
		}

		// --- Strategy 3: first "{" to last "}" brute-force ---
		const firstBrace = cleaned.indexOf("{");
		if (firstBrace !== -1 && lastBrace > firstBrace) {
			try {
				return {
					narrative: cleaned.slice(0, firstBrace).trim(),
					data: JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)),
				};
			} catch { /* fall through */ }
		}
	}

	// No valid JSON found
	return { narrative: raw.trim(), data: null };
}

// ---------------------------------------------------------------------------
// Multi-profile parallel simulation prompt
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Canonical multi-profile catalog
// ---------------------------------------------------------------------------

export const PROFILE_CATALOG: Array<{ id: string; label: string; color: string }> = [
	{ id: "average",  label: "Average Student",   color: "#3b82f6" },
	{ id: "adhd",     label: "ADHD Profile",       color: "#f97316" },
	{ id: "dyslexia", label: "Dyslexia Profile",   color: "#22c55e" },
	{ id: "ell",      label: "ELL Profile",        color: "#a855f7" },
	{ id: "gifted",   label: "Gifted / Fast",      color: "#eab308" },
];

// ---------------------------------------------------------------------------
// Confusion model — multi-factor score
// ---------------------------------------------------------------------------

/**
 * Minimum subset of measurables needed to compute the confusion score.
 * Using a partial interface so this can be called from both the backend and
 * any utility that assembles measurables on the fly.
 */
export interface ConfusionMeasurables {
	linguisticLoad: number;      // 0–1 (replaces cognitiveLoad + readingLoad)
	distractorDensity: number;   // 0–1
	steps: number;               // integer reasoning steps
	timeToProcessSeconds: number;
	[key: string]: unknown;
}

/**
 * Compute a multi-factor confusion score (0–1).
 *
 * Weights:
 *   0.40 × linguisticLoad
 *   0.20 × distractorDensity
 *   0.15 × steps (capped at 5 → 1.0)
 *   0.15 × misconceptionRisk
 *   0.10 × timeToProcess (capped at 30 s → 1.0)
 */
export function computeConfusionScore(
	m: ConfusionMeasurables,
	states: { misconceptionRisk: number },
): number {
	const stepsNorm = Math.min((m.steps ?? 1) / 5, 1);
	const timeNorm  = Math.min((m.timeToProcessSeconds ?? 0) / 30, 1);

	const raw =
		0.40 * (m.linguisticLoad ?? 0) +
		0.20 * (m.distractorDensity ?? 0) +
		0.15 * stepsNorm +
		0.15 * (states.misconceptionRisk ?? 0) +
		0.10 * timeNorm;

	return Math.min(Math.max(raw, 0), 1);
}

// ---------------------------------------------------------------------------
// Multi-profile parallel simulation prompt
// ---------------------------------------------------------------------------

/**
 * Build the parallel simulation prompt.
 * documentText: already-fetched plaintext from the session.
 * profiles: array of { label, profile } entries from the STUDENT_PROFILE_PRESETS.
 * profileLabels: display names aligned with profiles array (index-matched).
 */
export function buildMultiProfilePrompt(documentText: string, profileLabels: string[], profiles: StudentProfile[]): string {
	// Truncate aggressively: multi-profile output is large (N profiles × all items)
	const truncatedText = documentText.substring(0, 4000);

	const profilesText = profileLabels.map((label, i) => {
		const p = profiles[i];
		return `${label}:\n${formatStudentProfile(p)}`;
	}).join("\n\n");

	return `SYSTEM:
You are a student-experience simulator for teachers.
You receive pre-segmented items — measurables (cognitive load, reading load, etc.) are already computed locally.

For EACH student profile:
- Identify red flags per item (wording issues, pacing, ambiguity, difficulty for this profile)
- Estimate emotional responses (frustration, fatigue, confidence dips) per profile
- Predict pacing and time pressure patterns
- Identify likely misconceptions from wording
- Evaluate explanatory sections if present (reading load, vocabulary difficulty, confusion risk, fatigue risk, red flags)

Then produce a CROSS-STUDENT COMPARISON showing:
- Which items are universally difficult (high risk across ALL profiles)
- Which items disproportionately affect certain profiles (ADHD, dyslexia, ELL, low confidence)
- Where pacing diverges most
- Where behavioral risks are highest across profiles

IMPORTANT: All numeric fields (fatigueRisk, pacingRisk, predictedStates values) MUST be decimals between 0.0 and 1.0.

IMPORTANT — STRICT OUTPUT FORMAT:
- In the DATA section, output ONLY the raw JSON object.
- Do NOT wrap the JSON in code fences (no \`\`\` or \`\`\`json).
- Do NOT add any text, headings, or labels within the DATA section — only the JSON.
- Start the JSON directly with "{" and end with "}".

Return your answer in two parts:

1. NARRATIVE (teacher-friendly text, 3–5 paragraphs)

2. DATA (JSON ONLY, no commentary)
{
  "students": {
    "PROFILE_NAME": {
      "items": [
        {
          "itemNumber": number,
          "redFlags": [string]
        }
      ],
			"sections": [
				{
					"sectionId": string,
					"linguisticLoad": number (0.0–1.0),
					"confusionRisk": number (0.0–1.0),
					"fatigueRisk": number (0.0–1.0),
					"redFlags": [string]
				}
			],
      "overall": {
        "totalItems": number,
        "estimatedCompletionTimeSeconds": number,
        "fatigueRisk": number (0.0–1.0),
        "pacingRisk": number (0.0–1.0),
        "majorRedFlags": [string],
        "predictedStates": {
          "fatigue": number (0.0–1.0),
          "confusion": number (0.0–1.0),
          "guessing": number (0.0–1.0),
          "overload": number (0.0–1.0),
          "frustration": number (0.0–1.0),
          "timePressureCollapse": number (0.0–1.0),
          "emotionalFriction": number (0.0–1.0),
          "confidenceImpact": number (0.0–1.0),
          "pacingPressure": number (0.0–1.0),
          "fatigueIncrease": number[],
          "attentionDrop": number[]
        }
      }
    }
  },
  "comparison": {
    "universallyDifficultItems": [number],
    "profileSpecificRisks": {
      "PROFILE_NAME": [number]
    }
  },
  "rewriteSuggestions": {
    "testLevel": [string],
    "itemLevel": {
      "ITEM_NUMBER": [string]
    }
  },
  "profileNarratives": {
    "PROFILE_NAME": "2–3 sentence paragraph describing this profile's specific experience."
  }
}

USER:
Here are the pre-segmented items:
${truncatedText}

Here are the student profiles:
${profilesText}`;
}

// ---------------------------------------------------------------------------
// V4 item storage — v4_items table
// ---------------------------------------------------------------------------

/**
 * A structured assessment item as stored in (and loaded from) `v4_items`.
 * Contains no PII — only the assessment content and pedagogical metadata.
 */
export interface V4Item {
	itemNumber: number;
	type: string;
	stem: string;
	choices: unknown | null;
	answerKey: unknown | null;
	metadata: Record<string, unknown>;
	sourcePageNumbers: number[];
}

/**
 * Persist extracted items to `v4_items`.
 *
 * Called after `analyzeRegisteredDocument` during the upload pipeline so that
 * every subsequent LLM route (simulator, rewrite) can load items
 * from the DB instead of re-reading raw document text.
 *
 * Safe to call multiple times — existing rows for the same document will be
 * left in place (insert only, no upsert, so callers should call once per document).
 */
export async function saveItems(documentId: string, items: V4Item[]): Promise<void> {
	if (!items.length) return;
	if (!canPersistV4IngestionWrites()) {
		warnMissingServiceRoleForV4Writes();
		return;
	}
	if (!v4ItemsTableSupported) return;

	const rows = items.map((item) => ({
		document_id: documentId,
		item_number: item.itemNumber,
		type: item.type ?? "question",
		stem: item.stem ?? "",
		choices: item.choices ?? null,
		answer_key: item.answerKey ?? null,
		metadata: item.metadata ?? {},
		source_page_numbers: item.sourcePageNumbers ?? [],
	}));

	try {
		await supabaseRest("v4_items", {
			method: "POST",
			body: rows,
			prefer: "resolution=merge-duplicates",
		});
	} catch (error) {
		if (disableV4Table("v4_items", error)) return;
		throw error;
	}
}

// ---------------------------------------------------------------------------
// V4 section storage — v4_sections table
// ---------------------------------------------------------------------------

export interface V4Section {
	sectionId: string;
	order: number;
	title?: string;
	text: string;
	metadata: Record<string, unknown>;
}

/**
 * Persist extracted sections to `v4_sections`.
 * Deletes existing rows for the document first (idempotent upsert).
 */
export async function saveSections(documentId: string, sections: V4Section[]): Promise<void> {
	if (!sections.length) return;
	if (!canPersistV4IngestionWrites()) {
		warnMissingServiceRoleForV4Writes();
		return;
	}
	if (!v4SectionsTableSupported) return;

	// Delete existing sections for this document (idempotent)
	try {
		await supabaseRest("v4_sections", {
			method: "DELETE",
			filters: { document_id: `eq.${documentId}` },
		});
	} catch (error) {
		if (disableV4Table("v4_sections", error)) return;
		// Non-fatal — best effort delete before re-insert
	}

	const rows = sections.map((s) => ({
		document_id: documentId,
		section_id:  s.sectionId,
		order:       s.order,
		title:       s.title ?? null,
		text:        s.text,
		metadata:    s.metadata ?? {},
	}));

	try {
		await supabaseRest("v4_sections", {
			method: "POST",
			body: rows,
			prefer: "resolution=merge-duplicates",
		});
	} catch (error) {
		if (disableV4Table("v4_sections", error)) return;
		throw error;
	}
}

/**
 * Load all sections for a document from `v4_sections`, ordered by `order`.
 * Returns an empty array (never throws) when no sections are found.
 */
export async function getSectionsForDocument(documentId: string): Promise<V4Section[]> {
	try {
		const rows = (await supabaseRest("v4_sections", {
			method: "GET",
			select: "section_id,order,title,text,metadata",
			filters: {
				document_id: `eq.${documentId}`,
				order:       "order.asc",
			},
		})) as Array<{
			section_id: string;
			order: number;
			title: string | null;
			text: string;
			metadata: Record<string, unknown>;
		}> | null;

		return (rows ?? []).map((row) => ({
			sectionId: row.section_id,
			order:     row.order,
			title:     row.title ?? undefined,
			text:      row.text,
			metadata:  row.metadata ?? {},
		}));
	} catch {
		return [];
	}
}

// ---------------------------------------------------------------------------
// V4 analysis storage — v4_analysis table
// ---------------------------------------------------------------------------

/**
 * Persist structured analysis for a document to `v4_analysis`.
 * Upserts by document_id.
 */
export async function saveAnalysis(
	documentId: string,
	docType: "problem" | "notes" | "mixed",
	analyzed: {
		insights?: {
			concepts?: string[];
			misconceptionThemes?: string[];
		};
		[key: string]: unknown;
	},
): Promise<void> {
	if (!canPersistV4IngestionWrites()) {
		warnMissingServiceRoleForV4Writes();
		return;
	}
	if (!v4AnalysisTableSupported) return;

	try {
		await supabaseRest("v4_analysis", {
			method: "POST",
			body: {
				document_id:    documentId,
				doc_type:       docType,
				summary:        null,
				key_concepts:   analyzed.insights?.concepts ?? [],
				misconceptions: analyzed.insights?.misconceptionThemes ?? [],
				cognitive_load: {},
				charts:         {},
				metadata:       {},
			},
			prefer: "resolution=merge-duplicates",
		});
	} catch (err) {
		if (disableV4Table("v4_analysis", err)) return;
		console.warn("[saveAnalysis] non-fatal:", err instanceof Error ? err.message : err);
	}
}

// ---------------------------------------------------------------------------
// prism_v4_documents — doc_type writer
// ---------------------------------------------------------------------------

/**
 * Persist the classified doc_type back to `prism_v4_documents`.
 * Non-fatal — missing column (before migration) is swallowed.
 */
export async function setDocType(
	documentId: string,
	docType: "problem" | "notes" | "mixed",
): Promise<void> {
	if (!canPersistV4IngestionWrites()) {
		warnMissingServiceRoleForV4Writes();
		return;
	}

	try {
		const { url, key } = (await import("../../../lib/supabase")).supabaseAdmin();
		await fetch(`${url}/rest/v1/prism_v4_documents?document_id=eq.${encodeURIComponent(documentId)}`, {
			method: "PATCH",
			headers: {
				apikey: key,
				Authorization: `Bearer ${key}`,
				"Content-Type": "application/json",
				Prefer: "return=minimal",
			},
			body: JSON.stringify({ doc_type: docType }),
		});
	} catch (err) {
		console.warn("[setDocType] non-fatal:", err instanceof Error ? err.message : err);
	}
}

/**
 * Load a single prism_v4_documents row including doc_type.
 * Returns null when not found.
 */
export async function getDocument(documentId: string): Promise<{
	document_id: string;
	doc_type: "problem" | "notes" | "mixed" | null;
} | null> {
	try {
		const rows = (await supabaseRest("prism_v4_documents", {
			method: "GET",
			select: "document_id,doc_type",
			filters: { document_id: `eq.${documentId}` },
		})) as Array<{ document_id: string; doc_type: string | null }> | null;

		if (!rows || rows.length === 0) return null;
		const row = rows[0];
		return {
			document_id: row.document_id,
			doc_type: (row.doc_type as "problem" | "notes" | "mixed" | null) ?? null,
		};
	} catch {
		return null;
	}
}

/**
 * Load all items for a document from `v4_items`, ordered by item_number.
 *
 * Returns an empty array (never throws) when no items are found so that
 * callers can gracefully fall back to text-based prompts.
 */
export async function getItemsForDocument(documentId: string): Promise<V4Item[]> {
	try {
		const rows = (await supabaseRest("v4_items", {
			method: "GET",
			select: "item_number,type,stem,choices,answer_key,metadata,source_page_numbers",
			filters: {
				document_id: `eq.${documentId}`,
				order:        "item_number.asc",
			},
		})) as Array<{
			item_number: number;
			type: string;
			stem: string;
			choices: unknown;
			answer_key: unknown;
			metadata: Record<string, unknown>;
			source_page_numbers: number[];
		}> | null;

		return (rows ?? []).map((row) => ({
			itemNumber:         row.item_number,
			type:               row.type,
			stem:               row.stem,
			choices:            row.choices,
			answerKey:          row.answer_key,
			metadata:           row.metadata,
			sourcePageNumbers:  row.source_page_numbers,
		}));
	} catch {
		// Non-fatal: fall back to text-based prompts
		return [];
	}
}

// ---------------------------------------------------------------------------
// Option D: LLM segmentation + local semantic pipeline helpers
// ---------------------------------------------------------------------------

export interface SegmentedItem {
	itemNumber: number;
	text: string;
}

export interface SegmentationDiagnostics {
	answerKeyDetected: boolean;
	answerKeyLinesRemoved: number;
	pageFurnitureLinesRemoved: number;
	dedupedItems: number;
	rawItemCount: number;
	finalItemCount: number;
	fallbackUsed: boolean;
}

/**
 * Primary segmentation entry point — hybrid Azure-layout + local-rules.
 * LLM is called ONLY as a last-resort fallback when hybrid returns ≤1 item
 * (i.e. completely unstructured single-block text with no detectable boundaries).
 *
 * This eliminates 429s, retries, and quota windows in the normal (>99%) case.
 */
export async function segmentText(
	azure: { content?: string; paragraphs?: Array<{ text?: string }>; pages?: Array<{ text?: string; pageNumber?: number }> },
): Promise<SegmentedItem[]> {
	const result = await segmentTextWithDiagnostics(azure);
	return result.items;
}

export async function segmentTextWithDiagnostics(
	azure: { content?: string; paragraphs?: Array<{ text?: string }>; pages?: Array<{ text?: string; pageNumber?: number }> },
): Promise<{ items: SegmentedItem[]; diagnostics: SegmentationDiagnostics }> {
	const paras = azure.paragraphs?.length ?? 0;
	const pages = azure.pages?.length ?? 0;
	const chars = azure.content?.length ?? 0;
	console.log(`[segmentText] input: paragraphs=${paras}, pages=${pages}, content=${chars} chars`);

	const hybridResult = hybridSegmentWithDiagnostics(azure);
	const hybrid = hybridResult.items;
	console.log(`[segmentText] hybrid result: ${hybrid.length} item(s)`);

	if (hybrid.length > 1) {
		console.log("[segmentText] ✅ hybrid path — no LLM call");
		return {
			items: hybrid,
			diagnostics: {
				...hybridResult.diagnostics,
				fallbackUsed: false,
			},
		};
	}

	// Hybrid returned ≤1 item — fall back to LLM (optional, quota-limited path)
	const text = azure.content
		?? (azure.paragraphs ?? []).map((p) => p.text ?? "").filter(Boolean).join("\n")
		?? "";

	if (!text.trim()) {
		console.warn("[segmentText] no text available for LLM fallback — returning empty");
		return {
			items: hybrid,
			diagnostics: {
				...hybridResult.diagnostics,
				fallbackUsed: false,
			},
		};
	}

	console.warn(`[segmentText] hybrid ≤1 item — using local fallback (${text.length} chars)`);
	return {
		items: hybrid.length > 0 ? hybrid : _naiveSegmentFallback(text),
		diagnostics: {
			...hybridResult.diagnostics,
			fallbackUsed: true,
		},
	};
}

/**
 * @deprecated Use segmentText(azureExtract) instead.
 * Kept for backward compatibility — calls LLM directly.
 * Will fall back to _naiveSegmentFallback on LLM failure.
 */
export async function segmentTextWithLLM(text: string): Promise<SegmentedItem[]> {
	console.warn("[segmentTextWithLLM] LLM segmentation is disabled — using structural fallback");
	return _naiveSegmentFallback(text);
}

function _naiveSegmentFallback(text: string): SegmentedItem[] {
	console.log("[_naiveSegmentFallback] running line-based fallback segmentation");
	const lines = text.split("\n");
	const segments: SegmentedItem[] = [];
	let current: string[] = [];
	let itemNumber = 0;

	for (const line of lines) {
		if (/^(?:Question\s+\d+|\d+[.)]\s)/.test(line.trim()) && current.length > 0) {
			const t = current.join("\n").trim();
			if (t) segments.push({ itemNumber: ++itemNumber, text: t });
			current = [line];
		} else {
			current.push(line);
		}
	}
	const last = current.join("\n").trim();
	if (last) segments.push({ itemNumber: ++itemNumber, text: last });

	if (segments.length <= 1) {
		console.warn("[_naiveSegmentFallback] could not split text — treating as single item");
		return [{ itemNumber: 1, text: text.trim() }];
	}
	console.log(`[_naiveSegmentFallback] produced ${segments.length} item(s)`);
	return segments;
}

/**
 * Run the local semantic pipeline on a raw text string.
 * Creates a synthetic AzureExtractResult so the pipeline can process it.
 * Returns the first ProblemTagVector, or null on failure.
 */
export async function runSemanticOnText(
	text: string,
	documentId = "synthetic",
): Promise<ProblemTagVector | null> {
	console.log(`[runSemanticOnText] doc=${documentId} wc=${text.split(/\s+/).filter(Boolean).length}`);
	const syntheticExtract: AzureExtractResult = {
		fileName: "segment",
		content: text,
		pages: [{ pageNumber: 1, text }],
		paragraphs: [{ text, pageNumber: 1 }],
		tables: [],
		readingOrder: [],
	};

	try {
		const output = await runSemanticPipeline({
			documentId,
			fileName: "segment",
			azureExtract: syntheticExtract,
		});
		const vec = output.problemVectors?.[0] ?? null;
		console.log(`[runSemanticOnText] doc=${documentId} → ${vec ? "vector OK" : "NO vector (null)"}`);
		return vec;
	} catch (err) {
		console.warn(
			"[runSemanticOnText] pipeline failed:",
			err instanceof Error ? err.message : err,
		);
		return null;
	}
}

/** Local measurable fields mapped from a ProblemTagVector. */
export interface VocabCounts {
	level1: number; // easy (1-syllable)
	level2: number; // moderate (2-syllable)
	level3: number; // difficult (3+ syllable)
}

export interface LocalMeasurables {
	/** Combined vocabulary + word-length score, 0–1. Primary linguistic metric. */
	linguisticLoad: number;
	/** Avg syllable-based vocab level of the item text (1–3). */
	avgVocabLevel: number;
	/** Avg word character length. */
	avgWordLength: number;
	vocabCounts: VocabCounts;
	misconceptionRisk: number;
	distractorDensity: number;
	steps: number;
	timeToProcessSeconds: number;
	wordCount: number;
	confusionScore: number;
	/** Bloom's Taxonomy level (1=Remember … 6=Create). Integer. */
	bloomsLevel: number;
	/** Human-readable Bloom's label for the dominant level. */
	bloomsLabel: string;
	/** Number of sentences in the item text. */
	sentenceCount: number;
	/** Average words per sentence. */
	avgSentenceLength: number;
	/** Density of math/science symbols (0–1). */
	symbolDensity: number;
}

// Phase A: additive-only defaults for newly introduced measurable fields.
export function applyPhaseADefaults(item: SimulationItem): SimulationItem {
	return {
		...item,
		branchingFactor: item.branchingFactor ?? 0,
		scaffoldLevel: item.scaffoldLevel ?? 0,
		ambiguityScore: item.ambiguityScore ?? 0,
		planningLoad: item.planningLoad ?? 0,
		writingMode: item.writingMode ?? "Describe",
		expectedResponseLength: item.expectedResponseLength ?? 0,
		conceptDensity: item.conceptDensity ?? 0,
		reasoningSteps: item.reasoningSteps ?? 0,
		subQuestionCount: item.subQuestionCount ?? 0,
		isMultiPartItem: item.isMultiPartItem ?? false,
		isMultipleChoice: item.isMultipleChoice ?? false,
		distractorCount: item.distractorCount ?? 0,
	};
}

/**
 * Normalize all LocalMeasurables fields to a uniform 0–1 scale for charting.
 *
 * linguisticLoad / misconceptionRisk / distractorDensity / confusionScore are
 * already 0–1. steps and timeToProcessSeconds are converted to bucket curves.
 */
export function normalizeMetrics(m: LocalMeasurables): LocalMeasurables & {
	stepsNormalized: number;
	timeNormalized: number;
} {
	const stepsNormalized =
		m.steps <= 1 ? 0.1 :
		m.steps <= 3 ? 0.3 :
		m.steps <= 5 ? 0.6 : 1.0;

	const minutes = m.timeToProcessSeconds / 60;
	const timeNormalized =
		minutes <= 1 ? 0.2 :
		minutes <= 2 ? 0.4 :
		minutes <= 3 ? 0.6 :
		minutes <= 4 ? 0.8 : 1.0;

	return { ...m, stepsNormalized, timeNormalized };
}

// ---------------------------------------------------------------------------
// Vocab stats (syllable-based)
// ---------------------------------------------------------------------------

function countSyllables(word: string): number {
	return (word.toLowerCase().match(/[aeiouy]+/g) ?? []).length || 1;
}

function syllableVocabLevel(word: string): 1 | 2 | 3 {
	const s = countSyllables(word);
	if (s <= 1) return 1;
	if (s === 2) return 2;
	return 3;
}

export function computeVocabStats(text: string): {
	vocabCounts: VocabCounts;
	avgVocabLevel: number;
	avgWordLength: number;
} {
	const words = text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.split(/\s+/)
		.filter(Boolean);

	if (words.length === 0) {
		return { vocabCounts: { level1: 0, level2: 0, level3: 0 }, avgVocabLevel: 1, avgWordLength: 4 };
	}

	const levels = words.map(syllableVocabLevel);
	const vocabCounts: VocabCounts = {
		level1: levels.filter((l) => l === 1).length,
		level2: levels.filter((l) => l === 2).length,
		level3: levels.filter((l) => l === 3).length,
	};
	const avgVocabLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
	const avgWordLength = words.reduce((a, w) => a + w.length, 0) / words.length;

	return { vocabCounts, avgVocabLevel, avgWordLength };
}

// ---------------------------------------------------------------------------
// Bloom's taxonomy keyword dictionary (deterministic, keyword-first)
// Checked highest → lowest so higher-order verbs are never shadowed by lower ones.
// Default fallback: Understand (level 2) — safest for K-12 items.
// ---------------------------------------------------------------------------
const BLOOMS_KEYWORDS = {
	create:     ["create", "design", "construct", "develop", "formulate", "compose", "invent", "generate", "produce", "plan", "build", "propose"],
	evaluate:   ["evaluate", "justify", "critique", "argue", "assess", "defend", "support", "judge", "recommend", "prioritize", "verify", "validate", "debate"],
	analyze:    ["analyze", "differentiate", "categorize", "examine", "investigate", "organize", "structure", "attribute", "diagram", "map", "inspect", "compare", "contrast"],
	apply:      ["apply", "use", "solve", "compute", "calculate", "demonstrate", "perform", "execute", "implement", "operate", "model", "show", "carry out"],
	understand: ["explain", "summarize", "describe", "interpret", "classify", "paraphrase", "outline", "discuss", "report", "restate", "illustrate"],
	remember:   ["identify", "list", "define", "recall", "name", "label", "match", "select", "state", "recognize", "repeat", "choose", "find", "underline", "point", "circle", "highlight"],
} as const;

/**
 * Derive Bloom's level (1–6) from keyword matching only.
 * Independent of vec.steps or any procedural-complexity metric.
 * Checked highest → lowest; first match wins.
 * Default: 2 (Understand) — safe fallback for K-12 items.
 */
function computeBloomsLevel(text: string): { level: number; label: string } {
	const lower = text.toLowerCase();
	const hit = (kws: readonly string[]) => kws.some((kw) => lower.includes(kw));
	if (hit(BLOOMS_KEYWORDS.create))     return { level: 6, label: "Create" };
	if (hit(BLOOMS_KEYWORDS.evaluate))   return { level: 5, label: "Evaluate" };
	if (hit(BLOOMS_KEYWORDS.analyze))    return { level: 4, label: "Analyze" };
	if (hit(BLOOMS_KEYWORDS.apply))      return { level: 3, label: "Apply" };
	if (hit(BLOOMS_KEYWORDS.understand)) return { level: 2, label: "Understand" };
	if (hit(BLOOMS_KEYWORDS.remember))   return { level: 1, label: "Remember" };
	return { level: 2, label: "Understand" };
}

// ---------------------------------------------------------------------------
// Sentence and symbol helpers
// ---------------------------------------------------------------------------

function computeSentenceStats(text: string): { sentenceCount: number; avgSentenceLength: number } {
	const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
	const sentenceCount = Math.max(1, sentences.length);
	const wordCount = text.split(/\s+/).filter(Boolean).length;
	return { sentenceCount, avgSentenceLength: Math.round((wordCount / sentenceCount) * 10) / 10 };
}

function computeSymbolDensity(text: string): number {
	if (!text) return 0;
	const symbols = (text.match(/[+\-*/=<>()[\]{}\^%÷×∑∫√≤≥≠±]/g) ?? []).length;
	return Math.min(symbols / Math.max(text.length, 1), 1);
}

/**
 * Map a ProblemTagVector (from local semantic pipeline) to the full measurables
 * object. Replaces values previously generated by LLM.
 */
export function vectorToMeasurables(vec: ProblemTagVector, text: string): LocalMeasurables {
	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	const wordCount = text.split(/\s+/).filter(Boolean).length || 10;
	const steps = Math.max(1, Math.round(vec.steps ?? 1));
	const timeToProcessSeconds = Math.max(5, Math.round(wordCount / 3.3 + steps * 8));

	const triggerValues = Object.values(vec.misconceptionTriggers ?? {});
	const misconceptionRisk = clamp(triggerValues.length > 0 ? Math.max(...triggerValues) : 0);
	const distractorDensity = clamp(vec.distractorDensity ?? 0);

	// Linguistic load: syllable-based vocab difficulty + avg word length.
	const { vocabCounts, avgVocabLevel, avgWordLength } = computeVocabStats(text);
	const normalizedVocab = (avgVocabLevel - 1) / 2;          // 1–3 → 0–1
	const normalizedWordLen = Math.min(avgWordLength / 10, 1); // 10+ chars = max
	const linguisticLoad = clamp(0.6 * normalizedVocab + 0.4 * normalizedWordLen);

	const { level: bloomsLevel, label: bloomsLabel } = computeBloomsLevel(text);
	const { sentenceCount, avgSentenceLength } = computeSentenceStats(text);
	const symbolDensity = computeSymbolDensity(text);

	return {
		linguisticLoad,
		avgVocabLevel,
		avgWordLength,
		vocabCounts,
		misconceptionRisk,
		distractorDensity,
		steps,
		timeToProcessSeconds,
		wordCount,
		confusionScore: computeConfusionScore(
			{ linguisticLoad, distractorDensity, steps, timeToProcessSeconds },
			{ misconceptionRisk },
		),
		bloomsLevel,
		bloomsLabel,
		sentenceCount,
		avgSentenceLength,
		symbolDensity,
	};
}
