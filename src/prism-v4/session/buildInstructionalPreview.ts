import type { IntentProduct, TestProduct } from "../schema/integration";
import { canonicalConceptId, classifyBloomLevel, classifyItemModes, classifyScenarioTypes, type BloomLevel, type ItemMode, type ScenarioType } from "../teacherFeedback";
import type { ConceptRegistry } from "../normalizer";

import type { AssessmentPreviewItemModel, AssessmentPreviewModel } from "./InstructionalIntelligenceSession";

function resolveConceptId(raw: string, registry?: ConceptRegistry): string {
	const trimmed = raw.trim();
	if (registry) {
		const normalized = trimmed.includes(".") ? trimmed.toLowerCase() : trimmed;
		if (registry.canonical.has(normalized)) return normalized;
		const mapped = registry.mapToCanonical.get(trimmed);
		if (mapped !== undefined) return mapped ?? canonicalConceptId(trimmed);
	}
	return canonicalConceptId(trimmed);
}

function deriveBloom(item: TestProduct["sections"][number]["items"][number]): BloomLevel {
	if (item.explanation?.bloomLevel) {
		return item.explanation.bloomLevel as BloomLevel;
	}
	return classifyBloomLevel(item.prompt);
}

function deriveMode(item: TestProduct["sections"][number]["items"][number]): ItemMode {
	if (item.explanation?.itemModes?.[0]) {
		return item.explanation.itemModes[0] as ItemMode;
	}
	return classifyItemModes(item.prompt)[0] ?? "explain";
}

function deriveScenario(item: TestProduct["sections"][number]["items"][number]): ScenarioType {
	if (item.explanation?.scenarioTypes?.[0]) {
		return item.explanation.scenarioTypes[0] as ScenarioType;
	}
	return classifyScenarioTypes(item.prompt)[0] ?? "abstract-symbolic";
}

function normalizePreviewItem(
	concept: string,
	item: TestProduct["sections"][number]["items"][number],
	registry?: ConceptRegistry,
): AssessmentPreviewItemModel {
	return {
		itemId: item.itemId,
		stem: item.prompt,
		answer: item.answerGuidance,
		conceptId: resolveConceptId(item.concept || concept, registry),
		primaryConcepts: item.primaryConcepts,
		groupId: item.groupId,
		sourceDocumentId: item.sourceDocumentId,
		sourceSpan: item.sourceSpan,
		bloom: deriveBloom(item),
		difficulty: item.difficulty,
		mode: deriveMode(item),
		scenario: deriveScenario(item),
		misconceptionTag: item.misconceptionTriggers?.[0],
		teacherReasons: item.explanation
			? [item.explanation.conceptReason, item.explanation.bloomReason, item.explanation.scenarioReason, item.explanation.itemModeReason]
			: undefined,
		studentReasons: item.explanation?.studentReasons,
	};
}

export function buildInstructionalPreview(args: {
	product: TestProduct;
	productRecord?: IntentProduct;
	registry?: ConceptRegistry;
}): AssessmentPreviewModel {
	return {
		items: args.product.sections.flatMap((section) => section.items.map((item) => normalizePreviewItem(section.concept, item, args.registry))),
		product: args.productRecord,
	};
}