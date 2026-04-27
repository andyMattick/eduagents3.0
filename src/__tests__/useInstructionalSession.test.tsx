/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useInstructionalSession } from "../hooks/useInstructionalSession";

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("useInstructionalSession", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("loads a class profile into the canonical instructional session", async () => {
		const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
		fetchMock.mockImplementation(async (input) => {
			const url = String(input);

			if (url.includes("/api/v4/documents/session?sessionId=session-1")) {
				return jsonResponse({
					session: { sessionId: "session-1", documentIds: ["doc-1"] },
					documents: [
						{
							documentId: "doc-1",
							sourceFileName: "fractions.pdf",
							sourceMimeType: "application/pdf",
							createdAt: "2026-03-29T00:00:00.000Z",
						},
					],
					analyzedDocuments: [],
				});
			}

			if (url.includes("/api/v4/documents/session-analysis?sessionId=session-1")) {
				return jsonResponse({
					sessionId: "session-1",
					documentIds: ["doc-1"],
					analysis: {
						concepts: [],
						problems: [],
						misconceptions: [],
						bloomSummary: {
							remember: 0,
							understand: 0,
							apply: 0,
							analyze: 0,
							evaluate: 0,
							create: 0,
						},
						modeSummary: {},
						scenarioSummary: {},
						difficultySummary: {
							low: 0,
							medium: 0,
							high: 0,
							averageInstructionalDensity: 0,
						},
						domain: "Mathematics",
					},
					rawAnalysis: null,
				});
			}

			if (url.includes("/api/v4/documents/intent?sessionId=session-1")) {
				return jsonResponse({
					sessionId: "session-1",
					products: [],
				});
			}

			if (url.includes("/api/v4/classes/class-1/performance")) {
				return jsonResponse({
					classProfile: {
						classId: "class-1",
						students: [
							{
								studentId: "student-a",
								unitId: "unit-1",
								conceptMastery: [
									{ conceptId: "fractions", score: 0.82, confidence: 0.9 },
								],
								misconceptions: ["denominator-swap"],
								exposures: [],
								responseTimes: [],
								updatedAt: "2026-03-29T00:00:00.000Z",
							},
						],
						conceptClusters: [
							{ conceptId: "fractions", low: [], mid: [], high: ["student-a"] },
						],
						misconceptionClusters: [
							{ misconception: "denominator-swap", students: ["student-a"] },
						],
					},
				});
			}

			throw new Error(`Unexpected fetch: ${url}`);
		});

		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useInstructionalSession());

		await act(async () => {
			await result.current.refreshWorkspace("session-1");
		});

		await act(async () => {
			await result.current.loadClassProfile("class-1");
		});

		await waitFor(() => {
			expect(result.current.instructionalSession?.classProfile).toMatchObject({
				classId: "class-1",
				conceptClusters: [
					{ conceptId: "fractions", high: ["student-a"] },
				],
			});
		});

		expect(result.current.workspace?.instructionalSession?.classProfile?.classId).toBe("class-1");
		expect(fetchMock).toHaveBeenCalledWith("/api/v4/classes/class-1/performance", undefined);
	});
});