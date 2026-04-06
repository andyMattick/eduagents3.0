import type { CanonicalConcept, CanonicalMap } from "./domainTypes";

/**
 * Builds a `CanonicalMap` from a flat list of `CanonicalConcept` objects by
 * deriving edges from the `prerequisites` arrays on each concept.
 */
export function buildCanonicalMap(concepts: CanonicalConcept[]): CanonicalMap {
	const knownIds = new Set(concepts.map((c) => c.id));

	const edges = concepts.flatMap((c) =>
		c.prerequisites
			.filter((p) => knownIds.has(p)) // only keep edges within this map
			.map((p) => ({
				from: p,
				to: c.id,
				type: "prereq" as const,
			})),
	);

	return { concepts, edges };
}

/**
 * Looks up a concept by its canonical ID.
 * Returns `undefined` when the ID is not in the map.
 */
export function lookupConcept(
	map: CanonicalMap,
	id: string,
): CanonicalConcept | undefined {
	return map.concepts.find((c) => c.id === id);
}

/**
 * Returns every concept that must be understood before `targetId` (BFS traversal
 * of prerequisite edges, inclusive of `targetId` itself).
 */
export function getPrerequisiteChain(
	map: CanonicalMap,
	targetId: string,
): CanonicalConcept[] {
	const result: CanonicalConcept[] = [];
	const visited = new Set<string>();
	const queue = [targetId];

	while (queue.length > 0) {
		const id = queue.shift()!;
		if (visited.has(id)) continue;
		visited.add(id);

		const concept = lookupConcept(map, id);
		if (concept) result.push(concept);

		// Enqueue prereqs
		for (const edge of map.edges) {
			if (edge.to === id && !visited.has(edge.from)) {
				queue.push(edge.from);
			}
		}
	}

	return result;
}
