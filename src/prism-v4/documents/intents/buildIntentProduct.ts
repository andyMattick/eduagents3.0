import { inferDomainMerged } from "./utils/inferDomain";
import { mergeAnalyzedDocuments, mergeCollectionAnalysis, mergeInstructionalUnits } from "./utils/mergeSessionData";
import { cleanupProductPayload, dedupeLines, dedupeParagraphs } from "./cleanupProductPayload";
import type { AnalyzedDocument, DocumentCollectionAnalysis, InstructionalUnit } from "../../schema/semantic";
import type {
	BuiltIntentType,
	CompareDocumentsProduct,
	ConceptExtractionEntry,
	CurriculumAlignmentProduct,
	IntentPayloadByType,
	IntentRequest,
	InstructionalMapProduct,
	LessonSegment,
	LessonProduct,
	MergeDocumentsProduct,
	ProductDocumentSummary,
	ProductSourceAnchor,
	ProblemExtractionEntry,
	ReviewSection,
	SequenceProduct,
	TestItem,
	TestProduct,
	UnitProduct,
} from "../../schema/integration";
import {
	applyAssessmentFingerprintEdits,
	buildAssessmentFingerprint,
	canonicalConceptId,
	classifyBloomLevel,
	classifyItemModes,
	classifyScenarioTypes,
	compareBloomLevels,
	deriveItemCounts,
	getTeacherFingerprint,
	getUnitFingerprint,
	mergeAssessmentIntoTeacherFingerprint,
	mergeAssessmentIntoUnitFingerprint,
	saveAssessmentFingerprint,
	type AssessmentFingerprintEdits,
	type BloomLevel,
	type ConceptProfile,
	type ItemMode,
	type ScenarioDirective,
	type TeacherFingerprint,
	type UnitFingerprint,
} from "../../teacherFeedback";
import type { PrismSessionContext } from "../registryStore";

class IntentBuildError extends Error {
	statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);
		this.statusCode = statusCode;
	}
}

interface BuilderContext<T extends BuiltIntentType> {
	request: IntentRequest & { intentType: T };
	analyzedDocuments: AnalyzedDocument[];
	instructionalUnits: InstructionalUnit[];
	collectionAnalysis: DocumentCollectionAnalysis;
	sourceFileNames: Record<string, string>;
	documentSummaries: ProductDocumentSummary[];
	domain?: string;
	requestedItemCount?: number;
	teacherFingerprint?: TeacherFingerprint | null;
	unitFingerprint?: UnitFingerprint | null;
}

interface InstructionalUnitEntry {
	unit: InstructionalUnit;
	text: string;
	questionTexts: string[];
	documentIds: string[];
	sourceFileNames: string[];
	anchorNodeIds: string[];
	roles: string[];
	contentTypes: string[];
	primaryDocumentId: string;
	primarySourceFileName: string;
	difficultyBand: "low" | "medium" | "high";
}

const SUPPORTED_INTENTS: BuiltIntentType[] = [
	"extract-problems",
	"extract-concepts",
	"summarize",
	"build-review",
	"build-test",
	"compare-documents",
	"merge-documents",
	"build-sequence",
	"build-lesson",
	"build-unit",
	"build-instructional-map",
	"curriculum-alignment",
];

const MULTI_DOCUMENT_INTENTS: BuiltIntentType[] = ["compare-documents", "merge-documents", "build-sequence", "build-unit", "build-instructional-map"];
const SINGLE_DOCUMENT_INTENTS: BuiltIntentType[] = ["build-lesson"];
const DIFFICULTY_SCORE: Record<"low" | "medium" | "high", number> = {
	low: 1,
	medium: 2,
	high: 3,
};
const ITEM_MODE_TO_BLOOM: Record<ItemMode, BloomLevel> = {
	identify: "remember",
	state: "understand",
	interpret: "apply",
	compare: "analyze",
	apply: "apply",
	analyze: "analyze",
	evaluate: "evaluate",
	explain: "understand",
	construct: "create",
};



function joinList(values: string[]) {
	return values.filter(Boolean).join(", ");
}

function unique<T>(values: T[]) {
	return [...new Set(values)];
}

