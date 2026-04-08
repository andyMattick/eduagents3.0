/**
 * POST /api/v4/simulator/multi — Parallel multi-profile simulation
 *
 * Accepts a sessionId and a list of named student profiles.
 * Fetches stored document text, builds a single parallel prompt,
 * calls Gemini once, and returns:
 *   - narrative: teacher-facing summary
 *   - data: ParallelSimulatorData with per-profile analytics + comparison block
 *
 * No ingestion. No pipeline. One LLM call.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callLLM } from "../../../lib/llm";
import type { ParallelSimulatorData, StudentProfile } from "../../../src/types/simulator";
import {
	buildMultiProfilePrompt,
	fetchSessionText,
	formatStudentProfile,
	parseSimulatorResponse,
} from "./shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method === "OPTIONS") {
		return res
			.status(200)
			.setHeader("Access-Control-Allow-Origin", "*")
			.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
			.setHeader("Access-Control-Allow-Headers", "Content-Type")
			.end();
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	let body = req.body;
	if (typeof body === "string") {
		try { body = JSON.parse(body); } catch { /* keep as-is */ }
	}

	const { sessionId, studentProfiles } = (body ?? {}) as {
		sessionId?: string;
		studentProfiles?: Array<{ label: string; profile: StudentProfile }>;
	};

	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}
	if (!studentProfiles || studentProfiles.length < 2) {
		return res.status(400).json({ error: "At least 2 studentProfiles are required for parallel simulation" });
	}
	if (studentProfiles.length > 4) {
		return res.status(400).json({ error: "Maximum 4 profiles per simulation" });
	}

	try {
		const { text, docCount } = await fetchSessionText(sessionId);

		if (!text || docCount === 0) {
			return res.status(404).json({ error: "No document text found for this session." });
		}

		const labels = studentProfiles.map((sp) => sp.label);
		const profiles = studentProfiles.map((sp) => sp.profile);

		// Format profile descriptions for the system prompt preamble
		const profileDescriptions = labels.map((label, i) => {
			return `${label}:\n${formatStudentProfile(profiles[i])}`;
		}).join("\n\n");

		// Build the full prompt (system + user combined as a single Gemini user message)
		const prompt = buildMultiProfilePrompt(text, labels, profiles);

		const raw = await callLLM({ prompt, metadata: { runType: "simulate-multi", sessionId }, options: { temperature: 0.4, maxOutputTokens: 8192 } });

		const parsed = parseSimulatorResponse(raw);

		// Validate and cast the structured data
		const data: ParallelSimulatorData | null =
			parsed.data && typeof parsed.data === "object" && "students" in (parsed.data as object)
				? (parsed.data as ParallelSimulatorData)
				: null;

		return res.status(200).json({
			narrative: parsed.narrative,
			data,
			meta: {
				profiles: labels,
				docCount,
				profileDescriptions,
			},
		});
	} catch (err) {
		console.error("[simulator/multi]", err);
		return res.status(500).json({
			error: err instanceof Error ? err.message : "Simulation failed.",
		});
	}
}
