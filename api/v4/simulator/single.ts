/**
 * POST /api/v4/simulator/single — Single-document student experience simulation
 *
 * Accepts a sessionId (document already uploaded) and an optional studentProfile.
 * Fetches the stored document text, builds a prompt, calls Gemini once, and
 * returns a teacher-friendly narrative + structured per-item analytics data.
 *
 * No ingestion. No pipeline. No concept extraction.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveActor, getDailyUsage, DAILY_TOKEN_LIMIT, isTokenLimitError, sendTokenLimitResponse, checkTokenBudget, incrementTokens } from "../../../lib/tokenGate";
import { callGeminiDetailed } from "../../../lib/gemini";
import type { SimulationProfileMetrics, SimulatorData, StudentProfile } from "../../../src/types/simulator";
import {
	fetchSessionDocuments,
	formatStudentProfile,
	parseSimulatorResponse,
	runSemanticOnText,
	segmentText,
	vectorToMeasurables,
} from "./shared";

export const runtime = "nodejs";
export const maxDuration = 60;

const DATA_SCHEMA = `
Return your answer in two parts:

1. NARRATIVE (teacher-friendly text)

2. DATA (JSON ONLY, no commentary)
{
  "items": [
    {
      "itemNumber": number,
      "redFlags": [string]
    }
  ],
  "sections": [
    {
      "sectionId": string,
      "readingLoad": number (0.0-1.0),
      "vocabularyDifficulty": number (0.0-1.0),
      "cognitiveLoad": number (0.0-1.0),
      "confusionRisk": number (0.0-1.0),
      "fatigueRisk": number (0.0-1.0),
      "redFlags": [string]
    }
  ],
  "overall": {
    "totalItems": number,
    "estimatedCompletionTimeSeconds": number,
    "fatigueRisk": number (0.0-1.0),
    "pacingRisk": number (0.0-1.0),
    "majorRedFlags": [string],
    "predictedStates": {
      "fatigue": number (0.0-1.0),
      "confusion": number (0.0-1.0),
      "guessing": number (0.0-1.0),
      "overload": number (0.0-1.0),
      "frustration": number (0.0-1.0),
      "timePressureCollapse": number (0.0-1.0),
      "emotionalFriction": number (0.0-1.0),
      "confidenceImpact": number (0.0-1.0),
      "pacingPressure": number (0.0-1.0),
      "fatigueIncrease": number[],
      "attentionDrop": number[]
    }
  },
  "rewriteSuggestions": {
    "testLevel": [string],
    "itemLevel": {
      "ITEM_NUMBER": [string]
    }
  },
  "suggestions": [
    {
      "text": string,
      "type": "item_rewrite" | "instructional_support" | "student_behavior",
      "itemNumber": number
    }
  ]
}`;

const SYSTEM_PROMPT = `You are a student-experience simulator for teachers.
You receive pre-analyzed items — measurables (cognitive load, reading load, etc.) are already computed.

Your job:
- Write a narrative describing how this student experiences the assessment
- Identify red flags per item (wording issues, ambiguity, pacing, hidden difficulty)
- Predict overall unobservable student states
- Provide rewrite suggestions grounded in patterns you observe

Focus on:
- Pacing and time pressure
- Attention drift and fatigue arc
- Emotional responses (frustration, confidence dips, confusion spikes)
- Where sequencing creates difficulty
- Per-item red flags based on wording and structure

If the document includes explanatory notes or sections, evaluate each section for:
- reading load, vocabulary difficulty, cognitive load, confusion risk, fatigue risk, red flags

IMPORTANT: All numeric fields (readingLoad, vocabularyDifficulty, cognitiveLoad, confusionRisk, misconceptionRisk, fatigueRisk, pacingRisk) MUST be decimals between 0.0 and 1.0. Do NOT use percentages.

"overall.predictedStates": Predict the probability (0.0–1.0) of each unobservable student state:
- fatigue: likelihood the student fatigues before finishing
- confusion: overall confusion likelihood
- guessing: likelihood the student resorts to guessing
- overload: cognitive overload risk
- frustration: emotional frustration likelihood
- timePressureCollapse: likelihood time pressure causes performance collapse

"rewriteSuggestions": legacy flat format — still required for backwards compatibility.
- testLevel: 2–5 whole-assessment suggestions as plain strings.
- itemLevel: only include items that scored high on risk metrics.

"suggestions": new typed format — a flat array of ALL suggestions, each tagged with a routing type:
- "item_rewrite": the issue is in the item text and CAN be fixed by rewriting the item (ambiguous wording, excessive reading load, missing scaffold, misleading distractor, cognitive overload in the item itself).
- "instructional_support": the issue requires teacher action outside the item (re-teach concept, in-class support, pacing adjustment, supplemental materials).
- "student_behavior": a predicted student behavior pattern, diagnostic only (fatigue spike, guessing burst, confusion loop, attention drift) — NOT fixable by rewriting.
Include itemNumber for item-level suggestions.

Rules for suggestions:
- Suggestions must be grounded ONLY in the metrics you generated.
- item_rewrite suggestions must be actionable and teacher-friendly.
- Suggestions must NOT rewrite the item directly.
- Focus on clarity, pacing, cognitive load, vocabulary, and fairness.

IMPORTANT — STRICT OUTPUT FORMAT:
- In the DATA section, output ONLY the raw JSON object.
- Do NOT wrap the JSON in code fences (no \`\`\` or \`\`\`json).
- Do NOT add any text, headings, or labels within the DATA section — only the JSON.
- Start the JSON directly with "{" and end with "}".
${DATA_SCHEMA}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		return await simulateHandler(req, res);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[simulator/single] unhandled error:", message);
		const status = (err as { httpStatus?: number }).httpStatus ?? 500;
		return res.status(status).json({ error: message });
	}
}

async function simulateHandler(req: VercelRequest, res: VercelResponse) {
	if (req.method === "OPTIONS") {
		return res.status(200).setHeader("Access-Control-Allow-Origin", "*")
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

	const { sessionId, studentProfile } = (body ?? {}) as {
		sessionId?: string;
		studentProfile?: StudentProfile;
	};

	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	const { text, docCount, azureExtracts } = await fetchSessionDocuments(sessionId);
	if (!text) {
		return res.status(422).json({ error: "No document text found for this session." });
	}

	// Step 1 — Hybrid segmentation (Azure layout + local rules). No Gemini.
	// Segment each doc individually; items are numbered across all docs.
	const segments: Array<{ itemNumber: number; text: string }> = [];
	let itemOffset = 0;
	for (const azure of azureExtracts) {
		const docItems = await segmentText(azure);
		for (const item of docItems) {
			segments.push({ itemNumber: itemOffset + item.itemNumber, text: item.text });
		}
		itemOffset += docItems.length;
	}
	// If no azure_extracts available, fall back to segmenting the full text
	if (segments.length === 0 && text) {
		const fallback = await segmentText({ content: text });
		segments.push(...fallback.map((item) => ({ itemNumber: item.itemNumber, text: item.text })));
	}

	// Step 2 — Local semantic pipeline per segment → measurables.
	const localMeasurables: Array<ReturnType<typeof vectorToMeasurables> & { itemNumber: number }> = [];
	for (const seg of segments) {
		const vec = await runSemanticOnText(seg.text);
		if (!vec) continue;
		localMeasurables.push({ itemNumber: seg.itemNumber, ...vectorToMeasurables(vec, seg.text) });
	}

	// Step 3 — Build items JSON for Gemini (text only, no measurables).
	const itemsForPrompt = segments
		.map((s) => `Item ${s.itemNumber}:\n${s.text.substring(0, 600)}`)
		.join("\n\n");

	const profileStr = formatStudentProfile(studentProfile);

	const prompt = `${SYSTEM_PROMPT}

USER:
Here are the pre-segmented items (from ${docCount} document${docCount === 1 ? "" : "s"}):
${itemsForPrompt.substring(0, 8000)}

Here is the student profile:
${profileStr}`;

	const actor = resolveActor(req);

	try {
		await checkTokenBudget(actor.actorKey);
	} catch (err) {
		if (isTokenLimitError(err)) return sendTokenLimitResponse(res, err);
		throw err;
	}

	let raw: string;
	try {
		const result = await callGeminiDetailed({
			model: "gemini-2.0-flash",
			prompt,
			temperature: 0.4,
			maxOutputTokens: 8192,
		});
		raw = result.text;
		const tokensUsed =
			result.usageMetadata?.totalTokenCount ??
			(result.usageMetadata?.promptTokenCount ?? 0) +
				(result.usageMetadata?.candidatesTokenCount ?? 0);
		await incrementTokens(actor.actorKey, actor.userId, tokensUsed);
	} catch (err) {
		if (isTokenLimitError(err)) return sendTokenLimitResponse(res, err);
		// Re-throw Gemini errors (including 429) — do NOT fall back to a second
		// callLLM attempt, which would double the quota pressure and extend any
		// active throttle window.
		throw err;
	}

	const { narrative, data } = parseSimulatorResponse(raw);

	const usedAfter = await getDailyUsage(actor.actorKey).catch(() => 0);
	const tokenUsage = {
		used: usedAfter,
		remaining: Math.max(0, DAILY_TOKEN_LIMIT - usedAfter),
		limit: DAILY_TOKEN_LIMIT,
	};

	// Build SimulationProfileMetrics from LOCAL measurables (Option D).
	// Gemini no longer provides per-item measurables — they come from the
	// local semantic pipeline run above.
	const simData = data as SimulatorData | null;

	// Merge local measurables into data.items so the full schema is present.
	const mergedItems = localMeasurables.map((m) => {
		const geminiItem = (simData?.items ?? []).find((it) => it.itemNumber === m.itemNumber);
		return {
			itemNumber: m.itemNumber,
			cognitiveLoad: m.cognitiveLoad,
			readingLoad: m.readingLoad,
			vocabularyDifficulty: m.vocabularyDifficulty,
			misconceptionRisk: m.misconceptionRisk,
			distractorDensity: m.distractorDensity,
			steps: m.steps,
			wordCount: m.wordCount,
			timeToProcessSeconds: m.timeToProcessSeconds,
			confusionScore: m.confusionScore,
			difficulty: 3,
			sentenceCount: 0,
			confusionRisk: m.confusionScore,
			redFlags: (geminiItem as { redFlags?: string[] } | undefined)?.redFlags ?? [],
		};
	});

	const profiles: SimulationProfileMetrics[] | undefined = localMeasurables.length > 0
		? [
				{
					profileId: studentProfile?.attentionProfile === "ADHD" ? "adhd"
						: studentProfile?.readingProfile === "dyslexia" ? "dyslexia"
						: studentProfile?.readingProfile === "ELL" ? "ell"
						: "average",
					profileLabel: formatStudentProfileLabel(studentProfile),
					color: "#3b82f6",
					measurables: localMeasurables.map((m, idx) => ({
						itemId: String(m.itemNumber),
						index: idx,
						wordCount: m.wordCount,
						cognitiveLoad: m.cognitiveLoad,
						difficulty: 3,
						timeToProcessSeconds: m.timeToProcessSeconds,
						readingLoad: m.readingLoad,
						steps: m.steps,
						distractorDensity: m.distractorDensity,
						vocabularyDifficulty: m.vocabularyDifficulty,
						misconceptionRisk: m.misconceptionRisk,
						confusionScore: m.confusionScore,
					})),
					predictedStates: {
						...(simData?.overall?.predictedStates ?? {
							fatigue: 0,
							confusion: 0,
							guessing: 0,
							overload: 0,
							frustration: 0,
							timePressureCollapse: 0,
						}),
						emotionalFriction: simData?.overall?.predictedStates?.emotionalFriction ?? 0,
						confidenceImpact: simData?.overall?.predictedStates?.confidenceImpact ?? 0,
						pacingPressure: simData?.overall?.predictedStates?.pacingPressure ?? 0,
						fatigueIncrease: (simData?.overall?.predictedStates as { fatigueIncrease?: number[] } | undefined)?.fatigueIncrease ?? [],
						attentionDrop: (simData?.overall?.predictedStates as { attentionDrop?: number[] } | undefined)?.attentionDrop ?? [],
					},
				},
			]
		: undefined;

	const outputData = simData ? { ...simData, items: mergedItems } : null;
	return res.status(200).json({ narrative, data: outputData, profiles, tokenUsage });
}

function formatStudentProfileLabel(profile?: StudentProfile): string {
	if (!profile) return "Average Student";
	if (profile.attentionProfile === "ADHD") return "ADHD Profile";
	if (profile.readingProfile === "dyslexia") return "Dyslexia Profile";
	if (profile.readingProfile === "ELL") return "ELL Profile";
	if (profile.confidence === "low" && profile.anxietyLevel === "high") return "High Anxiety";
	if (profile.confidence === "high" && profile.pacingStyle === "fast") return "Gifted / Fast Processor";
	return "Average Student";
}
