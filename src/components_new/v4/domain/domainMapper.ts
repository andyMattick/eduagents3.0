import type { CanonicalConcept, ConceptMapping } from "./domainTypes";
import type { ConceptNode } from "../conceptGrouping";

/**
 * Maps extracted concept nodes to the closest canonical concept in the ontology.
 * Uses label similarity: exact match → substring → fallback 0.5 placeholder.
 * A real implementation would swap `computeSimilarity` for embedding cosine distance.
 */
export function mapConceptsToCanonical(
	extracted: ConceptNode[],
	canonical: CanonicalConcept[],
): ConceptMapping[] {
	return extracted.map((node) => {
		const ranked = canonical
			.map((c) => ({
				canonicalId: c.id,
				confidence: computeSimilarity(node.label, c.label),
			}))
			.sort((a, b) => b.confidence - a.confidence);

		const best = ranked[0] ?? { canonicalId: "", confidence: 0 };

		return {
			conceptId: node.id,
			canonicalId: best.canonicalId,
			confidence: best.confidence,
		};
	});
}

function computeSimilarity(a: string, b: string): number {
	const la = a.toLowerCase().trim();
	const lb = b.toLowerCase().trim();
	if (la === lb) return 1;
	if (la.includes(lb) || lb.includes(la)) return 0.8;
	// Word-overlap Jaccard as a lightweight fallback
	const wordsA = new Set(la.split(/\s+/));
	const wordsB = new Set(lb.split(/\s+/));
	const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
	const union = new Set([...wordsA, ...wordsB]).size;
	return union === 0 ? 0 : intersection / union;
}