function average(values: number[]) {
	if (values.length === 0) {
		return 0;
	}

	return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function getFocus(options: Record<string, unknown> | undefined) {
	const focus = options?.focus;
	return typeof focus === "string" && focus.trim().length > 0 ? focus.trim() : null;
}

function getPositiveNumberOption(options: Record<string, unknown> | undefined, key: string, fallback: number) {
	const value = options?.[key];
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function getStringOption(options: Record<string, unknown> | undefined, key: string) {
	const value = options?.[key];
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringArray(value: unknown) {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim());
}

function toPositiveIntegerRecord(value: unknown) {
	if (!isRecord(value)) {
		return undefined;
	}
	const normalized: Record<string, number> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (typeof entry !== "number" || !Number.isFinite(entry) || entry <= 0) {
			continue;
		}
		normalized[key] = Math.floor(entry);
	}
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function toStringRecord(value: unknown) {
	if (!isRecord(value)) {
		return undefined;
	}
	const normalized: Record<string, string> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (typeof entry !== "string" || entry.trim().length === 0) {
			continue;
		}
		normalized[key] = entry.trim();
	}
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function toStringArrayRecord(value: unknown) {
	if (!isRecord(value)) {
		return undefined;
	}
	const normalized: Record<string, string[]> = {};
	for (const [key, entry] of Object.entries(value)) {
		const values = toStringArray(entry);
		if (values.length > 0) {
			normalized[key] = values;
		}
	}
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function toBloomDistributionRecord(value: unknown) {
	if (!isRecord(value)) {
		return undefined;
	}
	const normalized: Record<string, Partial<Record<BloomLevel, number>>> = {};
	for (const [conceptId, entry] of Object.entries(value)) {
		if (!isRecord(entry)) {
			continue;
		}
		const distribution: Partial<Record<BloomLevel, number>> = {};
		for (const [level, amount] of Object.entries(entry)) {
			if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
				continue;
			}
			distribution[level as BloomLevel] = amount;
		}
		if (Object.keys(distribution).length > 0) {
			normalized[conceptId] = distribution;
		}
	}
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeConceptInput(value: unknown) {
	if (!Array.isArray(value)) {
		return undefined;
	}
	const concepts = value.flatMap((entry) => {
		if (!isRecord(entry)) {
			return [];
		}
		const displayName = typeof entry.displayName === "string" && entry.displayName.trim().length > 0 ? entry.displayName.trim() : null;
		if (!displayName) {
			return [];
		}
		return [{
			displayName,
			conceptId: typeof entry.conceptId === "string" && entry.conceptId.trim().length > 0 ? entry.conceptId.trim() : undefined,
			absoluteItemHint: typeof entry.absoluteItemHint === "number" && Number.isFinite(entry.absoluteItemHint) && entry.absoluteItemHint > 0 ? Math.floor(entry.absoluteItemHint) : undefined,
			maxBloomLevel: typeof entry.maxBloomLevel === "string" ? entry.maxBloomLevel as BloomLevel : undefined,
			scenarioPatterns: toStringArray(entry.scenarioPatterns) as Array<"real-world" | "simulation" | "data-table" | "graphical" | "abstract-symbolic">,
			scenarioDirective: typeof entry.scenarioDirective === "string" ? entry.scenarioDirective as ScenarioDirective : undefined,
			itemModes: toStringArray(entry.itemModes) as Array<"identify" | "state" | "interpret" | "compare" | "apply" | "analyze" | "evaluate" | "explain" | "construct">,
		}];
	});
	return concepts.length > 0 ? concepts : undefined;
}

function normalizeMergeInput(value: unknown) {
	if (!Array.isArray(value)) {
		return undefined;
	}
	const merges = value.flatMap((entry) => {
		if (!isRecord(entry)) {
			return [];
		}
		const conceptIds = toStringArray(entry.conceptIds);
		const mergedConceptId = typeof entry.mergedConceptId === "string" && entry.mergedConceptId.trim().length > 0 ? entry.mergedConceptId.trim() : null;
		if (!mergedConceptId || conceptIds.length === 0) {
			return [];
		}
		return [{
			conceptIds,
			mergedConceptId,
			displayName: typeof entry.displayName === "string" && entry.displayName.trim().length > 0 ? entry.displayName.trim() : undefined,
		}];
	});
	return merges.length > 0 ? merges : undefined;
}

function normalizeAssessmentFingerprintEdits(value: unknown): AssessmentFingerprintEdits | null {
	if (!isRecord(value)) {
		return null;
	}
	const edits: AssessmentFingerprintEdits = {
		removeConceptIds: toStringArray(value.removeConceptIds),
		addConcepts: normalizeConceptInput(value.addConcepts),
		mergeConcepts: normalizeMergeInput(value.mergeConcepts),
		itemCountOverrides: toPositiveIntegerRecord(value.itemCountOverrides),
		bloomDistributions: toBloomDistributionRecord(value.bloomDistributions),
		bloomCeilings: toStringRecord(value.bloomCeilings) as Record<string, BloomLevel> | undefined,
		bloomLevelAppends: toStringArrayRecord(value.bloomLevelAppends) as Record<string, BloomLevel[]> | undefined,
		scenarioOverrides: toStringArrayRecord(value.scenarioOverrides) as Record<string, Array<"real-world" | "simulation" | "data-table" | "graphical" | "abstract-symbolic">> | undefined,
		scenarioDirectives: toStringRecord(value.scenarioDirectives) as Record<string, ScenarioDirective> | undefined,
		sectionOrder: toStringArray(value.sectionOrder),
		now: typeof value.now === "string" && value.now.trim().length > 0 ? value.now.trim() : undefined,
	};
	return Object.values(edits).some((entry) => entry !== undefined && (!Array.isArray(entry) || entry.length > 0)) ? edits : null;
}

export function normalizeConceptBlueprintInput(raw: unknown) {
	if (!isRecord(raw)) {
		return null;
	}
	const edits = normalizeAssessmentFingerprintEdits(isRecord(raw.edits) ? raw.edits : raw);
	if (!edits) {
		return null;
	}
	const assessmentId = typeof raw.assessmentId === "string" && raw.assessmentId.trim().length > 0 ? raw.assessmentId.trim() : null;
	const teacherId = typeof raw.teacherId === "string" && raw.teacherId.trim().length > 0 ? raw.teacherId.trim() : null;
	const unitId = typeof raw.unitId === "string" && raw.unitId.trim().length > 0 ? raw.unitId.trim() : null;
	return {
		assessmentId,
		teacherId,
		unitId,
		edits,
	};
}

function getConceptBlueprintOption(options: Record<string, unknown> | undefined) {
	const normalized = normalizeConceptBlueprintInput(options?.conceptBlueprint);
	if (options?.conceptBlueprint && !normalized) {
		throw new IntentBuildError(400, "conceptBlueprint must include at least one valid fingerprint edit");
	}
	return normalized;
}

function estimateBlueprintSeedItemCount(options: Record<string, unknown> | undefined, edits: AssessmentFingerprintEdits) {
	const requested = getPositiveNumberOption(options, "itemCount", 5);
	const itemOverrideTotal = Object.values(edits.itemCountOverrides ?? {}).reduce((sum, value) => sum + Math.max(0, value), 0);
	const conceptTargets = [
		edits.sectionOrder?.length ?? 0,
		edits.addConcepts?.length ?? 0,
		Object.keys(edits.bloomDistributions ?? {}).length,
		Object.keys(edits.bloomCeilings ?? {}).length,
		Object.keys(edits.scenarioOverrides ?? {}).length,
	].reduce((max, value) => Math.max(max, value), 0);
	return Math.max(requested, itemOverrideTotal, conceptTargets, 6);
}

function withItemCountOverride<T extends BuiltIntentType>(request: IntentRequest & { intentType: T }, itemCount: number) {
	return {
		...request,
		options: {
			...(request.options ?? {}),
			itemCount,
		},
	};
}

function matchesFocus(textParts: string[], focus: string | null) {
	if (!focus) {
		return true;
	}
	const normalizedFocus = focus.toLowerCase();
	return textParts.some((value) => value.toLowerCase().includes(normalizedFocus));
}

const TEACHER_CONCEPT_LABELS: Record<string, string> = {
	"hypothesis testing": "Hypothesis Testing",
	"p-values & decision rules": "P-Values & Decision Rules",
	"one-sample proportion test": "One-Sample Proportion Test",
	"one-sample mean test": "One-Sample Mean Test",
	"simulation-based inference": "Simulation-Based Inference",
	"parameters & statistics": "Parameters & Statistics",
	"type i and type ii errors": "Type I and Type II Errors",
};

const ASSESSMENT_CLUSTER_ALIASES: Array<{ section: string; order: number; patterns: RegExp[] }> = [
	{ section: "hypothesis testing", order: 1, patterns: [/hypothesis testing/, /p values? decision rules?/, /parameters? statistics?/] },
	{ section: "one-sample proportion test", order: 2, patterns: [/one-sample proportion test/, /sample proportion/, /kissing couples/] },
	{ section: "one-sample mean test", order: 3, patterns: [/one-sample mean test/, /sample mean/, /restaurant income/, /construction zone/] },
	{ section: "simulation-based inference", order: 4, patterns: [/simulation-based inference/, /sampling distribution/, /dotplot/, /simulation/] },
	{ section: "type i and type ii errors", order: 5, patterns: [/type i and type ii errors/, /type i/, /type ii/, /false positive/, /false negative/] },
];

function normalizeTeacherText(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9α\s]+/g, " ").replace(/\s+/g, " ").trim();
}

function hasStatisticsTeacherSignal(textParts: string[]) {
	const combined = normalizeTeacherText(textParts.join(" "));
	return /p value|null hypothesis|alternative hypothesis|sample proportion|sample mean|sampling distribution|dotplot|simulation|type i|type ii|false positive|false negative|decision rule|alpha|α|significance/.test(combined);
}

function inferCanonicalTeacherConcepts(concepts: string[], textParts: string[]) {
	const combined = normalizeTeacherText([...concepts, ...textParts].join(" "));
	const canonical = new Set<string>();
	if (/null hypothesis|alternative hypothesis|hypothesis test|\bh0\b|\bha\b|significance test/.test(combined)) {
		canonical.add("hypothesis testing");
	}
	if (/p value|decision rule|alpha|α|significance level|reject the null|fail to reject/.test(combined)) {
		canonical.add("p-values & decision rules");
	}
	if (/one sample proportion test|sample proportion|kissing couples|coin flip|sample of proportions/.test(combined)) {
		canonical.add("one-sample proportion test");
	}
	if (/one sample mean test|sample mean|restaurant income|construction zone|speed limit|daily income/.test(combined)) {
		canonical.add("one-sample mean test");
	}
	if (/simulation based inference|simulation|sampling distribution|dotplot|repeated sample|proportion of outcomes/.test(combined)) {
		canonical.add("simulation-based inference");
	}
	if (/parameter|statistic/.test(combined)) {
		canonical.add("parameters & statistics");
	}
	if (/type i|type ii|false positive|false negative/.test(combined)) {
		canonical.add("type i and type ii errors");
	}

	const hasStatistics = canonical.size > 0 || hasStatisticsTeacherSignal(textParts);
	const normalizedConcepts = concepts
		.map((concept) => concept.trim().toLowerCase())
		.filter(Boolean)
		.filter((concept) => {
			if (!hasStatistics) {
				return true;
			}
			return !["decimal operations", "rights and responsibilities", "inference"].includes(concept);
		});

	if (hasStatistics && /\binfer|\binference/.test(combined) && /simulation|sampling distribution|dotplot/.test(combined)) {
		canonical.add("simulation-based inference");
	}

	return unique(canonical.size > 0 ? [...canonical] : normalizedConcepts);
}

function clusterAssessmentConcept(concept: string) {
	const normalizedConcept = normalizeTeacherText(concept);
	for (const alias of ASSESSMENT_CLUSTER_ALIASES) {
		if (alias.patterns.some((pattern) => pattern.test(normalizedConcept))) {
			return alias.section;
		}
	}
	return concept;
}

function conceptSortOrder(concept: string) {
	const clustered = clusterAssessmentConcept(concept);
	return ASSESSMENT_CLUSTER_ALIASES.find((entry) => entry.section === clustered)?.order ?? Number.MAX_SAFE_INTEGER;
}

function getPreferredFingerprintProfiles(context: BuilderContext<"build-test">): ConceptProfile[] {
	return context.unitFingerprint?.conceptProfiles?.length
		? context.unitFingerprint.conceptProfiles
		: context.teacherFingerprint?.globalConceptProfiles ?? [];
}

function getFingerprintProfileForConcept(context: BuilderContext<"build-test">, concept: string) {
	const conceptId = canonicalConceptId(concept);
	return getPreferredFingerprintProfiles(context).find((profile) => profile.conceptId === conceptId);
}

function sortAssessmentConceptNames(context: BuilderContext<"build-test">, conceptNames: string[]) {
	const preferredOrder = context.unitFingerprint?.flowProfile.sectionOrder?.length
		? context.unitFingerprint.flowProfile.sectionOrder
		: context.teacherFingerprint?.flowProfile.sectionOrder ?? [];
	const preferredOrderIndex = new Map(preferredOrder.map((conceptId, index) => [conceptId, index]));
	return [...conceptNames].sort((left, right) => {
		const leftIndex = preferredOrderIndex.get(canonicalConceptId(left));
		const rightIndex = preferredOrderIndex.get(canonicalConceptId(right));
		if (leftIndex !== undefined || rightIndex !== undefined) {
			return (leftIndex ?? Number.MAX_SAFE_INTEGER) - (rightIndex ?? Number.MAX_SAFE_INTEGER) || left.localeCompare(right);
		}
		return conceptSortOrder(left) - conceptSortOrder(right) || left.localeCompare(right);
	});
}

function applyFingerprintConstraintsToItems(context: BuilderContext<"build-test">, concept: string, items: TestItem[]) {
	const profile = getFingerprintProfileForConcept(context, concept);
	let constrained = [...items];
	if (profile) {
		const bloomFiltered = constrained.filter((item) => compareBloomLevels(classifyBloomLevel(item.prompt), profile.maxBloomLevel) <= 0);
		if (bloomFiltered.length > 0) {
			constrained = bloomFiltered;
		}
		const scenarioPreferences = profile.scenarioPatterns.length > 0
			? profile.scenarioPatterns
			: context.teacherFingerprint?.defaultScenarioPreferences ?? [];
		if (scenarioPreferences.length > 0) {
			const scenarioFiltered = constrained.filter((item) => classifyScenarioTypes(item.prompt).some((scenario) => scenarioPreferences.includes(scenario)));
			if (scenarioFiltered.length > 0) {
				constrained = scenarioFiltered;
			}
		}
	}
	return constrained;
}

function getFingerprintRequestedConceptCounts(context: BuilderContext<"build-test">, conceptNames: string[], itemCount: number) {
	const preferredProfiles = getPreferredFingerprintProfiles(context)
		.filter((profile) => conceptNames.some((concept) => canonicalConceptId(concept) === profile.conceptId));
	if (preferredProfiles.length === 0) {
		return null;
	}
	const flowProfile = context.unitFingerprint?.flowProfile ?? context.teacherFingerprint?.flowProfile;
	if (!flowProfile) {
		return null;
	}
	const rawCounts = deriveItemCounts({
		concepts: preferredProfiles,
		flowProfile,
	});
	const normalized: Record<string, number> = {};
	const queue = conceptNames.flatMap((concept) => Array.from({ length: Math.max(0, rawCounts[canonicalConceptId(concept)] ?? 0) }, () => concept));
	for (const concept of queue.slice(0, itemCount)) {
		normalized[concept] = (normalized[concept] ?? 0) + 1;
	}
	return normalized;
}

function getFingerprintCognitiveLadder(context: BuilderContext<"build-test">) {
	return context.unitFingerprint?.flowProfile.cognitiveLadderShape?.length
		? context.unitFingerprint.flowProfile.cognitiveLadderShape
		: context.teacherFingerprint?.flowProfile.cognitiveLadderShape ?? [];
}

function getPreferredScenarioPatterns(context: BuilderContext<"build-test">, profile: ConceptProfile) {
	return profile.scenarioPatterns.length > 0
		? profile.scenarioPatterns
		: context.teacherFingerprint?.defaultScenarioPreferences ?? [];
}

function getPreferredItemModes(context: BuilderContext<"build-test">, profile: ConceptProfile) {
	return profile.itemModes.length > 0
		? profile.itemModes
		: context.teacherFingerprint?.defaultItemModes ?? [];
}

function getItemModeBloomLevel(mode: ItemMode) {
	return ITEM_MODE_TO_BLOOM[mode];
}

function deriveRequestedBloomCounts(profile: ConceptProfile, requestedCount: number) {
	const levels = Object.entries(profile.bloomDistribution) as Array<[BloomLevel, number]>;
	const counts = Object.fromEntries(levels.map(([level]) => [level, 0])) as Record<BloomLevel, number>;
	const ranked = levels
		.map(([level, weight]) => ({ level, raw: weight * requestedCount }))
		.sort((left, right) => right.raw - left.raw || compareBloomLevels(right.level, left.level));
	let assigned = 0;
	for (const entry of ranked) {
		const whole = Math.floor(entry.raw);
		counts[entry.level] = whole;
		assigned += whole;
	}
	const remainders = ranked
		.map((entry) => ({ level: entry.level, remainder: entry.raw - Math.floor(entry.raw) }))
		.sort((left, right) => right.remainder - left.remainder || compareBloomLevels(right.level, left.level));
	for (const entry of remainders) {
		if (assigned >= requestedCount) {
			break;
		}
		counts[entry.level] += 1;
		assigned += 1;
	}
	return counts;
}

function buildRequestedBloomSequence(context: BuilderContext<"build-test">, profile: ConceptProfile, requestedCount: number) {
	const requestedBloomCounts = deriveRequestedBloomCounts(profile, requestedCount);
	const ladder = getFingerprintCognitiveLadder(context)
		.filter((level) => compareBloomLevels(level, profile.maxBloomLevel) <= 0);
	const ladderIndex = new Map(ladder.map((level, index) => [level, index]));
	return (Object.keys(requestedBloomCounts) as BloomLevel[])
		.flatMap((level) => Array.from({ length: requestedBloomCounts[level] ?? 0 }, () => level))
		.sort((left, right) => {
			const leftIndex = ladderIndex.get(left);
			const rightIndex = ladderIndex.get(right);
			if (leftIndex !== undefined || rightIndex !== undefined) {
				return (leftIndex ?? Number.MAX_SAFE_INTEGER) - (rightIndex ?? Number.MAX_SAFE_INTEGER) || compareBloomLevels(left, right);
			}
			return compareBloomLevels(left, right);
		});
}

function buildRequestedItemModeSequence(preferredModes: ItemMode[], requestedBloomSequence: BloomLevel[]) {
	if (preferredModes.length === 0) {
		return requestedBloomSequence.map(() => null);
	}
	let nextPreferenceIndex = 0;
	return requestedBloomSequence.map((targetBloom) => {
		const orderedModes = preferredModes.map((_, offset) => preferredModes[(nextPreferenceIndex + offset) % preferredModes.length]!);
		const matchedMode = orderedModes.find((mode) => compareBloomLevels(getItemModeBloomLevel(mode), targetBloom) <= 0) ?? orderedModes[0] ?? null;
		if (!matchedMode) {
			return null;
		}
		nextPreferenceIndex = (preferredModes.indexOf(matchedMode) + 1) % preferredModes.length;
		return matchedMode;
	});
}

function buildRequestedDifficultySequence(requestedBloomSequence: BloomLevel[]) {
	return requestedBloomSequence.map((targetBloom, index) => inferTargetDifficulty(targetBloom, index, requestedBloomSequence.length || 1));
}

function buildFingerprintSequencePlan(context: BuilderContext<"build-test">, profile: ConceptProfile, requestedCount: number) {
	const requestedBloomSequence = buildRequestedBloomSequence(context, profile, requestedCount);
	const effectiveBloomSequence = requestedBloomSequence.length > 0
		? requestedBloomSequence
		: Array.from({ length: requestedCount }, () => profile.maxBloomLevel);
	const preferredModes = getPreferredItemModes(context, profile);
	const preferredScenarios = getPreferredScenarioPatterns(context, profile);
	const requestedModeSequence = buildRequestedItemModeSequence(preferredModes, effectiveBloomSequence);
	const requestedDifficultySequence = buildRequestedDifficultySequence(effectiveBloomSequence);
	return effectiveBloomSequence.map((targetBloom, index) => ({
		targetBloom,
		targetMode: requestedModeSequence[index] ?? null,
		targetDifficulty: requestedDifficultySequence[index] ?? inferTargetDifficulty(targetBloom, index, effectiveBloomSequence.length || requestedCount || 1),
		preferredModes,
		preferredScenarios,
	}));
}

function inferTargetDifficulty(level: BloomLevel, index: number, requestedCount: number): TestItem["difficulty"] {
	const progress = requestedCount <= 1 ? 1 : index / Math.max(1, requestedCount - 1);
	const bloomWeight = Math.max(0, compareBloomLevels(level, "remember")) / 5;
	const composite = (progress + bloomWeight) / 2;
	if (composite >= 0.68) {
		return "high";
	}
	if (composite >= 0.34) {
		return "medium";
	}
	return "low";
}

function shapeSelectedDifficulty(item: TestItem, targetDifficulty: TestItem["difficulty"]) {
	return item.difficulty === targetDifficulty ? item : { ...item, difficulty: targetDifficulty };
}

function modePreferenceRank(preferredModes: ItemMode[], item: TestItem) {
	if (preferredModes.length === 0) {
		return 0;
	}
	const itemModes = classifyItemModes(item.prompt);
	const matchedIndex = preferredModes.reduce<number>((best, mode, index) => {
		return itemModes.includes(mode) ? Math.min(best, index) : best;
	}, Number.MAX_SAFE_INTEGER);
	return matchedIndex === Number.MAX_SAFE_INTEGER ? preferredModes.length + 1 : matchedIndex;
}

function targetModeRank(targetMode: ItemMode | null, item: TestItem) {
	if (!targetMode) {
		return 0;
	}
	return classifyItemModes(item.prompt).includes(targetMode) ? 0 : 1;
}

function scenarioPreferenceRank(preferredScenarios: ReturnType<typeof getPreferredScenarioPatterns>, item: TestItem) {
	if (preferredScenarios.length === 0) {
		return 0;
	}
	const itemScenarios = classifyScenarioTypes(item.prompt);
	const matchedIndex = preferredScenarios.reduce<number>((best, scenario, index) => {
		return itemScenarios.includes(scenario) ? Math.min(best, index) : best;
	}, Number.MAX_SAFE_INTEGER);
	return matchedIndex === Number.MAX_SAFE_INTEGER ? preferredScenarios.length + 1 : matchedIndex;
}

function selectBestFingerprintCandidate(args: {
	remaining: TestItem[];
	targetMode: ItemMode | null;
	preferredModes: ItemMode[];
	preferredScenarios: ReturnType<typeof getPreferredScenarioPatterns>;
	targetBloom: BloomLevel;
	targetDifficulty: TestItem["difficulty"];
}) {
	let bestIndex = -1;
	let bestScore: [number, number, number, number, number, number, string] | null = null;
	for (const [index, item] of args.remaining.entries()) {
		const itemBloom = classifyBloomLevel(item.prompt);
		const score: [number, number, number, number, number, number, string] = [
			Math.abs(compareBloomLevels(itemBloom, args.targetBloom)),
			targetModeRank(args.targetMode, item),
			modePreferenceRank(args.preferredModes, item),
			scenarioPreferenceRank(args.preferredScenarios, item),
			Math.abs(DIFFICULTY_SCORE[item.difficulty] - DIFFICULTY_SCORE[args.targetDifficulty]),
			inferAssessmentPromptStage(item.prompt),
			item.prompt,
		];
		if (!bestScore) {
			bestIndex = index;
			bestScore = score;
			continue;
		}
		for (let scoreIndex = 0; scoreIndex < score.length; scoreIndex += 1) {
			if (score[scoreIndex] === bestScore[scoreIndex]) {
				continue;
			}
			if (score[scoreIndex] < bestScore[scoreIndex]) {
				bestIndex = index;
				bestScore = score;
			}
			break;
		}
	}
	return bestIndex;
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

function applyScenarioDirectiveToPrompt(prompt: string, directive: ScenarioDirective | undefined) {
	if (directive !== "keep-context-change-numbers") {
		return prompt;
	}
	let occurrence = 0;
	const rewritten = prompt.replace(/\d+(?:\.\d+)?%?/g, (match) => {
		const rewritten = rewritePromptNumberLiteral(match, occurrence);
		occurrence += 1;
		return rewritten;
	});
	if (occurrence === 0) {
		return `${prompt} Use alpha = 0.06.`;
	}
	return rewritten;
}

function applyScenarioDirectiveToItem(item: TestItem, directive: ScenarioDirective | undefined): TestItem {
	const prompt = applyScenarioDirectiveToPrompt(item.prompt, directive);
	return prompt === item.prompt ? item : { ...item, prompt };
}

function applyFingerprintDirectiveToItem(context: BuilderContext<"build-test">, concept: string, item: TestItem) {
	const profile = getFingerprintProfileForConcept(context, concept);
	return applyScenarioDirectiveToItem(item, profile?.scenarioDirective);
}

function selectFingerprintItemsForConcept(context: BuilderContext<"build-test">, concept: string, items: TestItem[], requestedCount: number) {
	const profile = getFingerprintProfileForConcept(context, concept);
	if (!profile || requestedCount <= 0) {
		return items.slice(0, requestedCount);
	}
	const remaining = [...items];
	const selected: TestItem[] = [];
	const sequencePlan = buildFingerprintSequencePlan(context, profile, requestedCount);
	for (const slot of sequencePlan) {
		if (remaining.length === 0) {
			break;
		}
		const matchIndex = selectBestFingerprintCandidate({
			remaining,
			targetMode: slot.targetMode,
			preferredModes: slot.preferredModes,
			preferredScenarios: slot.preferredScenarios,
			targetBloom: slot.targetBloom,
			targetDifficulty: slot.targetDifficulty,
		});
		if (matchIndex < 0) {
			break;
		}
		selected.push(applyScenarioDirectiveToItem(shapeSelectedDifficulty(remaining.splice(matchIndex, 1)[0]!, slot.targetDifficulty), profile.scenarioDirective));
	}
	while (selected.length < requestedCount && remaining.length > 0) {
		const slot = sequencePlan[selected.length] ?? {
			targetBloom: profile.maxBloomLevel,
			targetMode: null,
			targetDifficulty: inferTargetDifficulty(profile.maxBloomLevel, selected.length, requestedCount),
			preferredModes: getPreferredItemModes(context, profile),
			preferredScenarios: getPreferredScenarioPatterns(context, profile),
		};
		const matchIndex = selectBestFingerprintCandidate({
			remaining,
			targetMode: slot.targetMode,
			preferredModes: slot.preferredModes,
			preferredScenarios: slot.preferredScenarios,
			targetBloom: slot.targetBloom,
			targetDifficulty: slot.targetDifficulty,
		});
		const next = matchIndex >= 0 ? remaining.splice(matchIndex, 1)[0]! : remaining.shift()!;
		selected.push(applyScenarioDirectiveToItem(shapeSelectedDifficulty(next, slot.targetDifficulty), profile.scenarioDirective));
	}
	return selected;
}

function inferAssessmentPromptStage(prompt: string) {
	const normalized = normalizeTeacherText(prompt);
	if (/parameter|statistic/.test(normalized)) {
		return 1;
	}
	if (/null hypothesis|alternative hypothesis|h0|ha/.test(normalized)) {
		return 2;
	}
	if (/p value|sampling distribution|dotplot|simulation/.test(normalized)) {
		return 3;
	}
	if (/decision rule|alpha|α|reject the null|fail to reject/.test(normalized)) {
		return 4;
	}
	if (/type i|type ii|false positive|false negative/.test(normalized)) {
		return 5;
	}
	if (/consequence|impact|evaluate|justify|why it matters/.test(normalized)) {
		return 6;
	}
	return 99;
}

function assessmentSemanticPromptKey(concept: string, prompt: string) {
	const clustered = clusterAssessmentConcept(concept);
	if (conceptSortOrder(clustered) !== Number.MAX_SAFE_INTEGER) {
		return `${clustered}:${inferAssessmentPromptStage(prompt)}`;
	}
	return normalizeTeacherText(prompt);
}

function getStructuredAssessmentContextLabel(concept: string) {
	const clustered = clusterAssessmentConcept(concept);
	if (clustered === "hypothesis testing") {
		return "this hypothesis test";
	}
	if (clustered === "one-sample proportion test") {
		return "this one-sample proportion study";
	}
	if (clustered === "one-sample mean test") {
		return "this one-sample mean study";
	}
	if (clustered === "simulation-based inference") {
		return "this simulation study";
	}
	if (clustered === "type i and type ii errors") {
		return "this statistical decision";
	}
	return "this scenario";
}

function teacherFacingConceptLabel(value: string) {
	if (TEACHER_CONCEPT_LABELS[value]) {
		return TEACHER_CONCEPT_LABELS[value];
	}
	return value
		.replace(/[._-]+/g, " ")
		.split(/\s+/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(" ");
}

function inferFallbackConceptForDomain(domain: string | undefined, focus: string | null) {
	if (focus) {
		return focus;
	}
	if (domain === "Mathematics") {
		return "problem solving";
	}
	if (domain === "Life Science") {
		return "ecosystems";
	}
	if (domain === "Social Studies") {
		return "historical understanding";
	}
	if (domain === "ELA") {
		return "reading comprehension";
	}
	return "general understanding";
}

function buildFallbackPrompt(domain: string | undefined, concept: string, index: number) {
	const normalizedConcept = concept.toLowerCase();
	if (conceptSortOrder(concept) !== Number.MAX_SAFE_INTEGER) {
		const statsPrompts: Record<string, string[]> = {
			"hypothesis testing": [
				"A class study compares a sample result to a claim. Identify the parameter and statistic in the hypothesis test.",
				"State the null hypothesis and alternative hypothesis for the class study.",
				"Use the p-value from the class study to explain what the evidence suggests.",
				"Make a decision at alpha = 0.05 and justify it in context.",
				"Explain one consequence of making the wrong decision in this hypothesis test.",
			],
			"one-sample proportion test": [
				"A survey of kissing couples is used to test a claim about a population proportion. Identify the parameter and the sample statistic.",
				"Write hypotheses for the one-sample proportion test about the kissing couples scenario.",
				"Interpret the p-value for the kissing couples proportion test.",
				"Decide whether the evidence supports the claim at alpha = 0.05.",
			],
			"one-sample mean test": [
				"A restaurant income study compares a sample mean to a claimed average. Identify the parameter and sample statistic.",
				"State the null and alternative hypotheses for the restaurant income claim.",
				"Interpret the p-value for the restaurant income test.",
				"Make and justify the decision for the restaurant income scenario at alpha = 0.05.",
			],
			"simulation-based inference": [
				"A dotplot of repeated samples is shown. Describe what the simulation is estimating.",
				"Use the sampling distribution to interpret how unusual the observed result is.",
				"Explain how simulation-based inference supports a decision about the claim.",
			],
			"type i and type ii errors": [
				"Describe a Type I error in the context of a significance test.",
				"Describe a Type II error in the same context.",
				"Explain which error would be more serious in this scenario and why.",
			],
		};
		const prompts = statsPrompts[clusterAssessmentConcept(concept)];
		if (prompts?.length) {
			return prompts[index % prompts.length]!;
		}
	}
	if (domain === "Life Science") {
		return [
			`Explain ${normalizedConcept} and give a concrete example from science.`,
			`Describe how ${normalizedConcept} works in a real-world life science example.`,
			`Use evidence from class learning to explain why ${normalizedConcept} matters.`,
		][index % 3]!;
	}
	if (domain === "Mathematics") {
		return [
			`Create and solve a problem that uses ${normalizedConcept}. Show your reasoning.`,
			`Explain how you would represent ${normalizedConcept} using words, numbers, or a model.`,
			`Compare two examples involving ${normalizedConcept} and justify your thinking.`,
		][index % 3]!;
	}
	if (domain === "Social Studies") {
		return [
			`Describe an example of ${normalizedConcept} and explain why it is important.`,
			`Explain how ${normalizedConcept} connects to people, events, or decisions in history or civics.`,
			`Use a specific example to show why ${normalizedConcept} matters in social studies.`,
		][index % 3]!;
	}
	if (domain === "ELA") {
		return [
			`Write a short response that demonstrates your understanding of ${normalizedConcept}.`,
			`Explain ${normalizedConcept} using evidence from a text or passage you have studied.`,
			`Describe how a reader can show strong understanding of ${normalizedConcept}.`,
		][index % 3]!;
	}
	return [
		`Explain ${normalizedConcept} in your own words.`,
		`Describe what ${normalizedConcept} means and give one clear example.`,
		`Show your understanding of ${normalizedConcept} with a brief explanation.`,
	][index % 3]!;
}

function buildFallbackTestSections(context: BuilderContext<"build-test">, focus: string | null, itemCount: number, conceptNames: string[] = []) {
	const concepts = unique((conceptNames.length > 0 ? conceptNames : [inferFallbackConceptForDomain(context.domain, focus)]).map((concept) => concept.trim()).filter(Boolean));
	const sourceDocumentId = context.analyzedDocuments[0]?.document.id ?? "unknown-document";
	const sourceFileName = context.sourceFileNames[sourceDocumentId] ?? context.analyzedDocuments[0]?.document.sourceFileName ?? "Unknown source";
	const items: TestItem[] = [];
	const seenPrompts = new Set<string>();

	for (let index = 0; index < itemCount; index += 1) {
		const concept = concepts[index % concepts.length] ?? inferFallbackConceptForDomain(context.domain, focus);
		const prompt = buildFallbackPrompt(context.domain, concept, index);
		if (seenPrompts.has(prompt)) {
			continue;
		}
		seenPrompts.add(prompt);
		items.push({
			itemId: `fallback-${sourceDocumentId}-${index + 1}`,
			prompt,
			concept,
			sourceDocumentId,
			sourceFileName,
			difficulty: "medium",
			cognitiveDemand: context.domain === "Mathematics" ? "procedural" : "conceptual",
			answerGuidance: `Look for accurate reasoning about ${teacherFacingConceptLabel(concept)} and a concrete supporting example.`,
		});
	}

	const grouped = new Map<string, TestItem[]>();
	for (const item of items) {
		const bucket = grouped.get(item.concept) ?? [];
		bucket.push(item);
		grouped.set(item.concept, bucket);
	}

	return [...grouped.entries()]
		.map(([concept, groupedItems]) => ({
			concept,
			sourceDocumentIds: unique(groupedItems.map((item) => item.sourceDocumentId)),
			items: groupedItems,
		}))
		.sort((left, right) => left.concept.localeCompare(right.concept));
}

function buildDocumentSummaries(analyzedDocuments: AnalyzedDocument[], sourceFileNames: Record<string, string>, unitEntries: InstructionalUnitEntry[] = []): ProductDocumentSummary[] {
	const effectiveDocumentConceptMap = buildEffectiveDocumentConceptMap({ analyzedDocuments, sourceFileNames }, unitEntries);
	return analyzedDocuments.map((analyzed) => ({
		documentId: analyzed.document.id,
		sourceFileName: sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
		problemCount: analyzed.problems.length,
		concepts: effectiveDocumentConceptMap.get(analyzed.document.id) ?? analyzed.insights.concepts,
		instructionalProfile: {
			exampleCount: analyzed.insights.exampleCount,
			explanationCount: analyzed.insights.explanationCount,
			instructionalDensity: analyzed.insights.instructionalDensity,
		},
	}));
}

function getFragmentText(analyzed: AnalyzedDocument, fragment: AnalyzedDocument["fragments"][number]) {
	return fragment.anchors
		.map((anchor) => analyzed.document.nodes.find((node) => node.id === anchor.nodeId)?.text?.trim() ?? "")
		.filter(Boolean)
		.join(" ")
		.trim();
}

function toDifficultyBand(value: number): "low" | "medium" | "high" {
	if (value >= 0.67) {
		return "high";
	}
	if (value >= 0.4) {
		return "medium";
	}
	return "low";
}

function collectInstructionalUnitEntries(units: InstructionalUnit[], analyzedDocuments: AnalyzedDocument[], sourceFileNames: Record<string, string>): InstructionalUnitEntry[] {
	const analyzedById = new Map(analyzedDocuments.map((analyzed) => [analyzed.document.id, analyzed]));

	return units.map((unit) => {
		const orderedFragments = [...unit.fragments].sort((left, right) => left.id.localeCompare(right.id));
		const fragmentTexts = orderedFragments.map((fragment) => {
			const analyzed = analyzedById.get(fragment.documentId);
			return analyzed ? getFragmentText(analyzed, fragment) : "";
		}).filter(Boolean);
		const text = unique(orderedFragments.map((fragment) => {
			const analyzed = analyzedById.get(fragment.documentId);
			return analyzed ? getFragmentText(analyzed, fragment) : "";
		}).filter(Boolean)).join(" ").trim();
		const questionTexts = unique(orderedFragments
			.filter((fragment) => fragment.contentType === "question")
			.map((fragment) => {
				const analyzed = analyzedById.get(fragment.documentId);
				return analyzed ? getFragmentText(analyzed, fragment) : "";
			})
			.filter(Boolean));
		const documentIds = unique(orderedFragments.map((fragment) => fragment.documentId));
		const derivedSourceFileNames = documentIds.map((documentId) => sourceFileNames[documentId] ?? analyzedById.get(documentId)?.document.sourceFileName ?? documentId);
		return {
			unit,
			text: text || fragmentTexts.join(" ").trim() || unit.title || joinList(unit.learningTargets) || joinList(unit.concepts),
			questionTexts,
			documentIds,
			sourceFileNames: unique(derivedSourceFileNames),
			anchorNodeIds: unique(orderedFragments.flatMap((fragment) => fragment.anchors.map((anchor) => anchor.nodeId))),
			roles: unique(orderedFragments.map((fragment) => fragment.instructionalRole)),
			contentTypes: unique(orderedFragments.map((fragment) => fragment.contentType)),
			primaryDocumentId: documentIds[0] ?? "unknown-document",
			primarySourceFileName: derivedSourceFileNames[0] ?? "Unknown source",
			difficultyBand: toDifficultyBand(unit.difficulty),
		};
	});
}

function buildEffectiveDocumentConceptMap(context: { analyzedDocuments: AnalyzedDocument[]; sourceFileNames: Record<string, string> }, unitEntries: InstructionalUnitEntry[]) {
	const byDocument = new Map<string, string[]>();

	for (const analyzed of context.analyzedDocuments) {
		const unitConcepts = unique(unitEntries
			.filter((entry) => entry.documentIds.includes(analyzed.document.id))
			.flatMap((entry) => entry.unit.concepts));
		byDocument.set(analyzed.document.id, unitConcepts.length > 0 ? unitConcepts : analyzed.insights.concepts);
	}

	return byDocument;
}

function buildEffectiveConceptToDocumentMap(context: { analyzedDocuments: AnalyzedDocument[] }, unitEntries: InstructionalUnitEntry[], collectionAnalysis: DocumentCollectionAnalysis) {
	const conceptToDocumentMap = new Map<string, string[]>();

	for (const entry of unitEntries) {
		for (const concept of entry.unit.concepts) {
			conceptToDocumentMap.set(concept, unique([...(conceptToDocumentMap.get(concept) ?? []), ...entry.documentIds]));
		}
	}

	if (conceptToDocumentMap.size > 0) {
		return Object.fromEntries([...conceptToDocumentMap.entries()].sort((left, right) => left[0].localeCompare(right[0])));
	}

	if (Object.keys(collectionAnalysis.conceptToDocumentMap).length > 0) {
		return collectionAnalysis.conceptToDocumentMap;
	}

	const fallback = new Map<string, string[]>();
	for (const analyzed of context.analyzedDocuments) {
		for (const concept of analyzed.insights.concepts) {
			fallback.set(concept, unique([...(fallback.get(concept) ?? []), analyzed.document.id]));
		}
	}

	return Object.fromEntries([...fallback.entries()].sort((left, right) => left[0].localeCompare(right[0])));
}

function toStandardId(concept: string) {
	return `STD-${concept.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "GENERAL"}`;
}

function buildGraphEdgesFromBuckets(buckets: Array<{ node: string; documentIds: string[] }>) {
	const edges: Array<{ from: string; to: string; weight: number; sharedDocumentIds: string[] }> = [];
	for (let index = 0; index < buckets.length; index += 1) {
		for (let offset = index + 1; offset < buckets.length; offset += 1) {
			const left = buckets[index]!;
			const right = buckets[offset]!;
			const sharedDocumentIds = left.documentIds.filter((documentId) => right.documentIds.includes(documentId));
			if (sharedDocumentIds.length === 0) {
				continue;
			}
			edges.push({
				from: left.node,
				to: right.node,
				weight: sharedDocumentIds.length,
				sharedDocumentIds,
			});
		}
	}
	return edges;
}

function buildConceptBuckets(context: BuilderContext<"build-instructional-map">, unitEntries: InstructionalUnitEntry[], focus: string | null) {
	const unitBuckets = unique(unitEntries.flatMap((entry) => entry.unit.concepts))
		.filter((concept) => matchesFocus([concept], focus))
		.map((concept) => ({
			node: concept,
			documentIds: unique(unitEntries.filter((entry) => entry.unit.concepts.includes(concept)).flatMap((entry) => entry.documentIds)),
		}));
	if (unitBuckets.length > 0) {
		return unitBuckets;
	}

	const collectionBuckets = Object.entries(context.collectionAnalysis.conceptToDocumentMap)
		.filter(([concept]) => matchesFocus([concept], focus))
		.map(([concept, documentIds]) => ({ node: concept, documentIds }));
	if (collectionBuckets.length > 0) {
		return collectionBuckets;
	}

	return unique(context.analyzedDocuments.flatMap((analyzed) => analyzed.insights.concepts))
		.filter((concept) => matchesFocus([concept], focus))
		.map((concept) => ({
			node: concept,
			documentIds: context.analyzedDocuments
				.filter((analyzed) => analyzed.insights.concepts.includes(concept))
				.map((analyzed) => analyzed.document.id),
		}));
}

function collectSourceAnchors(analyzedDocuments: AnalyzedDocument[]): ProductSourceAnchor[] {
	return analyzedDocuments.map((analyzed) => ({
		documentId: analyzed.document.id,
		anchorNodeIds: unique([
			...analyzed.problems.flatMap((problem) => problem.anchors.map((anchor) => anchor.nodeId)),
			...analyzed.fragments.flatMap((fragment) => fragment.anchors.map((anchor) => anchor.nodeId)),
		]).sort(),
	}));
}

function dominantDifficulty(analyzed: AnalyzedDocument) {
	return (["high", "medium", "low"] as const).reduce((winner, candidate) => {
		if (analyzed.insights.difficultyDistribution[candidate] > analyzed.insights.difficultyDistribution[winner]) {
			return candidate;
		}
		return winner;
	}, "low");
}

function buildProblemEntries(context: { analyzedDocuments: AnalyzedDocument[]; sourceFileNames: Record<string, string> }, focus: string | null) {
	return context.analyzedDocuments.flatMap<ProblemExtractionEntry>((analyzed) =>
		analyzed.problems
			.filter((problem) => matchesFocus([problem.text, ...problem.concepts, ...problem.representations], focus))
			.map((problem) => ({
				problemId: problem.id,
				documentId: problem.documentId,
				sourceFileName: context.sourceFileNames[problem.documentId] ?? analyzed.document.sourceFileName,
				text: problem.text,
				concepts: problem.concepts,
				representations: problem.representations,
				difficulty: problem.difficulty,
				cognitiveDemand: problem.cognitiveDemand,
				misconceptions: problem.misconceptions,
				anchorNodeIds: problem.anchors.map((anchor) => anchor.nodeId),
			})),
	);
}

function buildConceptEntries(context: { analyzedDocuments: AnalyzedDocument[]; sourceFileNames: Record<string, string>; instructionalUnits?: InstructionalUnit[] }, focus: string | null) {
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits ?? [], context.analyzedDocuments, context.sourceFileNames);
	const concepts = new Map<string, ConceptExtractionEntry>();

	for (const entry of unitEntries) {
		for (const concept of inferCanonicalTeacherConcepts(entry.unit.concepts, [entry.text, ...entry.questionTexts, ...entry.unit.learningTargets])) {
			if (!matchesFocus([concept], focus)) {
				continue;
			}

			const existing = concepts.get(concept);
			concepts.set(concept, {
				concept,
				frequency: (existing?.frequency ?? 0) + entry.documentIds.length,
				documentIds: unique([...(existing?.documentIds ?? []), ...entry.documentIds]),
				sourceFileNames: unique([...(existing?.sourceFileNames ?? []), ...entry.sourceFileNames]),
				representations: unique([...(existing?.representations ?? []), ...entry.contentTypes]),
				difficulties: unique([...(existing?.difficulties ?? []), entry.difficultyBand]),
				sampleProblemTexts: unique([...(existing?.sampleProblemTexts ?? []), ...entry.questionTexts, entry.text]).filter(Boolean).slice(0, 3),
			});
		}
	}

	if (concepts.size > 0) {
		return [...concepts.values()].sort((left, right) => right.frequency - left.frequency || conceptSortOrder(left.concept) - conceptSortOrder(right.concept) || left.concept.localeCompare(right.concept));
	}

	for (const analyzed of context.analyzedDocuments) {
		const documentTexts = analyzed.document.nodes
			.map((node) => node.text)
			.filter((text): text is string => typeof text === "string" && text.trim().length > 0);
		const canonicalProblemConcepts = analyzed.problems.map((problem) => ({
			problem,
			concepts: inferCanonicalTeacherConcepts(problem.concepts, [problem.text]),
		}));
		const canonicalDocumentConcepts = unique([
			...analyzed.insights.concepts
				.filter((concept): concept is string => typeof concept === "string" && concept.trim().length > 0)
				.flatMap((concept) => inferCanonicalTeacherConcepts([concept], documentTexts)),
			...canonicalProblemConcepts.flatMap((entry) => entry.concepts),
		]);
		for (const concept of canonicalDocumentConcepts) {
			if (!matchesFocus([concept], focus)) {
				continue;
			}

			const matchingProblems = canonicalProblemConcepts.filter((entry) => entry.concepts.includes(concept)).map((entry) => entry.problem);
			const existing = concepts.get(concept);
			concepts.set(concept, {
				concept,
				frequency: (existing?.frequency ?? 0) + Math.max(
					matchingProblems.length,
					analyzed.insights.concepts
						.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
						.filter((entry) => inferCanonicalTeacherConcepts([entry], documentTexts).includes(concept)).length,
					1,
				),
				documentIds: unique([...(existing?.documentIds ?? []), analyzed.document.id]),
				sourceFileNames: unique([...(existing?.sourceFileNames ?? []), context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName]),
				representations: unique([...(existing?.representations ?? []), ...matchingProblems.flatMap((problem) => problem.representations)]),
				difficulties: unique([...(existing?.difficulties ?? []), ...matchingProblems.map((problem) => problem.difficulty)]),
				sampleProblemTexts: unique([...(existing?.sampleProblemTexts ?? []), ...matchingProblems.map((problem) => problem.text)]).slice(0, 3),
			});
		}
	}

	return [...concepts.values()].sort((left, right) => right.frequency - left.frequency || conceptSortOrder(left.concept) - conceptSortOrder(right.concept) || left.concept.localeCompare(right.concept));
}

function buildExtractProblemsProduct(context: BuilderContext<"extract-problems">): IntentPayloadByType["extract-problems"] {
	const focus = getFocus(context.request.options);
	const maxItems = getPositiveNumberOption(context.request.options, "maxItems", Number.MAX_SAFE_INTEGER);
	const problems = buildProblemEntries(context, focus).slice(0, maxItems);

	return {
		kind: "problem-extraction",
		focus,
		domain: context.domain,
		totalProblemCount: problems.length,
		documents: context.documentSummaries,
		problems,
		generatedAt: new Date().toISOString(),
	};
}

function buildExtractConceptsProduct(context: BuilderContext<"extract-concepts">): IntentPayloadByType["extract-concepts"] {
	const focus = getFocus(context.request.options);
	const maxConcepts = getPositiveNumberOption(context.request.options, "maxConcepts", Number.MAX_SAFE_INTEGER);
	const concepts = buildConceptEntries(context, focus).slice(0, maxConcepts);
	const effectiveConceptToDocumentMap = buildEffectiveConceptToDocumentMap(context, collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames), context.collectionAnalysis);

	return {
		kind: "concept-extraction",
		focus,
		domain: context.domain,
		totalConceptCount: concepts.length,
		coverageSummary: {
			totalConcepts: Object.keys(effectiveConceptToDocumentMap).length,
			conceptGaps: focus
				? context.collectionAnalysis.conceptGaps.filter((concept) => concept.toLowerCase().includes(focus.toLowerCase()))
				: context.collectionAnalysis.conceptGaps,
			docsPerConcept: Object.fromEntries(Object.entries(effectiveConceptToDocumentMap).map(([concept, documentIds]) => [concept, documentIds.length])),
		},
		concepts,
		generatedAt: new Date().toISOString(),
	};
}

function buildSummaryProduct(context: BuilderContext<"summarize">): IntentPayloadByType["summarize"] {
	const focus = getFocus(context.request.options);
	const conceptEntries = buildConceptEntries(context, focus);
	const topConcepts = conceptEntries.slice(0, 3).map((entry) => entry.concept);
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);
	const effectiveDocumentConceptMap = buildEffectiveDocumentConceptMap(context, unitEntries);

	return {
		kind: "summary",
		focus,
		domain: context.domain,
		overallSummary: topConcepts.length > 0
			? `Selected documents emphasize ${joinList(topConcepts)} and contain ${context.analyzedDocuments.reduce((sum, analyzed) => sum + analyzed.problems.length, 0)} extracted problems across the session.`
			: "Selected documents have been analyzed, but there is not enough problem structure yet to produce a concept-led summary.",
		documents: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			summary:
				analyzed.problems.length > 0
					? `${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName} covers ${joinList((effectiveDocumentConceptMap.get(analyzed.document.id) ?? analyzed.insights.concepts).slice(0, 3)) || "the uploaded material"} through ${analyzed.problems.length} extracted problems.`
					: `${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName} is mainly explanatory material with ${analyzed.insights.exampleCount} examples and ${analyzed.insights.explanationCount} explanations.`,
			keyConcepts: effectiveDocumentConceptMap.get(analyzed.document.id) ?? analyzed.insights.concepts,
			problemCount: analyzed.problems.length,
			instructionalProfile: {
				exampleCount: analyzed.insights.exampleCount,
				explanationCount: analyzed.insights.explanationCount,
				questionCount: unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id) && entry.contentTypes.includes("question")).length,
			},
		})),
		crossDocumentTakeaways: [
			`${context.analyzedDocuments.length} document${context.analyzedDocuments.length === 1 ? "" : "s"} contribute to this summary.`,
			topConcepts.length > 0 ? `Most visible concepts: ${joinList(topConcepts)}.` : "No strong concept signal was extracted yet.",
			context.collectionAnalysis.conceptGaps.length > 0 ? `Concept gaps remain around ${joinList(context.collectionAnalysis.conceptGaps.slice(0, 3))}.` : "Core concepts are broadly reinforced across the selected documents.",
		],
		generatedAt: new Date().toISOString(),
	};
}

