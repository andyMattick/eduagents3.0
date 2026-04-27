/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

import { getFeedbackForProblem, getProblemOverride, listTeacherDerivedTemplates } from "../store";

describe("teacher feedback browser fetch fallbacks", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns empty data when dev server responds with html instead of json", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				headers: {
					get: () => "text/html",
				},
				text: async () => "<!DOCTYPE html><html><body>fallback</body></html>",
				json: async () => {
					throw new Error("should not parse html as json");
				},
			}),
		);

		await expect(getFeedbackForProblem("doc-1::p1")).resolves.toEqual([]);
		await expect(getProblemOverride("doc-1::p1")).resolves.toBeNull();
		await expect(listTeacherDerivedTemplates("math", "number")).resolves.toEqual([]);
	});
});