import { supabaseRest } from "../../../../lib/supabase";
import type { CognitiveTemplate, TemplateStepHints } from "../cognitive/templates/loadTemplates";

export type TeacherActionType =
	| "template_override"
	| "expected_steps_correction"
	| "difficulty_correction"
	| "representation_correction"
	| "multipart_restructure";

export interface TeacherActionContext {
	subject: string;
	gradeLevel?: string;
	templateIds?: string[];
	teacherTemplateIds?: string[];
	assessmentId?: string;
	unitId?: string;
	conceptId?: string;
	conceptDisplayName?: string;
	scenarioType?: string;
	scope?: "problem" | "instructional-unit" | "assessment-item";
}

export interface TeacherActionEvent {
	eventId: string;
	teacherId: string;
	problemId: string;
	timestamp: number;
	actionType: TeacherActionType;
	oldValue: unknown;
	newValue: unknown;
	context: TeacherActionContext;
}

export interface TemplateLearningRecord {
	templateId: string;
	strongMatches: number;
	weakMatches: number;
	teacherOverrides: number;
	expectedStepsCorrections: number;
	driftScore: number;
	lastUpdated: number;
	learnedExpectedSteps?: number;
	learnedStepType?: string;
	frozen?: boolean;
	evidenceCount?: number;
	confidenceDelta?: number;
}

const teacherActionMemory: TeacherActionEvent[] = [];
const learningRecordMemory = new Map<string, TemplateLearningRecord>();
let learningDirty = false;

export const MIN_LEARNING_EVIDENCE = 2;
export const FREEZE_EVIDENCE_THRESHOLD = 3;
export const DRIFT_FREEZE_THRESHOLD = 0.4;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function canUseSupabase() {
	return typeof window === "undefined" && Boolean(process.env.SUPABASE_URL) && Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isUuid(value: string) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function hashText(value: string) {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return (hash >>> 0).toString(16).padStart(8, "0");
}

function toStableUuid(value: string) {
	if (isUuid(value)) {
		return value.toLowerCase();
	}

	const seed = [
		hashText(value),
		hashText(`${value}:a`),
		hashText(`${value}:b`),
		hashText(`${value}:c`),
	].join("");
	const chars = seed.slice(0, 32).split("");
	chars[12] = "4";
	chars[16] = ["8", "9", "a", "b"][parseInt(chars[16] ?? "0", 16) % 4];
	const hex = chars.join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function toIsoString(value: number) {
	return new Date(value).toISOString();
}

async function readJsonIfAvailable<T>(response: Response): Promise<T | null> {
	const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
	if (contentType.includes("application/json")) {
		return response.json() as Promise<T>;
	}

	const text = (await response.text()).trim();
	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text) as T;
	} catch {
		return null;
	}
}

function normalizeTeacherActionEvent(event: TeacherActionEvent) {
	return {
		teacher_id: toStableUuid(event.teacherId),
		problem_id: event.problemId,
		action_type: event.actionType,
		old_value: event.oldValue ?? null,
		new_value: event.newValue ?? null,
		context: {
			...event.context,
			originalTeacherId: event.teacherId,
		},
		created_at: toIsoString(event.timestamp),
	};
}

function normalizeTemplateLearningRecord(record: TemplateLearningRecord) {
	return {
		template_id: record.templateId,
		strong_matches: record.strongMatches,
		weak_matches: record.weakMatches,
		teacher_overrides: record.teacherOverrides,
		expected_steps_corrections: record.expectedStepsCorrections,
		drift_score: record.driftScore,
		last_updated: toIsoString(record.lastUpdated),
	};
}

function hydrateTeacherActionEvent(row: Record<string, unknown>): TeacherActionEvent {
	const context = (row.context as (TeacherActionContext & { originalTeacherId?: string }) | undefined) ?? { subject: "unknown" };
	const fallbackTeacherId = typeof row.teacher_id === "string" ? row.teacher_id : "unknown-teacher";
	return {
		eventId: typeof row.id === "string" ? row.id : `event-${Date.now()}`,
		teacherId: typeof context.originalTeacherId === "string" ? context.originalTeacherId : fallbackTeacherId,
		problemId: String(row.problem_id ?? "unknown-problem"),
		timestamp: Date.parse(String(row.created_at ?? new Date().toISOString())),
		actionType: row.action_type as TeacherActionType,
		oldValue: row.old_value,
		newValue: row.new_value,
		context,
	};
}

function hydrateTemplateLearningRecord(row: Record<string, unknown>): TemplateLearningRecord {
	return {
		templateId: String(row.template_id),
		strongMatches: Number(row.strong_matches ?? 0),
		weakMatches: Number(row.weak_matches ?? 0),
		teacherOverrides: Number(row.teacher_overrides ?? 0),
		expectedStepsCorrections: Number(row.expected_steps_corrections ?? 0),
		driftScore: Number(row.drift_score ?? 0),
		lastUpdated: Date.parse(String(row.last_updated ?? new Date().toISOString())),
	};
}

function clamp01(value: number) {
	return Math.min(1, Math.max(0, value));
}

