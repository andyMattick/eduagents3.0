import { supabaseRest } from "../../../lib/supabase";
import type { CognitiveTemplate } from "../semantic/cognitive/templates";
import { loadTeacherTemplates } from "../semantic/cognitive/templates/loadTeacherTemplates";
import { deriveTemplateFromFeedback } from "../semantic/cognitive/templateLearning";
import { recordTeacherAction, resetLearningState, type TeacherActionEvent, type TeacherActionType } from "../semantic/learning";
import {
	applyAssessmentFingerprintEdits,
	canonicalConceptId,
	explainFingerprintAlignment,
	mergeAssessmentIntoTeacherFingerprint,
	mergeAssessmentIntoUnitFingerprint,
	type AssessmentFingerprint,
	type AssessmentFingerprintEdits,
	type BloomLevel,
	type FingerprintAlignmentExplanation,
	type ScenarioType,
	type TeacherFingerprint,
	type UnitFingerprint,
} from "./fingerprints";
import type {
	FeedbackTarget,
	ProblemOverrideRecord,
	TeacherDerivedTemplateRecord,
	TeacherFeedback,
	TeacherFeedbackPayload,
	ValidatedOverrides,
} from "./TeacherFeedback";

const feedbackMemory: TeacherFeedback[] = [];
const overrideMemory = new Map<string, ValidatedOverrides>();
const templateMemory = new Map<string, TeacherDerivedTemplateRecord>();
const assessmentFingerprintMemory = new Map<string, AssessmentFingerprint>();
const unitFingerprintMemory = new Map<string, UnitFingerprint>();
const teacherFingerprintMemory = new Map<string, TeacherFingerprint>();

const ASSESSMENT_FINGERPRINTS_TABLE = "assessment_fingerprints";
const UNIT_FINGERPRINTS_TABLE = "unit_fingerprints";

let assessmentFingerprintPersistenceSupported = true;
let unitFingerprintPersistenceSupported = true;

const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;
const REQUIRED_VECTOR_KEYS = new Set([
	"subject",
	"domain",
	"concepts",
	"problemType",
	"multiStep",
	"steps",
	"representation",
	"representationCount",
	"linguisticLoad",
	"vocabularyTier",
	"sentenceComplexity",
	"wordProblem",
	"passiveVoice",
	"abstractLanguage",
	"bloom",
	"difficulty",
	"distractorDensity",
	"abstractionLevel",
	"misconceptionTriggers",
	"frustrationRisk",
	"engagementPotential",
	"cognitive",
]);

