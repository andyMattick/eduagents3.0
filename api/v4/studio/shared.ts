import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
	createBlueprintStore,
	getBlueprintStore,
	getBlueprintVersionStore,
	getCollectionAnalysisStore,
	getStudioOutputStore,
	saveStudioOutputStore,
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
		}>(req.body, {});
		const { analysis, blueprint } = await buildSeedBlueprint({
			sessionId,
			teacherId: body.teacherId,
			unitId: body.unitId,
			itemCount: body.options?.itemCount,
		});
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

	const product = await buildIntentPayload(request, context);

	const output = await saveStudioOutputStore({
		sessionId: blueprintRecord.sessionId,
		blueprintId,
		blueprintVersion: blueprintRecord.activeVersion,
		outputType: "assessment",
		teacherId: blueprintRecord.teacherId,
		unitId: blueprintRecord.unitId,
		options: { totalItems },
		payload: product,
		renderModel: product,
	});

	return res.status(200).json({ output });
}