function clampExpectedSteps(value: number) {
	return Math.min(6, Math.max(1, Math.round(value)));
}

function isStepType(value: unknown): value is TemplateStepHints["stepType"] {
	return typeof value === "string" && ["procedural", "conceptual", "interpretive", "mixed", "definition", "code-interpretation"].includes(value);
}

function toExpectedSteps(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) {
		return clampExpectedSteps(1 + clamp01(value) * 5);
	}

	if (value && typeof value === "object") {
		const candidate = value as { expectedSteps?: unknown };
		if (typeof candidate.expectedSteps === "number" && Number.isFinite(candidate.expectedSteps)) {
			return clampExpectedSteps(candidate.expectedSteps);
		}
	}

	return undefined;
}

function toStepType(value: unknown) {
	if (value && typeof value === "object") {
		const candidate = value as { stepType?: unknown };
		if (isStepType(candidate.stepType)) {
			return candidate.stepType;
		}
	}

	return undefined;
}

function confidenceDeltaFor(record: Pick<TemplateLearningRecord, "strongMatches" | "weakMatches" | "teacherOverrides" | "expectedStepsCorrections" | "driftScore" | "evidenceCount">) {
	if ((record.evidenceCount ?? 0) < MIN_LEARNING_EVIDENCE) {
		return 0;
	}

	const support = record.strongMatches * 0.03 + record.weakMatches * 0.015 + record.expectedStepsCorrections * 0.02;
	const correctionPressure = record.teacherOverrides * 0.06 + record.driftScore * 0.08;
	return Math.min(0.08, Math.max(-0.25, support - correctionPressure));
}

function emptyRecord(templateId: string): TemplateLearningRecord {
	return {
		templateId,
		strongMatches: 0,
		weakMatches: 0,
		teacherOverrides: 0,
		expectedStepsCorrections: 0,
		driftScore: 0,
		lastUpdated: Date.now(),
	};
}

function affectedTemplateIds(context: TeacherActionContext) {
	return [...new Set([...(context.templateIds ?? []), ...(context.teacherTemplateIds ?? [])].filter(Boolean))];
}

export async function recordTeacherAction(event: TeacherActionEvent): Promise<void> {
	teacherActionMemory.push(event);
	learningDirty = true;
	if (canUseSupabase()) {
		await supabaseRest("teacher_action_events", {
			method: "POST",
			body: normalizeTeacherActionEvent(event),
			prefer: "return=minimal",
		});
	}
}

export async function saveTeacherActionEvent(event: TeacherActionEvent): Promise<void> {
	await recordTeacherAction(event);
}

export async function listTeacherActions(): Promise<TeacherActionEvent[]> {
	return loadTeacherActionEvents();
}

export async function loadTeacherActionEvents(since?: number | string | Date): Promise<TeacherActionEvent[]> {
	const sinceTimestamp = since instanceof Date
		? since.getTime()
		: typeof since === "string"
			? Date.parse(since)
			: typeof since === "number"
				? since
				: undefined;

	if (canUseSupabase()) {
		const rows = await supabaseRest("teacher_action_events", {
			select: "id,teacher_id,problem_id,action_type,old_value,new_value,context,created_at",
			filters: {
				...(typeof sinceTimestamp === "number" && Number.isFinite(sinceTimestamp)
					? { created_at: `gte.${toIsoString(sinceTimestamp)}` }
					: {}),
				order: "created_at.asc",
			},
		});
		return ((rows as Array<Record<string, unknown>>) ?? []).map(hydrateTeacherActionEvent);
	}

	return teacherActionMemory.filter((event) => (typeof sinceTimestamp === "number" ? event.timestamp >= sinceTimestamp : true));
}

export async function saveTemplateLearningRecord(record: TemplateLearningRecord): Promise<void> {
	learningRecordMemory.set(record.templateId, record);
	if (canUseSupabase()) {
		await supabaseRest("template_learning_records", {
			method: "POST",
			body: normalizeTemplateLearningRecord(record),
			prefer: "resolution=merge-duplicates,return=minimal",
		});
	}
}

export async function loadTemplateLearningRecords(): Promise<TemplateLearningRecord[]> {
	if (typeof window !== "undefined") {
		const response = await fetch("/api/v4/teacher-feedback/learning");
		if (!response.ok) {
			return [];
		}
		const payload = await readJsonIfAvailable<{ records?: TemplateLearningRecord[] }>(response);
		return payload?.records ?? [];
	}

	if (canUseSupabase()) {
		const rows = await supabaseRest("template_learning_records", {
			select: "template_id,strong_matches,weak_matches,teacher_overrides,expected_steps_corrections,drift_score,last_updated",
			filters: { order: "last_updated.desc" },
		});
		return ((rows as Array<Record<string, unknown>>) ?? []).map(hydrateTemplateLearningRecord);
	}

	return [...learningRecordMemory.values()];
}

