export interface SimulationItem {
	itemNumber: number;
	text: string;
	linguisticLoad: number;
	avgVocabLevel: number;
	avgWordLength: number;
	vocabCounts: { level1: number; level2: number; level3: number };
	misconceptionRisk: number;
	distractorDensity: number;
	steps: number;
	wordCount: number;
	timeToProcessSeconds: number;
	confusionScore: number;
	bloomsLevel: number;
	bloomsLabel: string;
	sentenceCount: number;
	avgSentenceLength: number;
	symbolDensity: number;

	// Phase A additive fields; default values are applied in applyPhaseADefaults.
	branchingFactor: number;
	scaffoldLevel: number;
	ambiguityScore: number;
	planningLoad: number;
	writingMode: string;
	expectedResponseLength: number;
	conceptDensity: number;
	reasoningSteps: number;
	subQuestionCount: number;
	isMultiPartItem: boolean;
	isMultipleChoice: boolean;
	distractorCount: number;
}
