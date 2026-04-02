import type { VercelRequest, VercelResponse } from "@vercel/node";

import { buildInstructionalBuilderPlan, buildInstructionalPreview, resolveInstructionalAssessmentRuntime } from "../../../src/prism-v4/session";
import { getDocumentSessionStore, listIntentProductsForSessionStore, loadPrismSessionContextCached } from "../../../src/prism-v4/documents/registryStore";
import {
	buildAssessmentFingerprint,
	getAssessmentFingerprint,
	saveAssessmentFingerprint,
	type TestProduct,
} from "../../../src/prism-v4/teacherFeedback";
import {
	buildAssessmentFingerprintFromBlueprint,
	buildInstructionalAnalysis,
	buildInstructionalBlueprint,
	buildInstructionalConceptMap,
	mergeBlueprintModel,
	type BlueprintModel,
} from "../../../src/prism-v4/session";
import { buildConceptRegistry, type ConceptRegistry } from "../../../src/prism-v4/normalizer";

const DEFAULT_TEACHER_ID = "00000000-0000-4000-8000-000000000001";

export function resolveQueryValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export function resolveSessionId(req: VercelRequest) {
	const sessionId = resolveQueryValue(req.query.sessionId);
	return typeof sessionId === "string" && sessionId.trim().length > 0 ? sessionId.trim() : null;
}

function isTestProduct(value: unknown): value is TestProduct {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	return candidate.kind === "test" && Array.isArray(candidate.sections) && typeof candidate.totalItemCount === "number";
}

async function resolveSessionBlueprint(sessionId: string) {
	const context = await loadPrismSessionContextCached(sessionId);
	if (!context) {
		return null;
	}

	const products = await listIntentProductsForSessionStore(sessionId);
	const activeAssessment = [...products]
		.filter((product) => isTestProduct(product.payload))
		.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

	if (!activeAssessment || !isTestProduct(activeAssessment.payload)) {
		return null;
	}

	const assessmentId = activeAssessment.productId;
	const storedAssessment = await getAssessmentFingerprint(assessmentId);
	const teacherId = storedAssessment?.teacherId ?? DEFAULT_TEACHER_ID;
	const assessment = storedAssessment ?? buildAssessmentFingerprint({
		teacherId,
		assessmentId,
		product: activeAssessment.payload,
		sourceType: "generated",
	});
	const analysis = buildInstructionalAnalysis(context);
	const blueprint = buildInstructionalBlueprint({ assessment, product: activeAssessment.payload, analysis });
	const conceptMap = buildInstructionalConceptMap({ analysis, blueprint });

	return {
		sessionId,
		assessmentId,
		teacherId,
		product: activeAssessment.payload,
		analysis,
		assessment,
		blueprint,
		conceptMap,
	};
}

// Resolve a raw concept label to a canonical taxonomy ID via the registry,
// falling back to `fallback` when the registry explicitly maps to null (document-title noise)
// or has no entry for the raw label.
function resolveToCanonical(raw: string, registry: ConceptRegistry, fallback: string): string {
	const trimmed = raw.trim();
	const normalized = trimmed.includes(".") ? trimmed.toLowerCase() : trimmed;
	if (registry.canonical.has(normalized)) return normalized;
	const mapped = registry.mapToCanonical.get(trimmed);
	if (mapped !== undefined) return mapped ?? fallback;
	return fallback;
}

// Rewrite every concept string in a TestProduct (section.concept, item.concept,
// item.primaryConcepts) to canonical taxonomy IDs.  Blueprint position provides
// the fallback for section headers that the registry identifies as document-title noise.
function remapProductConceptsToCanonical(
	product: TestProduct,
	registry: ConceptRegistry,
	blueprintConceptIds: string[],
): TestProduct {
	return {
		...product,
		sections: product.sections.map((section, index) => {
			const fallback = blueprintConceptIds[index] ?? section.concept;
			const sectionConceptId = resolveToCanonical(section.concept, registry, fallback);
			return {
				...section,
				concept: sectionConceptId,
				items: section.items.map((item) => ({
					...item,
					concept: resolveToCanonical(item.concept || section.concept, registry, sectionConceptId),
					primaryConcepts: item.primaryConcepts?.map((c) => resolveToCanonical(c, registry, sectionConceptId)),
				})),
			};
		}),
	};
}

