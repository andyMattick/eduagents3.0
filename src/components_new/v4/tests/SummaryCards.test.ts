import { describe, expect, it } from "vitest";

import { buildSummaryCards } from "../../../prism-v4/intelligence/buildSummaryCards";
import type { ViewerData, ViewerScoredConcept } from "../../../prism-v4/viewer";
import type { AssessmentPreviewItemModel } from "../../../prism-v4/session/InstructionalIntelligenceSession";

function makeScoredConcept(overrides: Partial<ViewerScoredConcept> & { concept: string }): ViewerScoredConcept {
	return {
		documentIds: ["doc-1"],
		sourceFileNames: ["test.pdf"],
		averageScore: 0.5,
		totalScore: 0.5,
		coverageScore: overrides.coverageScore ?? 0.5,
		gapScore: overrides.gapScore ?? 0,
		freqProblems: 1,
		freqPages: 1,
		freqDocuments: 1,
		groupCount: 1,
		multipartPresence: 0,
		crossDocumentAnchor: false,
		gap: overrides.gap ?? false,
		noiseCandidate: false,
		stability: 0.8,
		overlapStrength: 0.2,
		redundancy: 0,
		problemGroupIds: [],
		previewItemIds: [],
		previewCount: 0,
		previewDocumentIds: [],
		previewGroups: [],
		previewPageSpans: [],
		groupIds: [],
		problemCount: 1,
		previewItems: [],
		linkedPreviewFallbackCount: 0,
		previewCoverage: 0,
		...overrides,
	};
}

function makeViewerData(overrides: Partial<ViewerData> = {}): ViewerData {
	return {
		sessionId: "session-1",
		documents: [],
		problemGroups: [],
		scoredConcepts: [],
		collectionAnalysis: null,
		blueprint: null,
		conceptGraph: null,
		previewItems: [],
		previewSource: "none",
		productIds: [],
		productTypes: [],
		availableSurfaces: [],
		generatedAt: "2025-01-01T00:00:00.000Z",
		...overrides,
	};
}

describe("buildSummaryCards", () => {
	it("always produces exactly 4 cards", () => {
		const data = makeViewerData();
		const result = buildSummaryCards(data);
		expect(result.cards).toHaveLength(4);
	});

	it("card IDs are: coverage, gaps, misconceptions, next-steps", () => {
		const data = makeViewerData();
		const result = buildSummaryCards(data);
		const ids = result.cards.map((c) => c.id);
		expect(ids).toEqual(["coverage", "gaps", "misconceptions", "next-steps"]);
	});

	it("coverage card reflects average coverage", () => {
		const data = makeViewerData({
			scoredConcepts: [
				makeScoredConcept({ concept: "fractions", coverageScore: 0.8 }),
				makeScoredConcept({ concept: "decimals", coverageScore: 0.6 }),
			],
		});
		const result = buildSummaryCards(data);
		const coverageCard = result.cards.find((c) => c.id === "coverage")!;
		expect(coverageCard.value).toBe("70%");
	});

	it("gaps card counts gap concepts", () => {
		const data = makeViewerData({
			scoredConcepts: [
				makeScoredConcept({ concept: "fractions", coverageScore: 0.8 }),
				makeScoredConcept({ concept: "algebra", gap: true, gapScore: 0.8, coverageScore: 0.1 }),
			],
		});
		const result = buildSummaryCards(data);
		const gapsCard = result.cards.find((c) => c.id === "gaps")!;
		expect(gapsCard.value).toBe(1);
	});

	it("misconceptions card counts unique misconception tags", () => {
		const preview: AssessmentPreviewItemModel[] = [
			{ itemId: "i1", stem: "s1", conceptId: "fractions", primaryConcepts: ["fractions"], bloom: "understand", difficulty: "medium", mode: "explain", scenario: "abstract-symbolic", misconceptionTag: "denominator-swap" },
			{ itemId: "i2", stem: "s2", conceptId: "fractions", primaryConcepts: ["fractions"], bloom: "understand", difficulty: "medium", mode: "explain", scenario: "abstract-symbolic", misconceptionTag: "denominator-swap" },
			{ itemId: "i3", stem: "s3", conceptId: "decimals", primaryConcepts: ["decimals"], bloom: "understand", difficulty: "medium", mode: "explain", scenario: "abstract-symbolic", misconceptionTag: "place-value-error" },
		];
		const data = makeViewerData({ previewItems: preview });
		const result = buildSummaryCards(data);
		const mCard = result.cards.find((c) => c.id === "misconceptions")!;
		// Two unique tags: denominator-swap and place-value-error
		expect(mCard.value).toBe(2);
	});

	it("every card has a non-empty title, detail, and linkTarget", () => {
		const data = makeViewerData();
		const result = buildSummaryCards(data);
		for (const card of result.cards) {
			expect(card.title.trim().length).toBeGreaterThan(0);
			expect(card.detail.trim().length).toBeGreaterThan(0);
			expect(["coverage", "map", "misconception", "narrative"]).toContain(card.linkTarget);
		}
	});
});
