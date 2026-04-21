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
import type {
	ParallelSimulatorData,
	SimulationMeasurables,
	SimulationProfileMetrics,
	StudentProfile,
} from "../../../src/types/simulator";
import {
	buildMultiProfilePrompt,
	computeConfusionScore,
	fetchSessionText,
	formatStudentProfile,
	PROFILE_CATALOG,
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

		// Build SimulationProfileMetrics[] from the students map so the UI can
		// use the unified profiles format directly.
		const profiles: SimulationProfileMetrics[] = [];
		if (data?.students) {
			for (const entry of studentProfiles) {
				const profileData = data.students[entry.label];
				if (!profileData) continue;

				// Resolve color from catalog by matching label → id
				const catalogEntry = PROFILE_CATALOG.find(
					(c) => c.label.toLowerCase() === entry.label.toLowerCase()
						|| c.id === entry.label.toLowerCase().replace(/\s+/g, "_"),
				) ?? PROFILE_CATALOG[0];

				const measurables: SimulationMeasurables[] = (profileData.items ?? []).map(
					(item, idx) => ({
						itemId: String(item.itemNumber),
						index: item.itemNumber,
						wordCount: item.wordCount,
						cognitiveLoad: item.cognitiveLoad,
						difficulty: (item as { difficulty?: number }).difficulty ?? 3,
						timeToProcessSeconds: item.timeToProcessSeconds,
						readingLoad: item.readingLoad,
						steps: (item as { steps?: number }).steps ?? 1,
						distractorDensity: (item as { distractorDensity?: number }).distractorDensity ?? 0,
						vocabularyDifficulty: (item as { vocabularyDifficulty?: number }).vocabularyDifficulty ?? 0,
						misconceptionRisk: item.misconceptionRisk,

						confusionScore: (item as { confusionScore?: number }).confusionScore ??
							computeConfusionScore(
								{
									cognitiveLoad: item.cognitiveLoad,
									readingLoad: item.readingLoad,
									distractorDensity: (item as { distractorDensity?: number }).distractorDensity ?? 0,
									steps: (item as { steps?: number }).steps ?? 1,
									timeToProcessSeconds: item.timeToProcessSeconds,
								},
								{ misconceptionRisk: item.misconceptionRisk },
							),
					}),
				);

				profiles.push({
					profileId: catalogEntry.id,
					profileLabel: entry.label,
					color: catalogEntry.color,
					measurables,
					predictedStates: {
						fatigue: profileData.overall.predictedStates?.fatigue ?? profileData.overall.fatigueRisk,
						confusion: profileData.overall.predictedStates?.confusion ?? 0,
						guessing: profileData.overall.predictedStates?.guessing ?? 0,
						overload: profileData.overall.predictedStates?.overload ?? 0,
						frustration: profileData.overall.predictedStates?.frustration ?? 0,
						timePressureCollapse: profileData.overall.predictedStates?.timePressureCollapse ?? profileData.overall.pacingRisk,
						emotionalFriction: (profileData.overall.predictedStates as { emotionalFriction?: number } | undefined)?.emotionalFriction ?? 0,
						confidenceImpact: (profileData.overall.predictedStates as { confidenceImpact?: number } | undefined)?.confidenceImpact ?? 0,
						pacingPressure: (profileData.overall.predictedStates as { pacingPressure?: number } | undefined)?.pacingPressure ?? profileData.overall.pacingRisk,
					fatigueIncrease: (profileData.overall.predictedStates as { fatigueIncrease?: number[] } | undefined)?.fatigueIncrease ?? [],
					attentionDrop: (profileData.overall.predictedStates as { attentionDrop?: number[] } | undefined)?.attentionDrop ?? [],
					},
				});
			}
		}

		// Extract per-profile narratives if present
		const rawData = parsed.data as Record<string, unknown> | null;
		const profileNarratives: Record<string, string> =
			rawData && typeof rawData.profileNarratives === "object" && rawData.profileNarratives !== null
				? (rawData.profileNarratives as Record<string, string>)
				: {};

		return res.status(200).json({
			narrative: parsed.narrative,
			data,
			profiles,
			profileNarratives,
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