function buildReviewSections(context: BuilderContext<"build-review">, focus: string | null, maxSections: number) {
	const conceptEntries = buildConceptEntries(context, focus).slice(0, maxSections);
	const problemEntries = buildProblemEntries(context, focus);

	return conceptEntries.map<ReviewSection>((entry) => {
		const practicePrompts = problemEntries
			.filter((problem) => problem.concepts.includes(entry.concept))
			.slice(0, 2)
			.map((problem) => problem.text);
		const coverage = context.collectionAnalysis.coverageSummary.docsPerConcept[entry.concept] ?? entry.documentIds.length;
		const priority = coverage < context.request.documentIds.length ? "core" : entry.frequency > 1 ? "reinforce" : "extension";

		return {
			concept: entry.concept,
			priority,
			sourceDocumentIds: entry.documentIds,
			rationale: coverage < context.request.documentIds.length
				? `${entry.concept} appears unevenly across the selected documents and should be explicitly bridged.`
				: `${entry.concept} is repeated enough to support spaced review and quick checks for retention.`,
			reviewPoints: [
				`Revisit ${entry.concept} through ${joinList(entry.representations) || "text-based explanations"}.`,
				`Connect examples from ${joinList(entry.sourceFileNames)} before moving to independent work.`,
			],
			practicePrompts: practicePrompts.length > 0 ? practicePrompts : [`Explain the key idea behind ${entry.concept} in your own words.`],
		};
	});
}

