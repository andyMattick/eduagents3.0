/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssessmentPreviewItemModel } from "../../../prism-v4/session/InstructionalIntelligenceSession";
import type { ViewerScoredConcept, ViewerProblemGroup } from "../../../prism-v4/viewer";
import { ConceptListPanel } from "../viewer/ConceptListPanel";
import { PreviewPanel } from "../viewer/PreviewPanel";
import { CoveragePanel } from "../viewer/CoveragePanel";
import { ProblemGroupPanel } from "../ProblemGroupPanel";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makePreviewItem(args: {
	itemId: string;
	stem: string;
	conceptId: string;
	primaryConcepts: string[];
	groupId?: string;
	sourceDocumentId?: string;
}): AssessmentPreviewItemModel {
	return {
		itemId: args.itemId,
		stem: args.stem,
		conceptId: args.conceptId,
		primaryConcepts: args.primaryConcepts,
		groupId: args.groupId,
		sourceDocumentId: args.sourceDocumentId,
		bloom: "understand",
		difficulty: "medium",
		mode: "explain",
		scenario: "abstract-symbolic",
		teacherReasons: [],
		studentReasons: [],
	};
}

function makeScoredConcept(args: {
	concept: string;
	coverageScore: number;
	groupIds: string[];
	previewItemIds: string[];
	gap?: boolean;
}): ViewerScoredConcept {
	return {
		concept: args.concept,
		documentIds: ["doc-1"],
		sourceFileNames: ["test.pdf"],
		averageScore: args.coverageScore,
		totalScore: args.coverageScore,
		coverageScore: args.coverageScore,
		gapScore: args.gap ? 0.8 : 0,
		freqProblems: 2,
		freqPages: 1,
		freqDocuments: 1,
		groupCount: args.groupIds.length,
		multipartPresence: 0,
		crossDocumentAnchor: false,
		gap: args.gap ?? false,
		noiseCandidate: false,
		stability: 1,
		overlapStrength: 0,
		redundancy: 0,
		problemGroupIds: args.groupIds,
		previewItemIds: args.previewItemIds,
		previewCount: args.previewItemIds.length,
		previewDocumentIds: ["doc-1"],
		previewGroups: args.groupIds,
		previewPageSpans: [],
		groupIds: args.groupIds,
		problemCount: 2,
		previewItems: [],
		linkedPreviewFallbackCount: 0,
		previewCoverage: args.previewItemIds.length > 0 ? 1 : 0,
	};
}

function makeProblemGroup(args: {
	groupId: string;
	documentId: string;
	title: string;
	concepts: string[];
	primaryConcepts: string[];
	previewItemIds?: string[];
}): ViewerProblemGroup {
	return {
		groupId: args.groupId,
		documentId: args.documentId,
		sourceFileName: "test.pdf",
		sourceSpan: { firstPage: 1, lastPage: 2 },
		title: args.title,
		problemCount: 1,
		concepts: args.concepts,
		primaryConcepts: args.primaryConcepts,
		representations: ["text"],
		misconceptions: [],
		difficulty: "medium",
		cognitiveDemand: "conceptual",
		problems: [
			{
				problemId: `${args.groupId}-p1`,
				text: `A problem about ${args.concepts[0] ?? "topic"}.`,
				concepts: args.concepts,
				representations: ["text"],
				difficulty: "medium",
				cognitiveDemand: "conceptual",
				sourceSpan: { firstPage: 1, lastPage: 2 },
				anchors: [{ surfaceId: "s1", nodeId: "n1" }],
				misconceptions: [],
			},
		],
		previewItems: [],
		previewItemIds: args.previewItemIds ?? [],
		previewConcepts: args.primaryConcepts,
		previewSourceDocumentIds: [args.documentId],
		previewPageSpans: [],
		linkedPreviewCount: args.previewItemIds?.length ?? 0,
		linkedPreviewFallbackCount: 0,
		linkedBy: args.previewItemIds?.length ? "groupId" : "none",
		conceptFrequencies: Object.fromEntries(args.concepts.map((c) => [c, 1])),
	};
}

// ─── Test data ────────────────────────────────────────────────────────────────

const groupFractions = makeProblemGroup({
	groupId: "group-fractions",
	documentId: "doc-1",
	title: "Fractions group",
	concepts: ["fractions", "number sense"],
	primaryConcepts: ["fractions"],
	previewItemIds: ["item-frac-1"],
});

const groupDecimals = makeProblemGroup({
	groupId: "group-decimals",
	documentId: "doc-1",
	title: "Decimals group",
	concepts: ["decimals"],
	primaryConcepts: ["decimals"],
	previewItemIds: ["item-dec-1"],
});

const conceptFractions = makeScoredConcept({
	concept: "fractions",
	coverageScore: 0.92,
	groupIds: ["group-fractions"],
	previewItemIds: ["item-frac-1"],
});

