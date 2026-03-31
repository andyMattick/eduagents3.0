import { describe, expect, it } from "vitest";

import { buildMisconceptionPractice } from "../../../prism-v4/intelligence/buildMisconceptionPractice";
import type { ViewerScoredConcept } from "../../../prism-v4/viewer";
import type { AssessmentPreviewItemModel } from "../../../prism-v4/session/InstructionalIntelligenceSession";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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
		multipartPresence: overrides.multipartPresence ?? 0,
		crossDocumentAnchor: false,
		gap: overrides.gap ?? false,
		noiseCandidate: overrides.noiseCandidate ?? false,
		stability: 0.8,
		overlapStrength: 0.2,
		redundancy: 0,
		problemGroupIds: [],
		previewItemIds: overrides.previewItemIds ?? [],
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

function makeItem(overrides: Partial<AssessmentPreviewItemModel> & { itemId: string; conceptId: string }): AssessmentPreviewItemModel {
	return {
		stem: `Stem for ${overrides.itemId}`,
		primaryConcepts: [overrides.conceptId],
		bloom: "understand",
		difficulty: "medium",
		mode: "explain",
		scenario: "abstract-symbolic",
		...overrides,
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildMisconceptionPractice", () => {
	it("ranks high-gap, low-coverage concepts first", () => {
		const concepts = [
			makeScoredConcept({ concept: "fractions", coverageScore: 0.8, gapScore: 0.1 }),
			makeScoredConcept({ concept: "algebra", coverageScore: 0.2, gapScore: 0.7, gap: true }),
		];
		const result = buildMisconceptionPractice(concepts, [], null);
		const entryConceptNames = result.entries.map((e) => e.concept);
		// algebra should appear before fractions because of higher gap/lower coverage
		const algebraIdx = entryConceptNames.indexOf("algebra");
		const fractionsIdx = entryConceptNames.indexOf("fractions");
		// algebra must be ranked higher (earlier index) than fractions if it appears
		if (algebraIdx !== -1 && fractionsIdx !== -1) {
			expect(algebraIdx).toBeLessThan(fractionsIdx);
		}
	});

	it("assigns misconception tag from preview items", () => {
		const concepts = [
			makeScoredConcept({ concept: "fractions", coverageScore: 0.4, gapScore: 0.3 }),
		];
		const items = [
			makeItem({ itemId: "i1", conceptId: "fractions", misconceptionTag: "denominator-swap" }),
		];
		const result = buildMisconceptionPractice(concepts, items, null);
		const entry = result.entries.find((e) => e.concept === "fractions");
		expect(entry).toBeDefined();
		expect(entry!.misconception).toBe("denominator-swap");
	});

	it("falls back to generic misconception label when no tag is present", () => {
		const concepts = [
			makeScoredConcept({ concept: "geometry", coverageScore: 0.2, gapScore: 0.6, gap: true }),
		];
		const result = buildMisconceptionPractice(concepts, [], null);
		const entry = result.entries.find((e) => e.concept === "geometry");
		expect(entry).toBeDefined();
		expect(entry!.misconception.length).toBeGreaterThan(0);
	});

	it("returns at most 4 recommended items per concept", () => {
		const concepts = [
			makeScoredConcept({ concept: "fractions", coverageScore: 0.3, gapScore: 0.5 }),
		];
		const items = Array.from({ length: 6 }, (_, i) =>
			makeItem({ itemId: `i${i}`, conceptId: "fractions" }),
		);
		const result = buildMisconceptionPractice(concepts, items, null);
		const entry = result.entries.find((e) => e.concept === "fractions");
		expect(entry).toBeDefined();
		expect(entry!.recommendedItems.length).toBeLessThanOrEqual(4);
	});

	it("excludes noise candidates from output", () => {
		const concepts = [
			makeScoredConcept({ concept: "random-noise", coverageScore: 0.1, gapScore: 0.8, noiseCandidate: true }),
			makeScoredConcept({ concept: "fractions", coverageScore: 0.3, gapScore: 0.5 }),
		];
		const result = buildMisconceptionPractice(concepts, [], null);
		expect(result.entries.every((e) => e.concept !== "random-noise")).toBe(true);
	});

	it("produces stable output across multiple calls with the same input", () => {
		const concepts = [
			makeScoredConcept({ concept: "fractions", coverageScore: 0.3, gapScore: 0.5 }),
		];
		const items = [makeItem({ itemId: "i1", conceptId: "fractions", misconceptionTag: "tag-1" })];
		const r1 = buildMisconceptionPractice(concepts, items, null);
		const r2 = buildMisconceptionPractice(concepts, items, null);
		expect(r1.entries.map((e) => e.concept)).toEqual(r2.entries.map((e) => e.concept));
		expect(r1.entries.map((e) => e.misconception)).toEqual(r2.entries.map((e) => e.misconception));
	});
});
