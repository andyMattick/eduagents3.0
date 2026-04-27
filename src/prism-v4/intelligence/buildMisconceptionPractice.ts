import type { AssessmentPreviewItemModel, ConceptMapModel } from "../session/InstructionalIntelligenceSession";
import type { ViewerScoredConcept } from "../viewer/buildViewerData";

export interface PreviewItemRef {
	itemId: string;
	stem: string;
	conceptId: string;
	bloom: string;
	difficulty: string;
}

export interface MisconceptionPracticeEntry {
	concept: string;
	misconception: string;
	recommendedItems: PreviewItemRef[];
}

export interface MisconceptionPracticeOutput {
	entries: MisconceptionPracticeEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function conceptDifficultyScore(concept: ViewerScoredConcept): number {
	// Higher score = more worth targeting: high gap + low coverage + high misconception presence
	return concept.gapScore * 0.5 + (1 - concept.coverageScore) * 0.3 + concept.multipartPresence * 0.2;
}

function candidateMisconceptions(concept: ViewerScoredConcept, previewItems: AssessmentPreviewItemModel[]): string[] {
	const tagged = previewItems
		.filter((item) => item.conceptId === concept.concept || item.primaryConcepts?.includes(concept.concept))
		.map((item) => item.misconceptionTag)
		.filter((tag): tag is string => Boolean(tag));

	const seen = new Set<string>();
	const unique: string[] = [];
	for (const tag of tagged) {
		if (!seen.has(tag)) {
			seen.add(tag);
			unique.push(tag);
		}
	}

	// No fallback — only return real misconception signals.
	// Synthetic labels were masking the absence of actual distractor metadata.
	return unique;
}

function recommendedItemsForConcept(
	concept: ViewerScoredConcept,
	previewItems: AssessmentPreviewItemModel[],
	maxItems = 4,
): PreviewItemRef[] {
	const candidates = previewItems
		.filter((item) => item.conceptId === concept.concept || item.primaryConcepts?.includes(concept.concept))
		.slice(0, maxItems);

	return candidates.map((item) => ({
		itemId: item.itemId,
		stem: item.stem,
		conceptId: item.conceptId,
		bloom: item.bloom,
		difficulty: item.difficulty,
	}));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildMisconceptionPractice(
	scoredConcepts: ViewerScoredConcept[],
	previewItems: AssessmentPreviewItemModel[],
	_conceptGraph: ConceptMapModel | null,
): MisconceptionPracticeOutput {
	// Rank concepts by misconception-risk score
	const ranked = [...scoredConcepts]
		.filter((c) => !c.noiseCandidate)
		.sort((a, b) => conceptDifficultyScore(b) - conceptDifficultyScore(a));

	const entries: MisconceptionPracticeEntry[] = [];

	for (const concept of ranked) {
		const misconceptions = candidateMisconceptions(concept, previewItems);
		const items = recommendedItemsForConcept(concept, previewItems, 4);

		// Only surface entries with at least one recommended item or a clear misconception signal
		if (!items.length && concept.gapScore < 0.3) {
			continue;
		}

		for (const misconception of misconceptions.slice(0, 1)) {
			// One entry per concept (its primary misconception)
			entries.push({
				concept: concept.concept,
				misconception,
				recommendedItems: items,
			});
		}
	}

	return { entries };
}
