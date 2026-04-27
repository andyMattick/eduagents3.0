import type { AnalyzedDocument } from "../schema/semantic";
import type { AssessmentPreviewItemModel, ConceptMapModel } from "../session/InstructionalIntelligenceSession";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConceptRegistry {
	/** Concepts that appear in at least one extracted problem — the ground truth set. */
	canonical: Set<string>;
	/** Concepts only referenced in preview items or graph nodes — never in problem.concepts. */
	noise: Set<string>;
	/** For each noise concept: the closest canonical concept, or null if no match. */
	mapToCanonical: Map<string, string | null>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeKey(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Patterns that indicate a concept is actually a document section title, not
// a real instructional concept (e.g. "Chapter 9 Review", "Section 4.2").
const TITLE_PATTERN = /^(chapter|section|unit|module|lesson|part)\s+[\d.]+/i;

function isDocumentTitleConcept(concept: string): boolean {
	return TITLE_PATTERN.test(concept.trim());
}

/**
 * Try to find a canonical concept whose tail segment (last dot-separated part)
 * or whose full slug (dots → spaces) matches the noise concept string.
 * Returns the first match, or null if none.
 */
function findCanonicalMatch(noise: string, canonical: Set<string>): string | null {
	const normNoise = normalizeKey(noise);
	if (!normNoise) return null;

	for (const c of canonical) {
		// Tail: "math.statistics.hypothesis-testing" → "hypothesis testing"
		const segments = c.split(".");
		const tail = normalizeKey(segments[segments.length - 1] ?? "");
		if (tail && (tail === normNoise || normNoise.includes(tail) || tail.includes(normNoise))) {
			return c;
		}
		// Full slug: "math.statistics.hypothesis-testing" → "math statistics hypothesis testing"
		const slug = normalizeKey(c.replace(/\./g, " "));
		if (slug === normNoise || normNoise.includes(slug) || slug.includes(normNoise)) {
			return c;
		}
	}
	return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Build a concept registry that separates canonical concepts (sourced from
 * extracted problems and non-noise scored concepts) from noise concepts
 * (sourced only from preview item metadata or concept-graph nodes).
 *
 * This registry is the normalization gate that prevents noise concepts from
 * polluting coverage scores, gap flags, and instructional-intelligence outputs.
 */
export function buildConceptRegistry(
	analyzedDocuments: AnalyzedDocument[],
	previewItems: AssessmentPreviewItemModel[],
	conceptGraph: ConceptMapModel | null,
): ConceptRegistry {
	// ── Step 1: Ground truth — concepts from actual extracted problems ──────────
	const canonical = new Set<string>();

	for (const doc of analyzedDocuments) {
		// From extracted problems (highest confidence)
		for (const problem of doc.problems) {
			for (const c of problem.concepts ?? []) {
				const trimmed = c?.trim();
				if (trimmed) canonical.add(trimmed);
			}
		}
		// From per-document scored concepts that are NOT flagged as noise
		for (const sc of doc.insights.scoredConcepts ?? []) {
			const trimmed = sc.concept?.trim();
			if (trimmed && !sc.isNoise) canonical.add(trimmed);
		}
	}

	// ── Step 2: Gather all external concept mentions ──────────────────────────
	// These are concepts referenced by preview items and graph nodes; they may
	// be canonical (already in the set above) or noise.
	const external = new Set<string>();

	for (const item of previewItems) {
		for (const c of item.primaryConcepts ?? [item.conceptId]) {
			const trimmed = c?.trim();
			if (trimmed) external.add(trimmed);
		}
	}

	for (const node of conceptGraph?.nodes ?? []) {
		const trimmed = node.id?.trim();
		if (trimmed) external.add(trimmed);
	}

	// ── Step 3: Noise = external concepts not in canonical set ────────────────
	const noise = new Set<string>();
	const mapToCanonical = new Map<string, string | null>();

	for (const c of external) {
		if (!canonical.has(c)) {
			noise.add(c);
			// Document-title patterns (e.g. "Chapter 9 Review") never map to a canonical
			const mapped = isDocumentTitleConcept(c) ? null : findCanonicalMatch(c, canonical);
			mapToCanonical.set(c, mapped);
		}
	}

	return { canonical, noise, mapToCanonical };
}
