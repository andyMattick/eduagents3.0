import { supabaseRest } from "../../../lib/supabase";
import type { CognitiveTemplate } from "../semantic/cognitive/templates";
import { loadTeacherTemplates } from "../semantic/cognitive/templates/loadTeacherTemplates";
import { deriveTemplateFromFeedback } from "../semantic/cognitive/templateLearning";
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

export function resetTeacherFeedbackState() {
	feedbackMemory.length = 0;
	overrideMemory.clear();
	templateMemory.clear();
}