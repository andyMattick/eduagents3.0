import { buildIntentPayload, normalizeConceptBlueprintInput } from "../../../src/prism-v4/documents/intents/buildIntentProduct";
import { loadPrismSessionContextCached } from "../../../src/prism-v4/documents/registryStore";
import type { BuildTestIntentOptions, ConceptVerificationPreviewRequest, TestProduct } from "../../../src/prism-v4/schema/integration";
import {
	buildAssessmentFingerprint,
	explainFingerprintAlignment,
	explainTestItemAlignment,
	getTeacherFingerprint,
	getUnitFingerprint,
	mergeAssessmentIntoTeacherFingerprint,
	mergeAssessmentIntoUnitFingerprint,
} from "../../../src/prism-v4/teacherFeedback";

function getStringOption(options: Record<string, unknown> | undefined, key: string) {
	const value = options?.[key];
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function attachItemExplanations(product: TestProduct, itemExplanations: ReturnType<typeof explainTestItemAlignment>): TestProduct {
	const explanationById = new Map(itemExplanations.map((entry) => [entry.itemId, entry.explanation]));
	return {
		...product,
		sections: product.sections.map((section) => ({
			...section,
			items: section.items.map((item) => ({
				...item,
				explanation: explanationById.get(item.itemId),
			})),
		})),
	};
}

function rewritePromptNumberLiteral(value: string, occurrence: number) {
	if (value.endsWith("%")) {
		const numeric = Number(value.slice(0, -1));
		return `${numeric + Math.max(1, occurrence + 1)}%`;
	}
	if (value.includes(".")) {
		const decimals = value.split(".")[1]?.length ?? 0;
		const numeric = Number(value);
		return (numeric + Math.pow(10, -Math.max(decimals, 1)) * (occurrence + 1)).toFixed(decimals);
	}
	return String(Number(value) + occurrence + 1);
}

export function buildFallbackReplacementItem(item: TestProduct["sections"][number]["items"][number], occurrence = 0) {
	let rewrittenCount = 0;
	const rewrittenPrompt = item.prompt.replace(/\d+(?:\.\d+)?%?/g, (match) => {
		const next = rewritePromptNumberLiteral(match, occurrence + rewrittenCount);
		rewrittenCount += 1;
		return next;
	});
	const prompt = rewrittenCount > 0 ? rewrittenPrompt : `${item.prompt} Use a different data value or contextual detail in your response.`;
	return {
		...item,
		itemId: `${item.itemId}-regen-${occurrence + 1}`,
		prompt,
		explanation: item.explanation
			? {
				...item.explanation,
				narrative: `${item.explanation.narrative} No alternate source item was available, so this regenerated version preserves the fingerprint constraints while varying the surface details.`,
			}
			: item.explanation,
	};
}

export async function buildConceptVerificationPreview(payload: ConceptVerificationPreviewRequest) {
	if (!payload.sessionId || !payload.documentIds || payload.documentIds.length === 0) {
		throw new Error("sessionId and documentIds are required");
	}

	const normalizedBlueprint = normalizeConceptBlueprintInput(payload.options?.conceptBlueprint);
	if (!normalizedBlueprint) {
		throw new Error("options.conceptBlueprint with at least one valid edit is required");
	}

	const context = await loadPrismSessionContextCached(payload.sessionId);
	if (!context) {
		throw new Error("Session not found");
	}

	const options = (payload.options ?? {}) as BuildTestIntentOptions;
	const preview = await buildIntentPayload({
		sessionId: payload.sessionId,
		documentIds: payload.documentIds,
		intentType: "build-test",
		options: {
			...options,
			conceptBlueprint: normalizedBlueprint,
		},
	}, context);

	const teacherId = normalizedBlueprint.teacherId ?? getStringOption(options, "teacherId") ?? "concept-blueprint-preview";
	const unitId = normalizedBlueprint.unitId ?? getStringOption(options, "unitId") ?? undefined;
	const assessmentId = normalizedBlueprint.assessmentId ?? getStringOption(options, "assessmentId") ?? `${payload.sessionId}-concept-blueprint-preview`;
	const previewFingerprint = buildAssessmentFingerprint({
		teacherId,
		assessmentId,
		unitId,
		product: preview,
		sourceType: "generated",
	});

	const storedTeacher = teacherId ? await getTeacherFingerprint(teacherId) : null;
	const storedUnit = teacherId && unitId ? await getUnitFingerprint(teacherId, unitId) : null;
	const effectiveTeacher = mergeAssessmentIntoTeacherFingerprint({
		previous: storedTeacher,
		assessment: previewFingerprint,
		alpha: 1,
		now: previewFingerprint.lastUpdated,
	});
	const effectiveUnit = unitId || storedUnit
		? mergeAssessmentIntoUnitFingerprint({
			previous: storedUnit,
			assessment: previewFingerprint,
			alpha: 1,
			now: previewFingerprint.lastUpdated,
		})
		: null;
	const explanation = explainFingerprintAlignment({
		assessment: previewFingerprint,
		teacherFingerprint: effectiveTeacher,
		unitFingerprint: effectiveUnit,
	});
	const itemExplanations = explainTestItemAlignment({
		product: preview,
		teacherFingerprint: effectiveTeacher,
		unitFingerprint: effectiveUnit,
	});

	return {
		normalizedBlueprint,
		preview: attachItemExplanations(preview, itemExplanations),
		previewFingerprint,
		explanation,
		itemExplanations,
		effectiveTeacherFingerprint: effectiveTeacher,
		effectiveUnitFingerprint: effectiveUnit,
	};
}