export async function handleBuilderPlan(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const sessionId = resolveSessionId(req);
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	try {
		const runtime = await resolveInstructionalAssessmentRuntime({
			sessionId,
			studentId: resolveQueryValue(req.query.studentId),
			teacherId: resolveQueryValue(req.query.teacherId),
			unitId: resolveQueryValue(req.query.unitId),
		});
		const registry = buildConceptRegistry(runtime.context.analyzedDocuments, [], null);
		const analysis = buildInstructionalAnalysis(runtime.context);
		const blueprint = buildInstructionalBlueprint({ assessment: runtime.assessmentFingerprint, product: runtime.product, analysis });
		const blueprintConceptIds = blueprint.concepts
			.filter((c) => c.included !== false)
			.sort((a, b) => a.order - b.order)
			.map((c) => c.id);
		const normalizedProduct = remapProductConceptsToCanonical(runtime.product, registry, blueprintConceptIds);
		return res.status(200).json({
			sessionId,
			builderPlan: buildInstructionalBuilderPlan({
				product: normalizedProduct,
				conceptProfiles: runtime.assessmentFingerprint.conceptProfiles,
				adaptiveTargets: runtime.adaptiveTargets,
				registry,
			}),
		});
	} catch (error) {
		if (error instanceof Error && error.message === "Session not found") {
			return res.status(404).json({ error: error.message });
		}
		return res.status(500).json({ error: error instanceof Error ? error.message : "Builder plan request failed" });
	}
}

export async function handleAssessmentPreview(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const sessionId = resolveSessionId(req);
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	try {
		const runtime = await resolveInstructionalAssessmentRuntime({
			sessionId,
			studentId: resolveQueryValue(req.query.studentId),
			teacherId: resolveQueryValue(req.query.teacherId),
			unitId: resolveQueryValue(req.query.unitId),
		});
		const registry = buildConceptRegistry(runtime.context.analyzedDocuments, [], null);
		const analysis = buildInstructionalAnalysis(runtime.context);
		const blueprint = buildInstructionalBlueprint({ assessment: runtime.assessmentFingerprint, product: runtime.product, analysis });
		const blueprintConceptIds = blueprint.concepts
			.filter((c) => c.included !== false)
			.sort((a, b) => a.order - b.order)
			.map((c) => c.id);
		const normalizedProduct = remapProductConceptsToCanonical(runtime.product, registry, blueprintConceptIds);
		return res.status(200).json({
			sessionId,
			assessmentPreview: buildInstructionalPreview({
				product: normalizedProduct,
				productRecord: runtime.productRecord,
				registry,
			}),
		});
	} catch (error) {
		if (error instanceof Error && error.message === "Session not found") {
			return res.status(404).json({ error: error.message });
		}
		return res.status(500).json({ error: error instanceof Error ? error.message : "Assessment preview request failed" });
	}
}

export async function handleBlueprint(req: VercelRequest, res: VercelResponse) {
	const sessionId = resolveSessionId(req);
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	const session = await getDocumentSessionStore(sessionId);
	if (!session) {
		return res.status(404).json({ error: "Session not found" });
	}

	const resolved = await resolveSessionBlueprint(sessionId);
	if (!resolved) {
		return res.status(404).json({ error: "No assessment blueprint available for this session" });
	}

	if (req.method === "GET") {
		return res.status(200).json({
			sessionId,
			assessmentId: resolved.assessmentId,
			teacherId: resolved.teacherId,
			blueprint: resolved.blueprint,
			conceptMap: resolved.conceptMap,
		});
	}

	if (req.method !== "PATCH") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const patch = typeof req.body === "string" ? JSON.parse(req.body) as Partial<BlueprintModel> : (req.body ?? {}) as Partial<BlueprintModel>;
		const nextBlueprint = mergeBlueprintModel(resolved.blueprint, patch);
		const nextAssessment = buildAssessmentFingerprintFromBlueprint({
			teacherId: resolved.teacherId,
			assessmentId: resolved.assessmentId,
			product: resolved.product,
			blueprint: nextBlueprint,
			current: resolved.assessment,
		});
		await saveAssessmentFingerprint(nextAssessment);
		const nextConceptMap = buildInstructionalConceptMap({ analysis: resolved.analysis, blueprint: nextBlueprint });

		return res.status(200).json({
			sessionId,
			assessmentId: resolved.assessmentId,
			teacherId: resolved.teacherId,
			blueprint: nextBlueprint,
			conceptMap: nextConceptMap,
		});
	} catch (error) {
		return res.status(500).json({
			error: error instanceof Error ? error.message : "Blueprint update failed",
		});
	}
}