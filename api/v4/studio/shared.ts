import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
	createBlueprintStore,
	getBlueprintStore,
	getBlueprintVersionStore,
	getCollectionAnalysisStore,
	getStudioOutputStore,
	saveStudioOutputStore,
	updateStudioOutputStore,
	getStudioSessionEnvelopeStore,
	listBlueprintsForSessionStore,
	listStudioOutputsForSessionStore,
	loadPrismSessionContextCached,
	saveBlueprintVersionStore,
	setActiveBlueprintForSessionStore,
	updateStudioSessionEnvelopeStore,
} from "../../../src/prism-v4/documents/registryStore";
import type { BlueprintVersionEditorContext, TeacherStudioTarget } from "../../../src/prism-v4/studio/artifacts";
import { buildInstructionalAnalysis, buildInstructionalBlueprint, mergeBlueprintModel, type BlueprintModel } from "../../../src/prism-v4/session";
import type { AssessmentFingerprint } from "../../../src/prism-v4/teacherFeedback";
import { buildIntentPayload } from "../../../src/prism-v4/documents/intents/buildIntentProduct";
import type { IntentRequest } from "../../../src/prism-v4/schema/integration";
import { rewriteTestItem, replaceItemInTestPayload, type ItemRewriteIntent } from "../../../src/prism-v4/studio/rewriteItem";
import type { TestProduct } from "../../../src/prism-v4/schema/integration/IntentProduct";
import { enrichProductWithScenarios, generateScenarioSection, VALID_PROBLEM_FORMATS, type ProblemFormat } from "./generateScenarios";

const DEFAULT_TEACHER_ID = "00000000-0000-4000-8000-000000000001";

