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
		return body as ConceptVerificationPreviewRequest & { concept: string; excludeItemIds?: string[]; excludePrompts?: string[] };
	}
	return JSON.parse(body) as ConceptVerificationPreviewRequest & { concept: string; excludeItemIds?: string[]; excludePrompts?: string[] };
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
		if (!payload.concept) {
			return res.status(400).json({ error: "concept is required" });
		}

		const basePreview = await buildConceptVerificationPreview(payload);
		const targetSection = basePreview.preview.sections.find((section) => section.concept === payload.concept);
		if (!targetSection) {
			return res.status(404).json({ error: "Target section not found in preview" });
		}

		const expandedPreview = await buildConceptVerificationPreview({
			...payload,
			options: {
				...(payload.options ?? {}),
				itemCount: Math.max((payload.options?.itemCount as number | undefined) ?? basePreview.preview.totalItemCount, basePreview.preview.totalItemCount + targetSection.items.length + 3),
				conceptBlueprint: {
					...(payload.options?.conceptBlueprint ?? {}),
					edits: {
						...((payload.options?.conceptBlueprint as { edits?: Record<string, unknown> } | undefined)?.edits ?? {}),
						itemCountOverrides: {
							...(((payload.options?.conceptBlueprint as { edits?: { itemCountOverrides?: Record<string, number> } } | undefined)?.edits?.itemCountOverrides) ?? {}),
							[payload.concept]: Math.max(targetSection.items.length + 3, (((payload.options?.conceptBlueprint as { edits?: { itemCountOverrides?: Record<string, number> } } | undefined)?.edits?.itemCountOverrides?.[payload.concept]) ?? 0)),
						},
					},
				},
			},
		});

		const excludedItemIds = new Set([...(payload.excludeItemIds ?? []), ...targetSection.items.map((item) => item.itemId)]);
		const excludedPrompts = new Set([...(payload.excludePrompts ?? []), ...targetSection.items.map((item) => item.prompt)]);
		const expandedSection = expandedPreview.preview.sections.find((section) => section.concept === payload.concept);
		const replacementItems = (expandedSection?.items ?? []).filter((item) => !excludedItemIds.has(item.itemId) && !excludedPrompts.has(item.prompt)).slice(0, targetSection.items.length);
		while (replacementItems.length < targetSection.items.length) {
			const sourceItem = targetSection.items[replacementItems.length % targetSection.items.length];
			replacementItems.push(buildFallbackReplacementItem(sourceItem, replacementItems.length));
		}

		return res.status(200).json({
			targetConcept: payload.concept,
			replacementSection: {
				concept: payload.concept,
				sourceDocumentIds: [...new Set(replacementItems.map((item) => item.sourceDocumentId))],
				items: replacementItems,
			},
			normalizedBlueprint: expandedPreview.normalizedBlueprint,
			previewFingerprint: expandedPreview.previewFingerprint,
			explanation: expandedPreview.explanation,
		});
	} catch (error) {
		if (error instanceof Error && error.message === "Session not found") {
			return res.status(404).json({ error: error.message });
		}
		if (error instanceof Error && /required|conceptBlueprint/.test(error.message)) {
			return res.status(400).json({ error: error.message });
		}
		return res.status(500).json({ error: error instanceof Error ? error.message : "Section regeneration failed" });
	}
}