function buildReviewProduct(context: BuilderContext<"build-review">): IntentPayloadByType["build-review"] {
	const focus = getFocus(context.request.options);
	const maxSections = getPositiveNumberOption(context.request.options, "maxSections", 3);
	const sections = buildReviewSections(context, focus, maxSections);
	const conceptLabels = sections.map((section) => section.concept);

	return {
		kind: "review",
		focus,
		domain: context.domain,
		title: conceptLabels.length > 0 ? `Review Pack: ${joinList(conceptLabels.slice(0, 3))}` : "Review Pack",
		overview: sections.length > 0
			? `This review plan targets ${sections.length} concept areas using the analyzed source documents, with emphasis on concepts that need reinforcement across the set.`
			: "There was not enough concept evidence to assemble a structured review plan.",
		sections,
		generatedAt: new Date().toISOString(),
	};
}

function inferUnitCognitiveDemand(entry: InstructionalUnitEntry): TestItem["cognitiveDemand"] {
	if (entry.roles.includes("reflection")) {
		return "analysis";
	}
	if (entry.roles.includes("objective") || entry.roles.includes("explanation")) {
		return "conceptual";
	}
	if (entry.contentTypes.includes("diagram") || entry.contentTypes.includes("graph") || entry.contentTypes.includes("table")) {
		return "modeling";
	}
	if (entry.roles.includes("problem-stem") || entry.roles.includes("problem-part")) {
		return entry.difficultyBand === "high" ? "analysis" : "procedural";
	}
	return entry.difficultyBand === "high" ? "conceptual" : "procedural";
}

