import type { Problem } from "../../../schema/domain";
import type { CognitiveProfile } from "../../../schema/semantic";
import { clamp01 } from "../../utils/heuristics";

function problemText(problem: Problem) {
	return `${problem.stemText ?? ""}\n${problem.partText ?? ""}\n${problem.cleanedText ?? problem.rawText}`;
}

function hasConcept(problem: Problem, fragment: string) {
	return Object.keys(problem.tags?.concepts ?? {}).some((concept) => concept.includes(fragment));
}

function hasDomain(problem: Problem, fragment: string) {
	return (problem.tags?.domain ?? "").includes(fragment);
}

export interface CognitiveTemplate {
	id: string;
	match: (problem: Problem) => boolean;
	bloom: Partial<CognitiveProfile["bloom"]>;
	difficultyBoost?: number;
	misconceptionRiskBoost?: number;
}

const interpretationTemplate: CognitiveTemplate = {
	id: "interpretation",
	match: (problem) => /\binterpret\b|\bexplain\b|\bconclude\b|\bwhat does this mean\b/i.test(problemText(problem)),
	bloom: { understand: 0.2, analyze: 0.3, evaluate: 0.2 },
	difficultyBoost: 0.08,
	misconceptionRiskBoost: 0.05,
};

const modelingTemplate: CognitiveTemplate = {
	id: "modeling",
	match: (problem) => /\bmodel\b|\brepresent\b|\bwrite an equation\b|\bsimulate\b|\bconstruct\b/i.test(problemText(problem)),
	bloom: { apply: 0.25, analyze: 0.15, create: 0.15 },
	difficultyBoost: 0.1,
	misconceptionRiskBoost: 0.08,
};

const evidenceEvaluationTemplate: CognitiveTemplate = {
	id: "evidence-evaluation",
	match: (problem) => /\bevidence\b|\bsupport\b|\bjustify\b|\bwhich claim\b|\bbest supports\b/i.test(problemText(problem)),
	bloom: { understand: 0.1, analyze: 0.25, evaluate: 0.3 },
	difficultyBoost: 0.1,
	misconceptionRiskBoost: 0.12,
};

const dataAnalysisTemplate: CognitiveTemplate = {
	id: "data-analysis",
	match: (problem) => /\bdata\b|\bgraph\b|\btable\b|\bchart\b|\bplot\b|\bdistribution\b|\btrend\b/i.test(problemText(problem)),
	bloom: { understand: 0.1, apply: 0.2, analyze: 0.3 },
	difficultyBoost: 0.12,
	misconceptionRiskBoost: 0.1,
};

const causeEffectTemplate: CognitiveTemplate = {
	id: "cause-effect-reasoning",
	match: (problem) => /\bcause\b|\beffect\b|\bresult\b|\bconsequence\b|\bimpact\b|\bleads to\b/i.test(problemText(problem)),
	bloom: { understand: 0.15, analyze: 0.25, evaluate: 0.15 },
	difficultyBoost: 0.08,
	misconceptionRiskBoost: 0.08,
};

const multiRepresentationSynthesisTemplate: CognitiveTemplate = {
	id: "multi-representation-synthesis",
	match: (problem) => /\buse the graph\b|\buse the table\b|\bcompare the diagram\b|\busing the model\b|\bfrom the graph and table\b/i.test(problemText(problem)),
	bloom: { apply: 0.2, analyze: 0.25, create: 0.05 },
	difficultyBoost: 0.14,
	misconceptionRiskBoost: 0.12,
};

const mainIdeaTemplate: CognitiveTemplate = {
	id: "main-idea",
	match: (problem) => /\bmain idea\b|\bcentral idea\b|\btheme\b/i.test(problemText(problem)) || hasConcept(problem, "reading"),
	bloom: { understand: 0.25, analyze: 0.15 },
	difficultyBoost: 0.06,
};

const inferenceTemplate: CognitiveTemplate = {
	id: "inference",
	match: (problem) => /\binfer\b|\binference\b|\bimply\b|\bsuggest\b/i.test(problemText(problem)) || hasDomain(problem, "inference"),
	bloom: { understand: 0.1, analyze: 0.3, evaluate: 0.1 },
	difficultyBoost: 0.1,
	misconceptionRiskBoost: 0.1,
};

const authorPurposeTemplate: CognitiveTemplate = {
	id: "author-purpose",
	match: (problem) => /\bauthor'?s purpose\b|\bpoint of view\b|\btone\b|\bpurpose of the passage\b/i.test(problemText(problem)),
	bloom: { understand: 0.2, analyze: 0.25 },
	difficultyBoost: 0.08,
};

