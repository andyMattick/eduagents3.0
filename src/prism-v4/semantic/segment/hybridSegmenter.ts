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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Segment an Azure extract into discrete assessment items using layout +
 * local rules. Returns an empty array only when the extract is completely empty.
 */
export function hybridSegment(azure: AzureExtractLike): HybridSegmentItem[] {
	const blocks = collectBlocks(azure);
	console.log(`[hybridSegment] source: ${azure.paragraphs?.length ? `paragraphs(${azure.paragraphs.length})` : azure.pages?.length ? `pages(${azure.pages.length})` : "content"} → ${blocks.length} block(s)`);
	if (blocks.length === 0) {
		console.warn("[hybridSegment] no text blocks found in azure extract");
		return [];
	}

	const rawItems = applyBoundaryRules(blocks);
	console.log(`[hybridSegment] boundary rules → ${rawItems.length} raw item(s)`);

	const before_dedup = rawItems.length;
	const result = dedup(rawItems).filter((i) => i.text.trim().length > 20);
	if (result.length < before_dedup) {
		console.log(`[hybridSegment] dedup+filter removed ${before_dedup - result.length} fragment(s)`);
	}
	console.log(`[hybridSegment] final: ${result.length} item(s)`);
	return result;
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

function applyBoundaryRules(blocks: string[]): HybridSegmentItem[] {
	const items: HybridSegmentItem[] = [];
	let buffer: string[] = [];
	let itemNumber = 1;

	const flush = () => {
		const t = buffer.join("\n").trim();
		if (t.length > 0) {
			items.push({ itemNumber: itemNumber++, text: t });
		}
		buffer = [];
	};

	for (const block of blocks) {
		const lines = block.split("\n");

		for (const line of lines) {
			if (isHardBoundary(line)) {
				flush();
				buffer = [line];
			} else if (isSoftBoundary(line)) {
				flush();
				// Blank line — don't seed next buffer with it
			} else {
				buffer.push(line);
			}
		}
	}

	flush();
	return items;
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
