/**
 * v4Adapter.ts — Compare-Docs v4 ingestion adapter
 *
 * Maps a V4IngestionResult (from ingestionClientV4) to the Compare-Docs
 * internal document model. Applies mode filtering so downstream comparison
 * logic only sees the segment class the caller requested.
 *
 * Mode semantics (v4 edition):
 *   "all"      — all non-empty segments (default)
 *   "prep"     — teacher-facing segments: titled sections, headings, note-
 *                 role paragraphs, and explanatory paragraphs that do NOT look
 *                 like questions.
 *   "practice" — student-facing segments: paragraphs that appear to be
 *                 questions or problem stems (contain "?" or numbered prompts).
 *
 * No Simulation code is imported here. This adapter is Compare-Docs-only.
 */

import type { V4IngestionResult, V4Segment } from "./ingestionClientV4";

export type CompareDocsMode = "all" | "prep" | "practice";

export interface CompareDocsItem {
	id: string;
	text: string;
	pageIndex: number;
	order: number;
	concepts: string[];
	metadata: Record<string, unknown>;
}

export interface CompareDocsDocument {
	documentId: string;
	fileName: string;
	items: CompareDocsItem[];
	pageCount: number;
	mode: CompareDocsMode;
	/** Raw ingestion result retained for debug / downstream use. */
	raw: V4IngestionResult;
}

// Azure paragraph roles treated as teacher-facing prep content.
const PREP_ROLES = new Set(["title", "sectionHeading", "footnote", "pageHeader", "pageFooter"]);

/**
 * Returns true when the segment looks like a student-facing practice item
 * (question or numbered problem stem).
 */
function isPracticeSegment(seg: V4Segment): boolean {
	const text = seg.text.trim();
	// Direct question mark
	if (text.includes("?")) return true;
	// Numbered problem stem pattern: "1.", "1)", "a.", "a)"
	if (/^[0-9]+[.)]\s/.test(text) || /^[a-z][.)]\s/i.test(text)) return true;
	return false;
}

/**
 * Returns true when the segment looks like teacher-facing prep content.
 */
function isPrepSegment(seg: V4Segment): boolean {
	if (seg.role && PREP_ROLES.has(seg.role)) return true;
	// Section headings tend to be short and title-cased
	const text = seg.text.trim();
	if (text.length < 120 && /^[A-Z]/.test(text) && !text.includes("?")) return true;
	return false;
}

function applyModeFilter(
	segments: V4Segment[],
	mode: CompareDocsMode,
): V4Segment[] {
	if (mode === "all") return segments;
	if (mode === "practice") return segments.filter(isPracticeSegment);
	// prep
	return segments.filter((seg) => isPrepSegment(seg) && !isPracticeSegment(seg));
}

function segmentToItem(seg: V4Segment, index: number): CompareDocsItem {
	return {
		id: seg.id ?? `seg-${index}`,
		text: seg.text,
		pageIndex: seg.pageIndex,
		order: seg.order ?? index,
		concepts: seg.concepts ?? [],
		metadata: {
			...(seg.metadata ?? {}),
			role: seg.role ?? null,
		},
	};
}

/**
 * Map a V4IngestionResult to a CompareDocsDocument, applying mode filtering.
 *
 * Returns an error string (non-throwing) if the filtered items list is empty
 * so callers can surface the appropriate user message.
 */
export function mapV4ToCompareDocsDoc(
	v4: V4IngestionResult,
	mode: CompareDocsMode = "all",
): CompareDocsDocument {
	const segments = Array.isArray(v4.segments) ? v4.segments : [];
	const modeFiltered = applyModeFilter(segments, mode);
	const items = modeFiltered
		.filter((seg) => seg.text.trim().length > 0)
		.map(segmentToItem);

	return {
		documentId: v4.documentId,
		fileName: v4.fileName,
		items,
		pageCount: v4.pageCount,
		mode,
		raw: v4,
	};
}

/**
 * Build the rewrite payload shape expected by the existing rewrite engine.
 * Compare-Docs passes this to navigate("/rewrite", { state: { items } }).
 */
export function buildRewritePayload(
	items: CompareDocsItem[],
): Array<{ id: string; text: string; order: number; pageIndex: number }> {
	return items.map(({ id, text, order, pageIndex }) => ({
		id,
		text,
		order,
		pageIndex,
	}));
}