function prioritizeAssessmentUnits(entries: InstructionalUnitEntry[]) {
	return [...entries].sort((left, right) => {
		const leftQuestionLike = left.questionTexts.length > 0 || left.contentTypes.includes("question") || left.roles.includes("problem-stem") || left.roles.includes("problem-part");
		const rightQuestionLike = right.questionTexts.length > 0 || right.contentTypes.includes("question") || right.roles.includes("problem-stem") || right.roles.includes("problem-part");
		if (leftQuestionLike !== rightQuestionLike) {
			return leftQuestionLike ? -1 : 1;
		}
		return left.unit.unitId.localeCompare(right.unit.unitId);
	});
}

function buildAssessmentPrompts(entry: InstructionalUnitEntry, concept: string) {
	const prompts = entry.questionTexts.length > 0
		? entry.questionTexts
		: [entry.text || entry.unit.title || `Explain ${concept}.`];
	if (conceptSortOrder(concept) !== Number.MAX_SAFE_INTEGER && prompts.length === 1) {
		const contextLabel = getStructuredAssessmentContextLabel(concept);
		const scaffoldedPrompts: Record<string, string[]> = {
			"hypothesis testing": [
				`Identify the parameter and statistic in ${contextLabel}.`,
				`State the null hypothesis and alternative hypothesis for ${contextLabel}.`,
				`Interpret the p-value in ${contextLabel}.`,
				`Make the decision at alpha = 0.05 for ${contextLabel} and justify it.`,
			],
			"one-sample proportion test": [
				`Identify the population proportion and sample statistic in ${contextLabel}.`,
				`Write hypotheses for the one-sample proportion test in ${contextLabel}.`,
				`Interpret the p-value for ${contextLabel}.`,
				`Decide whether the evidence supports the claim at alpha = 0.05 in ${contextLabel}.`,
			],
			"one-sample mean test": [
				`Identify the population mean and sample statistic in ${contextLabel}.`,
				`Write hypotheses for the one-sample mean test in ${contextLabel}.`,
				`Interpret the p-value for ${contextLabel}.`,
				`Decide whether the evidence supports the claim at alpha = 0.05 in ${contextLabel}.`,
			],
			"simulation-based inference": [
				`Describe what the simulation is estimating in ${contextLabel}.`,
				`Use the dotplot or sampling distribution to interpret the result in ${contextLabel}.`,
				`Explain how the simulation supports a decision in ${contextLabel}.`,
			],
			"type i and type ii errors": [
				`Describe a Type I error in ${contextLabel}.`,
				`Describe a Type II error in ${contextLabel}.`,
				`Explain which error would matter more in ${contextLabel} and why.`,
			],
		};
		const generated = scaffoldedPrompts[clusterAssessmentConcept(concept)];
		if (generated?.length) {
			return generated;
		}
	}
	const ranked = unique(prompts.filter(Boolean))
		.map((prompt) => ({
			prompt,
			stage: inferAssessmentPromptStage(prompt),
			semanticKey: assessmentSemanticPromptKey(concept, prompt),
		}))
		.sort((left, right) => left.stage - right.stage || left.prompt.localeCompare(right.prompt));
	const seen = new Set<string>();
	return ranked.filter((entry) => {
		if (seen.has(entry.semanticKey)) {
			return false;
		}
		seen.add(entry.semanticKey);
		return true;
	}).map((entry) => entry.prompt);
}

function buildProblemBackedAssessmentEntries(context: BuilderContext<"build-test">, focus: string | null): InstructionalUnitEntry[] {
	return buildProblemEntries(context, focus).map((problem) => ({
		unit: {
			unitId: `problem-unit-${problem.problemId}`,
			fragments: [],
			concepts: inferCanonicalTeacherConcepts(problem.concepts, [problem.text]),
			skills: [problem.cognitiveDemand, "problem-stem", "question"],
			learningTargets: [],
			misconceptions: problem.misconceptions,
			difficulty: problem.difficulty === "high" ? 1 : problem.difficulty === "medium" ? 0.5 : 0.2,
			linguisticLoad: 0.5,
			sourceSections: [],
			confidence: 1,
			title: problem.text,
		},
		text: problem.text,
		questionTexts: [problem.text],
		documentIds: [problem.documentId],
		sourceFileNames: [problem.sourceFileName],
		anchorNodeIds: problem.anchorNodeIds,
		roles: ["problem-stem"],
		contentTypes: ["question"],
		primaryDocumentId: problem.documentId,
		primarySourceFileName: problem.sourceFileName,
		difficultyBand: problem.difficulty,
	}));
}

function chooseTestItems(context: BuilderContext<"build-test">, focus: string | null, itemCount: number) {
	const groupedUnitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames)
		.filter((entry) => matchesFocus([entry.text, ...inferCanonicalTeacherConcepts(entry.unit.concepts, [entry.text, ...entry.questionTexts, ...entry.unit.learningTargets]), ...entry.unit.learningTargets], focus));
	const unitEntries = groupedUnitEntries.length > 0 ? groupedUnitEntries : buildProblemBackedAssessmentEntries(context, focus);
	const conceptEntries = buildConceptEntries(context, focus);
	if (unitEntries.length === 0) {
		return buildFallbackTestSections(context, focus, itemCount, focus ? [focus] : conceptEntries.map((entry) => entry.concept));
	}
	const conceptNames = unique(conceptEntries.map((entry) => clusterAssessmentConcept(entry.concept)));
	const fingerprintConceptNames = getPreferredFingerprintProfiles(context).map((profile) => clusterAssessmentConcept(profile.displayName || profile.conceptId));
	const fallbackConceptNames = unique(unitEntries.flatMap((entry) => {
			const concepts = inferCanonicalTeacherConcepts(entry.unit.concepts, [entry.text, ...entry.questionTexts, ...entry.unit.learningTargets]).map((concept) => clusterAssessmentConcept(concept));
			return concepts.length > 0 ? concepts : ["general"];
		}));
	const effectiveConceptNames = conceptNames.length > 0 ? conceptNames : fallbackConceptNames;
	const orderedConceptNames = sortAssessmentConceptNames(context, unique([...effectiveConceptNames, ...fingerprintConceptNames]));

	const candidateItemsByConcept = new Map<string, TestItem[]>();
	const emittedPromptKeys = new Set<string>();

	for (const concept of orderedConceptNames) {
		const conceptUnits = prioritizeAssessmentUnits(unitEntries.filter((entry) =>
			concept === "general"
				? true
				: inferCanonicalTeacherConcepts(entry.unit.concepts, [entry.text, ...entry.questionTexts, ...entry.unit.learningTargets])
					.map((entryConcept) => clusterAssessmentConcept(entryConcept))
					.includes(concept)
					|| matchesFocus([entry.text, ...entry.unit.learningTargets], concept),
		));
		for (const unitEntry of conceptUnits) {
			for (const [promptIndex, prompt] of buildAssessmentPrompts(unitEntry, concept).entries()) {
				const promptKey = `${concept}:${assessmentSemanticPromptKey(concept, prompt)}`;
				if (emittedPromptKeys.has(promptKey)) {
					continue;
				}
				const item: TestItem = {
					itemId: `item-${unitEntry.unit.unitId}-${promptIndex + 1}`,
					prompt,
					concept,
					sourceDocumentId: unitEntry.primaryDocumentId,
					sourceFileName: unitEntry.primarySourceFileName,
					difficulty: unitEntry.difficultyBand,
					cognitiveDemand: inferUnitCognitiveDemand(unitEntry),
					answerGuidance: unitEntry.unit.learningTargets.length > 0
						? `Look for evidence that the student can ${joinList(unitEntry.unit.learningTargets).toLowerCase()}.`
						: `Look for accurate reasoning about ${concept}.`,
				};
				candidateItemsByConcept.set(concept, [...(candidateItemsByConcept.get(concept) ?? []), item]);
				emittedPromptKeys.add(promptKey);
			}
		}

		if (conceptUnits.length === 0) {
			const sourceDocument = conceptEntries.find((entry) => entry.concept === concept)?.documentIds[0] ?? context.analyzedDocuments[0]?.document.id ?? "unknown-document";
			const sourceFileName = conceptEntries.find((entry) => entry.concept === concept)?.sourceFileNames[0]
				?? context.sourceFileNames[sourceDocument]
				?? context.analyzedDocuments[0]?.document.sourceFileName
				?? "Unknown source";
			const fallbackKey = `concept-fallback:${concept}`;
			if (!emittedPromptKeys.has(fallbackKey)) {
				const item: TestItem = {
					itemId: `item-concept-${concept.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "general"}`,
					prompt: `Explain ${concept} and show how you would apply it.`,
					concept,
					sourceDocumentId: sourceDocument,
					sourceFileName,
					difficulty: "medium",
					cognitiveDemand: "conceptual",
					answerGuidance: `Look for accurate reasoning about ${concept} and a valid application example.`,
				};
				candidateItemsByConcept.set(concept, [...(candidateItemsByConcept.get(concept) ?? []), item]);
				emittedPromptKeys.add(fallbackKey);
			}
		}

		candidateItemsByConcept.set(concept, applyFingerprintConstraintsToItems(context, concept, candidateItemsByConcept.get(concept) ?? []));
	}

	const allItems: TestItem[] = [];
	const candidateQueues = new Map([...candidateItemsByConcept.entries()].map(([concept, items]) => [concept, [...items]]));
	const preferredConceptCounts = getFingerprintRequestedConceptCounts(context, orderedConceptNames, itemCount);
	if (preferredConceptCounts) {
		for (const concept of orderedConceptNames) {
			const queue = candidateQueues.get(concept) ?? [];
			const requested = preferredConceptCounts[concept] ?? 0;
			const selected = selectFingerprintItemsForConcept(context, concept, queue, requested);
			allItems.push(...selected.slice(0, Math.max(0, itemCount - allItems.length)));
			candidateQueues.set(concept, queue.filter((item) => !selected.includes(item)));
		}
	}
	for (const concept of orderedConceptNames) {
		if (allItems.length >= itemCount) {
			break;
		}
		if (preferredConceptCounts) {
			continue;
		}
		const queue = candidateQueues.get(concept) ?? [];
		const next = queue.shift();
		candidateQueues.set(concept, queue);
		if (next) {
			allItems.push(applyFingerprintDirectiveToItem(context, concept, next));
		}
	}

	for (const concept of orderedConceptNames) {
		if (allItems.length >= itemCount || conceptSortOrder(concept) === Number.MAX_SAFE_INTEGER) {
			continue;
		}
		if (preferredConceptCounts) {
			continue;
		}
		const queue = candidateQueues.get(concept) ?? [];
		const initialCount = allItems.filter((item) => item.concept === concept).length;
		const target = Math.min(3, initialCount + queue.length);
		while (allItems.length < itemCount && allItems.filter((item) => item.concept === concept).length < target) {
			const next = queue.shift();
			candidateQueues.set(concept, queue);
			if (!next) {
				break;
			}
			allItems.push(applyFingerprintDirectiveToItem(context, concept, next));
		}
	}

	while (!preferredConceptCounts && allItems.length < itemCount) {
		let emittedInRound = false;
		for (const concept of orderedConceptNames) {
			const queue = candidateQueues.get(concept) ?? [];
			const next = queue.shift();
			candidateQueues.set(concept, queue);
			if (!next) {
				continue;
			}
			allItems.push(applyFingerprintDirectiveToItem(context, concept, next));
			emittedInRound = true;
			if (allItems.length >= itemCount) {
				break;
			}
		}
		if (!emittedInRound) {
			break;
		}
	}
	if (allItems.length === 0) {
		return buildFallbackTestSections(context, focus, itemCount, orderedConceptNames.length > 0 ? orderedConceptNames : focus ? [focus] : []);
	}
	const conceptOrder = new Map(sortAssessmentConceptNames(context, orderedConceptNames).map((concept, index) => [concept, index]));
	const limited = allItems
		.map((item, index) => ({ item, index }))
		.sort((left, right) => (conceptOrder.get(left.item.concept) ?? Number.MAX_SAFE_INTEGER) - (conceptOrder.get(right.item.concept) ?? Number.MAX_SAFE_INTEGER) || left.index - right.index)
		.slice(0, itemCount)
		.map((entry) => entry.item);

	// Re-group by concept
	const grouped = new Map<string, TestItem[]>();
		for (const item of limited) {
			const list = grouped.get(item.concept) ?? [];
			list.push(item);
			grouped.set(item.concept, list);
		}
	
	// Remove empty concept sections (should not happen, but safe)
	const sections = [...grouped.entries()]
		.filter(([_, items]) => items.length > 0)
		.map(([concept, items]) => ({
			concept,
			sourceDocumentIds: unique(items.map((i) => i.sourceDocumentId)),
			items,
		}));
	const sectionOrder = new Map(sortAssessmentConceptNames(context, sections.map((section) => section.concept)).map((concept, index) => [concept, index]));
	sections.sort((a, b) => (sectionOrder.get(a.concept) ?? Number.MAX_SAFE_INTEGER) - (sectionOrder.get(b.concept) ?? Number.MAX_SAFE_INTEGER) || a.concept.localeCompare(b.concept));


	return sections;

}

