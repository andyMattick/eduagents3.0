import { describe, expect, it } from "vitest";

import { buildTeacherNarrative } from "../../../prism-v4/intelligence/buildTeacherNarrative";
import type { ViewerData, ViewerScoredConcept } from "../../../prism-v4/viewer";
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
		multipartPresence: 0,
		crossDocumentAnchor: false,
		gap: overrides.gap ?? false,
		noiseCandidate: overrides.noiseCandidate ?? false,
		stability: 0.8,
		overlapStrength: 0.2,
		redundancy: 0,
		problemGroupIds: ["group-1"],
		previewItemIds: [],
		previewCount: 0,
		previewDocumentIds: [],
		previewGroups: [],
		previewPageSpans: [],
		groupIds: ["group-1"],
		problemCount: 1,
		previewItems: [],
		linkedPreviewFallbackCount: 0,
		previewCoverage: 0,
		...overrides,
	};
}

function makePreviewItem(overrides: Partial<AssessmentPreviewItemModel> & { itemId: string; stem: string; conceptId: string }): AssessmentPreviewItemModel {
	return {
		primaryConcepts: overrides.primaryConcepts ?? [overrides.conceptId],
		bloom: "understand",
		difficulty: "medium",
		mode: "explain",
		scenario: "abstract-symbolic",
		...overrides,
	};
}

function makeViewerData(overrides: Partial<ViewerData> = {}): ViewerData {
	return {
		sessionId: "session-1",
		documents: [{
			documentId: "doc-1",
			sourceFileName: "test.pdf",
			sourceMimeType: "application/pdf",
			createdAt: "2025-01-01T00:00:00.000Z",
			problemCount: 2,
			conceptCount: 2,
			concepts: ["fractions", "decimals"],
			primaryConcepts: ["fractions"],
			groupCount: 1,
		}],
		problemGroups: [],
		scoredConcepts: overrides.scoredConcepts ?? [
			makeScoredConcept({ concept: "fractions", coverageScore: 0.8 }),
			makeScoredConcept({ concept: "decimals", coverageScore: 0.3 }),
		],
		collectionAnalysis: null,
		blueprint: null,
		conceptGraph: null,
		previewItems: overrides.previewItems ?? [],
		previewSource: "none",
		productIds: [],
		productTypes: [],
		availableSurfaces: ["documents", "analysis"],
		generatedAt: "2025-01-01T00:00:00.000Z",
		...overrides,
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildTeacherNarrative", () => {
	it("generates all five sections in stable order", () => {
		const data = makeViewerData();
		const result = buildTeacherNarrative(data, { title: "Fractions Unit", subject: "Math", gradeLevel: "5" });

		expect(result.sections).toHaveLength(5);
		const ids = result.sections.map((s) => s.id);
		expect(ids).toEqual(["overview", "concept-emphasis", "gaps-and-opportunities", "misconception-risks", "recommended-next-steps"]);
	});

	it("produces no empty-body sections", () => {
		const data = makeViewerData();
		const result = buildTeacherNarrative(data);
		for (const section of result.sections) {
			expect(section.body.trim().length).toBeGreaterThan(0);
			expect(section.title.trim().length).toBeGreaterThan(0);
		}
	});

	it("document overview includes concept count and document name context", () => {
		const data = makeViewerData();
		const result = buildTeacherNarrative(data, { title: "My Workspace" });
		const overview = result.sections.find((s) => s.id === "overview")!;
		expect(overview).toBeDefined();
		expect(overview.body).toContain("fractions");
	});

	it("concept emphasis calls out dominant concepts above 0.6 threshold", () => {
		const data = makeViewerData({
			scoredConcepts: [
				makeScoredConcept({ concept: "fractions", coverageScore: 0.9 }),
				makeScoredConcept({ concept: "decimals", coverageScore: 0.2 }),
			],
		});
		const result = buildTeacherNarrative(data);
		const section = result.sections.find((s) => s.id === "concept-emphasis")!;
		expect(section.body).toContain("fractions");
		expect(section.body).toContain("decimals");
	});

	it("gaps section mentions gap concepts", () => {
		const data = makeViewerData({
			scoredConcepts: [
				makeScoredConcept({ concept: "fractions", coverageScore: 0.8 }),
				makeScoredConcept({ concept: "algebra", coverageScore: 0.1, gap: true, gapScore: 0.9 }),
			],
		});
		const result = buildTeacherNarrative(data);
		const section = result.sections.find((s) => s.id === "gaps-and-opportunities")!;
		expect(section.body).toContain("algebra");
	});

	it("misconception risks section lists misconceptions from preview items", () => {
		const data = makeViewerData({
			previewItems: [
				makePreviewItem({ itemId: "i1", stem: "Solve x", conceptId: "fractions", misconceptionTag: "denominator-swap" }),
			],
		});
		const result = buildTeacherNarrative(data);
		const section = result.sections.find((s) => s.id === "misconception-risks")!;
		expect(section.body).toContain("denominator-swap");
	});

	it("recommended next steps includes blueprint suggestion when blueprint is absent", () => {
		const data = makeViewerData({ blueprint: null });
		const result = buildTeacherNarrative(data);
		const section = result.sections.find((s) => s.id === "recommended-next-steps")!;
		expect(section.body.toLowerCase()).toContain("blueprint");
	});

	it("works with no concepts (empty workspace)", () => {
		const data = makeViewerData({ scoredConcepts: [] });
		const result = buildTeacherNarrative(data);
		expect(result.sections).toHaveLength(5);
		for (const section of result.sections) {
			expect(section.body.trim().length).toBeGreaterThan(0);
		}
	});
});
