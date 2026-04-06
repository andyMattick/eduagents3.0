import type { ConceptGroup } from "../../conceptGrouping";
import type { AssessmentRequest } from "../assessmentTypes";

/**
 * Distributes item count across concept groups proportionally by `questionCount`.
 * Every group receives at least 1 item.
 * If `focusConceptIds` is set, only those groups are considered.
 */
export function allocateConcepts(
	groups: ConceptGroup[],
	req: AssessmentRequest,
): Record<string, number> {
	const targets =
		req.focusConceptIds && req.focusConceptIds.length > 0
			? groups.filter((g) => req.focusConceptIds!.includes(g.parentId))
			: groups;

	if (targets.length === 0) return {};

	const total = req.count;
	const weights = targets.map((g) => Math.max(g.questionCount, 1));
	const sum = weights.reduce((a, b) => a + b, 0);

	const allocation: Record<string, number> = {};

	let assigned = 0;
	targets.forEach((g, i) => {
		const share = Math.max(1, Math.round((weights[i] / sum) * total));
		allocation[g.parentId] = share;
		assigned += share;
	});

	// Correct rounding drift by adjusting the highest-weight group
	const diff = total - assigned;
	if (diff !== 0) {
		const topGroup = targets.reduce((a, b) =>
			(allocation[a.parentId] ?? 0) >= (allocation[b.parentId] ?? 0) ? a : b,
		);
		allocation[topGroup.parentId] = Math.max(1, (allocation[topGroup.parentId] ?? 0) + diff);
	}

	return allocation;
}
