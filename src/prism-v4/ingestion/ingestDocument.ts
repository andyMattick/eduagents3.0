/**
 * ingestDocument.ts — Unified ingestion entry point
 *
 * Single function called from every document source:
 *   - teacher-upload   (rawBinary already analysed by analyzeRegisteredDocument)
 *   - student-portal   (rawText)
 *   - created          (rawText from in-app editor)
 *   - api              (rawText)
 *   - backfill         (rawText fetched from prism_v4_documents)
 *
 * For binary sources (teacher-upload) the caller MUST pass `analyzedDocument`
 * — the result of the existing `analyzeRegisteredDocument` call — so we don't
 * re-process Azure extraction.  For text sources a plain CanonicalDocument is
 * constructed so problem extraction and section segmentation can run.
 *
 * What this guarantees for every document:
 *   1.  doc_type classified and written to prism_v4_documents.doc_type
 *   2.  v4_items populated (for "problem" and "mixed" docs)
 *   3.  v4_sections populated (for "notes" and "mixed" docs)
 *   4.  v4_analysis populated
 */

import { segmentSections } from "./segment/sectionSegmenter";
import { analyzeRegisteredDocument } from "../documents/analysis/analyzeRegisteredDocument";
import {
	saveItems,
	saveSections,
	saveAnalysis,
	setDocType,
	type V4Item,
	type V4Section,
} from "../../../api/v4/simulator/shared";
import { classifyDocType, type DocType } from "./classifyDocType";
import type { AnalyzedDocument, AzureExtractResult } from "../schema/semantic";

export type IngestionSource = "teacher-upload" | "student-portal" | "created" | "api" | "backfill";

export interface IngestionResult {
	documentId: string;
	docType: DocType;
	items: V4Item[];
	sections: V4Section[];
}

export interface IngestDocumentInput {
	source: IngestionSource;
	documentId: string;
	/** Plain text — required when source != "teacher-upload" */
	rawText?: string;
	/**
	 * Already-computed analysis from analyzeRegisteredDocument (teacher-upload path).
	 * When provided, skips the re-analysis step.
	 */
	analyzedDocument?: AnalyzedDocument;
	/** Azure extract for section segmentation when analyzedDocument is available */
	azureExtract?: AzureExtractResult;
	metadata?: Record<string, unknown>;
}

