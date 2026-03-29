import type { IntentProduct, IntentType } from "../schema/integration";
import type { AnalyzedDocument, DocumentCollectionAnalysis, ExtractedProblemCognitiveDemand, ExtractedProblemDifficulty } from "../schema/semantic";
import type { BloomLevel, ItemMode, ScenarioType, TeacherFingerprint } from "../teacherFeedback";
import type { StudentPerformanceProfile } from "../studentPerformance";
import type { CountedBloom, CountedDifficulty, CountedMode, CountedScenario } from "./primitives";
import type { StudentExposureEntry, StudentResponseTimeEntry } from "./buildStudentProfileView";
import type { MasteryBand } from "./masteryBands";

export interface BlueprintConcept {
  id: string;
  name: string;
  order: number;
  included: boolean;
  quota: number;
}

export interface ConceptSummary {
	concept: string;
	documentCount: number;
	problemCount: number;
	coverage: number;
}

export interface ProblemSummary {
	documentId: string;
	sourceFileName: string;
	problemCount: number;
	dominantDemand: ExtractedProblemCognitiveDemand | "mixed";
	difficultyDistribution: Record<ExtractedProblemDifficulty, number>;
}

export interface MisconceptionSummary {
	misconception: string;
	occurrences: number;
	concepts: string[];
}

export type BloomSummary = Record<BloomLevel, number>;
export type ModeSummary = Partial<Record<ItemMode, number>>;
export type ScenarioSummary = Partial<Record<ScenarioType, number>>;

export interface DifficultySummary {
	low: number;
	medium: number;
	high: number;
	averageInstructionalDensity: number;
}

export interface InstructionalAnalysis {
	concepts: ConceptSummary[];
	problems: ProblemSummary[];
	misconceptions: MisconceptionSummary[];
	bloomSummary: BloomSummary;
	modeSummary: ModeSummary;
	scenarioSummary: ScenarioSummary;
	difficultySummary: DifficultySummary;
	domain: string;
}

export interface BlueprintModel {
  concepts: BlueprintConcept[];
  bloomLadder: CountedBloom[];
  difficultyRamp: CountedDifficulty[];
  modeMix: CountedMode[];
  scenarioMix: CountedScenario[];
}

export interface ConceptMapModel {
	nodes: Array<{ id: string; label: string; weight: number }>;
	edges: Array<{ from: string; to: string; weight: number }>;
}

export interface TeacherFingerprintModel {
	teacherId: string;
	modePreferences: CountedMode[];
	scenarioPreferences: CountedScenario[];
	bloomPreferences: CountedBloom[];
	difficultyPreferences: CountedDifficulty[];
	rawFingerprint?: TeacherFingerprint | null;
}

export interface BuilderPlanModel {
	sections: Array<{
		conceptId: string;
		conceptName: string;
		itemCount: number;
		bloomSequence: BloomLevel[];
		difficultySequence: ExtractedProblemDifficulty[];
		modeSequence: ItemMode[];
		scenarioSequence: ScenarioType[];
	}>;
	adaptiveTargets?: {
		boostedConcepts: string[];
		suppressedConcepts: string[];
		boostedBloom: BloomLevel[];
		suppressedBloom: BloomLevel[];
	};
}

export interface AssessmentPreviewItemModel {
	itemId: string;
	stem: string;
	options?: string[];
	answer?: string;
	conceptId: string;
	bloom: BloomLevel;
	difficulty: ExtractedProblemDifficulty;
	mode: ItemMode;
	scenario: ScenarioType;
	misconceptionTag?: string;
	teacherReasons?: string[];
	studentReasons?: string[];
}

export interface AssessmentPreviewModel {
	items: AssessmentPreviewItemModel[];
	product?: IntentProduct;
}

export interface ClassProfileModel {
	classId: string;
	students: StudentPerformanceProfile[];
	conceptClusters: Array<{
		conceptId: string;
		low: string[];
		mid: string[];
		high: string[];
	}>;
	misconceptionClusters: Array<{
		misconception: string;
		students: string[];
	}>;
}

export interface DifferentiatedVersionModel {
	versionId: string;
	label: string;
	masteryBand: MasteryBand;
	studentIds: string[];
	representativeStudentId: string;
	explanation: string;
	builderPlan: BuilderPlanModel;
	assessmentPreview: AssessmentPreviewModel;
}

export interface DifferentiatedBuildModel {
	classId: string;
	versions: DifferentiatedVersionModel[];
}

export interface InstructionalIntelligenceSession {
	sessionId: string;
	documentIds: string[];
	analysis: InstructionalAnalysis;
	blueprint?: BlueprintModel;
	conceptMap?: ConceptMapModel;
	teacherFingerprint?: TeacherFingerprintModel;
	activeStudentId?: string;
	studentProfile?: StudentPerformanceProfile;
	studentMisconceptions?: string[];
	studentExposureTimeline?: StudentExposureEntry[];
	studentResponseTimes?: StudentResponseTimeEntry[];
	builderPlan?: BuilderPlanModel;
	assessmentPreview?: AssessmentPreviewModel;
	classProfile?: ClassProfileModel;
	differentiatedBuild?: DifferentiatedBuildModel;
}

export interface InstructionalSessionEnvelope {
	sessionId: string;
	documentIds: string[];
	analysis: InstructionalAnalysis;
	rawAnalysis?: DocumentCollectionAnalysis;
}

export interface InstructionalSessionWorkspace {
	sessionId: string;
	documents: Array<{
		documentId: string;
		sourceFileName: string;
		sourceMimeType: string;
		createdAt: string;
	}>;
	analyzedDocuments: AnalyzedDocument[];
	rawAnalysis: DocumentCollectionAnalysis | null;
	instructionalSession: InstructionalIntelligenceSession | null;
	products: IntentProduct[];
	selectedIntent?: IntentType;
}