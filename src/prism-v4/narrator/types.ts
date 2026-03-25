export interface NarratorTaskEssence {
	summary: string;
	evidence: string;
}

export interface NarratorCognitiveMove {
	step: string;
	whyItMatters: string;
}

export interface NarratorRepresentationalDemands {
	forms: string[];
	explanation: string;
}

export interface NarratorMisconception {
	misconception: string;
	trigger: string;
	howToNotice: string;
}

export interface NarratorInstructionalLever {
	move: string;
	whenToUse: string;
	whyItWorks: string;
}

export interface NarratorInstructionalPurpose {
	concept: string;
	futureConnection: string;
}

export interface NarratorBlocks {
	taskEssence?: NarratorTaskEssence;
	cognitiveMoves?: NarratorCognitiveMove[];
	representationalDemands?: NarratorRepresentationalDemands;
	likelyMisconceptions?: NarratorMisconception[];
	instructionalLevers?: NarratorInstructionalLever[];
	instructionalPurpose?: NarratorInstructionalPurpose;
}

export interface NarrateProblemRequest {
	problemId?: string;
	problemText: string;
	semanticFingerprint: unknown;
	lens: NarratorLens;
	gradeLevel?: string;
	subject?: string;
}

export interface NarrateProblemResponse {
	problemId?: string;
	lens: NarratorLens;
	blocks: NarratorBlocks;
	narrative: string;
}

export type NarratorLens =
	| "what-is-this-asking"
	| "cognitive-steps"
	| "where-students-struggle"
	| "representations-involved"
	| "how-to-scaffold"
	| "how-to-enrich"
	| "instructional-purpose"
	| "lesson-fit"
	| "explain-to-student"
	| "misconceptions";

export const NARRATOR_LENS_OPTIONS: Array<{ value: NarratorLens; label: string }> = [
	{ value: "what-is-this-asking", label: "What is this problem really asking?" },
	{ value: "cognitive-steps", label: "What cognitive steps are required?" },
	{ value: "where-students-struggle", label: "Where will students struggle?" },
	{ value: "representations-involved", label: "What representations are involved?" },
	{ value: "how-to-scaffold", label: "How do I scaffold this?" },
	{ value: "how-to-enrich", label: "How do I enrich this?" },
	{ value: "instructional-purpose", label: "What is the instructional purpose?" },
	{ value: "lesson-fit", label: "How does this fit into the lesson?" },
	{ value: "explain-to-student", label: "How do I explain this to a student?" },
	{ value: "misconceptions", label: "What misconceptions might appear?" },
];

export const LENS_MAP: Record<NarratorLens, Array<keyof NarratorBlocks>> = {
	"what-is-this-asking": ["taskEssence"],
	"cognitive-steps": ["cognitiveMoves"],
	"where-students-struggle": ["likelyMisconceptions"],
	"representations-involved": ["representationalDemands"],
	"how-to-scaffold": ["instructionalLevers"],
	"how-to-enrich": ["instructionalLevers", "instructionalPurpose"],
	"instructional-purpose": ["instructionalPurpose"],
	"lesson-fit": ["taskEssence", "instructionalPurpose"],
	"explain-to-student": ["taskEssence", "cognitiveMoves"],
	misconceptions: ["likelyMisconceptions"],
};

export function narratorLensLabel(lens: NarratorLens) {
	return NARRATOR_LENS_OPTIONS.find((option) => option.value === lens)?.label ?? "Teacher narrative";
}