function createUuid() {
	if (typeof globalThis.crypto?.randomUUID === "function") {
		return globalThis.crypto.randomUUID();
	}

	return `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function hashText(value: string) {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
	}

	return hash.toString(16);
}

function canUseSupabase() {
	return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isMissingSupabaseTableError(error: unknown, table: string) {
	const message = String(error instanceof Error ? error.message : error).toLowerCase();
	return message.includes("pgrst205")
		|| (message.includes("schema cache") && message.includes(table))
		|| message.includes(`could not find the table 'public.${table}'`);
}

function disableFingerprintPersistence(table: typeof ASSESSMENT_FINGERPRINTS_TABLE | typeof UNIT_FINGERPRINTS_TABLE, error: unknown) {
	if (!isMissingSupabaseTableError(error, table)) {
		throw error;
	}

	if (table === ASSESSMENT_FINGERPRINTS_TABLE) {
		if (assessmentFingerprintPersistenceSupported) {
			console.warn(`[teacherFeedback.store] ${table} missing in Supabase schema cache; falling back to in-memory assessment fingerprints.`);
		}
		assessmentFingerprintPersistenceSupported = false;
		return;
	}

	if (unitFingerprintPersistenceSupported) {
		console.warn(`[teacherFeedback.store] ${table} missing in Supabase schema cache; falling back to in-memory unit fingerprints.`);
	}
	unitFingerprintPersistenceSupported = false;
}

function fingerprintUnitKey(teacherId: string, unitId: string) {
	return `${teacherId}::${unitId}`;
}

function sortAssessmentsForAggregation(assessments: AssessmentFingerprint[]) {
	return [...assessments].sort((left, right) => left.lastUpdated.localeCompare(right.lastUpdated) || left.assessmentId.localeCompare(right.assessmentId));
}

function aggregateSectionOrder(assessments: AssessmentFingerprint[]) {
	const positions = new Map<string, { total: number; count: number }>();
	for (const assessment of assessments) {
		assessment.flowProfile.sectionOrder.forEach((conceptId, index) => {
			const current = positions.get(conceptId) ?? { total: 0, count: 0 };
			current.total += index;
			current.count += 1;
			positions.set(conceptId, current);
		});
	}
	return [...positions.entries()]
		.sort((left, right) => (left[1].total / left[1].count) - (right[1].total / right[1].count) || right[1].count - left[1].count || left[0].localeCompare(right[0]))
		.map(([conceptId]) => conceptId);
}

function aggregateCognitiveLadder(assessments: AssessmentFingerprint[]): BloomLevel[] {
	const positions = new Map<BloomLevel, { total: number; count: number }>();
	for (const assessment of assessments) {
		assessment.flowProfile.cognitiveLadderShape.forEach((level, index) => {
			const current = positions.get(level) ?? { total: 0, count: 0 };
			current.total += index;
			current.count += 1;
			positions.set(level, current);
		});
	}
	return [...positions.entries()]
		.sort((left, right) => (left[1].total / left[1].count) - (right[1].total / right[1].count) || right[1].count - left[1].count)
		.map(([level]) => level);
}

function finalizeFlowProfiles(assessments: AssessmentFingerprint[], fingerprint: TeacherFingerprint | UnitFingerprint | null) {
	if (!fingerprint) {
		return null;
	}
	return {
		...fingerprint,
		flowProfile: {
			...fingerprint.flowProfile,
			sectionOrder: aggregateSectionOrder(assessments),
			cognitiveLadderShape: aggregateCognitiveLadder(assessments),
		},
	};
}

function createFeedback(payload: TeacherFeedbackPayload): TeacherFeedback {
	return {
		feedbackId: createUuid(),
		teacherId: payload.teacherId,
		documentId: payload.documentId,
		canonicalProblemId: payload.canonicalProblemId,
		target: payload.target,
		aiValue: payload.aiValue,
		teacherValue: payload.teacherValue,
		rationale: payload.rationale,
		evidence: payload.evidence,
		createdAt: new Date().toISOString(),
	};
}

function feedbackTargetToActionType(target: FeedbackTarget): TeacherActionType {
	switch (target) {
		case "multiStep":
			return "expected_steps_correction";
		case "difficulty":
			return "difficulty_correction";
		case "representationComplexity":
			return "representation_correction";
		case "segmentation":
		case "problemGrouping":
			return "multipart_restructure";
		default:
			return "template_override";
	}
}

function buildTeacherActionEvent(payload: TeacherFeedbackPayload, feedback: TeacherFeedback): TeacherActionEvent {
	return {
		eventId: `action-${feedback.feedbackId}`,
		teacherId: feedback.teacherId,
		problemId: feedback.canonicalProblemId,
		timestamp: Date.parse(feedback.createdAt),
		actionType: feedbackTargetToActionType(payload.target),
		oldValue: payload.aiValue,
		newValue: payload.teacherValue,
		context: {
			subject: payload.context?.subject ?? "unknown",
			gradeLevel: payload.context?.gradeLevel,
			templateIds: payload.context?.templateIds ?? [],
			teacherTemplateIds: payload.context?.teacherTemplateIds ?? [],
			assessmentId: payload.context?.assessmentId,
			unitId: payload.context?.unitId,
			conceptId: payload.context?.conceptId,
			conceptDisplayName: payload.context?.conceptDisplayName,
			scenarioType: payload.context?.scenarioType,
			scope: payload.context?.scope,
		},
	};
}

function oneHotBloom(value: unknown) {
	if (typeof value !== "string") {
		return undefined;
	}

	const key = value.toLowerCase();
	const levels = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;
	if (!levels.includes(key as typeof levels[number])) {
		return undefined;
	}

	return {
		remember: key === "remember" ? 1 : 0,
		understand: key === "understand" ? 1 : 0,
		apply: key === "apply" ? 1 : 0,
		analyze: key === "analyze" ? 1 : 0,
		evaluate: key === "evaluate" ? 1 : 0,
		create: key === "create" ? 1 : 0,
	};
}

function toOverrideFragment(feedback: TeacherFeedback): ProblemOverrideRecord {
	switch (feedback.target) {
		case "bloom":
			return { bloom: typeof feedback.teacherValue === "object" && feedback.teacherValue ? feedback.teacherValue as ProblemOverrideRecord["bloom"] : oneHotBloom(feedback.teacherValue) };
		case "difficulty":
			return { difficulty: Number(feedback.teacherValue) };
		case "linguisticLoad":
			return { linguisticLoad: Number(feedback.teacherValue) };
		case "abstractionLevel":
			return { abstractionLevel: Number(feedback.teacherValue) };
		case "multiStep":
			return { multiStep: Number(feedback.teacherValue) };
		case "representationComplexity":
			return { representationComplexity: Number(feedback.teacherValue) };
		case "misconceptionRisk":
			return { misconceptionRisk: Number(feedback.teacherValue) };
		case "concepts":
			return { concepts: (feedback.teacherValue as Record<string, number>) ?? {} };
		case "subject":
			return { subject: String(feedback.teacherValue ?? "") };
		case "domain":
			return { domain: String(feedback.teacherValue ?? "") };
		case "stemText":
			return { stemText: String(feedback.teacherValue ?? "") };
		case "partText":
			return { partText: String(feedback.teacherValue ?? "") };
		case "segmentation":
			return { segmentation: typeof feedback.teacherValue === "object" && feedback.teacherValue ? feedback.teacherValue as Record<string, unknown> : { value: feedback.teacherValue } };
		case "problemGrouping":
			return { problemGrouping: typeof feedback.teacherValue === "object" && feedback.teacherValue ? feedback.teacherValue as Record<string, unknown> : { value: feedback.teacherValue } };
		case "tags":
			return { tags: typeof feedback.teacherValue === "object" && feedback.teacherValue ? feedback.teacherValue as Record<string, unknown> : { value: feedback.teacherValue } };
		default:
			return { other: feedback.teacherValue };
	}
}

function isNumberInRange(value: unknown) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validateOverrides(overrides: unknown, currentOverrideVersion = 0): ValidatedOverrides {
	if (!overrides || typeof overrides !== "object") {
		throw new Error("INVALID_OVERRIDE: overrides must be an object");
	}

	const candidate = overrides as ProblemOverrideRecord;
	if (candidate.bloom) {
		for (const [key, value] of Object.entries(candidate.bloom)) {
			if (!BLOOM_KEYS.includes(key as typeof BLOOM_KEYS[number]) || !isNumberInRange(value)) {
				throw new Error("INVALID_OVERRIDE: bloom must use valid keys with values in [0,1]");
			}
		}
	}

	for (const key of ["difficulty", "multiStep", "misconceptionRisk", "representationComplexity", "linguisticLoad", "abstractionLevel"] as const) {
		const value = candidate[key];
		if (value !== undefined && !isNumberInRange(value)) {
			throw new Error(`INVALID_OVERRIDE: ${key} must be in [0,1]`);
		}
	}

	if (candidate.concepts) {
		for (const [concept, weight] of Object.entries(candidate.concepts)) {
			if (!concept || !isNumberInRange(weight)) {
				throw new Error("INVALID_OVERRIDE: concepts must be a string-to-number map in [0,1]");
			}
		}
	}

	if (candidate.tags) {
		for (const [key, value] of Object.entries(candidate.tags)) {
			if (REQUIRED_VECTOR_KEYS.has(key) && (value === null || value === undefined)) {
				throw new Error(`INVALID_OVERRIDE: cannot remove required field ${key}`);
			}
		}
	}

	return {
		...candidate,
		overrideVersion: currentOverrideVersion + 1,
		lastUpdatedAt: new Date().toISOString(),
	};
}

function mergeOverrideRecords(current: ValidatedOverrides | null, fragment: ProblemOverrideRecord): ValidatedOverrides {
	const merged = {
		...(current ?? {}),
		...fragment,
		concepts: fragment.concepts ?? current?.concepts,
		tags: {
			...(current?.tags ?? {}),
			...(fragment.tags ?? {}),
		},
		misconceptionTriggers: {
			...(current?.misconceptionTriggers ?? {}),
			...(fragment.misconceptionTriggers ?? {}),
		},
	};

	return validateOverrides(merged, current?.overrideVersion ?? 0);
}

function normalizeOverride(canonicalProblemId: string, overrides: ValidatedOverrides) {
	return {
		canonical_problem_id: canonicalProblemId,
		overrides,
		updated_at: overrides.lastUpdatedAt,
	};
}

function normalizeFeedback(feedback: TeacherFeedback) {
	return {
		feedback_id: feedback.feedbackId,
		teacher_id: feedback.teacherId,
		document_id: feedback.documentId,
		canonical_problem_id: feedback.canonicalProblemId,
		target: feedback.target,
		ai_value: feedback.aiValue,
		teacher_value: feedback.teacherValue,
		rationale: feedback.rationale ?? null,
		evidence: feedback.evidence ?? null,
		created_at: feedback.createdAt,
	};
}

function normalizeTemplate(template: TeacherDerivedTemplateRecord) {
	return {
		id: template.id,
		teacher_id: template.teacherId,
		source_feedback_id: template.sourceFeedbackId,
		evidence_text: template.evidenceText,
		subject: template.subject ?? null,
		domain: template.domain ?? null,
		bloom: template.bloom ?? null,
		difficulty_boost: template.difficultyBoost ?? null,
		misconception_risk_boost: template.misconceptionRiskBoost ?? null,
		created_at: template.createdAt,
	};
}

function normalizeAssessmentFingerprint(fingerprint: AssessmentFingerprint) {
	return {
		assessment_id: fingerprint.assessmentId,
		teacher_id: fingerprint.teacherId,
		unit_id: fingerprint.unitId ?? null,
		concept_profiles: fingerprint.conceptProfiles,
		flow_profile: fingerprint.flowProfile,
		item_count: fingerprint.itemCount,
		source_type: fingerprint.sourceType,
		last_updated: fingerprint.lastUpdated,
		version: fingerprint.version,
	};
}

function normalizeUnitFingerprint(fingerprint: UnitFingerprint) {
	return {
		teacher_id: fingerprint.teacherId,
		unit_id: fingerprint.unitId,
		concept_profiles: fingerprint.conceptProfiles,
		flow_profile: fingerprint.flowProfile,
		derived_from_assessment_ids: fingerprint.derivedFromAssessmentIds,
		last_updated: fingerprint.lastUpdated,
		version: fingerprint.version,
	};
}

function hydrateAssessmentFingerprint(row: Record<string, unknown>): AssessmentFingerprint {
	return {
		assessmentId: String(row.assessment_id),
		teacherId: String(row.teacher_id),
		unitId: typeof row.unit_id === "string" ? row.unit_id : undefined,
		conceptProfiles: (row.concept_profiles as AssessmentFingerprint["conceptProfiles"]) ?? [],
		flowProfile: row.flow_profile as AssessmentFingerprint["flowProfile"],
		itemCount: Number(row.item_count ?? 0),
		sourceType: row.source_type as AssessmentFingerprint["sourceType"],
		lastUpdated: String(row.last_updated),
		version: Number(row.version ?? 1),
	};
}

function hydrateUnitFingerprint(row: Record<string, unknown>): UnitFingerprint {
	return {
		teacherId: String(row.teacher_id),
		unitId: String(row.unit_id),
		conceptProfiles: (row.concept_profiles as UnitFingerprint["conceptProfiles"]) ?? [],
		flowProfile: row.flow_profile as UnitFingerprint["flowProfile"],
		derivedFromAssessmentIds: (row.derived_from_assessment_ids as string[]) ?? [],
		lastUpdated: String(row.last_updated),
		version: Number(row.version ?? 1),
	};
}

function isBloomLevel(value: unknown): value is BloomLevel {
	return typeof value === "string" && BLOOM_KEYS.includes(value.toLowerCase() as typeof BLOOM_KEYS[number]);
}

function isScenarioType(value: unknown): value is ScenarioType {
	return typeof value === "string" && ["real-world", "simulation", "data-table", "graphical", "abstract-symbolic"].includes(value);
}

function inferFingerprintEdits(payload: TeacherFeedbackPayload, assessment: AssessmentFingerprint): AssessmentFingerprintEdits | null {
	const context = payload.context;
	if (!context) {
		return null;
	}

	const conceptId = context.conceptId ? canonicalConceptId(context.conceptId) : undefined;
	const edits: AssessmentFingerprintEdits = {};

	if (payload.target === "bloom" && conceptId && isBloomLevel(payload.teacherValue)) {
		edits.bloomCeilings = { [conceptId]: payload.teacherValue.toLowerCase() as BloomLevel };
		edits.bloomLevelAppends = { [conceptId]: [payload.teacherValue.toLowerCase() as BloomLevel] };
	}

	if (payload.target === "concepts" && payload.teacherValue && typeof payload.teacherValue === "object") {
		const teacherConcepts = Object.entries(payload.teacherValue as Record<string, unknown>)
			.filter(([, weight]) => typeof weight === "number" ? weight > 0 : Boolean(weight));

		const existingConceptIds = new Set(assessment.conceptProfiles.map((profile) => profile.conceptId));
		const addConcepts = teacherConcepts
			.map(([displayName, weight]) => ({
				conceptId: canonicalConceptId(displayName),
				displayName,
				absoluteItemHint: Math.max(1, Math.round(typeof weight === "number" ? weight : 1)),
			}))
			.filter((profile) => !existingConceptIds.has(profile.conceptId));

		if (addConcepts.length > 0) {
			edits.addConcepts = addConcepts;
		}

		if (context.scope === "instructional-unit" && teacherConcepts.length > 0) {
			edits.sectionOrder = teacherConcepts.map(([displayName]) => canonicalConceptId(displayName));
		}
	}

	if (context.scenarioType && conceptId && isScenarioType(context.scenarioType)) {
		edits.scenarioOverrides = { [conceptId]: [context.scenarioType] };
	}

	if (!edits.addConcepts && !edits.bloomCeilings && !edits.bloomLevelAppends && !edits.sectionOrder && !edits.scenarioOverrides) {
		return null;
	}

	return edits;
}

function recomputeStoredFingerprintsFromAssessments(teacherId: string, assessments: AssessmentFingerprint[]) {
	for (const key of [...unitFingerprintMemory.keys()]) {
		if (key.startsWith(`${teacherId}::`)) {
			unitFingerprintMemory.delete(key);
		}
	}

	// Only non-generated assessments (uploaded / hybrid) feed the teacher fingerprint.
	// Generated assessments are AI artifacts — they reflect no teacher intent.
	const teacherCandidates = assessments.filter((a) => a.sourceType !== "generated");

	let teacherFingerprint: TeacherFingerprint | null = null;
	for (const assessment of assessments) {
		assessmentFingerprintMemory.set(assessment.assessmentId, assessment);
		if (assessment.sourceType !== "generated") {
			teacherFingerprint = mergeAssessmentIntoTeacherFingerprint({ previous: teacherFingerprint, assessment, now: assessment.lastUpdated });
		}
		if (assessment.unitId) {
			const key = fingerprintUnitKey(teacherId, assessment.unitId);
			const previousUnit = unitFingerprintMemory.get(key) ?? null;
			unitFingerprintMemory.set(key, mergeAssessmentIntoUnitFingerprint({ previous: previousUnit, assessment, now: assessment.lastUpdated }));
		}
	}

	if (teacherFingerprint) {
		teacherFingerprintMemory.set(teacherId, finalizeFlowProfiles(teacherCandidates, teacherFingerprint) as TeacherFingerprint);
		for (const [key, fingerprint] of [...unitFingerprintMemory.entries()]) {
			if (!key.startsWith(`${teacherId}::`)) {
				continue;
			}
			const unitId = key.slice(teacherId.length + 2);
			const unitAssessments = assessments.filter((assessment) => assessment.unitId === unitId);
			unitFingerprintMemory.set(key, finalizeFlowProfiles(unitAssessments, fingerprint) as UnitFingerprint);
		}
	} else {
		teacherFingerprintMemory.delete(teacherId);
	}
}

async function listTeacherAssessments(teacherId: string) {
	if (canUseSupabase() && assessmentFingerprintPersistenceSupported) {
		try {
			const rows = await supabaseRest(ASSESSMENT_FINGERPRINTS_TABLE, {
				select: "assessment_id,teacher_id,unit_id,concept_profiles,flow_profile,item_count,source_type,last_updated,version",
				filters: { teacher_id: `eq.${teacherId}`, order: "last_updated.asc,assessment_id.asc" },
			});
			return ((rows as Array<Record<string, unknown>>) ?? []).map((row) => hydrateAssessmentFingerprint(row));
		} catch (error) {
			disableFingerprintPersistence(ASSESSMENT_FINGERPRINTS_TABLE, error);
		}
	}

	return sortAssessmentsForAggregation([...assessmentFingerprintMemory.values()].filter((assessment) => assessment.teacherId === teacherId));
}

async function recomputeStoredFingerprints(teacherId: string) {
	const assessments = await listTeacherAssessments(teacherId);
	recomputeStoredFingerprintsFromAssessments(teacherId, assessments);

	if (!canUseSupabase() || !unitFingerprintPersistenceSupported) {
		return;
	}

	try {
		if (assessments.length === 0) {
			await supabaseRest(UNIT_FINGERPRINTS_TABLE, {
				method: "DELETE",
				filters: { teacher_id: `eq.${teacherId}` },
				prefer: "return=minimal",
			});
			return;
		}

		const unitFingerprints = [...unitFingerprintMemory.entries()]
			.filter(([key]) => key.startsWith(`${teacherId}::`))
			.map(([, fingerprint]) => fingerprint);

		await supabaseRest(UNIT_FINGERPRINTS_TABLE, {
			method: "DELETE",
			filters: { teacher_id: `eq.${teacherId}` },
			prefer: "return=minimal",
		});

		if (unitFingerprints.length > 0) {
			await supabaseRest(UNIT_FINGERPRINTS_TABLE, {
				method: "POST",
				body: unitFingerprints.map((fingerprint) => normalizeUnitFingerprint(fingerprint)),
				prefer: "resolution=merge-duplicates,return=minimal",
			});
		}
	} catch (error) {
		disableFingerprintPersistence(UNIT_FINGERPRINTS_TABLE, error);
	}
}

async function readJsonIfAvailable<T>(response: Response): Promise<T | null> {
	const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

	if (contentType.includes("application/json")) {
		return response.json() as Promise<T>;
	}

	const text = await response.text();
	const trimmed = text.trim();
	if (!trimmed) {
		return null;
	}

	if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<")) {
		return null;
	}

	try {
		return JSON.parse(trimmed) as T;
	} catch {
		return null;
	}
}

export async function saveTeacherFeedback(payload: TeacherFeedbackPayload) {
	const feedback = createFeedback(payload);
	const currentOverride = await getProblemOverride(payload.canonicalProblemId);
	const mergedOverride = mergeOverrideRecords(currentOverride, toOverrideFragment(feedback));

	if (canUseSupabase()) {
		await supabaseRest("teacher_feedback", {
			method: "POST",
			body: normalizeFeedback(feedback),
			prefer: "return=minimal",
		});
		await supabaseRest("problem_overrides", {
			method: "POST",
			body: normalizeOverride(payload.canonicalProblemId, mergedOverride),
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	} else {
		feedbackMemory.push(feedback);
		overrideMemory.set(payload.canonicalProblemId, mergedOverride);
	}

	const learnedTemplate = await learnTemplateFromFeedback(feedback);
	if (payload.context?.assessmentId) {
		const assessment = await getAssessmentFingerprint(payload.context.assessmentId);
		const edits = assessment ? inferFingerprintEdits(payload, assessment) : null;
		if (assessment && edits) {
			await updateAssessmentFingerprint({
				assessmentId: assessment.assessmentId,
				edits: {
					...edits,
					now: feedback.createdAt,
				},
			});
		}
	}
	await recordTeacherAction(buildTeacherActionEvent(payload, feedback));
	return {
		feedback,
		overrides: mergedOverride,
		learnedTemplate,
	};
}

export async function getFeedbackForProblem(canonicalProblemId: string): Promise<TeacherFeedback[]> {
	if (typeof window !== "undefined") {
		const response = await fetch(`/api/v4/teacher-feedback/${encodeURIComponent(canonicalProblemId)}`);
		if (!response.ok) {
			return [];
		}
		const payload = await readJsonIfAvailable<{ feedback?: TeacherFeedback[] }>(response);
		if (!payload) {
			return [];
		}
		return (payload.feedback ?? []) as TeacherFeedback[];
	}

	if (canUseSupabase()) {
		const rows = await supabaseRest("teacher_feedback", {
			select: "feedback_id,teacher_id,document_id,canonical_problem_id,target,ai_value,teacher_value,rationale,evidence,created_at",
			filters: { canonical_problem_id: `eq.${canonicalProblemId}`, order: "created_at.desc" },
		});
		return ((rows as Array<Record<string, unknown>>) ?? []).map((row) => ({
			feedbackId: String(row.feedback_id),
			teacherId: String(row.teacher_id),
			documentId: String(row.document_id),
			canonicalProblemId: String(row.canonical_problem_id),
			target: row.target as FeedbackTarget,
			aiValue: row.ai_value,
			teacherValue: row.teacher_value,
			rationale: typeof row.rationale === "string" ? row.rationale : undefined,
			evidence: row.evidence as TeacherFeedback["evidence"],
			createdAt: String(row.created_at),
		}));
	}

	return feedbackMemory.filter((feedback) => feedback.canonicalProblemId === canonicalProblemId);
}

export async function getProblemOverride(canonicalProblemId: string): Promise<ProblemOverrideRecord | null> {
	if (typeof window !== "undefined") {
		const response = await fetch(`/api/v4/problem-overrides/${encodeURIComponent(canonicalProblemId)}`);
		if (!response.ok) {
			return null;
		}
		const payload = await readJsonIfAvailable<{ overrides?: ValidatedOverrides | null }>(response);
		if (!payload) {
			return null;
		}
		return (payload.overrides ?? null) as ValidatedOverrides | null;
	}

	if (canUseSupabase()) {
		const rows = await supabaseRest("problem_overrides", {
			select: "canonical_problem_id,overrides,updated_at",
			filters: { canonical_problem_id: `eq.${canonicalProblemId}` },
		});
		const row = Array.isArray(rows) ? rows[0] : null;
		return (row?.overrides as ValidatedOverrides | undefined) ?? null;
	}

	return overrideMemory.get(canonicalProblemId) ?? null;
}

export async function deleteProblemOverride(canonicalProblemId: string) {
	const existing = await getProblemOverride(canonicalProblemId);
	if (!existing) {
		return { deleted: false };
	}

	if (canUseSupabase()) {
		await supabaseRest("problem_overrides", {
			method: "DELETE",
			filters: { canonical_problem_id: `eq.${canonicalProblemId}` },
			prefer: "return=minimal",
		});
		await supabaseRest("teacher_feedback", {
			method: "POST",
			body: normalizeFeedback({
				feedbackId: createUuid(),
				teacherId: "system-reset",
				documentId: canonicalProblemId.split("::")[0] ?? "unknown-document",
				canonicalProblemId,
				target: "other",
				aiValue: existing,
				teacherValue: { reset: true },
				createdAt: new Date().toISOString(),
			}),
			prefer: "return=minimal",
		});
	} else {
		overrideMemory.delete(canonicalProblemId);
		feedbackMemory.push({
			feedbackId: createUuid(),
			teacherId: "system-reset",
			documentId: canonicalProblemId.split("::")[0] ?? "unknown-document",
			canonicalProblemId,
			target: "other",
			aiValue: existing,
			teacherValue: { reset: true },
			createdAt: new Date().toISOString(),
		});
	}

	return { deleted: true };
}

function buildTemplateId(evidenceText: string) {
	return `teacher-derived-${hashText(evidenceText).slice(0, 12)}`;
}

function buildTeacherTemplateRecord(feedback: TeacherFeedback): TeacherDerivedTemplateRecord | null {
	const derived = deriveTemplateFromFeedback(feedback);
	if (!derived) {
		return null;
	}

	return {
		id: buildTemplateId(derived.evidenceText ?? feedback.evidence?.text?.trim() ?? ""),
		teacherId: feedback.teacherId,
		sourceFeedbackId: feedback.feedbackId,
		evidenceText: derived.evidenceText ?? feedback.evidence?.text?.trim() ?? "",
		name: derived.name,
		archetypeKey: derived.archetypeKey,
		patternConfig: derived.patternConfig,
		stepHints: derived.stepHints,
		bloom: derived.bloom,
		difficultyBoost: derived.difficultyBoost,
		multiStepBoost: derived.multiStepBoost,
		misconceptionRiskBoost: derived.misconceptionRiskBoost,
		createdAt: feedback.createdAt,
	};
}

export async function learnTemplateFromFeedback(feedback: TeacherFeedback): Promise<TeacherDerivedTemplateRecord | null> {
	const template = buildTeacherTemplateRecord(feedback);
	if (!template) {
		return null;
	}

	const existing = templateMemory.get(template.id);
	const merged: TeacherDerivedTemplateRecord = existing
		? {
			...existing,
			name: template.name ?? existing.name,
			archetypeKey: template.archetypeKey ?? existing.archetypeKey,
			patternConfig: template.patternConfig ?? existing.patternConfig,
			stepHints: template.stepHints ?? existing.stepHints,
			bloom: { ...(existing.bloom ?? {}), ...(template.bloom ?? {}) },
			difficultyBoost: template.difficultyBoost ?? existing.difficultyBoost,
			multiStepBoost: template.multiStepBoost ?? existing.multiStepBoost,
			misconceptionRiskBoost: template.misconceptionRiskBoost ?? existing.misconceptionRiskBoost,
		}
		: template;

	if (canUseSupabase()) {
		await supabaseRest("cognitive_templates", {
			method: "POST",
			body: normalizeTemplate(merged),
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	} else {
		templateMemory.set(merged.id, merged);
	}

	return merged;
}

export async function upsertTeacherDerivedTemplateRecord(record: TeacherDerivedTemplateRecord): Promise<TeacherDerivedTemplateRecord> {
	const { templates, rejected } = loadTeacherTemplates([record]);
	if (templates.length === 0) {
		throw new Error(`INVALID_TEACHER_TEMPLATE: ${rejected[0]?.reason ?? "unknown validation error"}`);
	}

	if (canUseSupabase()) {
		await supabaseRest("cognitive_templates", {
			method: "POST",
			body: normalizeTemplate(record),
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	} else {
		templateMemory.set(record.id, record);
	}

	return record;
}

export async function getTeacherDerivedTemplateRecords(subject?: string, domain?: string): Promise<TeacherDerivedTemplateRecord[]> {
	if (canUseSupabase()) {
		const rows = await supabaseRest("cognitive_templates", {
			select: "id,teacher_id,source_feedback_id,evidence_text,subject,domain,bloom,difficulty_boost,misconception_risk_boost,created_at",
		});
		return ((rows as Array<Record<string, unknown>>) ?? []).map((row) => ({
			id: String(row.id),
			teacherId: String(row.teacher_id),
			sourceFeedbackId: String(row.source_feedback_id),
			evidenceText: String(row.evidence_text),
			subject: typeof row.subject === "string" ? row.subject : undefined,
			domain: typeof row.domain === "string" ? row.domain : undefined,
			bloom: row.bloom as TeacherDerivedTemplateRecord["bloom"],
			difficultyBoost: typeof row.difficulty_boost === "number" ? row.difficulty_boost : undefined,
			misconceptionRiskBoost: typeof row.misconception_risk_boost === "number" ? row.misconception_risk_boost : undefined,
			createdAt: String(row.created_at),
		})).filter((record) => (!subject || !record.subject || record.subject === subject) && (!domain || !record.domain || record.domain === domain));
	}

	return [...templateMemory.values()].filter((record) => (!subject || !record.subject || record.subject === subject) && (!domain || !record.domain || record.domain === domain));
}

export async function listTeacherDerivedTemplates(subject?: string, domain?: string): Promise<CognitiveTemplate[]> {
	if (typeof window !== "undefined") {
		const query = new URLSearchParams();
		if (subject) {
			query.set("subject", subject);
		}
		if (domain) {
			query.set("domain", domain);
		}
		const suffix = query.toString() ? `?${query.toString()}` : "";
		const response = await fetch(`/api/v4/teacher-feedback/templates${suffix}`);
		if (!response.ok) {
			return [];
		}
		const payload = await readJsonIfAvailable<{ templates?: TeacherDerivedTemplateRecord[] }>(response);
		if (!payload) {
			return [];
		}
		return loadTeacherTemplates((payload.templates ?? []) as TeacherDerivedTemplateRecord[]).templates;
	}
	const records = await getTeacherDerivedTemplateRecords(subject, domain);
	return loadTeacherTemplates(records).templates;
}

export async function saveAssessmentFingerprint(fingerprint: AssessmentFingerprint) {
	assessmentFingerprintMemory.set(fingerprint.assessmentId, fingerprint);
	if (canUseSupabase() && assessmentFingerprintPersistenceSupported) {
		try {
			await supabaseRest(ASSESSMENT_FINGERPRINTS_TABLE, {
				method: "POST",
				body: normalizeAssessmentFingerprint(fingerprint),
				prefer: "resolution=merge-duplicates,return=minimal",
			});
		} catch (error) {
			disableFingerprintPersistence(ASSESSMENT_FINGERPRINTS_TABLE, error);
		}
	}
	await recomputeStoredFingerprints(fingerprint.teacherId);
	return {
		assessment: assessmentFingerprintMemory.get(fingerprint.assessmentId) ?? fingerprint,
		unit: fingerprint.unitId ? unitFingerprintMemory.get(fingerprintUnitKey(fingerprint.teacherId, fingerprint.unitId)) ?? null : null,
		teacher: teacherFingerprintMemory.get(fingerprint.teacherId) ?? null,
	};
}

export async function updateAssessmentFingerprint(args: {
	assessmentId: string;
	edits: AssessmentFingerprintEdits;
}) {
	const current = await getAssessmentFingerprint(args.assessmentId);
	if (!current) {
		return null;
	}

	const rawUpdated = applyAssessmentFingerprintEdits({
		assessment: current,
		edits: args.edits,
	});
	// A teacher edit on a generated assessment graduates it to "hybrid" —
	// it now carries teacher intent and should feed the teacher fingerprint.
	const updated = rawUpdated.sourceType === "generated"
		? { ...rawUpdated, sourceType: "hybrid" as const }
		: rawUpdated;
	assessmentFingerprintMemory.set(updated.assessmentId, updated);
	if (canUseSupabase() && assessmentFingerprintPersistenceSupported) {
		try {
			await supabaseRest(ASSESSMENT_FINGERPRINTS_TABLE, {
				method: "POST",
				body: normalizeAssessmentFingerprint(updated),
				prefer: "resolution=merge-duplicates,return=minimal",
			});
		} catch (error) {
			disableFingerprintPersistence(ASSESSMENT_FINGERPRINTS_TABLE, error);
		}
	}
	await recomputeStoredFingerprints(updated.teacherId);

	return {
		assessment: updated,
		unit: updated.unitId ? unitFingerprintMemory.get(fingerprintUnitKey(updated.teacherId, updated.unitId)) ?? null : null,
		teacher: teacherFingerprintMemory.get(updated.teacherId) ?? null,
	};
}

export async function getAssessmentFingerprint(assessmentId: string): Promise<AssessmentFingerprint | null> {
	if (canUseSupabase() && assessmentFingerprintPersistenceSupported) {
		try {
			const rows = await supabaseRest(ASSESSMENT_FINGERPRINTS_TABLE, {
				select: "assessment_id,teacher_id,unit_id,concept_profiles,flow_profile,item_count,source_type,last_updated,version",
				filters: { assessment_id: `eq.${assessmentId}` },
			});
			const row = Array.isArray(rows) ? rows[0] : null;
			if (!row) {
				return null;
			}
			const fingerprint = hydrateAssessmentFingerprint(row as Record<string, unknown>);
			assessmentFingerprintMemory.set(fingerprint.assessmentId, fingerprint);
			return fingerprint;
		} catch (error) {
			disableFingerprintPersistence(ASSESSMENT_FINGERPRINTS_TABLE, error);
		}
	}

	return assessmentFingerprintMemory.get(assessmentId) ?? null;
}

export async function listAssessmentFingerprints(args?: { teacherId?: string; unitId?: string }) {
	if (canUseSupabase() && assessmentFingerprintPersistenceSupported) {
		try {
			const filters: Record<string, string> = { order: "last_updated.asc,assessment_id.asc" };
			if (args?.teacherId) {
				filters.teacher_id = `eq.${args.teacherId}`;
			}
			if (args?.unitId) {
				filters.unit_id = `eq.${args.unitId}`;
			}
			const rows = await supabaseRest(ASSESSMENT_FINGERPRINTS_TABLE, {
				select: "assessment_id,teacher_id,unit_id,concept_profiles,flow_profile,item_count,source_type,last_updated,version",
				filters,
			});
			const fingerprints = ((rows as Array<Record<string, unknown>>) ?? []).map((row) => hydrateAssessmentFingerprint(row));
			for (const fingerprint of fingerprints) {
				assessmentFingerprintMemory.set(fingerprint.assessmentId, fingerprint);
			}
			return fingerprints;
		} catch (error) {
			disableFingerprintPersistence(ASSESSMENT_FINGERPRINTS_TABLE, error);
		}
	}

	return [...assessmentFingerprintMemory.values()].filter((fingerprint) => {
		if (args?.teacherId && fingerprint.teacherId !== args.teacherId) {
			return false;
		}
		if (args?.unitId && fingerprint.unitId !== args.unitId) {
			return false;
		}
		return true;
	});
}

export async function getUnitFingerprint(teacherId: string, unitId: string): Promise<UnitFingerprint | null> {
	if (canUseSupabase() && unitFingerprintPersistenceSupported) {
		try {
			const rows = await supabaseRest(UNIT_FINGERPRINTS_TABLE, {
				select: "teacher_id,unit_id,concept_profiles,flow_profile,derived_from_assessment_ids,last_updated,version",
				filters: { teacher_id: `eq.${teacherId}`, unit_id: `eq.${unitId}` },
			});
			const row = Array.isArray(rows) ? rows[0] : null;
			if (!row) {
				return null;
			}
			const fingerprint = hydrateUnitFingerprint(row as Record<string, unknown>);
			unitFingerprintMemory.set(fingerprintUnitKey(teacherId, unitId), fingerprint);
			return fingerprint;
		} catch (error) {
			disableFingerprintPersistence(UNIT_FINGERPRINTS_TABLE, error);
		}
	}

	return unitFingerprintMemory.get(fingerprintUnitKey(teacherId, unitId)) ?? null;
}

export async function getTeacherFingerprint(teacherId: string): Promise<TeacherFingerprint | null> {
	if (canUseSupabase()) {
		if (!teacherFingerprintMemory.has(teacherId)) {
			const assessments = await listTeacherAssessments(teacherId);
			recomputeStoredFingerprintsFromAssessments(teacherId, assessments);
		}
		return teacherFingerprintMemory.get(teacherId) ?? null;
	}

	return teacherFingerprintMemory.get(teacherId) ?? null;
}

export async function saveTeacherFingerprint(fingerprint: TeacherFingerprint) {
	teacherFingerprintMemory.set(fingerprint.teacherId, fingerprint);
	return fingerprint;
}

export async function explainAssessmentFingerprintAlignment(assessmentId: string): Promise<FingerprintAlignmentExplanation | null> {
	const assessment = assessmentFingerprintMemory.get(assessmentId) ?? null;
	if (!assessment) {
		return null;
	}

	const teacherFingerprint = teacherFingerprintMemory.get(assessment.teacherId) ?? null;
	if (!teacherFingerprint) {
		return null;
	}

	const unitFingerprint = assessment.unitId
		? unitFingerprintMemory.get(fingerprintUnitKey(assessment.teacherId, assessment.unitId)) ?? null
		: null;

	return explainFingerprintAlignment({
		assessment,
		teacherFingerprint,
		unitFingerprint,
	});
}

export function resetTeacherFeedbackState() {
	feedbackMemory.length = 0;
	overrideMemory.clear();
	templateMemory.clear();
	assessmentFingerprintMemory.clear();
	unitFingerprintMemory.clear();
	teacherFingerprintMemory.clear();
	assessmentFingerprintPersistenceSupported = true;
	unitFingerprintPersistenceSupported = true;
	resetLearningState();
}