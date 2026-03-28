import type { ExtractedProblemCognitiveDemand, TestItem, TestItemExplanation, TestProduct } from "../schema/integration/IntentProduct";

export type BloomLevel =
	| "remember"
	| "understand"
	| "apply"
	| "analyze"
	| "evaluate"
	| "create";

export type ScenarioType =
	| "real-world"
	| "simulation"
	| "data-table"
	| "graphical"
	| "abstract-symbolic";

export type ScenarioDirective = "keep-context-change-numbers";

export type ItemMode =
	| "identify"
	| "state"
	| "interpret"
	| "compare"
	| "apply"
	| "analyze"
	| "evaluate"
	| "explain"
	| "construct";

export interface ConceptProfile {
	conceptId: string;
	displayName: string;
	frequencyWeight: number;
	absoluteItemHint?: number;
	lowEmphasis?: boolean;
	bloomDistribution: Record<BloomLevel, number>;
	scenarioPatterns: ScenarioType[];
	scenarioDirective?: ScenarioDirective;
	itemModes: ItemMode[];
	maxBloomLevel: BloomLevel;
}

export interface AssessmentFlowProfile {
	sectionOrder: string[];
	typicalLengthRange: [number, number];
	cognitiveLadderShape: BloomLevel[];
}

export interface TeacherFingerprint {
	teacherId: string;
	globalConceptProfiles: ConceptProfile[];
	defaultBloomDistribution: Record<BloomLevel, number>;
	defaultScenarioPreferences: ScenarioType[];
	defaultItemModes: ItemMode[];
	flowProfile: AssessmentFlowProfile;
	lastUpdated: string;
	version: number;
}

export interface UnitFingerprint {
	teacherId: string;
	unitId: string;
	conceptProfiles: ConceptProfile[];
	flowProfile: AssessmentFlowProfile;
	derivedFromAssessmentIds: string[];
	lastUpdated: string;
	version: number;
}

export interface AssessmentFingerprint {
	teacherId: string;
	assessmentId: string;
	unitId?: string;
	conceptProfiles: ConceptProfile[];
	flowProfile: AssessmentFlowProfile;
	itemCount: number;
	sourceType: "uploaded" | "generated" | "hybrid";
	lastUpdated: string;
	version: number;
}

export interface AssessmentFingerprintConceptInput {
	conceptId?: string;
	displayName: string;
	absoluteItemHint?: number;
	maxBloomLevel?: BloomLevel;
	scenarioPatterns?: ScenarioType[];
	scenarioDirective?: ScenarioDirective;
	itemModes?: ItemMode[];
}

export interface AssessmentFingerprintMergeInput {
	conceptIds: string[];
	mergedConceptId: string;
	displayName?: string;
}

export interface AssessmentFingerprintEdits {
	removeConceptIds?: string[];
	addConcepts?: AssessmentFingerprintConceptInput[];
	mergeConcepts?: AssessmentFingerprintMergeInput[];
	itemCountOverrides?: Record<string, number>;
	bloomDistributions?: Record<string, Partial<Record<BloomLevel, number>>>;
	bloomCeilings?: Record<string, BloomLevel>;
	bloomLevelAppends?: Record<string, BloomLevel[]>;
	scenarioOverrides?: Record<string, ScenarioType[]>;
	scenarioDirectives?: Record<string, ScenarioDirective>;
	sectionOrder?: string[];
	now?: string;
}

export interface FingerprintAlignmentExplanation {
	narrative: string;
	conceptReasons: string[];
	bloomReason: string;
	scenarioReason: string;
	flowReason: string;
}

export interface TestProductItemAlignmentExplanation {
	itemId: string;
	explanation: TestItemExplanation;
}

const BLOOM_LEVELS: BloomLevel[] = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
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

function unique<T>(values: T[]) {
	return [...new Set(values)];
}

function createEmptyBloomDistribution(): Record<BloomLevel, number> {
	return {
		remember: 0,
		understand: 0,
		apply: 0,
		analyze: 0,
		evaluate: 0,
		create: 0,
	};
}

function createSingleBloomDistribution(level: BloomLevel): Record<BloomLevel, number> {
	const distribution = createEmptyBloomDistribution();
	distribution[level] = 1;
	return distribution;
}