const conceptDecimals = makeScoredConcept({
	concept: "decimals",
	coverageScore: 0.74,
	groupIds: ["group-decimals"],
	previewItemIds: ["item-dec-1"],
	gap: true,
});

const itemFrac = makePreviewItem({
	itemId: "item-frac-1",
	stem: "Explain equivalent fractions.",
	conceptId: "fractions",
	primaryConcepts: ["fractions"],
	groupId: "group-fractions",
	sourceDocumentId: "doc-1",
});

const itemDec = makePreviewItem({
	itemId: "item-dec-1",
	stem: "Compare 0.5 and 0.50.",
	conceptId: "decimals",
	primaryConcepts: ["decimals"],
	groupId: "group-decimals",
	sourceDocumentId: "doc-1",
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ViewerInteraction — cross-panel selection", () => {
	it("ConceptListPanel marks the matching concept as v4-selected when selectedConcept is set", () => {
		render(
			<ConceptListPanel
				scoredConcepts={[conceptFractions, conceptDecimals]}
				selectedConcept="fractions"
			/>,
		);

		const fracRow = screen.getByText("fractions").closest(".v4-concept-list-row");
		const decRow = screen.getByText("decimals").closest(".v4-concept-list-row");

		expect(fracRow).toHaveClass("v4-selected");
		expect(decRow).not.toHaveClass("v4-selected");
	});

	it("ConceptListPanel highlights concepts linked to the selected group via groupIds", () => {
		render(
			<ConceptListPanel
				scoredConcepts={[conceptFractions, conceptDecimals]}
				selectedGroupKey={{ documentId: "doc-1", groupId: "group-fractions" }}
			/>,
		);

		const fracRow = screen.getByText("fractions").closest(".v4-concept-list-row");
		const decRow = screen.getByText("decimals").closest(".v4-concept-list-row");

		expect(fracRow).toHaveClass("v4-highlighted");
		expect(decRow).not.toHaveClass("v4-highlighted");
	});

	it("PreviewPanel marks the matching item as v4-selected when selectedPreviewItem is set", () => {
		render(
			<PreviewPanel
				previewItems={[itemFrac, itemDec]}
				selectedPreviewItem="item-frac-1"
			/>,
		);

		const fracCard = screen.getByText("Explain equivalent fractions.").closest(".v4-preview-card");
		const decCard = screen.getByText("Compare 0.5 and 0.50.").closest(".v4-preview-card");

		expect(fracCard).toHaveClass("v4-selected");
		expect(decCard).not.toHaveClass("v4-selected");
	});

	it("PreviewPanel highlights items whose primaryConcepts include selectedConcept", () => {
		render(
			<PreviewPanel
				previewItems={[itemFrac, itemDec]}
				selectedConcept="fractions"
			/>,
		);

		const fracCard = screen.getByText("Explain equivalent fractions.").closest(".v4-preview-card");
		const decCard = screen.getByText("Compare 0.5 and 0.50.").closest(".v4-preview-card");

		expect(fracCard).toHaveClass("v4-highlighted");
		expect(decCard).not.toHaveClass("v4-highlighted");
	});

	it("ProblemGroupPanel cross-highlights a group whose concepts include selectedConcept", () => {
		render(
			<ProblemGroupPanel
				problemGroups={[groupFractions, groupDecimals]}
				selectedConcept="fractions"
			/>,
		);

		// group-fractions contains "fractions" → should be v4-highlighted (but it's active so no cross-highlight)
		// The second group (decimals) does NOT contain "fractions"
		const fracTab = screen.getByRole("tab", { name: /Fractions group/i });
		const decTab = screen.getByRole("tab", { name: /Decimals group/i });

		// The active (default first) group won't get v4-highlighted (it's active already)
		// But clicking the decimals tab then selecting fractions concept should highlight fractions
		fireEvent.click(decTab);

		// Now fractions group is NOT active, so it should get v4-highlighted
		expect(fracTab).toHaveClass("v4-highlighted");
		expect(decTab).not.toHaveClass("v4-highlighted");
	});

	it("CoveragePanel marks the matching concept row as v4-selected when selectedConcept is set", () => {
		render(
			<CoveragePanel
				scoredConcepts={[conceptFractions, conceptDecimals]}
				selectedConcept="decimals"
			/>,
		);

		const rows = document.querySelectorAll(".v4-coverage-row");
		const selectedRows = document.querySelectorAll(".v4-coverage-row.v4-selected");

		expect(selectedRows).toHaveLength(1);
		// decimals has lower coverage so it appears second in the sorted list
		expect(rows).toHaveLength(2);
		expect(selectedRows[0]).toHaveTextContent("decimals");
	});
});
