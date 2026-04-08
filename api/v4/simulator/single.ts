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
import { callLLM } from "../../../lib/llm";
import type { SimulatorData, StudentProfile } from "../../../src/types/simulator";
import { fetchSessionText, formatStudentProfile, parseSimulatorResponse } from "./shared";

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
      "redFlags": [string]
    }
  ],
  "overall": {
    "totalItems": number,
    "estimatedCompletionTimeSeconds": number,
    "fatigueRisk": number (0.0–1.0),
    "pacingRisk": number (0.0–1.0),
    "majorRedFlags": [string]
  },
  "rewriteSuggestions": {
    "testLevel": [string],
    "itemLevel": {
      "ITEM_NUMBER": [string]
    }
  }
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

After completing the simulation, produce a final section called "rewriteSuggestions" inside the DATA JSON.
Rewrite suggestions must be grounded ONLY in the metrics you generated:
- high cognitiveLoad
- high confusionRisk
- high readingLoad
- high vocabularyDifficulty
- high misconceptionRisk
- long timeToProcessSeconds

Rules for suggestions:
- Suggestions must be actionable and teacher-friendly.
- Suggestions must NOT rewrite the item directly.
- Suggestions must NOT introduce new content.
- Focus on clarity, pacing, cognitive load, vocabulary, and fairness.
- testLevel: 2–5 whole-assessment suggestions.
- itemLevel: only include items that scored high on risk metrics.

IMPORTANT — STRICT OUTPUT FORMAT:
- In the DATA section, output ONLY the raw JSON object.
- Do NOT wrap the JSON in code fences (no \`\`\` or \`\`\`json).
- Do NOT add any text, headings, or labels within the DATA section — only the JSON.
- Start the JSON directly with "{" and end with "}".
${DATA_SCHEMA}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

	const raw = await callLLM({ prompt, metadata: { runType: "simulate-single", sessionId }, options: { temperature: 0.4, maxOutputTokens: 8192 } });

	const { narrative, data } = parseSimulatorResponse(raw);

	return res.status(200).json({ narrative, data: data as SimulatorData | null });
}
