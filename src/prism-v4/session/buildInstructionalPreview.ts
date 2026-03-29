import type { IntentProduct, TestProduct } from "../schema/integration";
import { canonicalConceptId, classifyBloomLevel, classifyItemModes, classifyScenarioTypes, type BloomLevel, type ItemMode, type ScenarioType } from "../teacherFeedback";

import type { AssessmentPreviewItemModel, AssessmentPreviewModel } from "./InstructionalIntelligenceSession";

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
): AssessmentPreviewItemModel {
	return {
		itemId: item.itemId,
		stem: item.prompt,
		answer: item.answerGuidance,
		conceptId: canonicalConceptId(item.concept || concept),
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
}): AssessmentPreviewModel {
	return {
		items: args.product.sections.flatMap((section) => section.items.map((item) => normalizePreviewItem(section.concept, item))),
		product: args.productRecord,
	};
}