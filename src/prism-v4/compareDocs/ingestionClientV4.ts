/**
 * ingestionClientV4.ts — Compare-Docs ingestion adapter
 *
 * Isolated ingestion path for Compare-Docs. Calls the same Azure extraction
 * pipeline as the main teacher-upload flow but returns a Compare-Docs-typed
 * result without touching the session or Supabase registry.
 *
 * Enforces PDF-only at this boundary so Compare-Docs never receives non-PDF
 * content regardless of how the caller obtained the buffer.
 */

import path from "path";

import { runAzureExtraction } from "../ingestion/azure/azureExtractor";
import { normalizeAzureLayout } from "../ingestion/azure/azureNormalizer";
import { mapAzureToCanonical } from "../ingestion/normalize/structureMapper";
import { cleanText } from "../ingestion/normalize/textCleaner";

export interface V4Segment {
	id: string;
	text: string;
	pageIndex: number;
	order: number;
	role?: string;
	concepts?: string[];
	metadata?: Record<string, unknown>;
}

export interface V4IngestionResult {
	documentId: string;
	fileName: string;
	segments: V4Segment[];
	pageCount: number;
	rawContent: string;
}

function isPdf(fileName: string, mimeType?: string): boolean {
	const ext = path.extname(fileName).toLowerCase();
	return (
		ext === ".pdf" &&
		(!mimeType || mimeType === "application/pdf" || mimeType === "application/octet-stream")
	);
}

function createDocumentId(fileName: string): string {
	const stem = path
		.basename(fileName, path.extname(fileName))
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	const suffix = Math.random().toString(36).slice(2, 10);
	return `${stem || "document"}-${suffix}`;
}

/**
 * Ingest a single PDF buffer through the v4 Azure extraction pipeline and
 * return a flat segments list suitable for the Compare-Docs adapter.
 *
 * @throws if the file is not a PDF or if Azure extraction fails.
 */
export async function ingestDocumentV4(
	fileBuffer: Buffer,
	filename: string,
	mimeType?: string,
): Promise<V4IngestionResult> {
	if (!isPdf(filename, mimeType)) {
		throw new Error(
			`Compare-Docs requires a PDF with selectable text. "${filename}" is not a supported format.`,
		);
	}

	const rawAzure = await runAzureExtraction(fileBuffer, "application/pdf");
	const normalizedAzure = normalizeAzureLayout(rawAzure);
	const canonical = mapAzureToCanonical(normalizedAzure, filename);

	const documentId = createDocumentId(filename);

	// Derive flat segments from paragraphs (most precise) or reading-order
	// fallback, then page text as a last resort.
	const segments: V4Segment[] = [];

	const paragraphs = canonical.paragraphs ?? [];
	if (paragraphs.length > 0) {
		for (const [index, para] of paragraphs.entries()) {
			const text = cleanText(para.text ?? "");
			if (!text) continue;
			segments.push({
				id: `${documentId}-para-${index}`,
				text,
				pageIndex: (para.pageNumber ?? 1) - 1,
				order: index,
				role: para.role ?? undefined,
				metadata: { source: "paragraph" },
			});
		}
	} else {
		const readingOrder = canonical.readingOrder ?? [];
		for (const [index, entry] of readingOrder.entries()) {
			const text = cleanText(typeof entry === "string" ? entry : "");
			if (!text) continue;
			segments.push({
				id: `${documentId}-ro-${index}`,
				text,
				pageIndex: 0,
				order: index,
				metadata: { source: "reading-order" },
			});
		}
	}

	// If neither source produced segments, fall back to page-level text blocks.
	if (segments.length === 0) {
		for (const [index, page] of canonical.pages.entries()) {
			const text = cleanText(page.text ?? "");
			if (!text) continue;
			segments.push({
				id: `${documentId}-page-${index}`,
				text,
				pageIndex: index,
				order: index,
				metadata: { source: "page" },
			});
		}
	}

	return {
		documentId,
		fileName: filename,
		segments,
		pageCount: canonical.pages.length,
		rawContent: cleanText(canonical.content ?? ""),
	};
}