function normalizeText(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9\s-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function canonicalConceptId(value: string) {
	return normalizeText(value).replace(/\s+/g, "-");
}

export function compareBloomLevels(left: BloomLevel, right: BloomLevel) {
	return BLOOM_LEVELS.indexOf(left) - BLOOM_LEVELS.indexOf(right);
}

export function createDefaultConceptProfile(input: AssessmentFingerprintConceptInput): ConceptProfile {
	const conceptId = input.conceptId ? canonicalConceptId(input.conceptId) : canonicalConceptId(input.displayName);
	const absoluteItemHint = Math.max(1, input.absoluteItemHint ?? 1);
	const maxBloomLevel = input.maxBloomLevel ?? "understand";
	return {
		conceptId,
		displayName: input.displayName,
		frequencyWeight: 0,
		absoluteItemHint,
		lowEmphasis: true,
		bloomDistribution: createSingleBloomDistribution(maxBloomLevel),
		scenarioPatterns: unique(input.scenarioPatterns?.length ? input.scenarioPatterns : ["abstract-symbolic"]),
		scenarioDirective: input.scenarioDirective,
		itemModes: unique(input.itemModes?.length ? input.itemModes : ["explain"]),
		maxBloomLevel,
	};
}

export function classifyItemModes(prompt: string): ItemMode[] {
	const normalized = normalizeText(prompt);
	const modes: ItemMode[] = [];

	if (/construct|design|write your own|create your own/.test(normalized)) {
		modes.push("construct");
	}
	if (/which error is more serious|do you agree|evaluate|assess whether|judge|justify your decision|justify the decision/.test(normalized)) {
		modes.push("evaluate");
	}
	if (/analyze|justify|why does|why do|explain why| and why\b|which .* more serious/.test(normalized)) {
		modes.push("analyze");
	}
	if (/use this|based on this|apply|make the decision|decide whether/.test(normalized)) {
		modes.push("apply");
	}
	if (/compare|versus|vs\b|larger|smaller|more than|less than/.test(normalized)) {
		modes.push("compare");
	}
	if (/interpret|what does this result mean|what does the p value mean|what does the graph show/.test(normalized)) {
		modes.push("interpret");
	}
	if (/state the|null hypothesis|alternative hypothesis|write hypotheses|write h0|write ha/.test(normalized)) {
		modes.push("state");
	}
	if (/identify|name|what is the parameter|what is the statistic|which of the following/.test(normalized)) {
		modes.push("identify");
	}
	if (/describe|explain|what does .* mean/.test(normalized)) {
		modes.push("explain");
	}

	return unique(modes.length > 0 ? modes : ["explain"]);
}

export function classifyBloomLevel(prompt: string): BloomLevel {
	const modes = classifyItemModes(prompt);
	let highestIndex = 0;
	for (const mode of modes) {
		const bloom = ITEM_MODE_TO_BLOOM[mode];
		highestIndex = Math.max(highestIndex, BLOOM_LEVELS.indexOf(bloom));
	}
	return BLOOM_LEVELS[highestIndex] ?? "understand";
}

function bloomFromCognitiveDemand(value: ExtractedProblemCognitiveDemand): BloomLevel {
	switch (value) {
		case "recall":
			return "remember";
		case "procedural":
			return "apply";
		case "conceptual":
			return "understand";
		case "modeling":
			return "analyze";
		case "analysis":
			return "analyze";
		default:
			return "understand";
	}
}

export function classifyScenarioTypes(prompt: string): ScenarioType[] {
	const normalized = normalizeText(prompt);
	const scenarios: ScenarioType[] = [];

	if (/simulation|resampling|repeated samples|randomization|sampling distribution|dotplot/.test(normalized)) {
		scenarios.push("simulation");
	}
	if (/table below|following data|data table|the table shows|values below/.test(normalized)) {
		scenarios.push("data-table");
	}
	if (/graph|histogram|boxplot|scatterplot|line plot|dotplot|chart/.test(normalized)) {
		scenarios.push("graphical");
	}
	if (/restaurant|construction zone|class study|survey|money|income|students|school|voter|population|city|minutes|dollars|flint water|water quality/.test(normalized)) {
		scenarios.push("real-world");
	}
	if (scenarios.length === 0 && (/\bx\b|\by\b|\bmu\b|\bsigma\b|equation|expression|symbol/.test(normalized) || /[=<>+\-/*]/.test(prompt))) {
		scenarios.push("abstract-symbolic");
	}

	return unique(scenarios.length > 0 ? scenarios : ["abstract-symbolic"]);
}

function normalizeDistribution(counts: Record<BloomLevel, number>) {
	const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
	if (total <= 0) {
		return createEmptyBloomDistribution();
	}

	return BLOOM_LEVELS.reduce<Record<BloomLevel, number>>((distribution, level) => {
		distribution[level] = Number(((counts[level] ?? 0) / total).toFixed(4));
		return distribution;
	}, createEmptyBloomDistribution());
}

function capDistributionAtBloomLevel(distribution: Record<BloomLevel, number>, maxBloomLevel: BloomLevel) {
	const capped = createEmptyBloomDistribution();
	for (const level of BLOOM_LEVELS) {
		if (compareBloomLevels(level, maxBloomLevel) <= 0) {
			capped[level] = distribution[level] ?? 0;
		}
	}
	const total = Object.values(capped).reduce((sum, value) => sum + value, 0);
	if (total <= 0) {
		return createSingleBloomDistribution(maxBloomLevel);
	}
	return normalizeDistribution(capped);
}

function highestBloomLevel(distribution: Record<BloomLevel, number>) {
	for (const level of [...BLOOM_LEVELS].reverse()) {
		if ((distribution[level] ?? 0) > 0) {
			return level;
		}
	}
	return "remember";
}

function aggregateByFrequency<T extends string>(values: T[]) {
	const counts = new Map<T, number>();
	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	return [...counts.entries()]
		.sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
		.map(([value]) => value);
}

function isLowEmphasisProfile(profile: Pick<ConceptProfile, "frequencyWeight" | "absoluteItemHint">) {
	return (profile.absoluteItemHint ?? 0) <= 1 || (profile.frequencyWeight ?? 0) <= 0.15;
}

function cloneConceptProfile(profile: ConceptProfile): ConceptProfile {
	return {
		...profile,
		bloomDistribution: { ...profile.bloomDistribution },
		scenarioPatterns: [...profile.scenarioPatterns],
		scenarioDirective: profile.scenarioDirective,
		itemModes: [...profile.itemModes],
	};
}

function normalizeConceptProfiles(concepts: ConceptProfile[]) {
	const totalItems = concepts.reduce((sum, concept) => sum + Math.max(0, concept.absoluteItemHint ?? 0), 0);
	return concepts.map((concept) => {
		const absoluteItemHint = Math.max(1, concept.absoluteItemHint ?? 1);
		const frequencyWeight = totalItems > 0 ? Number((absoluteItemHint / totalItems).toFixed(4)) : 0;
		const normalizedProfile = {
			...concept,
			absoluteItemHint,
			frequencyWeight,
			lowEmphasis: isLowEmphasisProfile({ absoluteItemHint, frequencyWeight }),
			bloomDistribution: capDistributionAtBloomLevel(concept.bloomDistribution, concept.maxBloomLevel),
		};
		return normalizedProfile;
	}).sort((left, right) => right.frequencyWeight - left.frequencyWeight || left.displayName.localeCompare(right.displayName));
}

function buildMergedConceptProfile(profiles: ConceptProfile[], merge: AssessmentFingerprintMergeInput): ConceptProfile {
	const totalItems = profiles.reduce((sum, profile) => sum + Math.max(1, profile.absoluteItemHint ?? 1), 0);
	const bloomDistribution = createEmptyBloomDistribution();
	for (const profile of profiles) {
		const weight = Math.max(1, profile.absoluteItemHint ?? 1);
		for (const level of BLOOM_LEVELS) {
			bloomDistribution[level] += (profile.bloomDistribution[level] ?? 0) * weight;
		}
	}
	const normalizedBloom = totalItems > 0
		? BLOOM_LEVELS.reduce<Record<BloomLevel, number>>((distribution, level) => {
			distribution[level] = Number((bloomDistribution[level] / totalItems).toFixed(4));
			return distribution;
		}, createEmptyBloomDistribution())
		: createSingleBloomDistribution("understand");
	const maxBloomLevel = profiles.reduce<BloomLevel>((current, profile) => compareBloomLevels(profile.maxBloomLevel, current) > 0 ? profile.maxBloomLevel : current, "remember");
	return {
		conceptId: canonicalConceptId(merge.mergedConceptId),
		displayName: merge.displayName ?? profiles[0]?.displayName ?? merge.mergedConceptId,
		frequencyWeight: 0,
		absoluteItemHint: totalItems,
		lowEmphasis: totalItems <= 1,
		bloomDistribution: normalizedBloom,
		scenarioPatterns: aggregateByFrequency(profiles.flatMap((profile) => profile.scenarioPatterns)),
		scenarioDirective: profiles.find((profile) => profile.scenarioDirective)?.scenarioDirective,
		itemModes: aggregateByFrequency(profiles.flatMap((profile) => profile.itemModes)),
		maxBloomLevel,
	};
}

function updateSectionOrder(args: {
	sectionOrder: string[];
	removed: Set<string>;
	merges: AssessmentFingerprintMergeInput[];
	additions: string[];
	conceptProfiles: ConceptProfile[];
}) {
	const mergedBySource = new Map<string, string>();
	for (const merge of args.merges) {
		const mergedId = canonicalConceptId(merge.mergedConceptId);
		for (const conceptId of merge.conceptIds) {
			mergedBySource.set(canonicalConceptId(conceptId), mergedId);
		}
	}

	const nextOrder: string[] = [];
	for (const conceptId of args.sectionOrder) {
		const canonical = canonicalConceptId(conceptId);
		if (args.removed.has(canonical)) {
			continue;
		}
		const replaced = mergedBySource.get(canonical) ?? canonical;
		if (!nextOrder.includes(replaced)) {
			nextOrder.push(replaced);
		}
	}

	for (const addition of args.additions.map((conceptId) => canonicalConceptId(conceptId))) {
		if (!nextOrder.includes(addition)) {
			nextOrder.push(addition);
		}
	}

	for (const profile of args.conceptProfiles) {
		if (!nextOrder.includes(profile.conceptId)) {
			nextOrder.push(profile.conceptId);
		}
	}

	return nextOrder;
}

export function buildAssessmentFingerprint(args: {
	teacherId: string;
	assessmentId: string;
	product: TestProduct;
	unitId?: string;
	sourceType?: AssessmentFingerprint["sourceType"];
	now?: string;
}): AssessmentFingerprint {
	const { teacherId, assessmentId, product, unitId, sourceType = "generated", now = new Date().toISOString() } = args;
	const totalItems = product.sections.reduce((sum, section) => sum + section.items.length, 0);
	const conceptProfiles = product.sections.map((section) => {
		const conceptId = canonicalConceptId(section.concept || section.items[0]?.concept || "general");
		const bloomCounts = createEmptyBloomDistribution();
		const itemModes = section.items.flatMap((item) => classifyItemModes(item.prompt));
		const scenarioPatterns = section.items.flatMap((item) => classifyScenarioTypes(item.prompt));

		for (const item of section.items) {
			const promptBloom = classifyBloomLevel(item.prompt);
			const demandBloom = bloomFromCognitiveDemand(item.cognitiveDemand);
			const bloom = BLOOM_LEVELS[Math.max(BLOOM_LEVELS.indexOf(promptBloom), BLOOM_LEVELS.indexOf(demandBloom))] ?? promptBloom;
			bloomCounts[bloom] += 1;
		}

		const bloomDistribution = normalizeDistribution(bloomCounts);
		return {
			conceptId,
			displayName: section.concept,
			frequencyWeight: totalItems > 0 ? Number((section.items.length / totalItems).toFixed(4)) : 0,
			absoluteItemHint: section.items.length,
			lowEmphasis: section.items.length <= 1,
			bloomDistribution,
			scenarioPatterns: aggregateByFrequency(scenarioPatterns),
			scenarioDirective: undefined,
			itemModes: aggregateByFrequency(itemModes),
			maxBloomLevel: highestBloomLevel(bloomDistribution),
		};
	});

	const ladder = unique(product.sections.flatMap((section) => section.items.map((item) => classifyBloomLevel(item.prompt))));
	return {
		teacherId,
		assessmentId,
		unitId,
		conceptProfiles,
		flowProfile: {
			sectionOrder: product.sections.map((section) => canonicalConceptId(section.concept)),
			typicalLengthRange: [product.totalItemCount, product.totalItemCount],
			cognitiveLadderShape: ladder,
		},
		itemCount: product.totalItemCount,
		sourceType,
		lastUpdated: now,
		version: 1,
	};
}

function ema(previous: number, current: number, alpha: number) {
	return Number((alpha * current + (1 - alpha) * previous).toFixed(4));
}

function mergeConceptProfiles(previous: ConceptProfile[], current: ConceptProfile[], alpha: number) {
	const merged = new Map<string, ConceptProfile>();
	for (const profile of previous) {
		merged.set(profile.conceptId, profile);
	}
	for (const profile of current) {
		const existing = merged.get(profile.conceptId);
		if (!existing) {
			merged.set(profile.conceptId, profile);
			continue;
		}

		const bloomDistribution = BLOOM_LEVELS.reduce<Record<BloomLevel, number>>((distribution, level) => {
			distribution[level] = ema(existing.bloomDistribution[level] ?? 0, profile.bloomDistribution[level] ?? 0, alpha);
			return distribution;
		}, createEmptyBloomDistribution());

		merged.set(profile.conceptId, {
			conceptId: profile.conceptId,
			displayName: profile.displayName || existing.displayName,
			frequencyWeight: ema(existing.frequencyWeight, profile.frequencyWeight, alpha),
			absoluteItemHint: Math.max(1, Math.round(ema(existing.absoluteItemHint ?? 0, profile.absoluteItemHint ?? 0, alpha))),
			lowEmphasis: false,
			bloomDistribution,
			scenarioPatterns: aggregateByFrequency([...existing.scenarioPatterns, ...profile.scenarioPatterns]),
			scenarioDirective: profile.scenarioDirective ?? existing.scenarioDirective,
			itemModes: aggregateByFrequency([...existing.itemModes, ...profile.itemModes]),
			maxBloomLevel: BLOOM_LEVELS[Math.max(BLOOM_LEVELS.indexOf(existing.maxBloomLevel), BLOOM_LEVELS.indexOf(profile.maxBloomLevel))] ?? profile.maxBloomLevel,
		});
	}

	return normalizeConceptProfiles([...merged.values()]);
}

function aggregateBloomDistribution(concepts: ConceptProfile[]) {
	const counts = createEmptyBloomDistribution();
	for (const concept of concepts) {
		for (const level of BLOOM_LEVELS) {
			counts[level] += concept.bloomDistribution[level] ?? 0;
		}
	}
	return normalizeDistribution(counts);
}

function aggregateScenarioPreferences(concepts: ConceptProfile[]) {
	return aggregateByFrequency(concepts.flatMap((concept) => concept.scenarioPatterns));
}

function aggregateItemModes(concepts: ConceptProfile[]) {
	return aggregateByFrequency(concepts.flatMap((concept) => concept.itemModes));
}

export function mergeAssessmentIntoUnitFingerprint(args: {
	previous?: UnitFingerprint | null;
	assessment: AssessmentFingerprint;
	alpha?: number;
	now?: string;
}): UnitFingerprint {
	const { previous, assessment, alpha = 0.7, now = new Date().toISOString() } = args;
	const conceptProfiles = mergeConceptProfiles(previous?.conceptProfiles ?? [], assessment.conceptProfiles, alpha);
	return {
		teacherId: assessment.teacherId,
		unitId: assessment.unitId ?? previous?.unitId ?? "unassigned-unit",
		conceptProfiles,
		flowProfile: {
			sectionOrder: assessment.flowProfile.sectionOrder.length > 0 ? assessment.flowProfile.sectionOrder : previous?.flowProfile.sectionOrder ?? [],
			typicalLengthRange: [
				Math.min(previous?.flowProfile.typicalLengthRange[0] ?? assessment.flowProfile.typicalLengthRange[0], assessment.flowProfile.typicalLengthRange[0]),
				Math.max(previous?.flowProfile.typicalLengthRange[1] ?? assessment.flowProfile.typicalLengthRange[1], assessment.flowProfile.typicalLengthRange[1]),
			],
			cognitiveLadderShape: assessment.flowProfile.cognitiveLadderShape.length > 0 ? assessment.flowProfile.cognitiveLadderShape : previous?.flowProfile.cognitiveLadderShape ?? [],
		},
		derivedFromAssessmentIds: unique([...(previous?.derivedFromAssessmentIds ?? []), assessment.assessmentId]),
		lastUpdated: now,
		version: (previous?.version ?? 0) + 1,
	};
}

export function mergeAssessmentIntoTeacherFingerprint(args: {
	previous?: TeacherFingerprint | null;
	assessment: AssessmentFingerprint;
	alpha?: number;
	now?: string;
}): TeacherFingerprint {
	const { previous, assessment, alpha = 0.7, now = new Date().toISOString() } = args;
	const globalConceptProfiles = mergeConceptProfiles(previous?.globalConceptProfiles ?? [], assessment.conceptProfiles, alpha);
	return {
		teacherId: assessment.teacherId,
		globalConceptProfiles,
		defaultBloomDistribution: aggregateBloomDistribution(globalConceptProfiles),
		defaultScenarioPreferences: aggregateScenarioPreferences(globalConceptProfiles),
		defaultItemModes: aggregateItemModes(globalConceptProfiles),
		flowProfile: {
			sectionOrder: assessment.flowProfile.sectionOrder.length > 0 ? assessment.flowProfile.sectionOrder : previous?.flowProfile.sectionOrder ?? [],
			typicalLengthRange: [
				Math.min(previous?.flowProfile.typicalLengthRange[0] ?? assessment.flowProfile.typicalLengthRange[0], assessment.flowProfile.typicalLengthRange[0]),
				Math.max(previous?.flowProfile.typicalLengthRange[1] ?? assessment.flowProfile.typicalLengthRange[1], assessment.flowProfile.typicalLengthRange[1]),
			],
			cognitiveLadderShape: assessment.flowProfile.cognitiveLadderShape.length > 0 ? assessment.flowProfile.cognitiveLadderShape : previous?.flowProfile.cognitiveLadderShape ?? [],
		},
		lastUpdated: now,
		version: (previous?.version ?? 0) + 1,
	};
}

export function deriveItemCounts(args: {
	concepts: ConceptProfile[];
	flowProfile: AssessmentFlowProfile;
	overrides?: Record<string, number>;
}): Record<string, number> {
	if (args.overrides) {
		return args.overrides;
	}

	const target = Math.max(args.flowProfile.typicalLengthRange[0], args.flowProfile.typicalLengthRange[1], args.concepts.length);
	const weightSum = args.concepts.reduce((sum, concept) => sum + (concept.frequencyWeight || 0), 0) || args.concepts.length;
	const counts: Record<string, number> = {};
	for (const concept of args.concepts) {
		const normalizedWeight = (concept.frequencyWeight || (1 / Math.max(args.concepts.length, 1))) / weightSum;
		counts[concept.conceptId] = concept.absoluteItemHint ?? Math.max(1, Math.round(normalizedWeight * target));
	}
	return counts;
}

export function applyAssessmentFingerprintEdits(args: {
	assessment: AssessmentFingerprint;
	edits: AssessmentFingerprintEdits;
}): AssessmentFingerprint {
	const { assessment, edits } = args;
	const profiles = new Map(assessment.conceptProfiles.map((profile) => [profile.conceptId, cloneConceptProfile(profile)]));
	const removed = new Set((edits.removeConceptIds ?? []).map((conceptId) => canonicalConceptId(conceptId)));
	for (const conceptId of removed) {
		profiles.delete(conceptId);
	}

	for (const merge of edits.mergeConcepts ?? []) {
		const sourceProfiles = merge.conceptIds
			.map((conceptId) => profiles.get(canonicalConceptId(conceptId)))
			.filter((profile): profile is ConceptProfile => Boolean(profile));
		if (sourceProfiles.length === 0) {
			continue;
		}
		for (const conceptId of merge.conceptIds) {
			profiles.delete(canonicalConceptId(conceptId));
			removed.add(canonicalConceptId(conceptId));
		}
		const mergedProfile = buildMergedConceptProfile(sourceProfiles, merge);
		profiles.set(mergedProfile.conceptId, mergedProfile);
	}

	for (const addition of edits.addConcepts ?? []) {
		const profile = createDefaultConceptProfile(addition);
		profiles.set(profile.conceptId, profile);
	}

	for (const [conceptId, itemCount] of Object.entries(edits.itemCountOverrides ?? {})) {
		const canonical = canonicalConceptId(conceptId);
		const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical, absoluteItemHint: itemCount });
		existing.absoluteItemHint = Math.max(1, itemCount);
		profiles.set(canonical, existing);
	}

	for (const [conceptId, override] of Object.entries(edits.bloomDistributions ?? {})) {
		const canonical = canonicalConceptId(conceptId);
		const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical });
		const counts = createEmptyBloomDistribution();
		let hasAnyLevel = false;
		for (const level of BLOOM_LEVELS) {
			const value = override[level];
			if (typeof value === "number" && Number.isFinite(value) && value > 0) {
				counts[level] = value;
				hasAnyLevel = true;
			}
		}
		if (!hasAnyLevel) {
			continue;
		}
		existing.bloomDistribution = normalizeDistribution(counts);
		existing.maxBloomLevel = highestBloomLevel(existing.bloomDistribution);
		profiles.set(canonical, existing);
	}

	for (const [conceptId, maxBloomLevel] of Object.entries(edits.bloomCeilings ?? {})) {
		const canonical = canonicalConceptId(conceptId);
		const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical, maxBloomLevel });
		existing.maxBloomLevel = maxBloomLevel;
		existing.bloomDistribution = capDistributionAtBloomLevel(existing.bloomDistribution, maxBloomLevel);
		profiles.set(canonical, existing);
	}

	for (const [conceptId, appendedLevels] of Object.entries(edits.bloomLevelAppends ?? {})) {
		const canonical = canonicalConceptId(conceptId);
		const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical });
		const baseCount = Math.max(1, existing.absoluteItemHint ?? 1);
		const counts = BLOOM_LEVELS.reduce<Record<BloomLevel, number>>((distribution, level) => {
			distribution[level] = (existing.bloomDistribution[level] ?? 0) * baseCount;
			return distribution;
		}, createEmptyBloomDistribution());
		for (const level of appendedLevels) {
			counts[level] += 1;
		}
		existing.absoluteItemHint = baseCount + appendedLevels.length;
		existing.bloomDistribution = normalizeDistribution(counts);
		existing.maxBloomLevel = highestBloomLevel(existing.bloomDistribution);
		profiles.set(canonical, existing);
	}

	for (const [conceptId, scenarios] of Object.entries(edits.scenarioOverrides ?? {})) {
		const canonical = canonicalConceptId(conceptId);
		const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical, scenarioPatterns: scenarios });
		existing.scenarioPatterns = unique(scenarios);
		profiles.set(canonical, existing);
	}

	for (const [conceptId, scenarioDirective] of Object.entries(edits.scenarioDirectives ?? {})) {
		const canonical = canonicalConceptId(conceptId);
		const existing = profiles.get(canonical) ?? createDefaultConceptProfile({ displayName: conceptId, conceptId: canonical, scenarioDirective });
		existing.scenarioDirective = scenarioDirective;
		profiles.set(canonical, existing);
	}

	const normalizedProfiles = normalizeConceptProfiles([...profiles.values()]);
	const additions = (edits.addConcepts ?? []).map((concept) => concept.conceptId ?? concept.displayName);
	const nextSectionOrder = updateSectionOrder({
		sectionOrder: edits.sectionOrder ?? assessment.flowProfile.sectionOrder,
		removed,
		merges: edits.mergeConcepts ?? [],
		additions,
		conceptProfiles: normalizedProfiles,
	});

	return {
		...assessment,
		conceptProfiles: normalizedProfiles,
		flowProfile: {
			...assessment.flowProfile,
			sectionOrder: nextSectionOrder,
		},
		itemCount: normalizedProfiles.reduce((sum, concept) => sum + Math.max(1, concept.absoluteItemHint ?? 1), 0),
		lastUpdated: edits.now ?? new Date().toISOString(),
		version: assessment.version + 1,
	};
}

export function explainFingerprintAlignment(args: {
	assessment: AssessmentFingerprint;
	teacherFingerprint: TeacherFingerprint;
	unitFingerprint?: UnitFingerprint | null;
}): FingerprintAlignmentExplanation {
	const sourceProfiles = args.unitFingerprint?.conceptProfiles ?? args.teacherFingerprint.globalConceptProfiles;
	const conceptReasons = args.assessment.conceptProfiles.map((concept) => {
		const reference = sourceProfiles.find((profile) => profile.conceptId === concept.conceptId);
		const targetCount = reference?.absoluteItemHint ?? concept.absoluteItemHint ?? 0;
		return `${concept.displayName} appears because the teacher fingerprint emphasizes it with about ${targetCount} item${targetCount === 1 ? "" : "s"}.`;
	});
	const sectionOrder = args.assessment.flowProfile.sectionOrder.join(" -> ");
	const bloomReason = `Bloom levels follow the stored ceiling and distribution, topping out at ${args.assessment.conceptProfiles.map((concept) => concept.maxBloomLevel).sort((left, right) => compareBloomLevels(left, right)).at(-1) ?? "understand"}.`;
	const scenarioDirectiveReason = args.assessment.conceptProfiles
		.filter((concept) => concept.scenarioDirective)
		.map((concept) => `${concept.displayName} keeps the original context while changing the numbers.`);
	const scenarioReason = `Scenario choices reflect preferred contexts: ${(args.teacherFingerprint.defaultScenarioPreferences.length > 0 ? args.teacherFingerprint.defaultScenarioPreferences : args.assessment.conceptProfiles.flatMap((concept) => concept.scenarioPatterns)).join(", ")}.${scenarioDirectiveReason.length > 0 ? ` ${scenarioDirectiveReason.join(" ")}` : ""}`;
	const flowReason = `Section order follows the teacher flow profile: ${sectionOrder || "no fixed sequence"}.`;
	return {
		narrative: [
			`This assessment matches the teacher fingerprint by emphasizing ${args.assessment.conceptProfiles.map((concept) => concept.displayName).join(", ")}.`,
			...conceptReasons,
			bloomReason,
			scenarioReason,
			flowReason,
		].join(" "),
		conceptReasons,
		bloomReason,
		scenarioReason,
		flowReason,
	};
}

function explainEffectiveBloomLevel(item: TestItem) {
	const promptLevel = classifyBloomLevel(item.prompt);
	const demandLevel = bloomFromCognitiveDemand(item.cognitiveDemand);
	return compareBloomLevels(promptLevel, demandLevel) >= 0 ? promptLevel : demandLevel;
}

export function explainTestItemAlignment(args: {
	product: TestProduct;
	teacherFingerprint: TeacherFingerprint;
	unitFingerprint?: UnitFingerprint | null;
}): TestProductItemAlignmentExplanation[] {
	const sourceProfiles = args.unitFingerprint?.conceptProfiles ?? args.teacherFingerprint.globalConceptProfiles;
	return args.product.sections.flatMap((section) => {
		const conceptId = canonicalConceptId(section.concept);
		const profile = sourceProfiles.find((entry) => entry.conceptId === conceptId);
		const preferredScenarios = profile?.scenarioPatterns.length ? profile.scenarioPatterns : args.teacherFingerprint.defaultScenarioPreferences;
		const preferredModes = profile?.itemModes.length ? profile.itemModes : args.teacherFingerprint.defaultItemModes;
		const requestedCount = profile?.absoluteItemHint ?? section.items.length;

		return section.items.map((item, index) => {
			const bloomLevel = explainEffectiveBloomLevel(item);
			const scenarioTypes = classifyScenarioTypes(item.prompt);
			const itemModes = classifyItemModes(item.prompt);
			const conceptReason = profile
				? `${profile.displayName} appears here because the blueprint targets about ${requestedCount} item${requestedCount === 1 ? "" : "s"} for this concept.`
				: `${section.concept} appears here because it remains part of the fingerprint-conditioned assessment coverage.`;
			const bloomReason = profile
				? `${bloomLevel} was selected because ${profile.displayName} tops out at ${profile.maxBloomLevel} and the stored distribution emphasizes ${Object.entries(profile.bloomDistribution).filter(([, weight]) => weight > 0).map(([level]) => level).join(", ")}.`
				: `${bloomLevel} was inferred from the prompt and cognitive demand for this item.`;
			const scenarioReason = preferredScenarios.length > 0
				? `${scenarioTypes.join(", ") || "abstract-symbolic"} was kept because the fingerprint prefers ${preferredScenarios.join(", ")} scenarios for this concept.`
				: `${scenarioTypes.join(", ") || "abstract-symbolic"} was inferred directly from the prompt context.`;
			const itemModeReason = preferredModes.length > 0
				? `${itemModes.join(", ")} fits the fingerprint preference for ${preferredModes.join(", ")} on ${profile?.displayName ?? section.concept}.`
				: `${itemModes.join(", ")} was inferred from the verbs and structure of the prompt.`;
			return {
				itemId: item.itemId,
				explanation: {
					conceptId,
					conceptReason,
					bloomLevel,
					bloomReason,
					scenarioTypes,
					scenarioReason,
					itemModes,
					itemModeReason,
					narrative: [
						conceptReason,
						bloomReason,
						scenarioReason,
						itemModeReason,
						`This is item ${index + 1} in the ${section.concept} section.`,
					].join(" "),
				},
			};
		});
	});
}