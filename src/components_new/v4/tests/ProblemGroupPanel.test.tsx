/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ViewerProblemGroup } from "../../../prism-v4/viewer";
import { ProblemGroupPanel } from "../ProblemGroupPanel";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

function makeProblemGroup(args: {
	groupId: string;
	documentId: string;
	title: string;
	sourceFileName: string;
	concepts: string[];
	primaryConcepts: string[];
	linkedPreviewCount?: number;
	linkedBy?: ViewerProblemGroup["linkedBy"];
	problemText: string;
	previewStem?: string;
}): ViewerProblemGroup {
	return {
		groupId: args.groupId,
		documentId: args.documentId,
		sourceFileName: args.sourceFileName,
		sourceSpan: { firstPage: 2, lastPage: 3 },
		title: args.title,
		problemCount: 1,
		concepts: args.concepts,
		primaryConcepts: args.primaryConcepts,
		representations: ["text", "visual"],
		misconceptions: ["common-error"],
		difficulty: "medium",
		cognitiveDemand: "conceptual",
		problems: [
			{
				problemId: `${args.groupId}-problem-1`,
				text: args.problemText,
				concepts: args.concepts,
				representations: ["text"],
				difficulty: "medium",
				cognitiveDemand: "conceptual",
				sourceSpan: { firstPage: 2, lastPage: 3 },
				anchors: [{ surfaceId: "surface-1", nodeId: "node-1" }],
				misconceptions: ["common-error"],
			},
		],
		previewItems: args.previewStem
			? [
				{
					itemId: `${args.groupId}-item-1`,
					stem: args.previewStem,
					answer: "Answer guidance",
					conceptId: args.primaryConcepts[0] ?? args.concepts[0] ?? "concept",
					primaryConcepts: args.primaryConcepts,
					bloom: "understand",
					difficulty: "medium",
					mode: "explain",
					scenario: "abstract-symbolic",
					sourceDocumentId: args.documentId,
					sourceSpan: { firstPage: 2, lastPage: 3 },
					teacherReasons: [],
					studentReasons: [],
					groupId: args.groupId,
				},
			]
			: [],
		previewItemIds: args.previewStem ? [`${args.groupId}-item-1`] : [],
		previewConcepts: args.primaryConcepts,
		previewSourceDocumentIds: [args.documentId],
		previewPageSpans: [{ firstPage: 2, lastPage: 3 }],
		linkedPreviewCount: args.linkedPreviewCount ?? (args.previewStem ? 1 : 0),
		linkedPreviewFallbackCount: 0,
		linkedBy: args.linkedBy ?? (args.previewStem ? "groupId" : "none"),
		conceptFrequencies: Object.fromEntries(args.concepts.map((concept) => [concept, 1])),
	};
}

describe("ProblemGroupPanel", () => {
	it("renders grouped problems and switches detail when another group is selected", () => {
		const handleSelect = vi.fn();
		const problemGroups = [
			makeProblemGroup({
				groupId: "group-fractions",
				documentId: "doc-1",
				title: "Explain equivalent fractions.",
				sourceFileName: "fractions.pdf",
				concepts: ["fractions", "number sense"],
				primaryConcepts: ["fractions"],
				problemText: "Explain why 2/4 and 1/2 are equivalent.",
				previewStem: "Which fraction is equivalent to 1/2?",
			}),
			makeProblemGroup({
				groupId: "group-ratios",
				documentId: "doc-2",
				title: "Compare ratio tables.",
				sourceFileName: "ratios.pdf",
				concepts: ["ratios"],
				primaryConcepts: ["ratios"],
				problemText: "Compare two ratio tables and justify which is proportional.",
				previewStem: "Which table shows a proportional relationship?",
			}),
		];

		render(<ProblemGroupPanel problemGroups={problemGroups} onSelectProblemGroup={handleSelect} />);

		expect(screen.getByRole("heading", { name: "Problem groups" })).toBeInTheDocument();
		expect(screen.getByRole("tabpanel", { name: "Explain equivalent fractions. details" })).toBeInTheDocument();
		expect(screen.getByText("Explain why 2/4 and 1/2 are equivalent.")).toBeInTheDocument();
		expect(screen.getByText("Which fraction is equivalent to 1/2?")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("tab", { name: /Compare ratio tables\./i }));

		expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ groupId: "group-ratios", documentId: "doc-2" }));
		expect(screen.getByRole("tabpanel", { name: "Compare ratio tables. details" })).toBeInTheDocument();
		expect(screen.getByText("Compare two ratio tables and justify which is proportional.")).toBeInTheDocument();
		expect(screen.getByText("Which table shows a proportional relationship?")).toBeInTheDocument();
	});

	it("renders an empty state when there are no problem groups", () => {
		render(<ProblemGroupPanel problemGroups={[]} />);

		expect(screen.getByText("No grouped problems are available yet for this workspace.")).toBeInTheDocument();
	});
});