export function resolveQueryValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export function resolvePathParam(req: VercelRequest, key: string) {
	const value = resolveQueryValue(req.query[key]);
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function parseJsonBody<T>(body: unknown, fallback: T): T {
	if (body == null) {
		return fallback;
	}
	if (typeof body === "string") {
		return JSON.parse(body) as T;
	}
	return body as T;
}

/**
 * Top-level error boundary for Studio route handlers.
 * Wraps a handler so that unhandled throws produce a structured JSON 500
 * instead of Vercel's empty-body 500.  Use at the `export default` site:
 *
 *   export default withStudioErrors(handleStudioSession);
 */
export function withStudioErrors(
	handlerFn: (req: VercelRequest, res: VercelResponse) => Promise<unknown>,
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
	return async (req: VercelRequest, res: VercelResponse) => {
		try {
			await handlerFn(req, res);
		} catch (err) {
			console.error("[Studio] unhandled error in", req.url, err);
			if (!res.writableEnded) {
				res.status(500).json({
					error: err instanceof Error ? err.message : String(err),
					...(process.env.NODE_ENV !== "production" && err instanceof Error ? { stack: err.stack } : {}),
				});
			}
		}
	};
}

function countAnalysisItems(analysis: ReturnType<typeof buildInstructionalAnalysis>) {
	const totalProblems = analysis.problems.reduce((sum, problem) => sum + Math.max(0, problem.problemCount), 0);
	if (totalProblems > 0) {
		return totalProblems;
	}
	return Math.max(1, analysis.concepts.filter((concept) => !concept.isNoise).length);
}

function createBlueprintSeedAssessment(args: {
	teacherId: string;
	unitId?: string;
	assessmentId: string;
	itemCount: number;
}): AssessmentFingerprint {
	return {
		teacherId: args.teacherId,
		assessmentId: args.assessmentId,
		unitId: args.unitId,
		conceptProfiles: [],
		flowProfile: {
			sectionOrder: [],
			typicalLengthRange: [args.itemCount, args.itemCount],
			cognitiveLadderShape: [],
		},
		itemCount: args.itemCount,
		sourceType: "generated",
		lastUpdated: new Date().toISOString(),
		version: 1,
	};
}

async function buildSeedBlueprint(args: {
	sessionId: string;
	teacherId?: string;
	unitId?: string;
	itemCount?: number;
}) {
	const context = await loadPrismSessionContextCached(args.sessionId);
	if (!context) {
		throw new Error("Session not found");
	}

	const analysis = buildInstructionalAnalysis(context);
	const itemCount = Math.max(1, Math.round(args.itemCount ?? countAnalysisItems(analysis)));
	const teacherId = args.teacherId ?? DEFAULT_TEACHER_ID;
	const seedAssessment = createBlueprintSeedAssessment({
		teacherId,
		unitId: args.unitId,
		assessmentId: `blueprint-seed-${args.sessionId}`,
		itemCount,
	});

	return {
		analysis,
		blueprint: buildInstructionalBlueprint({
			assessment: seedAssessment,
			analysis,
		}),
	};
}

export async function handleStudioSession(req: VercelRequest, res: VercelResponse) {
	const sessionId = resolvePathParam(req, "sessionId");
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	if (req.method === "GET") {
		const session = await getStudioSessionEnvelopeStore(sessionId);
		if (!session) {
			return res.status(404).json({ error: "Session not found" });
		}
		return res.status(200).json(session);
	}

	if (req.method === "PATCH") {
		const body = parseJsonBody<{
			activeBlueprintId?: string | null;
			activeTarget?: TeacherStudioTarget | null;
			outputIds?: string[];
		}>(req.body, {});
		const session = await updateStudioSessionEnvelopeStore(sessionId, {
			activeBlueprintId: body.activeBlueprintId,
			activeTarget: body.activeTarget,
			outputIds: body.outputIds,
		});
		if (!session) {
			return res.status(404).json({ error: "Session not found" });
		}
		return res.status(200).json(session);
	}

	return res.status(405).json({ error: "Method not allowed" });
}

export async function handleStudioSessionAnalysis(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const sessionId = resolvePathParam(req, "sessionId");
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	const context = await loadPrismSessionContextCached(sessionId);
	if (!context) {
		return res.status(404).json({ error: "Session not found" });
	}

	const rawAnalysis = await getCollectionAnalysisStore(sessionId);
	return res.status(200).json({
		sessionId,
		analysis: buildInstructionalAnalysis(context),
		rawAnalysis,
	});
}

// ── Concept ranking → quota allocation ───────────────────────────────────────

interface ConceptRankingInput {
	id: string;
	included: boolean;
	rank: number;
}

/**
 * Apply teacher-provided concept rankings to a seed blueprint.
 * Converts rank order → proportional item quotas.
 * Rank 1 = highest priority = most questions.
 */
export function applyConceptRankings(blueprint: BlueprintModel, rankings: ConceptRankingInput[], totalItems: number): BlueprintModel {
	const included = rankings.filter((r) => r.included);
	if (included.length === 0) return blueprint;

	// Sort by rank ascending (rank 1 → most questions)
	const sorted = [...included].sort((a, b) => a.rank - b.rank);
	const n = sorted.length;

	// Weight: rank position 1 gets weight n, rank 2 gets n-1, etc.
	const weights = sorted.map((_, i) => n - i);
	const totalWeight = weights.reduce((s, w) => s + w, 0);

	// Proportional quotas, minimum 1
	const rawQuotas = weights.map((w) => Math.max(1, Math.round((w / totalWeight) * totalItems)));

	// Absorb rounding delta in top concept
	const delta = totalItems - rawQuotas.reduce((s, q) => s + q, 0);
	if (rawQuotas.length > 0) rawQuotas[0] = Math.max(1, (rawQuotas[0] ?? 1) + delta);

	// Build update map
	const updates = new Map<string, { included: boolean; quota: number; order: number }>();
	sorted.forEach((r, i) => updates.set(r.id, { included: true, quota: rawQuotas[i]!, order: i }));
	rankings.filter((r) => !r.included).forEach((r) => updates.set(r.id, { included: false, quota: 0, order: 999 }));

	const updatedConcepts = blueprint.concepts.map((c) => {
		const u = updates.get(c.id);
		return u ? { ...c, included: u.included, quota: u.quota, order: u.order } : c;
	});

	return { ...blueprint, concepts: updatedConcepts };
}

export async function handleStudioSessionBlueprints(req: VercelRequest, res: VercelResponse) {
	const sessionId = resolvePathParam(req, "sessionId");
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	if (req.method === "GET") {
		return res.status(200).json({
			sessionId,
			blueprints: await listBlueprintsForSessionStore(sessionId),
		});
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const body = parseJsonBody<{
			teacherId?: string;
			unitId?: string;
			options?: { itemCount?: number };
			editorContext?: BlueprintVersionEditorContext;
			conceptRankings?: ConceptRankingInput[];
		}>(req.body, {});
		const { analysis, blueprint: seedBlueprint } = await buildSeedBlueprint({
			sessionId,
			teacherId: body.teacherId,
			unitId: body.unitId,
			itemCount: body.options?.itemCount,
		});
		const totalItems = body.options?.itemCount ?? countAnalysisItems(analysis);
		const blueprint =
			body.conceptRankings && body.conceptRankings.length > 0
				? applyConceptRankings(seedBlueprint, body.conceptRankings, totalItems)
				: seedBlueprint;
		const blueprintRecord = await createBlueprintStore({
			sessionId,
			analysisSessionId: sessionId,
			teacherId: body.teacherId,
			unitId: body.unitId,
			activeVersion: 1,
		});
		const versionRecord = await saveBlueprintVersionStore({
			blueprintId: blueprintRecord.blueprintId,
			version: 1,
			blueprint,
			analysisSnapshot: analysis,
			editorContext: body.editorContext ?? { source: "seed" },
			lineage: { createdFrom: "analysis" },
		});
		return res.status(200).json({ blueprint: blueprintRecord, version: versionRecord });
	} catch (error) {
		if (error instanceof Error && error.message === "Session not found") {
			return res.status(404).json({ error: error.message });
		}
		return res.status(500).json({ error: error instanceof Error ? error.message : "Blueprint creation failed" });
	}
}

export async function handleStudioBlueprint(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const blueprintId = resolvePathParam(req, "blueprintId");
	if (!blueprintId) {
		return res.status(400).json({ error: "blueprintId is required" });
	}

	const blueprint = await getBlueprintStore(blueprintId);
	if (!blueprint) {
		return res.status(404).json({ error: "Blueprint not found" });
	}

	const version = await getBlueprintVersionStore(blueprintId, blueprint.activeVersion);
	return res.status(200).json({ blueprint, version });
}

export async function handleStudioBlueprintVersion(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const blueprintId = resolvePathParam(req, "blueprintId");
	const versionParam = resolvePathParam(req, "version");
	if (!blueprintId || !versionParam) {
		return res.status(400).json({ error: "blueprintId and version are required" });
	}

	const version = Number(versionParam);
	if (!Number.isInteger(version) || version < 1) {
		return res.status(400).json({ error: "version must be a positive integer" });
	}

	const blueprintVersion = await getBlueprintVersionStore(blueprintId, version);
	if (!blueprintVersion) {
		return res.status(404).json({ error: "Blueprint version not found" });
	}

	return res.status(200).json(blueprintVersion);
}

export async function handleStudioBlueprintVersions(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const blueprintId = resolvePathParam(req, "blueprintId");
	if (!blueprintId) {
		return res.status(400).json({ error: "blueprintId is required" });
	}

	try {
		const body = parseJsonBody<{
			patch: Partial<BlueprintModel>;
			editorContext?: BlueprintVersionEditorContext;
		}>(req.body, { patch: {} });
		const current = await getBlueprintVersionStore(blueprintId);
		if (!current) {
			return res.status(404).json({ error: "Blueprint version not found" });
		}
		const nextBlueprint = mergeBlueprintModel(current.blueprint, body.patch ?? {});
		const nextVersion = await saveBlueprintVersionStore({
			blueprintId,
			blueprint: nextBlueprint,
			analysisSnapshot: current.analysisSnapshot,
			editorContext: body.editorContext ?? { source: "teacher-edit" },
			lineage: { parentVersion: current.version, createdFrom: "teacher-edit" },
		});
		return res.status(200).json(nextVersion);
	} catch (error) {
		return res.status(500).json({ error: error instanceof Error ? error.message : "Blueprint version save failed" });
	}
}

export async function handleStudioActiveBlueprint(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const sessionId = resolvePathParam(req, "sessionId");
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	const body = parseJsonBody<{ blueprintId?: string }>(req.body, {});
	if (!body.blueprintId) {
		return res.status(400).json({ error: "blueprintId is required" });
	}

	const blueprint = await getBlueprintStore(body.blueprintId);
	if (!blueprint) {
		return res.status(404).json({ error: "Blueprint not found" });
	}
	if (blueprint.sessionId !== sessionId) {
		return res.status(400).json({ error: "Blueprint does not belong to session" });
	}

	const session = await setActiveBlueprintForSessionStore(sessionId, body.blueprintId);
	if (!session) {
		return res.status(404).json({ error: "Session not found" });
	}
	return res.status(200).json(session);
}

export async function handleStudioSessionOutputs(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const sessionId = resolvePathParam(req, "sessionId");
	if (!sessionId) {
		return res.status(400).json({ error: "sessionId is required" });
	}

	return res.status(200).json({ sessionId, outputs: await listStudioOutputsForSessionStore(sessionId) });
}

export async function handleStudioOutput(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const outputId = resolvePathParam(req, "outputId");
	if (!outputId) {
		return res.status(400).json({ error: "outputId is required" });
	}

	const output = await getStudioOutputStore(outputId);
	if (!output) {
		return res.status(404).json({ error: "Output not found" });
	}

	return res.status(200).json(output);
}

/**
 * Pure function: translates a BlueprintModel into the request parameters
 * needed by buildIntentPayload. Exported so it can be unit-tested in isolation.
 */
export function blueprintToRequestParams(args: {
	blueprint: BlueprintModel;
	blueprint_id?: string;
	blueprintId?: string;
	teacherId?: string;
	unitId?: string;
	fallbackItemCount: number;
}): {
	totalItems: number;
	sectionOrder: string[];
	itemCountOverrides: Record<string, number>;
	conceptBlueprintOption:
		| { assessmentId: string; teacherId: string; unitId: string | undefined; edits: { sectionOrder: string[]; itemCountOverrides: Record<string, number> } }
		| undefined;
} {
	const bpId = args.blueprintId ?? args.blueprint_id ?? "studio-blueprint";
	const includedConcepts = args.blueprint.concepts.filter((c) => c.included && c.quota > 0);
	const sectionOrder = includedConcepts.map((c) => c.id);
	const itemCountOverrides: Record<string, number> = {};
	for (const concept of includedConcepts) {
		itemCountOverrides[concept.id] = concept.quota;
	}
	const quotaSum = includedConcepts.reduce((sum, c) => sum + c.quota, 0);
	const totalItems = Math.max(1, quotaSum || args.fallbackItemCount);
	const conceptBlueprintOption =
		sectionOrder.length > 0
			? {
					assessmentId: bpId,
					teacherId: args.teacherId ?? DEFAULT_TEACHER_ID,
					unitId: args.unitId,
					edits: { sectionOrder, itemCountOverrides },
			  }
			: undefined;
	return { totalItems, sectionOrder, itemCountOverrides, conceptBlueprintOption };
}

export async function handleStudioAssessmentOutput(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const blueprintId = resolvePathParam(req, "blueprintId");
	if (!blueprintId) {
		return res.status(400).json({ error: "blueprintId is required" });
	}

	const body = parseJsonBody<{
		version?: number;
		teacherId?: string;
		unitId?: string;
		studentId?: string;
		options?: {
			itemCount?: number;
			adaptiveConditioning?: boolean;
			allowedFormats?: string[];
			difficultyBias?: "easy" | "mixed" | "hard";
			teacherTone?: "conversational" | "formal";
			targetTimeMinutes?: number;
		};
	}>(req.body, {});

	const allowedFormats = Array.isArray(body.options?.allowedFormats)
		? (body.options!.allowedFormats as ProblemFormat[])
		: undefined;
	const difficultyBias = body.options?.difficultyBias ?? undefined;
	const teacherTone = body.options?.teacherTone ?? undefined;
	const targetTimeMinutes = body.options?.targetTimeMinutes ?? undefined;

	const blueprintRecord = await getBlueprintStore(blueprintId);
	if (!blueprintRecord) {
		return res.status(404).json({ error: "Blueprint not found" });
	}

	const version = await getBlueprintVersionStore(blueprintId, blueprintRecord.activeVersion);
	if (!version) {
		return res.status(404).json({ error: "Blueprint version not found" });
	}

	const context = await loadPrismSessionContextCached(blueprintRecord.sessionId);
	if (!context) {
		return res.status(404).json({ error: "Session not found" });
	}

	const { totalItems, conceptBlueprintOption } = blueprintToRequestParams({
		blueprint: version.blueprint,
		blueprintId,
		teacherId: blueprintRecord.teacherId,
		unitId: blueprintRecord.unitId,
		fallbackItemCount: countAnalysisItems(buildInstructionalAnalysis(context)),
	});

	// Build the per-concept quota list for the Writer.
	// Uses the same included concepts as blueprintToRequestParams, preserving order.
	const includedConcepts = version.blueprint.concepts.filter((c) => c.included && c.quota > 0);
	const conceptQuotas =
		includedConcepts.length > 0
			? includedConcepts.map((c) => ({ id: c.id, name: c.name || c.id, quota: c.quota }))
			: undefined;

	const request: IntentRequest & { intentType: "build-test" } = {
		sessionId: blueprintRecord.sessionId,
		documentIds: context.session.documentIds,
		intentType: "build-test",
		options: {
			...(blueprintRecord.teacherId ? { teacherId: blueprintRecord.teacherId } : {}),
			...(blueprintRecord.unitId ? { unitId: blueprintRecord.unitId } : {}),
			itemCount: totalItems,
			...(conceptBlueprintOption ? { conceptBlueprint: conceptBlueprintOption } : {}),
		},
	};

	const extracted = await buildIntentPayload(request, context);

	// Drive scenario generation from blueprint quotas, not extracted sections.
	// This ensures every teacher-ranked concept gets its assigned items even
	// when the source document has sparse content for some concepts.
	const seed = blueprintId + Date.now().toString(36);
	const product = await enrichProductWithScenarios(extracted as TestProduct, seed, conceptQuotas, allowedFormats, difficultyBias, teacherTone);

	const output = await saveStudioOutputStore({
		sessionId: blueprintRecord.sessionId,
		blueprintId,
		blueprintVersion: blueprintRecord.activeVersion,
		outputType: "assessment",
		teacherId: blueprintRecord.teacherId,
		unitId: blueprintRecord.unitId,
		options: { totalItems, ...(targetTimeMinutes !== undefined ? { targetTimeMinutes } : {}) },
		payload: product,
		renderModel: product,
	});

	return res.status(200).json({ output });
}

const VALID_REWRITE_INTENTS: ItemRewriteIntent[] = [
	"easier", "harder", "change_numbers", "real_world", "concise", "student_friendly", "academic",
];

function isValidRewriteIntent(value: unknown): value is ItemRewriteIntent {
	return typeof value === "string" && (VALID_REWRITE_INTENTS as string[]).includes(value);
}

export async function handleStudioOutputItemRewrite(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const outputId = resolvePathParam(req, "outputId");
	const itemId = resolvePathParam(req, "itemId");
	if (!outputId || !itemId) {
		return res.status(400).json({ error: "outputId and itemId are required" });
	}

	const body = parseJsonBody<{ intent?: unknown }>(req.body, {});
	if (!isValidRewriteIntent(body.intent)) {
		return res.status(400).json({ error: `intent must be one of: ${VALID_REWRITE_INTENTS.join(", ")}` });
	}

	const output = await getStudioOutputStore(outputId);
	if (!output) {
		return res.status(404).json({ error: "Output not found" });
	}

	const testPayload = output.payload as TestProduct;
	const allItems = testPayload.sections?.flatMap((s) => s.items) ?? [];
	const target = allItems.find((i) => i.itemId === itemId);
	if (!target) {
		return res.status(404).json({ error: "Item not found" });
	}

	const rewritten = rewriteTestItem(target, body.intent);
	const nextPayload = replaceItemInTestPayload(testPayload, itemId, rewritten);
	if (!nextPayload) {
		return res.status(404).json({ error: "Item not found in payload" });
	}

	const updated = await updateStudioOutputStore(outputId, { payload: nextPayload, renderModel: nextPayload });
	if (!updated) {
		return res.status(500).json({ error: "Failed to save updated output" });
	}

	return res.status(200).json({ item: rewritten, output: updated });
}

export async function handleStudioOutputItemReplace(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const outputId = resolvePathParam(req, "outputId");
	const itemId = resolvePathParam(req, "itemId");
	if (!outputId || !itemId) {
		return res.status(400).json({ error: "outputId and itemId are required" });
	}

	const output = await getStudioOutputStore(outputId);
	if (!output) {
		return res.status(404).json({ error: "Output not found" });
	}

	const testPayload = output.payload as TestProduct;
	const allItems = testPayload.sections?.flatMap((s) => s.items) ?? [];
	const target = allItems.find((i) => i.itemId === itemId);
	if (!target) {
		return res.status(404).json({ error: "Item not found" });
	}

	const blueprintRecord = await getBlueprintStore(output.blueprintId);
	if (!blueprintRecord) {
		return res.status(404).json({ error: "Blueprint not found" });
	}

	const context = await loadPrismSessionContextCached(blueprintRecord.sessionId);
	if (!context) {
		return res.status(404).json({ error: "Session not found" });
	}

	// Regenerate 1 item for the same concept slot
	const request: IntentRequest & { intentType: "build-test" } = {
		sessionId: blueprintRecord.sessionId,
		documentIds: context.session.documentIds,
		intentType: "build-test",
		options: {
			itemCount: 1,
			...(target.concept ? { focus: target.concept } : {}),
			...(blueprintRecord.teacherId ? { teacherId: blueprintRecord.teacherId } : {}),
		},
	};

	const refreshed = await buildIntentPayload(request, context);
	const refreshedSections = (refreshed as TestProduct).sections ?? [];
	const candidate = refreshedSections.flatMap((s) => s.items)[0];
	if (!candidate) {
		return res.status(500).json({ error: "No replacement item generated" });
	}

	// Keep the original's slot identity but use the new prompt + metadata
	const replacement = { ...candidate, itemId: `${itemId}-r` };
	const nextPayload = replaceItemInTestPayload(testPayload, itemId, replacement);
	if (!nextPayload) {
		return res.status(404).json({ error: "Item not found in payload" });
	}

	const updated = await updateStudioOutputStore(outputId, { payload: nextPayload, renderModel: nextPayload });
	if (!updated) {
		return res.status(500).json({ error: "Failed to save updated output" });
	}

	return res.status(200).json({ item: replacement, output: updated });
}

// ── Change Format ──────────────────────────────────────────────────────────────
// Re-generates a single item for the same concept slot but forces a specific
// problem format (MC, TF, FRQ, etc.) via the generative LLM.

export async function handleStudioOutputItemChangeFormat(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const outputId = resolvePathParam(req, "outputId");
	const itemId = resolvePathParam(req, "itemId");
	if (!outputId || !itemId) {
		return res.status(400).json({ error: "outputId and itemId are required" });
	}

	const body = parseJsonBody<{ format?: unknown }>(req.body, {});
	if (typeof body.format !== "string" || !(VALID_PROBLEM_FORMATS as string[]).includes(body.format)) {
		return res.status(400).json({ error: `format must be one of: ${VALID_PROBLEM_FORMATS.join(", ")}` });
	}
	const targetFormat = body.format as ProblemFormat;

	const output = await getStudioOutputStore(outputId);
	if (!output) {
		return res.status(404).json({ error: "Output not found" });
	}

	const testPayload = output.payload as TestProduct;
	const allItems = testPayload.sections?.flatMap((s) => s.items) ?? [];
	const target = allItems.find((i) => i.itemId === itemId);
	if (!target) {
		return res.status(404).json({ error: "Item not found" });
	}

	// Build a 1-item stub section for the concept slot and regenerate with forced format.
	const seed = `cf-${outputId.slice(-6)}-${itemId.slice(-6)}`;
	const stubSection = {
		concept: target.concept,
		sourceDocumentIds: [target.sourceDocumentId],
		items: [{ ...target, itemId: `stub-cf` }],
	};

	const regenerated = await generateScenarioSection(stubSection, seed, [], targetFormat);
	const candidate = regenerated.items[0];
	if (!candidate) {
		return res.status(500).json({ error: "No replacement item generated" });
	}

	const replacement = { ...candidate, itemId };
	const nextPayload = replaceItemInTestPayload(testPayload, itemId, replacement);
	if (!nextPayload) {
		return res.status(404).json({ error: "Item not found in payload" });
	}

	const updated = await updateStudioOutputStore(outputId, { payload: nextPayload, renderModel: nextPayload });
	if (!updated) {
		return res.status(500).json({ error: "Failed to save updated output" });
	}

	return res.status(200).json({ item: replacement, output: updated });
}