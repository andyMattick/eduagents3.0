/**
 * src/lib/suggestionTargeting.ts — Load-score-based suggestion targeting
 *
 * Derives typed SimulationSuggestion objects from a SimulationProfileMetrics
 * object, targeting items that score above the RED_THRESHOLD.
 * Results are sorted by loadScore descending so the worst items surface first.
 */

import type { SimulationProfileMetrics, SimulationSuggestion } from "../types/simulator";
import { computeLoadScore } from "./loadScore";

/** Items at or above this load score are flagged as "red" and get suggestions. */
const RED_THRESHOLD = 0.7;

/**
 * Generate item_rewrite suggestions for a single profile.
 * An item is flagged when its composite load score is at or above RED_THRESHOLD,
 * OR when any of the Phase-6 explicit trigger conditions are met:
 *   confusionScore > 0.65  |  readingLoad > 0.70  |  steps > 4
 */
export function buildSuggestionsForProfile(
	profile: SimulationProfileMetrics,
): SimulationSuggestion[] {
	const states = profile.predictedStates;

	const scoredItems = profile.measurables.map((m) => ({
		...m,
		loadScore: computeLoadScore(m, states),
	}));

	return scoredItems
		.filter((item) =>
			item.loadScore >= RED_THRESHOLD ||
			(item.confusionScore ?? 0) > 0.65 ||
			item.readingLoad > 0.70 ||
			item.steps > 4,
		)
		.sort((a, b) => b.loadScore - a.loadScore)
		.map((item) => {
			// Build a more specific message based on which trigger fired
			const triggers: string[] = [];
			if (item.loadScore >= RED_THRESHOLD) triggers.push(`load score ${(item.loadScore * 100).toFixed(0)}%`);
			if ((item.confusionScore ?? 0) > 0.65)  triggers.push(`confusion ${Math.round((item.confusionScore ?? 0) * 100)}%`);
			if (item.readingLoad > 0.70)             triggers.push(`reading load ${Math.round(item.readingLoad * 100)}%`);
			if (item.steps > 4)                      triggers.push(`${item.steps} reasoning steps`);

			return {
				id: `${profile.profileId}-${item.itemId}`,
				text: `Item ${item.index} is high load for ${profile.profileLabel} (${triggers.join(", ")}). Consider simplifying language, reducing steps, or adding scaffolds.`,
				type: "item_rewrite" as const,
				profileId: profile.profileId,
				itemId: item.itemId,
				loadScore: item.loadScore,
			};
		});
}

/**
 * Build suggestions across all profiles, deduplicating by itemId when
 * multiple profiles flag the same item (keeps the highest loadScore entry).
 * Results are sorted by loadScore descending.
 */
export function buildSuggestionsAllProfiles(
	profiles: SimulationProfileMetrics[],
): SimulationSuggestion[] {
	const all = profiles.flatMap(buildSuggestionsForProfile);

	// Surface the highest-score version of each item across profiles
	const byItem = new Map<string, SimulationSuggestion>();
	for (const s of all) {
		const key = s.itemId ?? s.id ?? s.text;
		const existing = byItem.get(key);
		if (!existing || (s.loadScore ?? 0) > (existing.loadScore ?? 0)) {
			byItem.set(key, s);
		}
	}

	return [...byItem.values()].sort((a, b) => (b.loadScore ?? 0) - (a.loadScore ?? 0));
}
