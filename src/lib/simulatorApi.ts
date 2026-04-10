/**
 * src/lib/simulatorApi.ts — Client-side wrappers for simulator API routes
 */

import type {
	GenerateTestRequest,
	GenerateTestResponse,
	MultiProfileSimulatorResponse,
	PreparednessSimulatorRequest,
	PreparednessSimulatorResponse,
	RewriteResponse,
	SingleSimulatorRequest,
	SingleSimulatorResponse,
} from "../types/simulator";
import { fetchJson } from "./instructionalSessionApi";

function buildJsonHeaders(userId?: string): Record<string, string> {
	return {
		"Content-Type": "application/json",
		...(userId ? { "x-user-id": userId } : {}),
	};
}

export function runSingleSimulatorApi(params: SingleSimulatorRequest, userId?: string) {
	return fetchJson<SingleSimulatorResponse>("/api/v4/simulator/single", {
		method: "POST",
		headers: buildJsonHeaders(userId),
		body: JSON.stringify(params),
	});
}

export function runPreparednessSimulatorApi(params: PreparednessSimulatorRequest, userId?: string) {
	return fetchJson<PreparednessSimulatorResponse>("/api/v4/simulator/preparedness", {
		method: "POST",
		headers: buildJsonHeaders(userId),
		body: JSON.stringify(params),
	});
}

export function runMultiSimulatorApi(
	sessionId: string,
	studentProfiles: Array<{ label: string; profile: import("../types/simulator").StudentProfile }>,
	userId?: string,
) {
	return fetchJson<MultiProfileSimulatorResponse>("/api/v4/simulator/multi", {
		method: "POST",
		headers: buildJsonHeaders(userId),
		body: JSON.stringify({ sessionId, studentProfiles }),
	});
}

export function runGenerateTestApi(params: GenerateTestRequest, userId?: string) {
	return fetchJson<GenerateTestResponse>("/api/v4/simulator/generate-test", {
		method: "POST",
		headers: buildJsonHeaders(userId),
		body: JSON.stringify(params),
	});
}

export function runRewriteApi(params: {
	documentId?: string;
	selectedSuggestions: {
		testLevel: string[];
		itemLevel: Record<string, string[]>;
	};
	teacherSuggestions?: string[];
	preferences?: Record<string, unknown>;
}, userId?: string) {
	return fetchJson<RewriteResponse>("/api/v4/rewrite", {
		method: "POST",
		headers: buildJsonHeaders(userId),
		body: JSON.stringify(params),
	});
}

export function reportBadRewriteApi(params: {
	userId?: string;
	sectionId?: string;
	original: string;
	rewritten: string;
	teacherInput: string;
	expectedOutput: string;
	whatWasWrong: string;
	additionalContext?: string;
}) {
	return fetchJson<{ ok: boolean }>("/api/v4/rewrite/report-bad", {
		method: "POST",
		headers: buildJsonHeaders(params.userId),
		body: JSON.stringify(params),
	});
}