const argumentAnalysisTemplate: CognitiveTemplate = {
	id: "argument-analysis",
	match: (problem) => /\bargument\b|\bclaim\b|\breasoning\b|\bcounterclaim\b/i.test(problemText(problem)),
	bloom: { analyze: 0.3, evaluate: 0.25 },
	difficultyBoost: 0.1,
	misconceptionRiskBoost: 0.08,
};

const algebraTemplate: CognitiveTemplate = {
	id: "multi-step-algebra",
	match: (problem) => /\bsolve\b.*\bequation\b|\bsystem of equations\b|\binequality\b/i.test(problemText(problem)) || hasConcept(problem, "algebra"),
	bloom: { apply: 0.3, analyze: 0.2 },
	difficultyBoost: 0.12,
	misconceptionRiskBoost: 0.1,
};

const functionAnalysisTemplate: CognitiveTemplate = {
	id: "function-analysis",
	match: (problem) => /\bfunction\b|\brate of change\b|\bslope\b|\bintercept\b/i.test(problemText(problem)) || hasConcept(problem, "function"),
	bloom: { understand: 0.1, apply: 0.25, analyze: 0.2 },
	difficultyBoost: 0.1,
};

const proofTemplate: CognitiveTemplate = {
	id: "proof",
	match: (problem) => /\bprove\b|\bshow that\b|\bjustify why\b/i.test(problemText(problem)),
	bloom: { analyze: 0.2, evaluate: 0.25, create: 0.15 },
	difficultyBoost: 0.14,
	misconceptionRiskBoost: 0.08,
};

const optimizationTemplate: CognitiveTemplate = {
	id: "optimization",
	match: (problem) => /\bmaximize\b|\bminimize\b|\boptimal\b|\bbest value\b/i.test(problemText(problem)),
	bloom: { apply: 0.2, analyze: 0.25, evaluate: 0.2 },
	difficultyBoost: 0.14,
};

const confidenceIntervalTemplate: CognitiveTemplate = {
	id: "confidence-interval",
	match: (problem) => /\bconfidence interval\b|\bmargin of error\b|\binterval estimate\b/i.test(problemText(problem)),
	bloom: { understand: 0.1, apply: 0.25, analyze: 0.2 },
	difficultyBoost: 0.12,
	misconceptionRiskBoost: 0.12,
};

const hypothesisTestingTemplate: CognitiveTemplate = {
	id: "hypothesis-testing",
	match: (problem) => /\bhypothesis test\b|\bp-value\b|\bnull hypothesis\b|\balternative hypothesis\b/i.test(problemText(problem)),
	bloom: { apply: 0.25, analyze: 0.25, evaluate: 0.2 },
	difficultyBoost: 0.15,
	misconceptionRiskBoost: 0.15,
};

const errorTypeTemplate: CognitiveTemplate = {
	id: "type-i-ii",
	match: (problem) => /\btype i\b|\btype ii\b|\bfalse positive\b|\bfalse negative\b/i.test(problemText(problem)),
	bloom: { understand: 0.15, analyze: 0.25, evaluate: 0.15 },
	difficultyBoost: 0.12,
	misconceptionRiskBoost: 0.18,
};

const samplingDistributionTemplate: CognitiveTemplate = {
	id: "sampling-distribution",
	match: (problem) => /\bsampling distribution\b|\bstandard error\b|\bsample proportion\b/i.test(problemText(problem)),
	bloom: { understand: 0.15, apply: 0.2, analyze: 0.2 },
	difficultyBoost: 0.12,
	misconceptionRiskBoost: 0.12,
};

const experimentalDesignTemplate: CognitiveTemplate = {
	id: "experimental-design",
	match: (problem) => /\bexperimental design\b|\bdesign an experiment\b|\bhypothesis\b|\bprocedure\b/i.test(problemText(problem)),
	bloom: { apply: 0.2, analyze: 0.2, create: 0.2 },
	difficultyBoost: 0.14,
	misconceptionRiskBoost: 0.12,
};

const variableControlTemplate: CognitiveTemplate = {
	id: "variable-control",
	match: (problem) => /\bcontrol variable\b|\bindependent variable\b|\bdependent variable\b|\bconstant\b/i.test(problemText(problem)),
	bloom: { understand: 0.2, apply: 0.2, analyze: 0.15 },
	difficultyBoost: 0.1,
	misconceptionRiskBoost: 0.1,
};

const dataInterpretationTemplate: CognitiveTemplate = {
	id: "science-data-interpretation",
	match: (problem) => /\bdata\b|\bgraph\b|\btrend\b|\bobservation\b/i.test(problemText(problem)) || hasConcept(problem, "science"),
	bloom: { understand: 0.1, analyze: 0.3 },
	difficultyBoost: 0.1,
};

