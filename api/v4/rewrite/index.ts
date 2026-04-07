/**
 * POST /api/v4/rewrite — Assessment rewrite engine
 *
 * Accepts a sessionId (document already uploaded), rewriteSuggestions from the
 * simulator, and optional teacher preferences.  Fetches the original document
 * text server-side, then asks Gemini to rewrite flagged items in place.
 *
 * Returns { rewrittenItems: [...] }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callGemini } from "../../../lib/gemini";
import type { RewriteSuggestions } from "../../../src/types/simulator";
import { fetchSessionText } from "../simulator/shared";

export const runtime = "nodejs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method === "OPTIONS") {
		return res.status(200)
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

	const { sessionId, suggestions, preferences } = (body ?? {}) as {
		sessionId?: string;
		suggestions?: RewriteSuggestions;
		preferences?: Record<string, unknown>;
	};

	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}
	if (!suggestions) {
		return res.status(400).json({ error: "suggestions are required" });
	}

	const { text, docCount } = await fetchSessionText(sessionId);
	if (!text) {
		return res.status(422).json({ error: "No document text found for this session." });
	}

	const prompt = `You are an assessment rewrite engine for teachers.

Below is a test or assessment document (from ${docCount} document${docCount === 1 ? "" : "s"}).
Using the rewrite suggestions provided:
- Rewrite ONLY the flagged items
- Preserve the original learning objective for each item
- Do NOT change the correct answer
- Do NOT introduce new content beyond what is already in the document
- Do NOT increase difficulty
- Do NOT remove essential meaning

Return ONLY a JSON object with this shape:

{
  "rewrittenItems": [
    {
      "originalItemNumber": NUMBER,
      "rewrittenStem": "...",
      "rewrittenParts": ["...", "..."],
      "notes": "Short explanation of what was improved"
    }
  ]
}

IMPORTANT — STRICT OUTPUT FORMAT:
Do NOT wrap the JSON in code fences or backticks.
Do NOT add any headings, labels, or commentary.
Output ONLY the JSON object, starting with "{" and ending with "}".

DOCUMENT:
${text.substring(0, 8000)}

REWRITE SUGGESTIONS:
${JSON.stringify(suggestions, null, 2)}

TEACHER PREFERENCES:
${JSON.stringify(preferences ?? {}, null, 2)}`;

	try {
		const raw = await callGemini({ model: "gemini-2.0-flash", prompt, temperature: 0.3, maxOutputTokens: 4096 });

		// Strip code fences if LLM added them anyway
		const cleaned = raw.replace(/```(?:json)?\s*\n?/gi, "").replace(/```\s*/g, "");

		const firstBrace = cleaned.indexOf("{");
		const lastBrace = cleaned.lastIndexOf("}");

		if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
			console.error("[rewrite] No JSON found in LLM output:", raw.substring(0, 200));
			return res.status(500).json({ error: "Rewrite failed: could not extract JSON from response" });
		}

		const json = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
		return res.status(200).json(json);
	} catch (err) {
		console.error("[rewrite] error:", err);
		return res.status(500).json({ error: err instanceof Error ? err.message : "Rewrite failed" });
	}
}
