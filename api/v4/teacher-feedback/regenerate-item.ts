import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { ConceptVerificationPreviewRequest } from "../../../src/prism-v4/schema/integration";
import { buildConceptVerificationPreview, buildFallbackReplacementItem } from "./sharedPreview";

export const runtime = "nodejs";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function parseBody(body: unknown) {
	if (typeof body !== "string") {
		return body as ConceptVerificationPreviewRequest & { itemId: string; concept?: string; prompt?: string; excludeItemIds?: string[]; excludePrompts?: string[] };
	}
	return JSON.parse(body) as ConceptVerificationPreviewRequest & { itemId: string; concept?: string; prompt?: string; excludeItemIds?: string[]; excludePrompts?: string[] };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

	if (req.method === "OPTIONS") {
		return res.status(200).json({});
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const payload = parseBody(req.body ?? {});
		if (!payload.itemId) {
			return res.status(400).json({ error: "itemId is required" });
		}

		const basePreview = await buildConceptVerificationPreview(payload);
		const targetSection = basePreview.preview.sections.find((section) => {
			if (payload.concept && section.concept !== payload.concept) {
				return false;
			}
			return section.items.some((item) => item.itemId === payload.itemId && (!payload.prompt || item.prompt === payload.prompt));
		});
		const targetItem = targetSection?.items.find((item) => item.itemId === payload.itemId && (!payload.prompt || item.prompt === payload.prompt)) ?? null;
		if (!targetSection || !targetItem) {
			return res.status(404).json({ error: "Target item not found in preview" });
		}

		const expandedPreview = await buildConceptVerificationPreview({
			...payload,
			options: {
				...(payload.options ?? {}),
				itemCount: Math.max((payload.options?.itemCount as number | undefined) ?? basePreview.preview.totalItemCount, basePreview.preview.totalItemCount + 4),
				conceptBlueprint: {
					...(payload.options?.conceptBlueprint ?? {}),
					edits: {
						...((payload.options?.conceptBlueprint as { edits?: Record<string, unknown> } | undefined)?.edits ?? {}),
						...((payload.options?.conceptBlueprint as { edits?: Record<string, unknown> } | undefined)?.edits ?? {}),
						itemCountOverrides: {
							...(((payload.options?.conceptBlueprint as { edits?: { itemCountOverrides?: Record<string, number> } } | undefined)?.edits?.itemCountOverrides) ?? {}),
							[targetSection.concept]: Math.max(targetSection.items.length + 3, (((payload.options?.conceptBlueprint as { edits?: { itemCountOverrides?: Record<string, number> } } | undefined)?.edits?.itemCountOverrides?.[targetSection.concept]) ?? 0)),
						},
					},
				},
			},
		});

		const excludedItemIds = new Set([payload.itemId, ...(payload.excludeItemIds ?? [])]);
		const excludedPrompts = new Set([targetItem.prompt, ...(payload.excludePrompts ?? [])]);
		const replacementItem = expandedPreview.preview.sections
			.find((section) => section.concept === targetSection.concept)
			?.items.find((item) => !excludedItemIds.has(item.itemId) && !excludedPrompts.has(item.prompt))
			?? buildFallbackReplacementItem(targetItem);

		return res.status(200).json({
			targetItemId: payload.itemId,
			targetConcept: targetSection.concept,
			replacementItem,
			normalizedBlueprint: expandedPreview.normalizedBlueprint,
			previewFingerprint: expandedPreview.previewFingerprint,
			explanation: replacementItem.explanation,
		});
	} catch (error) {
		if (error instanceof Error && error.message === "Session not found") {
			return res.status(404).json({ error: error.message });
		}
		if (error instanceof Error && /required|conceptBlueprint/.test(error.message)) {
			return res.status(400).json({ error: error.message });
		}
		return res.status(500).json({ error: error instanceof Error ? error.message : "Item regeneration failed" });
	}
}