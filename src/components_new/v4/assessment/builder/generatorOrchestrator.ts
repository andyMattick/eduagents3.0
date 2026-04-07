import type { AssessmentItem, DifficultyLevel, ItemType } from "../assessmentTypes";
import type { CanonicalConcept } from "../../domain/domainTypes";
import { difficultyToTime } from "../difficultyRules";

const GENERATE_ITEMS_ENDPOINT = "/api/v4/studio/generateItems";

/**
 * Generates assessment items for a given concept × type × difficulty by calling
 * the server-side LLM endpoint (`/api/v4/studio/generateItems`).
 *
 * Falls back to placeholder items when the API is unreachable or returns an error,
 * so the builder pipeline never hard-fails due to generation issues.
 *
 * @param conceptId    Layer-2 concept node ID
 * @param type         "mc" | "short_answer" | "frq"
 * @param difficulty   "easy" | "medium" | "hard"
 * @param count        Number of items to generate (capped server-side at 20)
 * @param canonical    Optional domain ontology entry for richer, concept-aware prompts
 */
export async function generateItemsForConcept(
	conceptId: string,
	type: ItemType,
	difficulty: DifficultyLevel,
	count: number,
	canonical?: CanonicalConcept,
): Promise<AssessmentItem[]> {
	try {
		const res = await fetch(GENERATE_ITEMS_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				conceptId,
				canonical: canonical
					? {
							id: canonical.id,
							label: canonical.label,
							description: canonical.description,
							subject: canonical.subject,
							prerequisites: canonical.prerequisites,
							misconceptions: canonical.misconceptions,
							typicalStepRange: canonical.typicalStepRange,
					  }
					: undefined,
				type,
				difficulty,
				count,
			}),
		});

		if (!res.ok) throw new Error(`generate-items API returned ${res.status}`);

		const data = (await res.json()) as { items: AssessmentItem[] };
		if (!Array.isArray(data.items)) throw new Error("Unexpected response shape");

		return data.items;
	} catch (err) {
		console.warn("[generatorOrchestrator] Falling back to placeholders:", err instanceof Error ? err.message : err);
		return placeholderItems(conceptId, type, difficulty, count, canonical);
	}
}

function placeholderItems(
	conceptId: string,
	type: ItemType,
	difficulty: DifficultyLevel,
	count: number,
	canonical?: CanonicalConcept,
): AssessmentItem[] {
	const label = canonical?.label ?? conceptId;
	return Array.from({ length: count }, (_, i) => ({
		id: `${conceptId}__${type}__${difficulty}__${i}`,
		stem: `[Placeholder] ${type.toUpperCase()} question ${i + 1} for "${label}"`,
		type,
		...(type === "mc"
			? { options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: "Option A" }
			: { correctAnswer: "" }),
		concepts: [canonical?.id ?? conceptId],
		difficulty,
		estimatedTimeSeconds: difficultyToTime(type, difficulty),
	}));
}