function buildTestProduct(context: BuilderContext<"build-test">): IntentPayloadByType["build-test"] {
	const focus = getFocus(context.request.options);
	const itemCount = context.requestedItemCount ?? getPositiveNumberOption(context.request.options, "itemCount", 5);
	const sections = chooseTestItems(context, focus, itemCount);
	const totalItemCount = sections.reduce((sum, section) => sum + section.items.length, 0);

	return {
		kind: "test",
		focus,
		domain: context.domain,
		title: focus ? `Assessment Draft: ${focus}` : "Assessment Draft",
		overview: totalItemCount > 0
			? `This draft assessment includes ${totalItemCount} item${totalItemCount === 1 ? "" : "s"} focused on ${joinList(sections.map((section) => teacherFacingConceptLabel(section.concept)).slice(0, 3)) || "core concepts"}.`
			: "No grouped instructional units were available to build an assessment draft.",
		estimatedDurationMinutes: Math.max(5, totalItemCount * 3),
		sections,
		totalItemCount,
		generatedAt: new Date().toISOString(),
	};
}


function buildCompareMetricEntries(context: BuilderContext<"compare-documents">) {
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);
	const effectiveConceptToDocumentMap = buildEffectiveConceptToDocumentMap(context, unitEntries, context.collectionAnalysis);
	const effectiveDocumentConceptMap = buildEffectiveDocumentConceptMap(context, unitEntries);
	return context.analyzedDocuments.map((analyzed) => ({
		documentId: analyzed.document.id,
		sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
		problemCount: analyzed.problems.length,
		dominantDifficulty: dominantDifficulty(analyzed),
		averageDifficultyScore: average(analyzed.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
		representations: analyzed.insights.representations,
		instructionalDensity: analyzed.insights.instructionalDensity,
		uniqueConcepts: (effectiveDocumentConceptMap.get(analyzed.document.id) ?? analyzed.insights.concepts).filter((concept) => (effectiveConceptToDocumentMap[concept] ?? []).length === 1),
		sharedConcepts: (effectiveDocumentConceptMap.get(analyzed.document.id) ?? analyzed.insights.concepts).filter((concept) => (effectiveConceptToDocumentMap[concept] ?? []).length >= 2),
	}));
}

function buildCompareDocumentsProduct(context: BuilderContext<"compare-documents">): CompareDocumentsProduct {
	const focus = getFocus(context.request.options);
	const metrics = buildCompareMetricEntries(context);
	const filteredOverlap = Object.entries(buildEffectiveConceptToDocumentMap(context, collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames), context.collectionAnalysis))
		.filter(([concept]) => matchesFocus([concept], focus))
		.map(([concept, documentIds]) => ({ concept, documentIds }));

	return {
		kind: "compare-documents",
		focus,
		domain: context.domain,
		sharedConcepts: filteredOverlap.map((entry) => entry.concept),
		conceptOverlap: filteredOverlap,
		documents: metrics,
		difficultyComparison: [...metrics].sort((left, right) => left.averageDifficultyScore - right.averageDifficultyScore || left.documentId.localeCompare(right.documentId)),
		representationComparison: [...metrics].sort((left, right) => left.representations.length - right.representations.length || left.documentId.localeCompare(right.documentId)),
		instructionalDensityComparison: [...metrics].sort((left, right) => right.instructionalDensity - left.instructionalDensity || left.documentId.localeCompare(right.documentId)),
		problemDistributionComparison: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			totalProblems: analyzed.problems.length,
			byDifficulty: analyzed.insights.difficultyDistribution,
		})),
		documentSimilarity: context.collectionAnalysis.documentSimilarity,
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function mergeProblemEntries(context: BuilderContext<"merge-documents">, focus: string | null) {
	const merged = new Map<string, MergeDocumentsProduct["mergedProblems"][number]>();

	for (const analyzed of context.analyzedDocuments) {
		for (const problem of analyzed.problems) {
			if (!matchesFocus([problem.text, ...problem.concepts, ...problem.representations], focus)) {
				continue;
			}

			const key = `${problem.text.toLowerCase()}::${problem.concepts.slice().sort().join("|")}`;
			const existing = merged.get(key);
			const sourceFileName = context.sourceFileNames[problem.documentId] ?? analyzed.document.sourceFileName;
			const sourceAnchor = {
				documentId: problem.documentId,
				anchorNodeIds: unique(problem.anchors.map((anchor) => anchor.nodeId)),
			};

			if (!existing) {
				merged.set(key, {
					mergedProblemId: `merged-problem-${problem.id}`,
					text: problem.text,
					concepts: problem.concepts,
					representations: problem.representations,
					difficulty: problem.difficulty,
					sourceDocumentIds: [problem.documentId],
					sourceFileNames: [sourceFileName],
					sourceAnchors: [sourceAnchor],
				});
				continue;
			}

			existing.sourceDocumentIds = unique([...existing.sourceDocumentIds, problem.documentId]);
			existing.sourceFileNames = unique([...existing.sourceFileNames, sourceFileName]);
			existing.sourceAnchors = existing.sourceAnchors.some((entry) => entry.documentId === sourceAnchor.documentId)
				? existing.sourceAnchors.map((entry) => entry.documentId === sourceAnchor.documentId
					? { ...entry, anchorNodeIds: unique([...entry.anchorNodeIds, ...sourceAnchor.anchorNodeIds]).sort() }
					: entry)
				: [...existing.sourceAnchors, sourceAnchor];
		}
	}

	return [...merged.values()];
}

function mergeFragmentEntries(context: BuilderContext<"merge-documents">, focus: string | null) {
	const merged = new Map<string, MergeDocumentsProduct["mergedFragments"][number]>();
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);

	for (const entry of unitEntries) {
		if (!entry.text || !matchesFocus([entry.text, ...entry.unit.concepts, ...entry.unit.learningTargets, ...entry.roles], focus)) {
			continue;
		}

		const key = `${entry.text.toLowerCase()}::${entry.roles.slice().sort().join("|")}::${entry.contentTypes.slice().sort().join("|")}::${entry.unit.concepts.slice().sort().join("|")}`;
		const existing = merged.get(key);
		const sourceAnchors = entry.documentIds.map((documentId) => ({
			documentId,
			anchorNodeIds: unique(entry.unit.fragments.filter((fragment) => fragment.documentId === documentId).flatMap((fragment) => fragment.anchors.map((anchor) => anchor.nodeId))),
		}));

		if (!existing) {
			merged.set(key, {
				mergedFragmentId: `merged-fragment-${entry.unit.unitId}`,
				text: entry.text,
				instructionalRole: entry.roles[0] ?? "other",
				contentType: entry.contentTypes[0] ?? "text",
				sourceDocumentIds: entry.documentIds,
				sourceAnchors,
			});
			continue;
		}

		existing.sourceDocumentIds = unique([...existing.sourceDocumentIds, ...entry.documentIds]);
		for (const sourceAnchor of sourceAnchors) {
			existing.sourceAnchors = existing.sourceAnchors.some((existingAnchor) => existingAnchor.documentId === sourceAnchor.documentId)
				? existing.sourceAnchors.map((existingAnchor) => existingAnchor.documentId === sourceAnchor.documentId
					? { ...existingAnchor, anchorNodeIds: unique([...existingAnchor.anchorNodeIds, ...sourceAnchor.anchorNodeIds]).sort() }
					: existingAnchor)
				: [...existing.sourceAnchors, sourceAnchor];
		}
	}

	return [...merged.values()];
}

