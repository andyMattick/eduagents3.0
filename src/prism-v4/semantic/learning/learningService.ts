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
export const DRIFT_FREEZE_THRESHOLD = 0.75;

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
}

export async function listTeacherActions(): Promise<TeacherActionEvent[]> {
	return [...teacherActionMemory];
}

export async function aggregateTemplateLearning(): Promise<TemplateLearningRecord[]> {
	const stepSignals = new Map<string, number[]>();
	const stepTypes = new Map<string, TemplateStepHints["stepType"][]>();
	const nextRecords = new Map<string, TemplateLearningRecord>();

	for (const event of teacherActionMemory) {
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
		learningRecordMemory.set(record.templateId, record);
	}
	learningDirty = false;
	return [...learningRecordMemory.values()];
}

export async function loadTemplateLearning(): Promise<TemplateLearningRecord[]> {
	if (learningDirty) {
		return aggregateTemplateLearning();
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

		if (learning.frozen) {
			return [];
		}

		const adjusted: CognitiveTemplate = {
			...template,
			learningAdjustment: {
				confidenceDelta: learning.confidenceDelta,
				frozen: learning.frozen,
				learnedExpectedSteps: learning.learnedExpectedSteps,
				learnedStepType: isStepType(learning.learnedStepType) ? learning.learnedStepType : undefined,
			},
		};

		if (typeof learning.learnedExpectedSteps === "number") {
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
