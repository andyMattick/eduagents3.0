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

export function runSingleSimulatorApi(params: SingleSimulatorRequest) {
	return fetchJson<SingleSimulatorResponse>("/api/v4/simulator/single", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(params),
	});
}

export function runPreparednessSimulatorApi(params: PreparednessSimulatorRequest) {
	return fetchJson<PreparednessSimulatorResponse>("/api/v4/simulator/preparedness", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(params),
	});
}

export function runMultiSimulatorApi(
	sessionId: string,
	studentProfiles: Array<{ label: string; profile: import("../types/simulator").StudentProfile }>,
) {
	return fetchJson<MultiProfileSimulatorResponse>("/api/v4/simulator/multi", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ sessionId, studentProfiles }),
	});
}

export function runGenerateTestApi(params: GenerateTestRequest) {
	return fetchJson<GenerateTestResponse>("/api/v4/simulator/generate-test", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
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
}) {
	return fetchJson<RewriteResponse>("/api/v4/rewrite", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(params),
	});
}