function buildMergeDocumentsProduct(context: BuilderContext<"merge-documents">): MergeDocumentsProduct {
	const focus = getFocus(context.request.options);
	const mergedProblems = mergeProblemEntries(context, focus);
	const mergedFragments = mergeFragmentEntries(context, focus);
	const effectiveConceptToDocumentMap = buildEffectiveConceptToDocumentMap(context, collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames), context.collectionAnalysis);

	return {
		kind: "merge-documents",
		focus,
		domain: context.domain,
		mergedConcepts: Object.keys(effectiveConceptToDocumentMap).filter((concept) => matchesFocus([concept], focus)).sort(),
		mergedProblems,
		mergedFragments,
		mergedInsights: {
			totalDocuments: context.analyzedDocuments.length,
			totalProblems: mergedProblems.length,
			totalFragments: mergedFragments.length,
			totalConcepts: Object.keys(effectiveConceptToDocumentMap).length,
			coverageSummary: {
				totalConcepts: Object.keys(effectiveConceptToDocumentMap).length,
				conceptGaps: context.collectionAnalysis.conceptGaps,
				docsPerConcept: Object.fromEntries(Object.entries(effectiveConceptToDocumentMap).map(([concept, documentIds]) => [concept, documentIds.length])),
			},
		},
		mergedCanonicalOrder: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			surfaceCount: analyzed.document.surfaces.length,
			nodeCount: analyzed.document.nodes.length,
		})),
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function buildSequenceProduct(context: BuilderContext<"build-sequence">): SequenceProduct {
	const focus = getFocus(context.request.options);
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);
	const effectiveConceptToDocumentMap = buildEffectiveConceptToDocumentMap(context, unitEntries, context.collectionAnalysis);
	const orderedDocuments = [...context.analyzedDocuments].sort((left, right) => {
		const leftDifficulty = average(unitEntries.filter((entry) => entry.documentIds.includes(left.document.id)).map((entry) => entry.unit.difficulty * 3))
			|| average(left.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		const rightDifficulty = average(unitEntries.filter((entry) => entry.documentIds.includes(right.document.id)).map((entry) => entry.unit.difficulty * 3))
			|| average(right.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		if (leftDifficulty !== rightDifficulty) {
			return leftDifficulty - rightDifficulty;
		}
		if (left.insights.instructionalDensity !== right.insights.instructionalDensity) {
			return right.insights.instructionalDensity - left.insights.instructionalDensity;
		}
		return left.document.id.localeCompare(right.document.id);
	});
	const seenConcepts = new Set<string>();
	const allBridgingConcepts = new Set<string>();
	const allMissingPrerequisites = new Set<string>();

	const recommendedOrder = orderedDocuments.map((analyzed, index) => {
		const currentConcepts = unique(unitEntries
			.filter((entry) => entry.documentIds.includes(analyzed.document.id))
			.flatMap((entry) => entry.unit.concepts))
			.filter((concept) => matchesFocus([concept], focus));
		const bridgingConcepts = currentConcepts.filter((concept) => seenConcepts.has(concept));
		const missingPrerequisites = currentConcepts.filter((concept) => !seenConcepts.has(concept) && (effectiveConceptToDocumentMap[concept] ?? []).length === 1);

		for (const concept of bridgingConcepts) {
			allBridgingConcepts.add(concept);
		}
		for (const concept of missingPrerequisites) {
			allMissingPrerequisites.add(concept);
		}
		for (const concept of currentConcepts) {
			seenConcepts.add(concept);
		}

		return {
			position: index + 1,
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			rationale: bridgingConcepts.length > 0
				? `Build on ${joinList(bridgingConcepts)} before introducing ${joinList(missingPrerequisites) || "new practice"}.`
				: `Start here because the document has lighter difficulty and an instructional density of ${analyzed.insights.instructionalDensity}.`,
			bridgingConcepts,
			missingPrerequisites,
			anchorNodeIds: unique(unitEntries
				.filter((entry) => entry.documentIds.includes(analyzed.document.id))
				.flatMap((entry) => entry.anchorNodeIds)).slice(0, 12),
		};
	});

	return {
		kind: "sequence",
		focus,
		domain: context.domain,
		recommendedOrder,
		bridgingConcepts: [...allBridgingConcepts],
		missingPrerequisites: [...allMissingPrerequisites],
		sourceAnchors: collectSourceAnchors(orderedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function buildLessonProduct(context: BuilderContext<"build-lesson">): LessonProduct {
	const focus = getFocus(context.request.options);
	const analyzed = context.analyzedDocuments[0]!;
	const sourceFileName = context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName;
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, [analyzed], context.sourceFileNames)
		.filter((entry) => matchesFocus([entry.text, ...entry.unit.concepts, ...entry.unit.learningTargets], focus));
	const problemEntries = buildProblemEntries(context, focus);
	const objectiveEntries = unique(unitEntries.flatMap((entry) => entry.unit.learningTargets));
	const prerequisiteConcepts = unique(unitEntries.flatMap((entry) => entry.unit.concepts).filter(Boolean));
	const misconceptionTriggers = unique(unitEntries.flatMap((entry) => entry.unit.misconceptions).filter(Boolean));
	const coreConcepts = unique([...(focus ? [focus] : []), ...prerequisiteConcepts, ...analyzed.insights.concepts].filter(Boolean)).slice(0, 3);
	const sourceAnchorNodeIds = unique([
		...unitEntries.flatMap((entry) => entry.anchorNodeIds),
		...problemEntries.flatMap((problem) => problem.anchorNodeIds),
	]);
	const isMinimalContentMode = analyzed.insights.instructionalDensity < 0.45
		|| (analyzed.insights.exampleCount + analyzed.insights.explanationCount === 0 && problemEntries.length < 2)
		|| (unitEntries.length < 3 && problemEntries.length < 2);
	const scaffoldEntries = unitEntries
		.map((entry) => ({
			concepts: entry.unit.concepts.length > 0 ? entry.unit.concepts : coreConcepts,
			level: entry.difficultyBand === "high" ? "low" as const : entry.difficultyBand === "low" ? "high" as const : "medium" as const,
			strategy: entry.text || entry.unit.title || `Scaffold ${entry.difficultyBand}`,
			documentIds: entry.documentIds,
			roles: entry.roles,
			misconceptions: entry.unit.misconceptions,
		}));
	const noteEntries = unitEntries
		.filter((entry) => entry.roles.includes("note") || entry.roles.includes("reflection") || entry.roles.includes("objective"))
		.map((entry) => entry.text)
		.filter(Boolean);

	function stripLessonLabel(text: string) {
		return text
			.replace(/^(section\s*\d+\s*[-:]\s*)/i, "")
			.replace(/^(learning target|warm[- ]up|concept introduction|guided practice|independent practice|exit ticket|teacher notes?)\s*[:\-]\s*/i, "")
			.trim();
	}

	function normalizeLessonText(text: string) {
		return dedupeParagraphs(stripLessonLabel(text))
			.split(/\n+/)
			.map((line) => line.trim())
			.filter(Boolean)
			.join(" ")
			.trim();
	}

	function splitLessonSentences(text: string) {
		const normalized = normalizeLessonText(text);
		if (!normalized) {
			return [];
		}

		const matches = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
		return dedupeLines(matches.map((sentence) => {
			const trimmed = sentence.trim();
			if (!trimmed) {
				return "";
			}
			return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
		}).filter(Boolean));
	}

	function joinCoreConcepts(limit = 2) {
		return joinList(coreConcepts.slice(0, limit)) || "the main concept";
	}

	function buildLessonSegment(title: string, description: string, options?: Partial<LessonSegment>): LessonSegment {
		return {
			title,
			description: normalizeLessonText(description),
			documentId: options?.documentId ?? analyzed.document.id,
			sourceFileName: options?.sourceFileName ?? sourceFileName,
			anchorNodeIds: options?.anchorNodeIds ?? sourceAnchorNodeIds,
			concepts: options?.concepts ?? coreConcepts,
		};
	}

	function ensureQuestion(text: string) {
		const normalized = normalizeLessonText(text).replace(/[.!]+$/g, "").trim();
		if (!normalized) {
			return `What do you already know about ${joinCoreConcepts(1)}?`;
		}
		return /\?$/.test(normalized) ? normalized : `${normalized}?`;
	}

	function fallbackExplanationSentence() {
		return coreConcepts.length > 1
			? `Connect ${joinCoreConcepts(2)} before students move into independent practice.`
			: `Connect ${joinCoreConcepts(1)} to a concrete example before students practice on their own.`;
	}

	const explanationEntries = unitEntries.filter((entry) => entry.roles.includes("explanation") && entry.text.trim().length > 0);
	const exampleEntries = unitEntries.filter((entry) => entry.roles.includes("example") && entry.text.trim().length > 0);
	const reflectionEntries = unitEntries.filter((entry) => entry.roles.includes("reflection") && entry.text.trim().length > 0);
	const problemMisconceptions = dedupeLines(problemEntries.flatMap((problem) => problem.misconceptions).filter(Boolean));
	const uniqueProblems = problemEntries.filter((problem, index, entries) => {
		const normalized = normalizeLessonText(problem.text);
		return normalized.length > 0 && entries.findIndex((entry) => normalizeLessonText(entry.text) === normalized) === index;
	});

	function titleCaseConcept(value: string) {
		return value
			.trim()
			.replace(/[.!?]+$/g, "")
			.split(/\s+/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	function buildCuratedScaffolds() {
		const grouped = new Map<string, { level: "low" | "medium" | "high"; strategies: string[]; documentIds: string[] }>();

		for (const entry of scaffoldEntries) {
			for (const concept of entry.concepts.length > 0 ? entry.concepts : coreConcepts) {
				const normalizedConcept = normalizeLessonText(concept);
				if (!normalizedConcept) {
					continue;
				}

				const group = grouped.get(normalizedConcept) ?? {
					level: entry.level,
					strategies: [],
					documentIds: [],
				};

				group.level = group.level === "medium" ? entry.level : group.level;
				group.strategies = dedupeLines([
					...group.strategies,
					entry.roles.includes("example")
						? `Model one concise example for ${normalizedConcept} before students try it independently.`
						: "",
					entry.roles.includes("explanation") || entry.roles.includes("objective")
						? `Restate ${normalizedConcept} in student-friendly language and highlight the key vocabulary.`
						: "",
					entry.misconceptions[0]
						? `Contrast ${normalizedConcept} with ${entry.misconceptions[0].toLowerCase()} before releasing students to practice.`
						: "",
					entry.strategy,
				].filter(Boolean)).slice(0, 2);
				group.documentIds = dedupeLines([...group.documentIds, ...entry.documentIds]);
				grouped.set(normalizedConcept, group);
			}
		}

		if (grouped.size === 0) {
			for (const concept of coreConcepts.slice(0, 2)) {
				grouped.set(concept, {
					level: "medium",
					strategies: [`Model one short example for ${concept} and name the strategy students should repeat.`],
					documentIds: [analyzed.document.id],
				});
			}
		}

		return [...grouped.entries()]
			.sort((left, right) => left[0].localeCompare(right[0]))
			.flatMap(([concept, group]) => group.strategies.map((strategy) => ({
				concept: titleCaseConcept(concept),
				level: group.level,
				strategy,
				documentIds: group.documentIds,
			})));
	}

	function buildTeacherNotes() {
		return dedupeLines([
			prerequisiteConcepts.length > 0
				? `Check prerequisite understanding of ${joinList(prerequisiteConcepts.slice(0, 2))} before guided practice begins.`
				: "",
			(problemMisconceptions[0] || misconceptionTriggers[0])
				? `Watch for ${String(problemMisconceptions[0] || misconceptionTriggers[0]).toLowerCase()} and correct it with a quick counterexample.`
				: "",
			coreConcepts.length > 0
				? `Listen for students to explain ${joinCoreConcepts(2)} aloud during the exit ticket, not just produce an answer.`
				: "",
			...noteEntries.slice(0, 2).map((entry) => {
				const sentence = splitLessonSentences(entry)[0];
				return sentence ? `During instruction, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}` : "";
			}),
		].filter(Boolean)).slice(0, 3);
	}

	const curatedScaffolds = buildCuratedScaffolds();
	const curatedTeacherNotes = buildTeacherNotes();

	const warmUp = [buildLessonSegment(
		"Quick Check",
		uniqueProblems[0]
			? `Start with a short retrieval prompt: ${ensureQuestion(uniqueProblems[0].text)}`
			: `Ask students to explain what ${joinCoreConcepts(1)} means and share one example they already know.`,
		uniqueProblems[0]
			? {
				documentId: uniqueProblems[0].documentId,
				sourceFileName: uniqueProblems[0].sourceFileName,
				anchorNodeIds: uniqueProblems[0].anchorNodeIds,
				concepts: uniqueProblems[0].concepts,
			}
			: undefined,
	)];

	const conceptIntroduction: LessonSegment[] = [];
	for (const entry of explanationEntries) {
		const sentences = splitLessonSentences(entry.text).slice(0, 4);
		if (sentences.length === 0) {
			continue;
		}

		if (sentences.length === 1) {
			sentences.push(fallbackExplanationSentence());
		}

		while (sentences.length > 0 && conceptIntroduction.length < 2) {
			const chunk = sentences.splice(0, sentences.length >= 4 ? 2 : Math.min(2, sentences.length));
			if (chunk.length === 1) {
				chunk.push(fallbackExplanationSentence());
			}
			conceptIntroduction.push(buildLessonSegment(`Key Idea ${conceptIntroduction.length + 1}`, chunk.slice(0, 4).join(" "), {
				documentId: entry.primaryDocumentId,
				sourceFileName: entry.primarySourceFileName,
				anchorNodeIds: entry.anchorNodeIds,
				concepts: entry.unit.concepts,
			}));
		}

		if (conceptIntroduction.length >= 2) {
			break;
		}
	}

	if (conceptIntroduction.length === 0) {
		conceptIntroduction.push(
			buildLessonSegment("Key Idea 1", `${joinCoreConcepts(1)} is the central idea for this lesson. State the meaning clearly before students move into practice.`),
			buildLessonSegment("Key Idea 2", fallbackExplanationSentence()),
		);
	}

	const guidedPracticeCandidates = dedupeLines([
		...exampleEntries.map((entry) => normalizeLessonText(entry.text)),
		...uniqueProblems.map((problem) => normalizeLessonText(problem.text)),
	].filter(Boolean));
	const guidedPractice = guidedPracticeCandidates.slice(0, 2).map((text, index) => buildLessonSegment(
		`Worked Example ${index + 1}`,
		text.includes("?")
			? `Model this together: ${ensureQuestion(text)}`
			: `${text} Think aloud as students identify the strategy and justify each step.`,
	));
	if (guidedPractice.length === 0) {
		guidedPractice.push(buildLessonSegment(
			"Worked Example 1",
			`Model one example about ${joinCoreConcepts(1)} and think aloud so students can hear the strategy before they practice independently.`,
		));
	}

	const independentPracticePromptCount = isMinimalContentMode ? 2 : 3;
	const independentPracticePrompts = dedupeLines([
		...uniqueProblems.map((problem) => normalizeLessonText(problem.text)),
		`Solve a new problem about ${joinCoreConcepts(1)} and show each step.`,
		`Explain your reasoning about ${joinCoreConcepts(1)} using words, numbers, or a model.`,
		coreConcepts[1]
			? `Compare ${coreConcepts[0]} and ${coreConcepts[1]} in a short response and justify your thinking.`
			: `Create your own example about ${joinCoreConcepts(1)} and explain why it works.`,
	].filter(Boolean)).slice(0, independentPracticePromptCount);
	const independentPractice = independentPracticePrompts.map((prompt, index) => buildLessonSegment(
		`Practice ${index + 1}`,
		prompt,
	));

	const exitTicketPrompt = reflectionEntries[0]
		? ensureQuestion(reflectionEntries[0].text)
		: misconceptionTriggers[0]
			? `In 2-3 sentences, explain ${joinCoreConcepts(1)} and describe how to avoid ${misconceptionTriggers[0].toLowerCase()}.`
			: `In 2-3 sentences, explain ${joinCoreConcepts(1)} and give one example.`;
	const exitTicket = [buildLessonSegment("Exit Prompt", exitTicketPrompt, reflectionEntries[0]
		? {
			documentId: reflectionEntries[0].primaryDocumentId,
			sourceFileName: reflectionEntries[0].primarySourceFileName,
			anchorNodeIds: reflectionEntries[0].anchorNodeIds,
			concepts: reflectionEntries[0].unit.concepts,
		}
		: undefined)];

	return {
		kind: "lesson",
		focus,
		domain: context.domain,
		title: focus ? `Lesson Builder: ${focus}` : `Lesson Builder: ${sourceFileName}`,
		learningObjectives: objectiveEntries.length > 0 ? objectiveEntries : analyzed.insights.concepts.slice(0, 3).map((concept) => `Students will explain and apply ${concept}.`),
		prerequisiteConcepts,
		warmUp,
		conceptIntroduction,
		guidedPractice,
		independentPractice,
		exitTicket,
		misconceptions: misconceptionTriggers.map((trigger) => ({
			trigger,
			correction: `Address ${trigger.toLowerCase()} with a quick model and a corrected example.`,
			documentIds: [analyzed.document.id],
		})),
		scaffolds: curatedScaffolds.length > 0 ? curatedScaffolds : [{ concept: titleCaseConcept(joinCoreConcepts(1)), level: "medium", strategy: "Model the first problem together before releasing to independent work.", documentIds: [analyzed.document.id] }],
		extensions: problemEntries.filter((problem) => problem.difficulty === "high").map((problem) => `Extend with: ${problem.text}`).slice(0, 2),
		teacherNotes: curatedTeacherNotes.length > 0 ? curatedTeacherNotes : [`Use ${sourceFileName} as the core source and emphasize ${joinList(analyzed.insights.concepts.slice(0, 2)) || "the central concepts"}.`],
		sourceAnchors: collectSourceAnchors([analyzed]),
		generatedAt: new Date().toISOString(),
	};
}

function buildUnitProduct(context: BuilderContext<"build-unit">): UnitProduct {
	const focus = getFocus(context.request.options);
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);
	const effectiveConceptToDocumentMap = buildEffectiveConceptToDocumentMap(context, unitEntries, context.collectionAnalysis);
	const orderedDocuments = [...context.analyzedDocuments].sort((left, right) => {
		const leftScore = average(unitEntries.filter((entry) => entry.documentIds.includes(left.document.id)).map((entry) => entry.unit.difficulty * 3))
			|| average(left.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		const rightScore = average(unitEntries.filter((entry) => entry.documentIds.includes(right.document.id)).map((entry) => entry.unit.difficulty * 3))
			|| average(right.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		return leftScore - rightScore || left.document.id.localeCompare(right.document.id);
	});
	const lessonSequence = orderedDocuments.map((analyzed, index) => {
		const documentUnitEntries = unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id));
		const focusConcepts = unique(documentUnitEntries.flatMap((entry) => entry.unit.concepts));
		const priorDocumentIds = orderedDocuments.slice(0, index).map((document) => document.document.id);
		const priorConcepts = unique(unitEntries
			.filter((entry) => entry.documentIds.some((documentId) => priorDocumentIds.includes(documentId)))
			.flatMap((entry) => entry.unit.concepts));

		return {
			position: index + 1,
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			focusConcepts,
			rationale: index === 0
				? `Open the unit with ${joinList(focusConcepts.slice(0, 2)) || "core concepts"} because this document has the lowest difficulty profile.`
				: `Place this after earlier documents to build from ${joinList(focusConcepts.filter((concept) => priorConcepts.includes(concept))) || "the prior concepts"}.`,
			anchorNodeIds: unique(documentUnitEntries.flatMap((entry) => entry.anchorNodeIds)),
		};
	});
	const conceptMap = Object.entries(effectiveConceptToDocumentMap).map(([concept, documentIds]) => ({
		concept,
		documentIds,
		prerequisites: unique(unitEntries.filter((entry) => entry.unit.concepts.includes(concept)).flatMap((entry) => entry.unit.concepts).filter((item) => item !== concept)),
	}));
	const misconceptionMap = Object.entries(effectiveConceptToDocumentMap).map(([concept, documentIds]) => ({
		concept,
		triggers: unique(unitEntries.filter((entry) => entry.text.toLowerCase().includes(concept.toLowerCase()) || entry.unit.concepts.includes(concept)).flatMap((entry) => entry.unit.misconceptions)).slice(0, 3),
		documentIds,
	})).filter((entry) => entry.triggers.length > 0);

	return {
		kind: "unit",
		focus,
		domain: context.domain,
		title: focus ? `Unit Builder: ${focus}` : `Unit Builder: ${context.analyzedDocuments.length} Documents`,
		lessonSequence,
		conceptMap,
		difficultyCurve: orderedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			averageDifficultyScore: average(unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id)).map((entry) => entry.unit.difficulty * 3))
				|| average(analyzed.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
		})),
		representationCurve: orderedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			representations: analyzed.insights.representations,
		})),
		misconceptionMap,
		suggestedAssessments: orderedDocuments.map((analyzed) => {
			const documentUnitEntries = unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id));
			return `Assessment checkpoint from ${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName} on ${joinList(unique(documentUnitEntries.flatMap((entry) => entry.unit.concepts)).slice(0, 2)) || "key ideas"}.`;
		}).slice(0, 3),
		suggestedReviews: context.collectionAnalysis.conceptGaps.slice(0, 3).map((concept) => `Review ${concept} before moving to the next lesson.`),
		suggestedPracticeSets: orderedDocuments.map((analyzed) => {
			const documentUnitCount = unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id)).length;
			return `Practice set using ${documentUnitCount || analyzed.problems.length} instructional block(s) from ${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName}.`;
		}).slice(0, 3),
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function buildInstructionalMapProduct(context: BuilderContext<"build-instructional-map">): InstructionalMapProduct {
	const focus = getFocus(context.request.options);
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);
	const filteredConceptEntries = buildConceptBuckets(context, unitEntries, focus);
	const resolveUnitAlignmentConcepts = (entry: InstructionalUnitEntry) => {
		const directConcepts = entry.unit.concepts.filter((concept) => matchesFocus([concept], focus));
		if (directConcepts.length > 0) {
			return directConcepts;
		}

		return unique(context.analyzedDocuments
			.filter((analyzed) => entry.documentIds.includes(analyzed.document.id))
			.flatMap((analyzed) => analyzed.insights.concepts)
			.filter((concept) => matchesFocus([concept], focus)));
	};
	const representationBuckets = unique(unitEntries.flatMap((entry) => entry.contentTypes))
		.map((representation) => ({
			node: representation,
			documentIds: unique(unitEntries.filter((entry) => entry.contentTypes.includes(representation)).flatMap((entry) => entry.documentIds)),
		}));
	const misconceptionBuckets = unique(unitEntries.flatMap((entry) => entry.unit.misconceptions))
		.map((trigger) => ({
			node: trigger,
			documentIds: unique(unitEntries.filter((entry) => entry.unit.misconceptions.includes(trigger)).flatMap((entry) => entry.documentIds)),
		}));

	return {
		kind: "instructional-map",
		focus,
		domain: context.domain,
		conceptGraph: {
			nodes: filteredConceptEntries.map((entry) => entry.node),
			edges: buildGraphEdgesFromBuckets(filteredConceptEntries),
		},
		representationGraph: {
			nodes: representationBuckets.map((entry) => entry.node),
			edges: buildGraphEdgesFromBuckets(representationBuckets),
		},
		misconceptionGraph: {
			nodes: misconceptionBuckets.map((entry) => entry.node),
			edges: buildGraphEdgesFromBuckets(misconceptionBuckets),
		},
		difficultyCurve: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			averageDifficultyScore: average(unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id)).map((entry) => entry.unit.difficulty * 3))
				|| average(analyzed.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
		})),
		documentConceptAlignment: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			concepts: (() => {
				const unitConcepts = unique(unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id)).flatMap((entry) => entry.unit.concepts));
				if (unitConcepts.length > 0) {
					return unitConcepts;
				}
				return analyzed.insights.concepts.filter((concept) => matchesFocus([concept], focus));
			})(),
		})),
		unitConceptAlignment: unitEntries.map((entry) => ({
			unitId: entry.unit.unitId,
			title: entry.unit.title ?? entry.text,
			concepts: resolveUnitAlignmentConcepts(entry),
			documentIds: entry.documentIds,
			sourceFileNames: entry.sourceFileNames,
			anchorNodeIds: entry.anchorNodeIds,
		})),
		problemConceptAlignment: context.analyzedDocuments.flatMap((analyzed) => analyzed.problems.map((problem) => ({
			problemId: problem.id,
			documentId: problem.documentId,
			concepts: problem.concepts,
			anchorNodeIds: unique(problem.anchors.map((anchor) => anchor.nodeId)),
		}))),
		instructionalRoleDistribution: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			roles: unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id)).reduce<Record<string, number>>((acc, entry) => {
				for (const role of entry.roles) {
					acc[role] = (acc[role] ?? 0) + 1;
				}
				return acc;
			}, {}),
		})),
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function buildCurriculumAlignmentProduct(context: BuilderContext<"curriculum-alignment">): CurriculumAlignmentProduct {
	const focus = getFocus(context.request.options);
	const concepts = Object.entries(buildEffectiveConceptToDocumentMap(context, collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames), context.collectionAnalysis)).filter(([concept]) => matchesFocus([concept], focus));
	const standardsCoverage = concepts.map(([concept, documentIds]) => ({
		standardId: toStandardId(concept),
		concept,
		documentIds,
		coverage: documentIds.length >= 2 ? "full" as const : "partial" as const,
	}));
	const redundancies = Object.entries(context.collectionAnalysis.redundancy)
		.flatMap(([documentId, entries]) => entries.map((entry) => `${documentId} overlaps with ${entry.otherDocumentId} on ${joinList(entry.sharedConcepts.slice(0, 2)) || "shared concepts"}.`));

	return {
		kind: "curriculum-alignment",
		focus,
		domain: context.domain,
		standardsCoverage,
		gaps: context.collectionAnalysis.conceptGaps.map((concept) => `${toStandardId(concept)} has partial coverage for ${concept}.`),
		redundancies: redundancies.slice(0, 5),
		suggestedFixes: [
			...context.collectionAnalysis.conceptGaps.slice(0, 3).map((concept) => `Add another source or assessment artifact to fully cover ${concept}.`),
			...redundancies.slice(0, 2).map((entry) => `Reduce duplicate treatment where ${entry.toLowerCase()}`),
		],
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

const BUILDERS: { [K in BuiltIntentType]: (context: BuilderContext<K>) => IntentPayloadByType[K] } = {
	"extract-problems": buildExtractProblemsProduct,
	"extract-concepts": buildExtractConceptsProduct,
	"summarize": buildSummaryProduct,
	"build-review": buildReviewProduct,
	"build-test": buildTestProduct,
	"compare-documents": buildCompareDocumentsProduct,
	"merge-documents": buildMergeDocumentsProduct,
	"build-sequence": buildSequenceProduct,
	"build-lesson": buildLessonProduct,
	"build-unit": buildUnitProduct,
	"build-instructional-map": buildInstructionalMapProduct,
	"curriculum-alignment": buildCurriculumAlignmentProduct,
};

export function isBuiltIntentType(intentType: IntentRequest["intentType"]): intentType is BuiltIntentType {
	return SUPPORTED_INTENTS.includes(intentType as BuiltIntentType);
}

function buildBuilderContext<T extends BuiltIntentType>(
    request: IntentRequest & { intentType: T },
    context: PrismSessionContext,
    preferences?: {
		teacherFingerprint?: TeacherFingerprint | null;
		unitFingerprint?: UnitFingerprint | null;
	},
): BuilderContext<T> {
    const session = context.session;
    if (!session) {
        throw new IntentBuildError(404, "Session not found");
    }

    if (SINGLE_DOCUMENT_INTENTS.includes(request.intentType) && request.documentIds.length !== 1) {
        throw new IntentBuildError(400, `${request.intentType} requires exactly 1 document`);
    }

    if (MULTI_DOCUMENT_INTENTS.includes(request.intentType) && request.documentIds.length < 2) {
        throw new IntentBuildError(400, `${request.intentType} requires at least 2 documents`);
    }

    for (const documentId of request.documentIds) {
        if (!session.documentIds.includes(documentId)) {
            throw new IntentBuildError(400, `Document ${documentId} is not part of session ${request.sessionId}`);
        }
        if ((session.sessionRoles[documentId] ?? []).length === 0) {
            throw new IntentBuildError(400, `Document ${documentId} is missing session roles`);
        }
    }

    const analyzedDocuments = request.documentIds.map((documentId) => {
        const analyzedDocument = context.analyzedDocuments.find((document) => document.document.id === documentId);
        if (!analyzedDocument) {
            throw new IntentBuildError(404, `Document ${documentId} has not been analyzed`);
        }
        return analyzedDocument;
    });

    const instructionalUnits = context.groupedUnits
        .filter((unit) => unit.fragments.some((fragment) => request.documentIds.includes(fragment.documentId)))
        .map((unit) => ({
            ...unit,
            fragments: unit.fragments.filter((fragment) => request.documentIds.includes(fragment.documentId)),
        }));

    // EPIC 4: merge multi-document intelligence
    const mergedAnalyzedDocuments = mergeAnalyzedDocuments(analyzedDocuments);
    const mergedInstructionalUnits = mergeInstructionalUnits(instructionalUnits);
	const mergedCollectionAnalysis = mergeCollectionAnalysis(context.collectionAnalysis, mergedAnalyzedDocuments);

    // EPIC 4: infer domain
    const domain = inferDomainMerged(
        mergedCollectionAnalysis.conceptToDocumentMap,
        mergedAnalyzedDocuments,
        mergedInstructionalUnits,
    );

    // EPIC 4: requested item count (for build-test)
    const requestedItemCount = getPositiveNumberOption(request.options, "itemCount", 5);

    const unitEntries = collectInstructionalUnitEntries(
        mergedInstructionalUnits,
        mergedAnalyzedDocuments,
        context.sourceFileNames,
    );

    return {
        request,
        analyzedDocuments: mergedAnalyzedDocuments,
        instructionalUnits: mergedInstructionalUnits,
        collectionAnalysis: mergedCollectionAnalysis,
        sourceFileNames: context.sourceFileNames,
        documentSummaries: buildDocumentSummaries(mergedAnalyzedDocuments, context.sourceFileNames, unitEntries),
        domain,
        requestedItemCount,
		teacherFingerprint: preferences?.teacherFingerprint ?? null,
		unitFingerprint: preferences?.unitFingerprint ?? null,
    };
}

export async function buildIntentPayload<T extends BuiltIntentType>(request: IntentRequest & { intentType: T }, prismSessionContext: PrismSessionContext): Promise<IntentPayloadByType[T]> {
	const teacherId = getStringOption(request.options, "teacherId");
	const unitId = getStringOption(request.options, "unitId");
	const conceptBlueprint = request.intentType === "build-test" ? getConceptBlueprintOption(request.options) : null;
	const preferences = request.intentType === "build-test" && teacherId
		? {
			teacherFingerprint: await getTeacherFingerprint(teacherId),
			unitFingerprint: unitId ? await getUnitFingerprint(teacherId, unitId) : null,
		}
		: undefined;
	const initialRequest = request.intentType === "build-test" && conceptBlueprint
		? withItemCountOverride(request, estimateBlueprintSeedItemCount(request.options, conceptBlueprint.edits))
		: request;
	const initialContext = buildBuilderContext(initialRequest, prismSessionContext, preferences);
	let payload = cleanupProductPayload(BUILDERS[request.intentType](initialContext as BuilderContext<T>)) as IntentPayloadByType[T];

	if (request.intentType === "build-test" && conceptBlueprint) {
		const assessmentId = conceptBlueprint.assessmentId ?? getStringOption(request.options, "assessmentId") ?? `${request.sessionId}-concept-blueprint`;
		const previewTeacherId = teacherId ?? conceptBlueprint.teacherId ?? "concept-blueprint-preview";
		const previewUnitId = unitId ?? conceptBlueprint.unitId ?? undefined;
		const previewAssessment = applyAssessmentFingerprintEdits({
			assessment: buildAssessmentFingerprint({
				teacherId: previewTeacherId,
				assessmentId,
				unitId: previewUnitId,
				product: payload as TestProduct,
				sourceType: "generated",
			}),
			edits: conceptBlueprint.edits,
		});
		const effectivePreferences = {
			teacherFingerprint: mergeAssessmentIntoTeacherFingerprint({
				previous: preferences?.teacherFingerprint ?? null,
				assessment: previewAssessment,
				alpha: 1,
				now: previewAssessment.lastUpdated,
			}),
			unitFingerprint: previewUnitId || preferences?.unitFingerprint
				? mergeAssessmentIntoUnitFingerprint({
					previous: preferences?.unitFingerprint ?? null,
					assessment: previewAssessment,
					alpha: 1,
					now: previewAssessment.lastUpdated,
				})
				: null,
		};
		const finalContext = buildBuilderContext(request, prismSessionContext, effectivePreferences);
		payload = cleanupProductPayload(BUILDERS[request.intentType](finalContext as BuilderContext<T>)) as IntentPayloadByType[T];
	}

	if (request.intentType === "build-test" && teacherId) {
		const assessmentId = getStringOption(request.options, "assessmentId") ?? `${request.sessionId}-generated-assessment`;
		await saveAssessmentFingerprint(buildAssessmentFingerprint({
			teacherId,
			assessmentId,
			unitId: unitId ?? undefined,
			product: payload as TestProduct,
			sourceType: "generated",
		}));
	}
	return payload;
}

export function getIntentBuildErrorStatus(error: unknown) {
	return error instanceof IntentBuildError ? error.statusCode : 500;
}