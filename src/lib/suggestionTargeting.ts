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
 * Only items that score RED or above produce suggestions.
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
		.filter((item) => item.loadScore >= RED_THRESHOLD)
		.sort((a, b) => b.loadScore - a.loadScore)
		.map((item) => ({
			id: `${profile.profileId}-${item.itemId}`,
			text: `Item ${item.index} is high load for ${profile.profileLabel} (score ${(item.loadScore * 100).toFixed(0)}%). Consider simplifying language, reducing steps, or adding scaffolds.`,
			type: "item_rewrite" as const,
			profileId: profile.profileId,
			itemId: item.itemId,
			loadScore: item.loadScore,
		}));
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
