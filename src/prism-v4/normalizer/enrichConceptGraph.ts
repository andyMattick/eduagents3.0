import type { ConceptMapModel } from "../session/InstructionalIntelligenceSession";
import type { ViewerProblemGroup } from "../viewer/buildViewerData";

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Ensure the concept graph contains nodes and co-occurrence edges for every
 * canonical concept so that intelligence engines (instructional map, narrative)
 * can derive skills and prerequisites even when the upstream graph only has
 * noise concept nodes.
 *
 * Strategy
 * ─────────
 * 1. For canonical concepts absent from the existing graph, add a node whose
 *    weight equals the number of problem groups that contain the concept.
 * 2. Build co-occurrence edges from canonical concepts that share a problem
 *    group; add any edge not already in the existing graph.
 * 3. If there is no existing graph at all, create one from scratch.
 */
export function enrichConceptGraph(
	conceptGraph: ConceptMapModel | null,
	problemGroups: ViewerProblemGroup[],
	canonical: Set<string>,
): ConceptMapModel {
	if (!canonical.size) {
		return conceptGraph ?? { nodes: [], edges: [] };
	}

	// ── Build canonical nodes (weight = # groups that contain the concept) ────
	const groupCountByCanonical = new Map<string, number>();
	for (const group of problemGroups) {
		for (const c of group.concepts) {
			if (canonical.has(c)) {
				groupCountByCanonical.set(c, (groupCountByCanonical.get(c) ?? 0) + 1);
			}
		}
	}

	const canonicalNodes = [...canonical].map((c) => ({
		id: c,
		label: c.split(".").pop() ?? c,
		weight: groupCountByCanonical.get(c) ?? 1,
	}));

	// ── Build co-occurrence edges from same-group canonical concepts ──────────
	const coOccurrences = new Map<string, number>();
	for (const group of problemGroups) {
		const concepts = group.concepts.filter((c) => canonical.has(c));
		for (let i = 0; i < concepts.length; i++) {
			for (let j = i + 1; j < concepts.length; j++) {
				// Canonical edge key — sort so a→b and b→a are the same entry
				const from = concepts[i] < concepts[j] ? concepts[i] : concepts[j];
				const to = concepts[i] < concepts[j] ? concepts[j] : concepts[i];
				const key = `${from}::${to}`;
				coOccurrences.set(key, (coOccurrences.get(key) ?? 0) + 1);
			}
		}
	}

	const coEdges = [...coOccurrences.entries()].map(([key, weight]) => {
		const sep = key.indexOf("::");
		return {
			from: key.slice(0, sep),
			to: key.slice(sep + 2),
			weight,
		};
	});

	// ── Build from scratch if no existing graph ───────────────────────────────
	if (!conceptGraph) {
		return { nodes: canonicalNodes, edges: coEdges };
	}

	// ── Augment existing graph with missing canonical nodes/edges ────────────
	const existingNodeIds = new Set(conceptGraph.nodes.map((n) => n.id));
	const existingEdgeKeys = new Set(
		conceptGraph.edges.map((e) => {
			const from = e.from < e.to ? e.from : e.to;
			const to = e.from < e.to ? e.to : e.from;
			return `${from}::${to}`;
		}),
	);

	const newNodes = canonicalNodes.filter((n) => !existingNodeIds.has(n.id));
	const newEdges = coEdges.filter((e) => {
		const from = e.from < e.to ? e.from : e.to;
		const to = e.from < e.to ? e.to : e.from;
		return !existingEdgeKeys.has(`${from}::${to}`);
	});

	if (!newNodes.length && !newEdges.length) {
		return conceptGraph;
	}

	return {
		nodes: [...conceptGraph.nodes, ...newNodes],
		edges: [...conceptGraph.edges, ...newEdges],
	};
}
