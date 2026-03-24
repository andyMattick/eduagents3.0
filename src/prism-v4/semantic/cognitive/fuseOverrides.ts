import type { Problem } from "../../schema/domain";
import type { ValidatedOverrides } from "../../teacherFeedback";

const IMMUTABLE_KEYS = new Set(["canonicalProblemId", "rootProblemId", "parentProblemId", "displayOrder", "createdAt"]);

export function fuseOverrides(problem: Problem, overrides: ValidatedOverrides | null | undefined): Problem {
	if (!overrides) {
		if (problem.tags?.reasoning) {
			problem.tags.reasoning.overridesApplied = false;
		}
		return problem;
	}

	const next = {
		...problem,
		tags: {
			...(problem.tags ?? {}),
		},
	};

	if (overrides.bloom) {
		next.tags!.bloom = overrides.bloom;
		next.tags!.cognitive = {
			...next.tags!.cognitive,
			bloom: overrides.bloom,
		};
	}
	if (typeof overrides.difficulty === "number") {
		next.tags!.difficulty = overrides.difficulty;
		next.tags!.cognitive = { ...next.tags!.cognitive, difficulty: overrides.difficulty };
	}
	if (typeof overrides.linguisticLoad === "number") {
		next.tags!.linguisticLoad = overrides.linguisticLoad;
		next.tags!.cognitive = { ...next.tags!.cognitive, linguisticLoad: overrides.linguisticLoad };
	}
	if (typeof overrides.abstractionLevel === "number") {
		next.tags!.abstractionLevel = overrides.abstractionLevel;
		next.tags!.cognitive = { ...next.tags!.cognitive, abstractionLevel: overrides.abstractionLevel };
	}
	if (typeof overrides.multiStep === "number") {
		next.tags!.multiStep = overrides.multiStep;
		next.tags!.cognitive = { ...next.tags!.cognitive, multiStep: overrides.multiStep };
	}
	if (typeof overrides.representationComplexity === "number") {
		next.tags!.cognitive = { ...next.tags!.cognitive, representationComplexity: overrides.representationComplexity };
	}
	if (typeof overrides.misconceptionRisk === "number") {
		next.tags!.cognitive = { ...next.tags!.cognitive, misconceptionRisk: overrides.misconceptionRisk };
	}
	if (overrides.concepts) {
		next.tags!.concepts = overrides.concepts;
	}
	if (overrides.subject) {
		next.tags!.subject = overrides.subject;
	}
	if (overrides.domain) {
		next.tags!.domain = overrides.domain;
	}
	if (typeof overrides.stemText === "string" && !IMMUTABLE_KEYS.has("stemText")) {
		next.stemText = overrides.stemText;
	}
	if (typeof overrides.partText === "string" && !IMMUTABLE_KEYS.has("partText")) {
		next.partText = overrides.partText;
	}
	if (overrides.tags) {
		next.tags = {
			...next.tags,
			...overrides.tags,
		};
	}
	if (overrides.misconceptionTriggers) {
		next.tags!.misconceptionTriggers = {
			...(next.tags!.misconceptionTriggers ?? {}),
			...overrides.misconceptionTriggers,
		};
	}
	if (overrides.segmentation) {
		next.tags!.teacherSegmentation = overrides.segmentation;
	}
	if (overrides.problemGrouping) {
		next.tags!.teacherProblemGrouping = overrides.problemGrouping;
	}
	next.tags!.teacherAdjustments = {
		overrideVersion: overrides.overrideVersion,
		lastUpdatedAt: overrides.lastUpdatedAt,
	};
	if (next.tags!.reasoning) {
		next.tags!.reasoning = {
			...next.tags!.reasoning,
			overridesApplied: true,
		};
	}

	return next;
}