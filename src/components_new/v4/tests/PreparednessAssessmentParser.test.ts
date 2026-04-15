import { describe, expect, it } from "vitest";

import { buildPreparednessAssessmentItems } from "../preparednessAssessmentParser.ts";

describe("buildPreparednessAssessmentItems", () => {
	it("parses top-level numbered questions from paragraph-separated text", () => {
		const rawText = [
			"1. Find and interpret the percentile for a score of 1220.",
			"Use the ogive to justify your answer.",
			"",
			"2. Estimate the 60th percentile from the graph.",
			"Explain whether the estimate is exact or approximate.",
			"",
			"3. Joe scores a 90 on the test. Determine his z-score and interpret it.",
		].join("\n\n");

		const items = buildPreparednessAssessmentItems(rawText);

		expect(items).toHaveLength(3);
		expect(items[0]).toMatchObject({ itemNumber: 1 });
		expect(items[1]?.text).toContain("Estimate the 60th percentile");
		expect(items[2]?.text).toContain("Joe scores a 90");
	});

	it("does not treat every instruction line or table row as its own question", () => {
		const rawText = [
			"Chapter 2 Test",
			"For problems #5-10 use the Empirical Rule.",
			"Score Frequency Cumulative",
			"70 3 3",
			"80 5 8",
			"90 7 15",
			"1. Find and interpret the percentile.",
			"2. Estimate the 20th percentile.",
			"3. Joe scores a 90.",
		].join("\n\n");

		const items = buildPreparednessAssessmentItems(rawText);

		expect(items).toHaveLength(3);
		expect(items.map((item) => item.itemNumber)).toEqual([1, 2, 3]);
	});

	it("returns no items when there is no clear numbered question list", () => {
		const rawText = [
			"Chapter 2 Review Notes",
			"Mean, median, and mode definitions",
			"Histogram examples",
			"Ogive interpretation tips",
		].join("\n\n");

		expect(buildPreparednessAssessmentItems(rawText)).toEqual([]);
	});
});