import type { AssessmentRequest, ItemType } from "../assessmentTypes";

/**
 * Distributes item count across the requested item types as evenly as possible.
 * Remainder items are assigned to the first types in the list.
 */
export function allocateTypes(req: AssessmentRequest): Record<ItemType, number> {
	const total = req.count;
	const allowed = req.types;

	if (allowed.length === 0) return {} as Record<ItemType, number>;

	const base = Math.floor(total / allowed.length);
	const remainder = total % allowed.length;

	const allocation = {} as Record<ItemType, number>;

	allowed.forEach((t, i) => {
		allocation[t] = base + (i < remainder ? 1 : 0);
	});

	return allocation;
}
