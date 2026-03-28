import { describe, expect, it } from "vitest";

import { cleanupProductPayload } from "./cleanupProductPayload";
import type { IntentPayloadByType } from "../../schema/integration";

describe("cleanupProductPayload", () => {
	it("preserves domain while removing duplicate test prompts and empty sections", () => {
		const payload: IntentPayloadByType["build-test"] = {
			kind: "test",
			focus: null,
			domain: "Mathematics",
			title: "Assessment Draft",
			overview: "Review fractions. Review fractions.",
			estimatedDurationMinutes: 10,
			sections: [
				{
					concept: "fractions",
					sourceDocumentIds: ["doc-1", "doc-1"],
					items: [
						{
							itemId: "item-1",
							prompt: "Explain equivalent fractions.\nExplain equivalent fractions.",
							concept: "fractions",
							sourceDocumentId: "doc-1",
							sourceFileName: "doc-1.pdf",
							difficulty: "medium",
							cognitiveDemand: "conceptual",
							answerGuidance: "Look for reasoning.\nLook for reasoning.",
						},
						{
							itemId: "item-2",
							prompt: "Explain equivalent fractions.\nExplain equivalent fractions.",
							concept: "fractions",
							sourceDocumentId: "doc-1",
							sourceFileName: "doc-1.pdf",
							difficulty: "medium",
							cognitiveDemand: "conceptual",
							answerGuidance: "Look for reasoning.\nLook for reasoning.",
						},
					],
				},
				{
					concept: "ratios",
					sourceDocumentIds: ["doc-2"],
					items: [],
				},
			],
			totalItemCount: 2,
			generatedAt: "2026-03-28T00:00:00.000Z",
		};

		const cleaned = cleanupProductPayload(payload);

		expect(cleaned.domain).toBe("Mathematics");
		expect(cleaned.sections).toHaveLength(1);
		expect(cleaned.sections[0]?.sourceDocumentIds).toEqual(["doc-1"]);
		expect(cleaned.sections[0]?.items).toHaveLength(1);
		expect(cleaned.totalItemCount).toBe(1);
	});
});