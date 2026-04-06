import type { Assessment, AssessmentItem, AssessmentRequest, DifficultyLevel, ItemType } from "../assessmentTypes";
import type { ConceptGroup } from "../../conceptGrouping";
import { allocateConcepts } from "./conceptAllocator";
import { allocateTypes } from "./typeAllocator";
import { allocateDifficulty } from "./difficultyAllocator";
import { generateItemsForConcept } from "./generatorOrchestrator";

/**
 * Orchestrates the full assessment build pipeline:
 * concept allocation → type allocation → difficulty allocation → item generation.
 *
 * The output is trimmed to exactly `req.count` items and conceptCoverage is
 * computed from the final item list.
 */
export async function buildAssessment(
	groups: ConceptGroup[],
	req: AssessmentRequest,
): Promise<Assessment> {
	const conceptAlloc = allocateConcepts(groups, req);
	const typeAlloc = allocateTypes(req);
	const diffAlloc = allocateDifficulty(req.count, req.difficulty);

	// Build an ordered list of (difficulty, quota) pairs to draw from
	const diffSlots = (Object.entries(diffAlloc) as [DifficultyLevel, number][]).filter(
		([, n]) => n > 0,
	);

	const items: AssessmentItem[] = [];
	let diffIdx = 0;

	for (const [conceptId, conceptCount] of Object.entries(conceptAlloc)) {
		const typeEntries = Object.entries(typeAlloc) as [ItemType, number][];
		const perType = Math.max(1, Math.ceil(conceptCount / typeEntries.length));

		for (const [type] of typeEntries) {
			const [difficulty] = diffSlots[diffIdx % diffSlots.length];
			diffIdx++;

			const generated = await generateItemsForConcept(conceptId, type, difficulty, perType);
			items.push(...generated);
		}
	}

	const finalItems = items.slice(0, req.count);

	// Compute concept coverage
	const conceptCoverage: Record<string, number> = {};
	for (const item of finalItems) {
		for (const cid of item.concepts) {
			conceptCoverage[cid] = (conceptCoverage[cid] ?? 0) + 1;
		}
	}

	return {
		id: `assessment-${Date.now()}`,
		items: finalItems,
		totalTimeSeconds: finalItems.reduce((sum, item) => sum + item.estimatedTimeSeconds, 0),
		conceptCoverage,
	};
}
