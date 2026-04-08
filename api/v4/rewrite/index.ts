/**
 * POST /api/v4/rewrite — Assessment rewrite engine
 *
 * Accepts { documentId?, sessionId?, suggestions, preferences? }.
 *
 * Preferred path (item-based):
 *   - documentId is provided → load structured items from v4_items and build
 *     a deterministic, PII-safe item-based prompt.
 *
 * Legacy path (text-based fallback):
 *   - Only sessionId provided → fetch raw document text and build a text-based
 *     prompt (same behaviour as the original route).
 *
 * All LLM calls go through callLLM(), which guards against PII in the prompt.
 *
 * Returns { rewrittenItems: [...] }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callLLM } from "../../../lib/llm";
import { supabaseRest } from "../../../lib/supabase";
import type { RewriteSuggestions } from "../../../src/types/simulator";
import { fetchSessionText, getItemsForDocument, type V4Item } from "../simulator/shared";

export const runtime = "nodejs";
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Prompt builder (item-based, PII-safe)
// ---------------------------------------------------------------------------

function buildRewritePrompt(
	items: V4Item[],
	suggestions: RewriteSuggestions,
	preferences: Record<string, unknown>,
): string {
	// Only include items that have item-level suggestions to shrink the prompt
	const itemNums = new Set(Object.keys(suggestions.itemLevel).map(Number));
	const relevantItems = itemNums.size > 0
		? items.filter((it) => itemNums.has(it.itemNumber))
		: items; // test-level only → send all

	return `You are an instructional rewrite engine for teachers.
Your job is to improve assessment items using the provided rewrite suggestions.

IMPORTANT PRIVACY RULES:
- The student, teacher, and school identities are anonymized.
- Do NOT invent names, locations, or personal identifiers.
- Do NOT include any PII in your output.

REWRITE RULES:
- Preserve the original learning objective.
- Preserve the correct answer.
- Do NOT introduce new content not present in the original item.
- Do NOT increase difficulty.
- Do NOT change the meaning of the question.
- Do NOT add narrative, commentary, or explanation outside the JSON.
- Apply ONLY the provided rewrite suggestions (AI-generated + teacher-authored).
- If a suggestion conflicts with correctness or meaning, adjust it safely.

OUTPUT RULES:
- Output ONLY a JSON object.
- Do NOT wrap the JSON in code fences.
- Do NOT include headings, labels, or narrative outside the JSON.
- Follow this exact schema:

{
  "rewrittenItems": [
    {
      "originalItemNumber": number,
      "rewrittenStem": "string",
      "rewrittenParts": ["optional array of strings"],
      "notes": "brief explanation of what was improved"
    }
  ]
}

ASSESSMENT ITEMS (JSON):
${JSON.stringify(relevantItems, null, 2)}

SELECTED + TEACHER-AUTHORED SUGGESTIONS (JSON):
${JSON.stringify(suggestions, null, 2)}

TEACHER PREFERENCES (JSON):
${JSON.stringify(preferences, null, 2)}

Now produce the rewrittenItems JSON object only.`;
}

// ---------------------------------------------------------------------------
// Legacy text-based prompt builder
// ---------------------------------------------------------------------------

function buildTextRewritePrompt(
	text: string,
	docCount: number,
	suggestions: RewriteSuggestions,
	preferences: Record<string, unknown>,
): string {
	return `You are an assessment rewrite engine for teachers.

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
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

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

	const {
	documentId,
	sessionId,
	selectedSuggestions,
	teacherSuggestions,
	selectedItems,
	preferences
	} = (body ?? {}) as {
	documentId?: string;
	sessionId?: string;
	selectedSuggestions?: {
		testLevel?: string[];
		itemLevel?: Record<string, string[]>;
	};
	teacherSuggestions?: string[];
	selectedItems?: number[];
	preferences?: Record<string, unknown>;
	};


	if (!sessionId && !documentId) {
		return res.status(400).json({ error: "documentId or sessionId is required" });
	}
	if (!selectedSuggestions) {
		return res.status(400).json({ error: "selectedSuggestions are required" });
	}

const mergedSuggestions: RewriteSuggestions = {
  testLevel: [
    ...(selectedSuggestions?.testLevel ?? []),
    ...(teacherSuggestions ?? []),
  ],
  itemLevel: selectedSuggestions?.itemLevel ?? {},
};

let prompt: string;

	// --- Preferred path: item-based ---
	if (documentId) {
  const items = await getItemsForDocument(documentId);

  if (items.length === 0) {
    // Items not yet persisted — fall back to text if sessionId is also present
    if (!sessionId) {
      return res.status(422).json({
        error: "No stored items found for this document. Re-upload the document to enable item-based rewriting.",
      });
    }

    // Fall through to text-based path below
    const { text, docCount } = await fetchSessionText(sessionId);
    if (!text) {
      return res.status(422).json({ error: "No document text found for this session." });
    }

    // ✅ FIXED: correct argument order + mergedSuggestions
    prompt = buildTextRewritePrompt(text, docCount, mergedSuggestions, preferences ?? {});
  } else {
    // Item-based rewrite
    prompt = buildRewritePrompt(items, mergedSuggestions, preferences ?? {});
  }
} else {
  // --- Legacy text-based path ---
  const { text, docCount } = await fetchSessionText(sessionId!);
  if (!text) {
    return res.status(422).json({ error: "No document text found for this session." });
  }

  // ✅ FIXED:
  prompt = buildTextRewritePrompt(text, docCount, mergedSuggestions, preferences ?? {});
}

	try {
		const raw = await callLLM({
			prompt,	
			metadata: { runType: "rewrite", documentId },
			options: { temperature: 0.3, maxOutputTokens: 8192 },
		});

		// Strip code fences if LLM added them anyway
		const cleaned = raw.replace(/```(?:json)?\s*\n?/gi, "").replace(/```\s*/g, "");

		const firstBrace = cleaned.indexOf("{");
		const lastBrace  = cleaned.lastIndexOf("}");

		if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
			console.error("[rewrite] No JSON found in LLM output:", raw.substring(0, 200));
			return res.status(500).json({ error: "Rewrite failed: could not extract JSON from response" });
		}

		const json = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));

		// Persist rewrite run for PDF export (fire-and-forget, non-fatal)
		if (documentId && Array.isArray(json.rewrittenItems)) {
			supabaseRest("v4_rewrite_runs", {
				method: "POST",
				body: { document_id: documentId, rewritten_items: json.rewrittenItems },
			}).catch(() => {});
		}

		return res.status(200).json(json);
	} catch (err) {
		console.error("[rewrite] error:", err);
		return res.status(500).json({ error: err instanceof Error ? err.message : "Rewrite failed" });
	}
}
