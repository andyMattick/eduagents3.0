/**
 * POST /api/v4/simulator/shortcircuit
 *
 * Option D diagnostic path:
 *   Azure extract → LLM segmentation (text only) → local semantic pipeline
 *   per segment → measurables → graph.
 *
 * LLM does ONLY segmentation (250–400 tokens in / ~200 tokens out).
 * All measurables are computed locally — no LLM measurables, no 429 storms.
 *
 * Returns:
 *   { rawItems: SegmentedItem[], items: ShortCircuitItem[] }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseRest } from "../../../lib/supabase";
import type { SimulationItem, SimulationItemTree } from "../../../src/prism-v4/schema";
import { buildItemTree } from "../../../src/prism-v4/segmentation/buildItemTree";
import { applySectionInstructionEffects, buildSections, type SimulationSection } from "../../../src/prism-v4/segmentation/sectioning";
import {
	applyPhaseADefaults,
	buildAzureExtractFromRow,
	computeConfusionScore,
	PROFILE_CATALOG,
	runSemanticOnText,
	segmentText,
	vectorToMeasurables,
	type SegmentedItem,
} from "./shared";

export const runtime = "nodejs";
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShortCircuitItem = SimulationItem;

export interface ProfileShortCircuitResult {
	profileId: string;
	profileLabel: string;
	color: string;
	items: ShortCircuitItem[];
	itemTrees?: SimulationItemTree[];
}

// ---------------------------------------------------------------------------
// Profile load modifiers — deterministic, no LLM
// ---------------------------------------------------------------------------

const PROFILE_LOAD_MODIFIERS: Record<string, { linguistic: number; confusion: number; time: number }> = {
	average:  { linguistic: 1.00, confusion: 1.00, time: 1.00 },
	adhd:     { linguistic: 1.15, confusion: 1.25, time: 0.85 },
	dyslexia: { linguistic: 1.40, confusion: 1.15, time: 1.50 },
	ell:      { linguistic: 1.50, confusion: 1.30, time: 1.40 },
	gifted:   { linguistic: 0.70, confusion: 0.75, time: 0.70 },
};

interface DocumentRow {
	document_id: string;
	source_file_name: string | null;
	azure_extract: {
		content?: string;
		paragraphs?: Array<{ text?: string }>;
		pages?: Array<{ text?: string }>;
	} | null;
	canonical_document: {
		content?: string;
		nodes?: Array<{ text?: string; normalizedText?: string }>;
	} | null;
}

function assignLogicalLabels(itemTrees: SimulationItemTree[]): SimulationItemTree[] {
	const realItems = itemTrees.map((t) => t.item);
	realItems.forEach((item, idx) => {
		item.logicalNumber = idx + 1;
	});

	itemTrees.forEach((tree) => {
		const parentLogical = tree.item.logicalNumber ?? 0;
		if (tree.subItems && tree.subItems.length > 0) {
			tree.subItems.forEach((sub, subIdx) => {
				sub.logicalNumber = parentLogical;
				sub.logicalLabel = `${parentLogical}${String.fromCharCode(97 + subIdx)}`;
			});
			tree.item.logicalLabel = `${parentLogical}`;
		} else {
			tree.item.logicalLabel = `${parentLogical}`;
		}
	});

	return itemTrees;
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
		try { body = JSON.parse(body); } catch { /* keep as-is */ }
	}

	const { sessionId, profiles: rawProfiles } = (body ?? {}) as { sessionId?: string; profiles?: string[] };
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}
	const requestedProfiles: string[] =
		Array.isArray(rawProfiles) && rawProfiles.length > 0 ? rawProfiles : ["average"];

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

		console.log(`[shortcircuit] session=${sessionId} docs=${rows.length}`);
		rows.forEach((r, i) => {
			const paras = r.azure_extract?.paragraphs?.length ?? 0;
			const pages = r.azure_extract?.pages?.length ?? 0;
			const chars = r.azure_extract?.content?.length ?? 0;
			console.log(`[shortcircuit] doc[${i}] id=${r.document_id} file=${r.source_file_name ?? "?"} paras=${paras} pages=${pages} content=${chars}chars`);
		});

		// Step 1 — Hybrid segmentation per document (Azure layout + local rules).
		// LLM is NOT called here; segmentText only falls back to LLM when
		// hybrid returns ≤1 item, which is rare for real teacher documents.
		const rawItems: SegmentedItem[] = [];
		let itemOffset = 0;
		for (const row of rows) {
			const azure = buildAzureExtractFromRow(row);
			const docItems = await segmentText(azure);
			console.log(`[shortcircuit] doc=${row.document_id} → ${docItems.length} segment(s)`);
			for (const item of docItems) {
				rawItems.push({ itemNumber: itemOffset + item.itemNumber, text: item.text });
			}
			itemOffset += docItems.length;
		}

		console.log(`[shortcircuit] total rawItems after segmentation: ${rawItems.length}`);

		if (rawItems.length === 0) {
			// Nothing from azure_extract — check if there is at least some plain text
			const fullText = rows.map(extractFullText).filter(Boolean).join("\n\n---\n\n");
			if (!fullText.trim()) {
				return res.status(422).json({ error: "No readable text found in the stored documents." });
			}
			return res.status(422).json({ error: "Segmentation produced no items." });
		}

		const sectioning = buildSections(rawItems.map((seg) => ({ itemNumber: seg.itemNumber, text: seg.text })));

		// Step 2 — Local semantic pipeline per item block.
		const items: ShortCircuitItem[] = [];
		for (const seg of sectioning.itemBlocks) {
			console.log(`[shortcircuit] item ${seg.itemNumber}: running semantic pipeline (${seg.text.length} chars)`);
			const vec = await runSemanticOnText(seg.text);
			if (!vec) {
				console.warn(`[shortcircuit] item ${seg.itemNumber}: semantic pipeline returned null — skipped`);
				continue;
			}

			const m = vectorToMeasurables(vec, seg.text);
			console.log(`[shortcircuit] item ${seg.itemNumber}: linguistic=${m.linguisticLoad.toFixed(2)} confusion=${m.confusionScore.toFixed(2)} steps=${m.steps}`);
			items.push({
				itemNumber: seg.itemNumber,
				text: seg.text,
				...m,
			});
		}

		console.log(`[shortcircuit] done: ${items.length}/${rawItems.length} items with measurables`);

		if (items.length === 0) {
			return res.status(422).json({
				error: "Local semantic pipeline produced no measurables. Check that documents have analysed content.",
			});
		}

		// Phase A: additive-only defaults for newly introduced measurable fields.
		const itemsWithDefaults: ShortCircuitItem[] = items.map(applyPhaseADefaults);

		const baseItemTrees: SimulationItemTree[] = itemsWithDefaults.map((item) => buildItemTree(item));
		const instructionsByItem = new Map<number, string[]>();
		for (const section of sectioning.sections) {
			for (const itemNumber of section.itemNumbers) {
				instructionsByItem.set(itemNumber, section.instructions);
			}
		}

		const itemTrees: SimulationItemTree[] = assignLogicalLabels(baseItemTrees.map((tree) => {
			const instructions = instructionsByItem.get(tree.item.itemNumber) ?? [];
			const item = applySectionInstructionEffects(tree.item, instructions);
			const subItems = tree.subItems?.map((sub) => applySectionInstructionEffects(sub, instructions));
			return { ...tree, item, subItems };
		}));
		const itemsWithTreesApplied: ShortCircuitItem[] = itemTrees.map((tree) => tree.item);

		const sections: Array<SimulationSection & { itemTrees: SimulationItemTree[] }> = sectioning.sections.map((section) => ({
			...section,
			itemTrees: itemTrees.filter((tree) => sectioning.itemToSectionId.get(tree.item.itemNumber) === section.id),
		}));

		// Build per-profile adjusted items (deterministic modifiers, no LLM).
		const profileResults: ProfileShortCircuitResult[] = requestedProfiles.map((profileId) => {
			const catalog = PROFILE_CATALOG.find((p) => p.id === profileId);
			const mods = PROFILE_LOAD_MODIFIERS[profileId] ?? PROFILE_LOAD_MODIFIERS["average"]!;
			const profileItems: ShortCircuitItem[] = itemsWithTreesApplied.map((item) => ({
				...item,
				linguisticLoad: Math.min(1, item.linguisticLoad * mods.linguistic),
				confusionScore: Math.min(1, item.confusionScore * mods.confusion),
				timeToProcessSeconds: Math.round(item.timeToProcessSeconds * mods.time),
			}));
			const profileItemTrees = assignLogicalLabels(profileItems
				.map((item) => buildItemTree(item))
				.map((tree) => {
					const instructions = instructionsByItem.get(tree.item.itemNumber) ?? [];
					const item = applySectionInstructionEffects(tree.item, instructions);
					const subItems = tree.subItems?.map((sub) => applySectionInstructionEffects(sub, instructions));
					return { ...tree, item, subItems };
				}));
			return {
				profileId,
				profileLabel: catalog?.label ?? profileId,
				color: catalog?.color ?? "#3b82f6",
				items: profileItemTrees.map((tree) => tree.item),
				itemTrees: profileItemTrees,
			};
		});

		return res.status(200).json({
			rawItems,
			items: itemsWithTreesApplied as SimulationItem[],
			itemTrees,
			sections,
			profiles: profileResults,
		});
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

function extractFullText(row: DocumentRow): string {
	const nodes = row.canonical_document?.nodes;
	if (nodes && nodes.length > 0) {
		return nodes.map((n) => n.text ?? n.normalizedText ?? "").filter(Boolean).join("\n");
	}

	const azureContent = row.azure_extract?.content;
	if (azureContent) return azureContent;

	const paras = row.azure_extract?.paragraphs;
	if (paras && paras.length > 0) {
		return paras.map((p) => p.text ?? "").filter(Boolean).join("\n");
	}

	const pages = row.azure_extract?.pages;
	if (pages && pages.length > 0) {
		return pages.map((p) => p.text ?? "").filter(Boolean).join("\n");
	}

	return "";
}

// Re-export for backward-compat consumers.
export { computeConfusionScore };

