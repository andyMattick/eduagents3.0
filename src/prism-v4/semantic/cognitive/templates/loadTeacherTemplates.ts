import type { CognitiveProfile } from "../../../schema/semantic";
import type { TeacherDerivedTemplateRecord } from "../../../teacherFeedback";
import type { CognitiveTemplate, TemplatePatternConfig, TemplateStepHints } from "./loadTemplates";
import { loadSeededTemplates } from "./loadTemplates";

const SYSTEM_TEMPLATE_IDS = new Set(loadSeededTemplates().map((template) => template.id));
const BLOOM_KEYS = new Set(["remember", "understand", "apply", "analyze", "evaluate", "create"]);
const STEP_TYPES = new Set(["procedural", "conceptual", "interpretive", "mixed", "definition", "code-interpretation"]);
const STRUCTURAL_PATTERNS = new Set([
	"hasEquation",
	"hasGraph",
	"hasTable",
	"hasDiagram",
	"hasMap",
	"hasTimeline",
	"hasExperiment",
	"hasSourceExcerpt",
	"hasPassage",
	"hasCodeLikeContent",
	"multiRepresentation",
	"constructedResponse",
	"multipart",
]);

export interface TeacherTemplateValidationIssue {
	id?: string;
	reason: string;
}

export interface LoadTeacherTemplatesResult {
	templates: CognitiveTemplate[];
	rejected: TeacherTemplateValidationIssue[];
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function clampRange(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function normalizeBloom(bloom: TeacherDerivedTemplateRecord["bloom"]): Partial<CognitiveProfile["bloom"]> | undefined {
	if (!bloom) {
		return undefined;
	}

	const normalized: Partial<CognitiveProfile["bloom"]> = {};
	for (const [key, value] of Object.entries(bloom)) {
		if (!BLOOM_KEYS.has(key) || !isFiniteNumber(value) || value < 0 || value > 1) {
			return undefined;
		}
		normalized[key as keyof CognitiveProfile["bloom"]] = value;
	}

	return normalized;
}

function normalizePatternConfig(record: TeacherDerivedTemplateRecord): TemplatePatternConfig | undefined {
	const config = record.patternConfig;
	if (!config) {
		const evidenceText = record.evidenceText.trim().toLowerCase();
		if (!evidenceText) {
			return undefined;
		}

		return {
			textPatterns: [evidenceText],
			structuralPatterns: [],
			regexPatterns: [],
			minConfidence: 0.85,
		};
	}

	const textPatterns = Array.isArray(config.textPatterns) ? config.textPatterns.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.toLowerCase()) : [];
	const structuralPatterns = Array.isArray(config.structuralPatterns)
		? config.structuralPatterns.filter((value): value is string => typeof value === "string" && STRUCTURAL_PATTERNS.has(value))
		: [];
	const regexPatterns = Array.isArray(config.regexPatterns) ? config.regexPatterns.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : [];
	const minConfidence = isFiniteNumber(config.minConfidence) ? clampRange(config.minConfidence, 0, 1) : NaN;

	if (!Number.isFinite(minConfidence)) {
		return undefined;
	}

	if (Array.isArray(config.structuralPatterns) && structuralPatterns.length !== config.structuralPatterns.length) {
		return undefined;
	}

	return {
		textPatterns,
		structuralPatterns,
		regexPatterns,
		minConfidence,
	};
}

function normalizeStepHints(stepHints: TeacherDerivedTemplateRecord["stepHints"]): TemplateStepHints | undefined {
	if (!stepHints) {
		return undefined;
	}

	if (!isFiniteNumber(stepHints.expectedSteps)) {
		return undefined;
	}

	if (typeof stepHints.stepType !== "string" || !STEP_TYPES.has(stepHints.stepType)) {
		return undefined;
	}

	return {
		expectedSteps: clampRange(Math.round(stepHints.expectedSteps), 1, 6),
		stepType: stepHints.stepType,
	};
}

function toRuntimeTemplate(record: TeacherDerivedTemplateRecord): CognitiveTemplate | null {
	if (!record.id || typeof record.id !== "string") {
		return null;
	}

	if (SYSTEM_TEMPLATE_IDS.has(record.id)) {
		return null;
	}

	const patternConfig = normalizePatternConfig(record);
	if (!patternConfig) {
		return null;
	}

	const bloom = normalizeBloom(record.bloom);
	if (record.bloom && !bloom) {
		return null;
	}

	const stepHints = normalizeStepHints(record.stepHints);
	if (record.stepHints && !stepHints) {
		return null;
	}

	if (record.patternConfig?.structuralPatterns && patternConfig.structuralPatterns.length !== record.patternConfig.structuralPatterns.length) {
		return null;
	}

	return {
		id: record.id,
		name: record.name ?? `Teacher Template ${record.id}`,
		archetypeKey: record.archetypeKey ?? "teacher-derived",
		description: record.evidenceText,
		patternConfig,
		stepHints,
		bloom: bloom ?? {},
		difficultyBoost: isFiniteNumber(record.difficultyBoost) ? clampRange(record.difficultyBoost, -1, 1) : undefined,
		multiStepBoost: isFiniteNumber(record.multiStepBoost) ? clampRange(record.multiStepBoost, 0, 1) : undefined,
		misconceptionRiskBoost: isFiniteNumber(record.misconceptionRiskBoost) ? clampRange(record.misconceptionRiskBoost, -1, 1) : undefined,
	};
}

export function loadTeacherTemplates(records: TeacherDerivedTemplateRecord[]): LoadTeacherTemplatesResult {
	const templates: CognitiveTemplate[] = [];
	const rejected: TeacherTemplateValidationIssue[] = [];
	const seenIds = new Set<string>();

	for (const record of records) {
		if (seenIds.has(record.id)) {
			rejected.push({ id: record.id, reason: "duplicate teacher template id" });
			continue;
		}

		seenIds.add(record.id);
		const template = toRuntimeTemplate(record);
		if (!template) {
			rejected.push({ id: record.id, reason: "invalid teacher template" });
			continue;
		}

		templates.push(template);
	}

	return { templates, rejected };
}