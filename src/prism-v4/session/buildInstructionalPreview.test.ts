import { describe, expect, it } from "vitest";

import { buildInstructionalPreview } from "./buildInstructionalPreview";
import type { TestProduct } from "../schema/integration";

describe("buildInstructionalPreview", () => {
	it("preserves preview provenance from test items", () => {
		const product: TestProduct = {
			kind: "test",
			focus: null,
			title: "Assessment",
			overview: "Preview",
			estimatedDurationMinutes: 15,
			totalItemCount: 1,
			generatedAt: "2026-03-31T00:00:00.000Z",
			sections: [
				{
					concept: "fractions",
					sourceDocumentIds: ["doc-1"],
					items: [
						{
							itemId: "item-1",
							prompt: "Explain equivalent fractions.",
							concept: "fractions",
							primaryConcepts: ["fractions", "number sense"],
							groupId: "group-fractions",
							sourceDocumentId: "doc-1",
							sourceFileName: "fractions.pdf",
							sourceSpan: { firstPage: 2, lastPage: 3 },
							difficulty: "medium",
							cognitiveDemand: "conceptual",
							answerGuidance: "Look for equivalence reasoning.",
						},
					],
				},
			],
		};

		const preview = buildInstructionalPreview({ product });

		expect(preview.items).toHaveLength(1);
		expect(preview.items[0]).toMatchObject({
			itemId: "item-1",
			conceptId: "fractions",
			primaryConcepts: ["fractions", "number sense"],
			groupId: "group-fractions",
			sourceDocumentId: "doc-1",
			sourceSpan: { firstPage: 2, lastPage: 3 },
		});
	});
});