import type { ViewerData } from "../viewer/buildViewerData";

export interface SummaryCard {
	id: string;
	title: string;
	value: string | number;
	detail: string;
	linkTarget: "narrative" | "misconception" | "map" | "coverage";
}

export interface SummaryCardsOutput {
	cards: SummaryCard[];
}

export function buildSummaryCards(data: ViewerData): SummaryCardsOutput {
	const totalConcepts = data.scoredConcepts.length;
	const gapConcepts = data.scoredConcepts.filter((c) => c.gap || c.gapScore > 0.5);
	const coverageAvg = totalConcepts
		? data.scoredConcepts.reduce((sum, c) => sum + c.coverageScore, 0) / totalConcepts
		: 0;

	const allMisconceptions = new Set<string>();
	for (const group of data.problemGroups) {
		for (const m of group.misconceptions) allMisconceptions.add(m);
	}
	for (const item of data.previewItems) {
		if (item.misconceptionTag) allMisconceptions.add(item.misconceptionTag);
	}

	const cards: SummaryCard[] = [
		{
			id: "coverage",
			title: "Coverage",
			value: `${Math.round(coverageAvg * 100)}%`,
			detail: `${totalConcepts} concept${totalConcepts !== 1 ? "s" : ""} · avg coverage ${Math.round(coverageAvg * 100)}%`,
			linkTarget: "coverage",
		},
		{
			id: "gaps",
			title: "Gaps",
			value: gapConcepts.length,
			detail:
				gapConcepts.length === 0
					? "No significant gaps detected."
					: `${gapConcepts.length} concept${gapConcepts.length !== 1 ? "s" : ""} with low or missing coverage: ${gapConcepts.slice(0, 3).map((c) => c.concept).join(", ")}`,
			linkTarget: "map",
		},
		{
			id: "misconceptions",
			title: "Misconception Risks",
			value: allMisconceptions.size,
			detail:
				allMisconceptions.size === 0
					? "No misconception signals detected."
					: `${allMisconceptions.size} misconception${allMisconceptions.size !== 1 ? "s" : ""} identified: ${[...allMisconceptions].slice(0, 3).join(", ")}`,
			linkTarget: "misconception",
		},
		{
			id: "next-steps",
			title: "Recommended Actions",
			value: gapConcepts.length + (allMisconceptions.size > 0 ? 1 : 0) + (data.blueprint ? 0 : 1),
			detail: "See the Teacher Narrative for a full breakdown of recommended next steps.",
			linkTarget: "narrative",
		},
	];

	return { cards };
}