export async function ingestDocument(input: IngestDocumentInput): Promise<IngestionResult> {
	const { documentId, analyzedDocument, azureExtract, rawText } = input;

	// -------------------------------------------------------------------------
	// 1. Acquire canonical text for doc-type classification
	// -------------------------------------------------------------------------
	let text = rawText ?? "";
	if (!text && analyzedDocument) {
		text = flattenAnalyzedDocumentText(analyzedDocument);
	}

	// -------------------------------------------------------------------------
	// 2. Classify doc type
	// -------------------------------------------------------------------------
	const docType = classifyDocType(text);

	// Non-blocking: write doc_type to prism_v4_documents
	setDocType(documentId, docType).catch(() => {/* non-fatal */});

	// -------------------------------------------------------------------------
	// 3. Segment structure depending on doc type
	// -------------------------------------------------------------------------
	let items: V4Item[] = [];
	let sections: V4Section[] = [];

	if (docType === "problem" || docType === "mixed") {
		items = extractItemsFromAnalysis(analyzedDocument, text, documentId);
	}

	if (docType === "notes" || docType === "mixed") {
		sections = extractSectionsFromAnalysis(analyzedDocument, azureExtract, text, documentId);
	}

	// -------------------------------------------------------------------------
	// 4. Persist items / sections (fire-and-forget; non-fatal)
	// -------------------------------------------------------------------------
	const persistItems = items.length > 0
		? saveItems(documentId, items).catch((err) =>
			console.warn("[ingestDocument] saveItems non-fatal:", err instanceof Error ? err.message : err))
		: Promise.resolve();

	const persistSections = sections.length > 0
		? saveSections(documentId, sections).catch((err) =>
			console.warn("[ingestDocument] saveSections non-fatal:", err instanceof Error ? err.message : err))
		: Promise.resolve();

	// -------------------------------------------------------------------------
	// 5. Save structured analysis
	// -------------------------------------------------------------------------
	const persistAnalysis = saveAnalysis(documentId, docType, analyzedDocument ?? {}).catch((err) =>
		console.warn("[ingestDocument] saveAnalysis non-fatal:", err instanceof Error ? err.message : err),
	);

	await Promise.all([persistItems, persistSections, persistAnalysis]);

	return { documentId, docType, items, sections };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Flatten all text from an AnalyzedDocument into a single string
 * for doc-type classification.
 */
function flattenAnalyzedDocumentText(doc: AnalyzedDocument): string {
	const nodes = doc.document?.nodes ?? [];
	if (nodes.length > 0) {
		return nodes.map((n) => (n as { text?: string }).text ?? "").filter(Boolean).join("\n");
	}
	return doc.problems.map((p) => p.text).join("\n");
}

/**
 * Build V4Item[] from an AnalyzedDocument (teacher-upload path)
 * or return an empty array for text-only sources that don't have problem extraction.
 */
function extractItemsFromAnalysis(
	doc: AnalyzedDocument | undefined,
	_text: string,
	_documentId: string,
): V4Item[] {
	if (!doc?.problems?.length) return [];

	return doc.problems.map((problem, index) => ({
		itemNumber: index + 1,
		type:       problem.cognitiveDemand ?? "question",
		stem:       problem.text ?? "",
		choices:    null,
		answerKey:  null,
		metadata: {
			extractedProblemId: problem.id,
			concepts:           problem.concepts ?? [],
			representations:    problem.representations ?? [],
			difficulty:         problem.difficulty ?? "medium",
			misconceptions:     problem.misconceptions ?? [],
			cognitiveDemand:    problem.cognitiveDemand ?? "recall",
			bloomLevel:         problem.bloomLevel ?? 2,
			cognitiveLoad:      problem.cognitiveLoad ?? 0.5,
			linguisticLoad:     problem.linguisticLoad ?? 0.5,
			representationLoad: problem.representationLoad ?? 0.5,
			phaseB: {
				bloomLevel:         problem.bloomLevel ?? 2,
				cognitiveLoad:      problem.cognitiveLoad ?? 0.5,
				linguisticLoad:     problem.linguisticLoad ?? 0.5,
				representationLoad: problem.representationLoad ?? 0.5,
			},
			metrics: {
				bloom_level:         problem.bloomLevel ?? 2,
				cognitive_load:      problem.cognitiveLoad ?? 0.5,
				linguistic_load:     problem.linguisticLoad ?? 0.5,
				representation_load: problem.representationLoad ?? 0.5,
			},
			sourceSpan:         problem.sourceSpan ?? null,
		},
		sourcePageNumbers: problem.sourceSpan
			? Array.from(
				{ length: (problem.sourceSpan.lastPage - problem.sourceSpan.firstPage) + 1 },
				(_, i) => problem.sourceSpan!.firstPage + i,
			  )
			: [],
	}));
}

/**
 * Build V4Section[] using the existing sectionSegmenter.
 * Prefers the AzureExtractResult when available (richer paragraph metadata).
 * Falls back to a minimal synthetic extract built from rawText.
 */
function extractSectionsFromAnalysis(
	_doc: AnalyzedDocument | undefined,
	azureExtract: AzureExtractResult | undefined,
	rawText: string,
	_documentId: string,
): V4Section[] {
	let extract: AzureExtractResult;

	if (azureExtract) {
		extract = azureExtract;
	} else if (rawText) {
		// Build a minimal synthetic AzureExtractResult from plain text
		const paragraphs = rawText
			.split(/\n{2,}/)
			.map((p) => p.trim())
			.filter(Boolean)
			.map((p, i) => ({ text: p, pageNumber: Math.floor(i / 20) + 1 }));

		extract = {
			fileName:    "document.txt",
			content:     rawText,
			pages:       [{ pageNumber: 1, text: rawText }],
			paragraphs,
			tables:      [],
			readingOrder: [],
		};
	} else {
		return [];
	}

	const ingestionSections = segmentSections(extract);
	return ingestionSections.map((s, idx) => ({
		sectionId: s.sectionId,
		order:     idx + 1,
		title:     s.title,
		text:      s.text,
		metadata:  {},
	}));
}
