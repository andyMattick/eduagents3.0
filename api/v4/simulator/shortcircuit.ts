/**
 * POST /api/v4/simulator/shortcircuit
 *
 * Short-circuit diagnostic: Azure ingestion → local semantic analysis → measurables.
 * No Gemini. No profiles. No narratives. No rewrite. No heavy prompt.
 *
 * Accepts { sessionId } — session must already exist in prism_v4_documents.
 * Runs runSemanticPipeline locally on each stored document and returns
 * per-item measurables for graph rendering.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseRest } from "../../../lib/supabase";
import { runSemanticPipeline } from "../../../src/prism-v4/semantic/pipeline/runSemanticPipeline";
import { computeConfusionScore } from "./shared";
import type { AzureExtractResult } from "../../../src/prism-v4/schema/semantic";

export const runtime = "nodejs";
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentRow {
	document_id: string;
	source_file_name: string | null;
	azure_extract: AzureExtractResult | Record<string, unknown> | null;
	canonical_document: {
		content?: string;
		nodes?: Array<{ text?: string; normalizedText?: string }>;
	} | null;
}

export interface ShortCircuitItem {
	itemNumber: number;
	documentId: string;
	cognitiveLoad: number;
	readingLoad: number;
	vocabularyDifficulty: number;
	misconceptionRisk: number;
	distractorDensity: number;
	steps: number;
	confusionScore: number;
	timeToProcessSeconds: number;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

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
		try {
			body = JSON.parse(body);
		} catch {
			/* keep as-is */
		}
	}

	const { sessionId } = (body ?? {}) as { sessionId?: string };
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	try {
		const rows = (await supabaseRest("prism_v4_documents", {
			select: "document_id,source_file_name,azure_extract,canonical_document",
			filters: { session_id: `eq.${sessionId}` },
		})) as DocumentRow[] | null;

		if (!rows || rows.length === 0) {
			return res.status(404).json({
				error: "No documents found for this session. Upload a document first.",
			});
		}

		const items: ShortCircuitItem[] = [];
		let globalItemNumber = 0;

		for (const row of rows) {
			const azureExtract = reconstructAzureExtract(row);
			if (!azureExtract) {
				console.warn("[shortcircuit] no usable azure_extract for document", row.document_id);
				continue;
			}

			let pipelineOutput;
			try {
				pipelineOutput = await runSemanticPipeline({
					documentId: row.document_id,
					fileName: row.source_file_name ?? "document",
					azureExtract,
				});
			} catch (err) {
				console.warn(
					"[shortcircuit] runSemanticPipeline failed for",
					row.document_id,
					err instanceof Error ? err.message : err,
				);
				continue;
			}

			for (const vec of pipelineOutput.problemVectors) {
				globalItemNumber++;

				// cognitiveLoad — fused difficulty from fuseCognition: weighted blend of
				// azure difficulty, structural cues, and template knowledge.
				const cognitiveLoad = clamp01(vec.cognitive?.difficulty ?? 0);

				// readingLoad — tagLinguisticLoad value passed through fuseCognition unchanged.
				// vec.linguisticLoad === vec.cognitive.linguisticLoad; both are safe.
				const readingLoad = clamp01(vec.linguisticLoad ?? 0);

				// vocabularyDifficulty — normalize vocabularyTier (1–3) to 0–1.
				// (abstractionLevel is conceptual depth, not vocabulary difficulty).
				const vocabularyDiff = clamp01(((vec.vocabularyTier ?? 1) - 1) / 2);

				// misconceptionRisk — aggregate of misconceptionTriggers scores rather than
				// vec.cognitive.misconceptionRisk which is template-dependent and often 0
				// when no template has been matched for the problem.
				const triggerValues = Object.values(vec.misconceptionTriggers ?? {});
				const misconceptionRsk = clamp01(triggerValues.length > 0 ? Math.max(...triggerValues) : 0);

				const distractorDens = clamp01(vec.distractorDensity ?? 0);
				const steps          = Math.max(1, Math.round(vec.steps ?? 1));

				// Estimate processing time from text length + step count.
				// (word_count / 3.3 words·s⁻¹) + steps × 8 s per reasoning step
				const stemText  = (vec.azure?.text ?? "").toString();
				const wordCount = stemText.split(/\s+/).filter(Boolean).length || 10;
				const timeToProcessSeconds = Math.max(5, Math.round(wordCount / 3.3 + steps * 8));

				const confusionScore = computeConfusionScore(
					{ cognitiveLoad, readingLoad, distractorDensity: distractorDens, steps, timeToProcessSeconds },
					{ misconceptionRisk: misconceptionRsk },
				);

				items.push({
					itemNumber: globalItemNumber,
					documentId: row.document_id,
					cognitiveLoad,
					readingLoad,
					vocabularyDifficulty: vocabularyDiff,
					misconceptionRisk: misconceptionRsk,
					distractorDensity: distractorDens,
					steps,
					confusionScore,
					timeToProcessSeconds,
				});
			}
		}

		if (items.length === 0) {
			return res.status(422).json({
				error: "No items could be extracted from the stored documents. Check that the session has analysed content.",
			});
		}

		return res.status(200).json({ items });
	} catch (err) {
		console.error("[shortcircuit] ERROR:", err);
		return res.status(500).json({
			error: err instanceof Error ? err.message : "Internal error",
		});
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
	return Math.min(1, Math.max(0, v));
}

/**
 * Reconstruct an AzureExtractResult from the stored row.
 * The `azure_extract` column stores the full AzureExtractResult shape when
 * the document was uploaded via the teacher upload pipeline.  Falls back to
 * a synthetic extract built from canonical_document nodes when azure_extract
 * is absent or incomplete.
 */
function reconstructAzureExtract(row: DocumentRow): AzureExtractResult | null {
	const raw = row.azure_extract as AzureExtractResult | null;

	// Prefer the stored azure_extract when it has the required fields
	if (raw && raw.content && Array.isArray(raw.pages) && raw.pages.length > 0) {
		return {
			fileName: row.source_file_name ?? raw.fileName ?? "document",
			content: raw.content,
			pages: raw.pages,
			paragraphs: raw.paragraphs ?? [],
			tables: raw.tables ?? [],
			readingOrder: raw.readingOrder ?? [],
		};
	}

	// Fallback — reconstruct from canonical_document nodes
	const nodes = row.canonical_document?.nodes ?? [];
	const content = nodes.map((n) => n.text ?? n.normalizedText ?? "").filter(Boolean).join("\n");
	if (content) {
		const paragraphs = content
			.split(/\n{2,}/)
			.filter(Boolean)
			.map((text, i) => ({ text, pageNumber: Math.floor(i / 20) + 1 }));

		return {
			fileName: row.source_file_name ?? "document",
			content,
			pages: [{ pageNumber: 1, text: content }],
			paragraphs,
			tables: [],
			readingOrder: [],
		};
	}

	// Last resort — use raw azure_extract content string only
	const rawContent = (row.azure_extract as { content?: string } | null)?.content;
	if (rawContent) {
		return {
			fileName: row.source_file_name ?? "document",
			content: rawContent,
			pages: [{ pageNumber: 1, text: rawContent }],
			paragraphs: [],
			tables: [],
			readingOrder: [],
		};
	}

	return null;
}