export async function aggregateTemplateLearning(since = Date.now() - ONE_WEEK_MS): Promise<TemplateLearningRecord[]> {
	const stepSignals = new Map<string, number[]>();
	const stepTypes = new Map<string, TemplateStepHints["stepType"][]>();
	const nextRecords = new Map<string, TemplateLearningRecord>();
	const teacherActions = await loadTeacherActionEvents(since);

	for (const event of teacherActions) {
		const strongIds = new Set(event.context.teacherTemplateIds ?? []);
		const weakIds = new Set(event.context.templateIds ?? []);
		for (const templateId of affectedTemplateIds(event.context)) {
			const current = nextRecords.get(templateId) ?? emptyRecord(templateId);
			if (strongIds.has(templateId)) {
				current.strongMatches += 1;
			}
			if (weakIds.has(templateId)) {
				current.weakMatches += 1;
			}

			switch (event.actionType) {
				case "expected_steps_correction":
					current.expectedStepsCorrections += 1;
					break;
				case "template_override":
				case "difficulty_correction":
				case "representation_correction":
				case "multipart_restructure":
					current.teacherOverrides += 1;
					break;
			}

			const learnedSteps = toExpectedSteps(event.newValue);
			if (event.actionType === "expected_steps_correction" && typeof learnedSteps === "number") {
				const values = stepSignals.get(templateId) ?? [];
				values.push(learnedSteps);
				stepSignals.set(templateId, values);
			}

			const learnedStepType = toStepType(event.newValue);
			if (event.actionType === "expected_steps_correction" && learnedStepType) {
				const values = stepTypes.get(templateId) ?? [];
				values.push(learnedStepType);
				stepTypes.set(templateId, values);
			}

			current.lastUpdated = Math.max(current.lastUpdated, event.timestamp);
			nextRecords.set(templateId, current);
		}
	}

	for (const record of nextRecords.values()) {
		record.evidenceCount = record.strongMatches + record.weakMatches + record.teacherOverrides + record.expectedStepsCorrections;
		record.driftScore = clamp01((record.teacherOverrides + record.expectedStepsCorrections * 0.35) / Math.max(1, record.strongMatches + record.weakMatches));
		record.confidenceDelta = confidenceDeltaFor(record);
		if ((record.evidenceCount ?? 0) >= FREEZE_EVIDENCE_THRESHOLD && record.driftScore >= DRIFT_FREEZE_THRESHOLD) {
			record.frozen = true;
		}

		const learnedSteps = stepSignals.get(record.templateId);
		if (learnedSteps && learnedSteps.length >= MIN_LEARNING_EVIDENCE) {
			record.learnedExpectedSteps = clampExpectedSteps(learnedSteps.reduce((sum, value) => sum + value, 0) / learnedSteps.length);
		}

		const learnedTypes = stepTypes.get(record.templateId);
		if (learnedTypes && learnedTypes.length >= MIN_LEARNING_EVIDENCE) {
			record.learnedStepType = learnedTypes[learnedTypes.length - 1];
		}
	}

	learningRecordMemory.clear();
	for (const record of nextRecords.values()) {
		await saveTemplateLearningRecord(record);
	}
	learningDirty = false;
	return [...learningRecordMemory.values()];
}

export async function loadTemplateLearning(): Promise<TemplateLearningRecord[]> {
	if (typeof window !== "undefined") {
		return loadTemplateLearningRecords();
	}

	if (learningDirty && !canUseSupabase()) {
		return aggregateTemplateLearning();
	}

	const records = await loadTemplateLearningRecords();
	if (records.length > 0 || canUseSupabase()) {
		return records;
	}

	return [...learningRecordMemory.values()];
}

export function applyLearningAdjustments(
	templates: CognitiveTemplate[],
	learningRecords: TemplateLearningRecord[],
): CognitiveTemplate[] {
	if (learningRecords.length === 0) {
		return templates;
	}

	const learningMap = new Map(learningRecords.map((record) => [record.templateId, record]));
	return templates.flatMap((template) => {
		const learning = learningMap.get(template.id);
		if (!learning) {
			return [template];
		}

		const hasLearnedSteps = typeof learning.learnedExpectedSteps === "number";
		const isFrozen = Boolean(learning.frozen);

		const adjusted: CognitiveTemplate = {
			...template,
			learningAdjustment: {
				confidenceDelta: isFrozen ? undefined : learning.confidenceDelta,
				frozen: isFrozen,
				learnedExpectedSteps: learning.learnedExpectedSteps,
				learnedStepType: isStepType(learning.learnedStepType) ? learning.learnedStepType : undefined,
				originalExpectedSteps: template.stepHints?.expectedSteps,
				driftScore: learning.driftScore,
				evidenceCount: learning.evidenceCount,
				status: isFrozen ? "frozen" : (learning.evidenceCount ?? 0) > 0 || hasLearnedSteps || typeof learning.confidenceDelta === "number" ? "learning" : "stable",
			},
		};

		if (!isFrozen && typeof learning.learnedExpectedSteps === "number") {
			adjusted.stepHints = {
				expectedSteps: learning.learnedExpectedSteps,
				stepType: isStepType(learning.learnedStepType)
					? learning.learnedStepType
					: template.stepHints?.stepType ?? "mixed",
			};
		}

		return [adjusted];
	});
}

export function resetLearningState() {
	teacherActionMemory.length = 0;
	learningRecordMemory.clear();
	learningDirty = false;
}
