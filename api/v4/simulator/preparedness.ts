/**
 * POST /api/v4/simulator/preparedness — Prep vs. test preparedness simulation
 *
 * Compares the uploaded session document (the test) against a separately-provided
 * prep/study document text to evaluate how well a student would be prepared.
 *
 * No ingestion. No pipeline.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callLLM } from "../../../lib/llm";
import type { SimulatorData, StudentProfile } from "../../../src/types/simulator";
import { fetchSessionText, formatStudentProfile, parseSimulatorResponse } from "./shared";

export const runtime = "nodejs";

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
      "alignmentScore": number (0.0–1.0),
      "redFlags": [string]
    }
  ],
  "overall": {
    "totalItems": number,
    "estimatedCompletionTimeSeconds": number,
    "fatigueRisk": number (0.0–1.0),
    "pacingRisk": number (0.0–1.0),
    "alignmentScore": number (0.0–1.0),
    "documentType": "notes" | "review" | "mixed" | "other",
    "documentTypeConfidence": number (0.0–1.0),
    "majorRedFlags": [string]
  },
  "rewriteSuggestions": {
    "testLevel": [string],
    "itemLevel": {
      "ITEM_NUMBER": [string]
    }
  }
}`;

const SYSTEM_PROMPT = `You compare a review/prep document with a test document and evaluate how well a typical student would be prepared.

Analyze:
- concept alignment
- difficulty alignment
- vocabulary alignment
- gaps between what was taught and what is tested
- cognitive load mismatch
- time and pacing mismatch
- likely student struggles
- fairness of the assessment

For each test item, evaluate:
- alignment with prep content
- vocabulary mismatch
- concept mismatch
- difficulty mismatch
- confusion risk
- time risk
- red flags

Also classify the prep document type:
- "notes": raw student or teacher notes, bullet points, unstructured
- "review": structured review sheet, study guide, or organized summary
- "mixed": combination of notes and structured content
- "other": textbook excerpt, article, or anything that doesn't fit the above

After completing the simulation, produce a final section called "rewriteSuggestions" inside the DATA JSON.
Rewrite suggestions must be grounded ONLY in the metrics you generated:
- high cognitiveLoad
- high confusionRisk
- high readingLoad
- high vocabularyDifficulty
- high misconceptionRisk
- long timeToProcessSeconds
- missing prep alignment (low alignmentScore)

Rules for suggestions:
- Suggestions must be actionable and teacher-friendly.
- Suggestions must NOT rewrite the item directly.
- Suggestions must NOT introduce new content.
- Focus on clarity, pacing, cognitive load, vocabulary, fairness, and prep alignment gaps.
- testLevel: 2–5 whole-assessment suggestions.
- itemLevel: only include items that scored high on risk metrics or low on alignment.

IMPORTANT — STRICT OUTPUT FORMAT:
- In the DATA section, output ONLY the raw JSON object.
- Do NOT wrap the JSON in code fences (no \`\`\` or \`\`\`json).
- Do NOT add any text, headings, or labels within the DATA section — only the JSON.
- Start the JSON directly with "{" and end with "}".

IMPORTANT: All numeric fields (readingLoad, vocabularyDifficulty, cognitiveLoad, confusionRisk, misconceptionRisk, alignmentScore, fatigueRisk, pacingRisk, documentTypeConfidence) MUST be decimals between 0.0 and 1.0. Do NOT use percentages.
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

	const { sessionId, prepText, studentProfile } = (body ?? {}) as {
		sessionId?: string;
		prepText?: string;
		studentProfile?: StudentProfile;
	};

	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}
	if (!prepText?.trim()) {
		return res.status(400).json({ error: "prepText is required" });
	}

	const { text: testText } = await fetchSessionText(sessionId);
	if (!testText) {
		return res.status(422).json({ error: "No document text found for this session." });
	}

	const profileStr = formatStudentProfile(studentProfile);

	const prompt = `${SYSTEM_PROMPT}

USER:
Prep Document:
${prepText.substring(0, 6000)}

Test Document:
${testText.substring(0, 6000)}

Student Profile:
${profileStr}`;

	const raw = await callLLM({ prompt, metadata: { runType: "simulate-preparedness", sessionId }, options: { temperature: 0.4, maxOutputTokens: 8192 } });

	const { narrative, data } = parseSimulatorResponse(raw);

	return res.status(200).json({ narrative, data: data as SimulatorData | null });
}
