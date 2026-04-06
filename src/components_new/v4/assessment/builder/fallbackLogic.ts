import type { ConceptGroup } from "../../conceptGrouping";

/**
 * Returns fallback concept IDs to use when a concept produces insufficient items.
 *
 * Priority order:
 * 1. Children of the same group (topic-adjacent, preferred)
 * 2. Other group parent IDs (cross-topic, last resort)
 */
export function fallbackConcepts(
	conceptId: string,
	groups: ConceptGroup[],
): string[] {
	const group = groups.find((g) => g.parentId === conceptId);

	const children = group ? group.children.map((c) => c.id) : [];
	const otherParents = groups.map((g) => g.parentId).filter((id) => id !== conceptId);

	return [...children, ...otherParents];
}
