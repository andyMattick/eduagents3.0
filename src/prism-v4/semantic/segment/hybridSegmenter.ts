/**
 * src/prism-v4/semantic/segment/hybridSegmenter.ts
 *
 * Hybrid Azure-layout + local-rules segmenter.
 *
 * Uses Azure paragraph/page structure as the primary source of text blocks,
 * then applies local boundary-detection rules (numbered stems, question stems,
 * blank-line flushing) to split those blocks into discrete assessment items.
 *
 * Zero Gemini dependency. Deterministic. No quota windows. No retries.
 *
 * Architecture:
 *   collectBlocks(azure)  → paragraphs > pages > content-split
 *   applyBoundaryRules()  → hard boundary = new item, soft boundary = flush
 *   dedup()               → remove OCR-repeated 80-char-prefix matches
 *   filter                → drop fragments shorter than 20 chars
 */

/** Permissive input type — matches Supabase-stored azure_extract as well as AzureExtractResult. */
export interface AzureExtractLike {
	content?: string;
	paragraphs?: Array<{ text?: string }>;
	pages?: Array<{ text?: string; pageNumber?: number }>;
}

export interface HybridSegmentItem {
	itemNumber: number;
	text: string;
}

export interface HybridSegmentationDiagnostics {
	answerKeyDetected: boolean;
	answerKeyLinesRemoved: number;
	pageFurnitureLinesRemoved: number;
	dedupedItems: number;
	rawItemCount: number;
	finalItemCount: number;
}

const ANSWER_KEY_HEADING_RE = /^\s*(?:#+\s*)?answer\s*key\b[:\-]?\s*$/i;
const ANSWER_KEY_ENTRY_RE = /^\s*\d{1,3}\.\s*([A-E])\s*(?:[\).,:;\-]?\s*)?$/i;
const PAGE_FOOTER_PATTERNS = [
	/^\s*page\s+\d+\s*$/i,
	/^\s*spring exam review\s+page\s+\d+\s*$/i,
] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Segment an Azure extract into discrete assessment items using layout +
 * local rules. Returns an empty array only when the extract is completely empty.
 */
export function hybridSegment(azure: AzureExtractLike): HybridSegmentItem[] {
	return hybridSegmentWithDiagnostics(azure).items;
}

export function hybridSegmentWithDiagnostics(azure: AzureExtractLike): {
	items: HybridSegmentItem[];
	diagnostics: HybridSegmentationDiagnostics;
} {
	const blocks = collectBlocks(azure);
	console.log(`[hybridSegment] source: ${azure.paragraphs?.length ? `paragraphs(${azure.paragraphs.length})` : azure.pages?.length ? `pages(${azure.pages.length})` : "content"} → ${blocks.length} block(s)`);
	if (blocks.length === 0) {
		console.warn("[hybridSegment] no text blocks found in azure extract");
		return {
			items: [],
			diagnostics: {
				answerKeyDetected: false,
				answerKeyLinesRemoved: 0,
				pageFurnitureLinesRemoved: 0,
				dedupedItems: 0,
				rawItemCount: 0,
				finalItemCount: 0,
			},
		};
	}

	const boundary = applyBoundaryRules(blocks);
	const rawItems = boundary.items;
	console.log(`[hybridSegment] boundary rules → ${rawItems.length} raw item(s)`);

	const before_dedup = rawItems.length;
	const result = dedup(rawItems).filter((i) => i.text.trim().length > 20);
	if (result.length < before_dedup) {
		console.log(`[hybridSegment] dedup+filter removed ${before_dedup - result.length} fragment(s)`);
	}
	console.log(`[hybridSegment] final: ${result.length} item(s)`);
	return {
		items: result,
		diagnostics: {
			answerKeyDetected: boundary.answerKeyDetected,
			answerKeyLinesRemoved: boundary.answerKeyLinesRemoved,
			pageFurnitureLinesRemoved: boundary.pageFurnitureLinesRemoved,
			dedupedItems: Math.max(0, before_dedup - result.length),
			rawItemCount: rawItems.length,
			finalItemCount: result.length,
		},
	};
}

// ---------------------------------------------------------------------------
// Step 1 — collect text blocks from Azure structure
// ---------------------------------------------------------------------------

function collectBlocks(azure: AzureExtractLike): string[] {
	// Prefer paragraphs — they are already layout-segmented by Azure
	if (azure.paragraphs && azure.paragraphs.length > 0) {
		console.log(`[hybridSegment:collectBlocks] using azure.paragraphs (${azure.paragraphs.length} entries)`);
		return azure.paragraphs
			.map((p) => normalizeWhitespace(p.text ?? ""))
			.filter(Boolean);
	}

	// Fall back to page text
	if (azure.pages && azure.pages.length > 0) {
		console.log(`[hybridSegment:collectBlocks] using azure.pages (${azure.pages.length} page(s))`);
		return azure.pages
			.map((p) => normalizeWhitespace(p.text ?? ""))
			.filter(Boolean);
	}

	// Last resort — split the content string on double newlines
	if (azure.content) {
		console.log(`[hybridSegment:collectBlocks] using azure.content (${azure.content.length} chars) — splitting on double newline`);
		return azure.content
			.split(/\n{2,}/)
			.map(normalizeWhitespace)
			.filter(Boolean);
	}

	console.warn("[hybridSegment:collectBlocks] azure extract has no paragraphs/pages/content");
	return [];
}

