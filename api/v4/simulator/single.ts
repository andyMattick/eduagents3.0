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
import { computeConfusionScore, fetchSessionText, formatStudentProfile, parseSimulatorResponse } from "./shared";

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
      "readingLoad": number (0.0–1.0),
      "wordCount": number,
      "sentenceCount": number,
      "vocabularyDifficulty": number (0.0–1.0),
      "cognitiveLoad": number (0.0–1.0),
      "confusionRisk": number (0.0–1.0),
      "timeToProcessSeconds": number,
      "misconceptionRisk": number (0.0–1.0),
      "difficulty": number (1–5, integer),
      "steps": number (integer, estimated reasoning steps required),
      "distractorDensity": number (0.0–1.0, share of choices designed to mislead),
      "redFlags": [string]
    }
  ],
	"sections": [
		{
			"sectionId": string,
			"readingLoad": number (0.0–1.0),
			"vocabularyDifficulty": number (0.0–1.0),
			"cognitiveLoad": number (0.0–1.0),
			"confusionRisk": number (0.0–1.0),
			"fatigueRisk": number (0.0–1.0),
			"redFlags": [string]
		}
	],
  "overall": {
    "totalItems": number,
    "estimatedCompletionTimeSeconds": number,
    "fatigueRisk": number (0.0–1.0),
    "pacingRisk": number (0.0–1.0),
    "majorRedFlags": [string],
    "predictedStates": {
      "fatigue": number (0.0–1.0),
      "confusion": number (0.0–1.0),
      "guessing": number (0.0–1.0),
      "overload": number (0.0–1.0),
      "frustration": number (0.0–1.0),
      "timePressureCollapse": number (0.0–1.0)
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
      "itemNumber": number (optional, only for item-level suggestions)
    }
  ]
}`;

const SYSTEM_PROMPT = `You are a student-experience simulator for teachers.
Given a test and a student profile, analyze how a typical student would experience the assessment in real time.

Focus on:
- cognitive load
- confusion points
- pacing and time pressure
- attention drift
- emotional responses (frustration, confidence dips, fatigue)
- likely misconceptions
- where students will lose time
- where sequencing creates difficulty
- readability and clarity of wording
- sentence length, vocabulary load, and unnecessary complexity

If the document includes explanatory notes or sections, also evaluate each section for:
- reading load
- vocabulary difficulty
- conceptual density via cognitiveLoad
- confusion risk
- fatigue risk
- red flags

IMPORTANT: All numeric fields (readingLoad, vocabularyDifficulty, cognitiveLoad, confusionRisk, misconceptionRisk, fatigueRisk, pacingRisk) MUST be decimals between 0.0 and 1.0. Do NOT use percentages.

For each item, evaluate:
- reading load
- word count
- sentence count
- vocabulary difficulty
- cognitive load
- confusion risk
- time to process
- misconception risk
- red flags

After completing the simulation, populate the following sections in the DATA JSON:

"overall.predictedStates": Predict the probability (0.0–1.0) of each unobservable student state across the full assessment:
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

	const { text, docCount } = await fetchSessionText(sessionId);
	if (!text) {
		return res.status(422).json({ error: "No document text found for this session." });
	}

	const profileStr = formatStudentProfile(studentProfile);

	const prompt = `${SYSTEM_PROMPT}

USER:
Here is the test (from ${docCount} document${docCount === 1 ? "" : "s"}):
${text.substring(0, 12000)}

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

	// Build a SimulationProfileMetrics entry for the submitted profile so the
	// UI can use the unified `profiles` format even for single-profile runs.
	const simData = data as SimulatorData | null;
	const profiles: SimulationProfileMetrics[] | undefined = simData?.items
		? [
				{
					profileId: studentProfile?.attentionProfile === "ADHD" ? "adhd"
						: studentProfile?.readingProfile === "dyslexia" ? "dyslexia"
						: studentProfile?.readingProfile === "ELL" ? "ell"
						: "average",
					profileLabel: formatStudentProfileLabel(studentProfile),
					color: "#3b82f6",
					measurables: simData.items.map((item, idx) => ({
						itemId: String(item.itemNumber),
						index: idx,
						wordCount: item.wordCount,
						cognitiveLoad: item.cognitiveLoad,
						difficulty: (item as unknown as { difficulty?: number }).difficulty ?? 3,
						timeToProcessSeconds: item.timeToProcessSeconds,
						readingLoad: item.readingLoad,
						steps: (item as unknown as { steps?: number }).steps ?? 1,
						distractorDensity: (item as unknown as { distractorDensity?: number }).distractorDensity ?? 0,
						vocabularyDifficulty: (item as unknown as { vocabularyDifficulty?: number }).vocabularyDifficulty ?? 0,
						misconceptionRisk: item.misconceptionRisk,
						confusionScore: computeConfusionScore(
							{
								cognitiveLoad: item.cognitiveLoad,
								readingLoad: item.readingLoad,
								distractorDensity: (item as unknown as { distractorDensity?: number }).distractorDensity ?? 0,
								steps: (item as unknown as { steps?: number }).steps ?? 1,
								timeToProcessSeconds: item.timeToProcessSeconds,
								wordCount: item.wordCount,
								difficulty: (item as unknown as { difficulty?: number }).difficulty ?? 3,
								itemId: String(item.itemNumber),
								index: idx,
							},
							{ misconceptionRisk: item.misconceptionRisk },
						),
					})),
					predictedStates: {
						...(simData.overall.predictedStates ?? {
							fatigue: 0,
							confusion: 0,
							guessing: 0,
							overload: 0,
							frustration: 0,
							timePressureCollapse: 0,
						}),
						emotionalFriction: simData.overall.predictedStates?.emotionalFriction ?? 0,
						confidenceImpact: simData.overall.predictedStates?.confidenceImpact ?? 0,
						pacingPressure: simData.overall.predictedStates?.pacingPressure ?? 0,
						fatigueIncrease: (simData.overall.predictedStates as { fatigueIncrease?: number[] } | undefined)?.fatigueIncrease ?? [],
						attentionDrop: (simData.overall.predictedStates as { attentionDrop?: number[] } | undefined)?.attentionDrop ?? [],
					},
				},
			]
		: undefined;

	return res.status(200).json({ narrative, data: simData, profiles, tokenUsage });
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
