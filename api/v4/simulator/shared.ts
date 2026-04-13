/**
 * api/v4/simulator/shared.ts — Shared utilities for simulator routes
 *
 * Text retrieval: queries prism_v4_documents (already extracted during upload)
 * and flattens all canonical node text for a session.  Zero pipeline dependency —
 * we are only reading already-stored text, not re-processing anything.
 *
 * Profile formatting: turns a StudentProfile into an LLM-readable paragraph.
 */

import { hasSupabaseServiceRoleCredentials, supabaseRest } from "../../../lib/supabase";
import type { StudentProfile } from "../../../src/types/simulator";

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
	const rows = (await supabaseRest("prism_v4_documents", {
		select: "document_id,canonical_document,azure_extract,source_file_name",
		filters: { session_id: `eq.${sessionId}` },
	})) as SupabaseDocumentRow[] | null;

	const docs: string[] = [];

	for (const row of rows ?? []) {
		const text = extractTextFromRow(row);
		if (text) docs.push(text);
	}

	return { text: docs.join("\n\n---\n\n"), docCount: docs.length };
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
Given a test and multiple student profiles, simulate how EACH student would experience the assessment.

For EACH student profile:
- simulate cognitive load per item
- identify confusion points
- estimate pacing and time pressure
- identify attention drift
- estimate emotional responses (frustration, confidence dips, fatigue)
- identify likely misconceptions
- evaluate reading load, vocabulary difficulty, and clarity
- identify red flags and time risks
- when notes/explanatory sections are present, evaluate per-section reading load, vocabulary difficulty, cognitive load, confusion risk, fatigue risk, and red flags

Then produce a CROSS-STUDENT COMPARISON showing:
- which items are universally difficult (high cognitive load across ALL profiles)
- which items disproportionately affect certain profiles (e.g. ADHD, dyslexia, ELL, low confidence)
- where pacing diverges most
- where cognitive load variance is highest across profiles

IMPORTANT: All numeric fields (readingLoad, vocabularyDifficulty, cognitiveLoad, confusionRisk, misconceptionRisk, fatigueRisk, pacingRisk) MUST be decimals between 0.0 and 1.0. Do NOT use percentages.

After completing the simulation, produce a final section called "rewriteSuggestions" inside the DATA JSON (top-level, alongside "students" and "comparison").
Rewrite suggestions must be grounded ONLY in the metrics you generated:
- high cognitiveLoad
- high confusionRisk
- high readingLoad
- high vocabularyDifficulty
- high misconceptionRisk
- long timeToProcessSeconds
- profile-specific difficulty patterns (items that disproportionately affect certain profiles)

Rules for suggestions:
- Suggestions must be actionable and teacher-friendly.
- Suggestions must NOT rewrite the item directly.
- Suggestions must NOT introduce new content.
- Focus on clarity, pacing, cognitive load, vocabulary, and fairness.
- testLevel: 2–5 whole-assessment suggestions.
- itemLevel: only include items that scored high on risk metrics.

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
          "readingLoad": number (0.0–1.0),
          "wordCount": number,
          "sentenceCount": number,
          "vocabularyDifficulty": number (0.0–1.0),
          "cognitiveLoad": number (0.0–1.0),
          "confusionRisk": number (0.0–1.0),
          "timeToProcessSeconds": number,
          "misconceptionRisk": number (0.0–1.0),
          "redFlags": [string]
        }
      ],
			"sections": [
				{
					"sectionId": string,
					"readingLoad": number (0.0–1.0),
					"vocabularyDifficulty": number (0.0–1.0),
					"cognitiveLoad": number (0.0–1.0),
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
        "majorRedFlags": [string]
      }
    }
  },
  "comparison": {
    "universallyDifficultItems": [number],
    "profileSpecificRisks": {
      "PROFILE_NAME": [number]
    },
    "itemDifficultySpread": {
      "ITEM_NUMBER": {
        "min": number,
        "max": number,
        "variance": number
      }
    }
  },
  "rewriteSuggestions": {
    "testLevel": [string],
    "itemLevel": {
      "ITEM_NUMBER": [string]
    }
  }
}

USER:
Here is the test:
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
 * every subsequent LLM route (simulator, rewrite, preparedness) can load items
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