function normalizeWhitespace(s: string): string {
	// Collapse runs of spaces/tabs but preserve newlines
	return s.replace(/[ \t]+/g, " ").trim();
}

function isPageFurnitureLine(line: string): boolean {
	return PAGE_FOOTER_PATTERNS.some((pattern) => pattern.test(line));
}

// ---------------------------------------------------------------------------
// Step 2 — boundary rules → items
// ---------------------------------------------------------------------------

/**
 * Hard boundary — starts a NEW item and becomes the first line of the next buffer.
 * Examples: "1." / "1)" / "Question 3"
 */
function isHardBoundary(line: string): boolean {
	const t = line.trim();
	if (!t) return false;

	// Numbered item: "1." / "1)" / "12."  (up to 3 digits)
	if (/^\d{1,3}[\.)]\s/.test(t)) return true;

	// Explicit question header
	if (/^Question\s+\d+/i.test(t)) return true;

	return false;
}

/**
 * Soft boundary — FLUSHES current buffer but does not seed the next one.
 * Blank lines fall here — they act as paragraph separators.
 */
function isSoftBoundary(line: string): boolean {
	return line.trim() === "";
}

function applyBoundaryRules(blocks: string[]): {
	items: HybridSegmentItem[];
	answerKeyDetected: boolean;
	answerKeyLinesRemoved: number;
	pageFurnitureLinesRemoved: number;
} {
	const items: HybridSegmentItem[] = [];
	let buffer: string[] = [];
	let itemNumber = 1;
	let inAnswerKeyRegion = false;
	let answerKeyDetected = false;
	let pendingAnswerKeyEntries: string[] = [];
	let answerKeyLinesRemoved = 0;
	let pageFurnitureLinesRemoved = 0;

	const flush = () => {
		const t = buffer.join("\n").trim();
		if (t.length > 0) {
			items.push({ itemNumber: itemNumber++, text: t });
		}
		buffer = [];
	};

	const applySegmentationRules = (line: string) => {
		if (isHardBoundary(line)) {
			flush();
			buffer = [line];
		} else if (isSoftBoundary(line)) {
			flush();
			// Blank line — don't seed next buffer with it
		} else {
			buffer.push(line);
		}
	};

	for (const block of blocks) {
		const lines = block.split("\n");

		for (const rawLine of lines) {
			const line = normalizeWhitespace(rawLine);

			if (!line) {
				continue;
			}

			if (isPageFurnitureLine(line)) {
				pageFurnitureLinesRemoved += 1;
				continue;
			}

			if (inAnswerKeyRegion) {
				answerKeyLinesRemoved += 1;
				continue;
			}

			if (ANSWER_KEY_HEADING_RE.test(line)) {
				inAnswerKeyRegion = true;
				answerKeyDetected = true;
				answerKeyLinesRemoved += 1;
				pendingAnswerKeyEntries = [];
				continue;
			}

			if (ANSWER_KEY_ENTRY_RE.test(line)) {
				pendingAnswerKeyEntries.push(line);
				if (pendingAnswerKeyEntries.length >= 3) {
					inAnswerKeyRegion = true;
					answerKeyDetected = true;
					answerKeyLinesRemoved += pendingAnswerKeyEntries.length;
					pendingAnswerKeyEntries = [];
				}
				continue;
			}

			if (pendingAnswerKeyEntries.length > 0) {
				for (const pendingLine of pendingAnswerKeyEntries) {
					applySegmentationRules(pendingLine);
				}
				pendingAnswerKeyEntries = [];
			}

			applySegmentationRules(line);
		}
	}

	if (!inAnswerKeyRegion && pendingAnswerKeyEntries.length > 0) {
		for (const pendingLine of pendingAnswerKeyEntries) {
			applySegmentationRules(pendingLine);
		}
	}

	flush();
	return {
		items,
		answerKeyDetected,
		answerKeyLinesRemoved,
		pageFurnitureLinesRemoved,
	};
}

// ---------------------------------------------------------------------------
// Step 3 — deduplication (OCR repeats)
// ---------------------------------------------------------------------------

function dedup(items: HybridSegmentItem[]): HybridSegmentItem[] {
	const seen = new Set<string>();
	const out: HybridSegmentItem[] = [];

	for (const item of items) {
		const key = item.text.slice(0, 80);
		if (!seen.has(key)) {
			seen.add(key);
			out.push(item);
		} else {
			console.log(`[hybridSegment:dedup] dropped duplicate: "${key.substring(0, 40)}…"`);
		}
	}

	// Re-number sequentially after dedup
	return out.map((item, i) => ({ ...item, itemNumber: i + 1 }));
}