const modelEvaluationTemplate: CognitiveTemplate = {
	id: "model-evaluation",
	match: (problem) => /\bevaluate the model\b|\blimitations of the model\b|\bcompare models\b/i.test(problemText(problem)),
	bloom: { analyze: 0.25, evaluate: 0.25 },
	difficultyBoost: 0.12,
	misconceptionRiskBoost: 0.08,
};

const sourcingTemplate: CognitiveTemplate = {
	id: "sourcing",
	match: (problem) => /\bsource\b|\bwho wrote\b|\bwhen was this written\b|\borigin of the document\b/i.test(problemText(problem)),
	bloom: { understand: 0.2, analyze: 0.2 },
	difficultyBoost: 0.08,
};

const corroborationTemplate: CognitiveTemplate = {
	id: "corroboration",
	match: (problem) => /\bcorroborate\b|\bcompare sources\b|\bboth sources\b|\bagree and disagree\b/i.test(problemText(problem)),
	bloom: { analyze: 0.3, evaluate: 0.2 },
	difficultyBoost: 0.12,
	misconceptionRiskBoost: 0.08,
};

const perspectiveAnalysisTemplate: CognitiveTemplate = {
	id: "perspective-analysis",
	match: (problem) => /\bperspective\b|\bpoint of view\b|\bbias\b|\baudience\b/i.test(problemText(problem)),
	bloom: { understand: 0.15, analyze: 0.25, evaluate: 0.15 },
	difficultyBoost: 0.1,
};

export const genericTemplates: CognitiveTemplate[] = [
	interpretationTemplate,
	evidenceEvaluationTemplate,
	dataAnalysisTemplate,
	causeEffectTemplate,
	multiRepresentationSynthesisTemplate,
];

export const mathTemplates: CognitiveTemplate[] = [
	modelingTemplate,
	algebraTemplate,
	functionAnalysisTemplate,
	proofTemplate,
	optimizationTemplate,
	multiRepresentationSynthesisTemplate,
];

export const statsTemplates: CognitiveTemplate[] = [
	dataAnalysisTemplate,
	confidenceIntervalTemplate,
	hypothesisTestingTemplate,
	errorTypeTemplate,
	samplingDistributionTemplate,
];

export const elaTemplates: CognitiveTemplate[] = [
	mainIdeaTemplate,
	inferenceTemplate,
	evidenceEvaluationTemplate,
	authorPurposeTemplate,
	argumentAnalysisTemplate,
];

export const scienceTemplates: CognitiveTemplate[] = [
	experimentalDesignTemplate,
	variableControlTemplate,
	dataInterpretationTemplate,
	modelEvaluationTemplate,
	multiRepresentationSynthesisTemplate,
];

export const historyTemplates: CognitiveTemplate[] = [
	sourcingTemplate,
	corroborationTemplate,
	causeEffectTemplate,
	perspectiveAnalysisTemplate,
	evidenceEvaluationTemplate,
];

export const cognitiveTemplates: CognitiveTemplate[] = [
	...genericTemplates,
	...mathTemplates,
	...statsTemplates,
	...elaTemplates,
	...scienceTemplates,
	...historyTemplates,
];

export function pickTemplatesForSubject(subject: string): CognitiveTemplate[] {
	switch (subject) {
		case "math":
			return [...genericTemplates, ...mathTemplates, ...statsTemplates];
		case "reading":
			return [...genericTemplates, ...elaTemplates];
		case "science":
			return [...genericTemplates, ...scienceTemplates];
		case "socialstudies":
			return [...genericTemplates, ...historyTemplates];
		default:
			return genericTemplates;
	}
}

export function applyTemplates(
	problem: Problem,
	templates: CognitiveTemplate[] = cognitiveTemplates,
): Partial<CognitiveProfile> {
	const matched = getMatchedTemplates(problem, templates);
	const bloom: Partial<CognitiveProfile["bloom"]> = {};

	for (const template of matched) {
		for (const [level, score] of Object.entries(template.bloom)) {
			const key = level as keyof CognitiveProfile["bloom"];
			bloom[key] = clamp01((bloom[key] ?? 0) + (score ?? 0));
		}
	}

	return {
		bloom,
		difficulty: clamp01(matched.reduce((total, template) => total + (template.difficultyBoost ?? 0), 0)),
		misconceptionRisk: clamp01(matched.reduce((total, template) => total + (template.misconceptionRiskBoost ?? 0), 0)),
	};
}

export function getMatchedTemplates(
	problem: Problem,
	templates: CognitiveTemplate[] = cognitiveTemplates,
): CognitiveTemplate[] {
	return templates.filter((template) => template.match(problem));
}