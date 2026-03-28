import type { ExtractedProblemCognitiveDemand, ExtractedProblemDifficulty } from "../semantic";
import type { IntentType } from "./IntentRequest";

export type BuiltIntentType =
	| "extract-problems"
	| "extract-concepts"
	| "summarize"
	| "build-review"
	| "build-test"
	| "compare-documents"
	| "merge-documents"
	| "build-sequence"
	| "build-lesson"
	| "build-unit"
	| "build-instructional-map"
	| "curriculum-alignment";

export interface ProductSourceAnchor {
	documentId: string;
	anchorNodeIds: string[];
}

export interface ProductDocumentSummary {
	documentId: string;
	sourceFileName: string;
	problemCount: number;
	concepts: string[];
	instructionalProfile: {
		exampleCount: number;
		explanationCount: number;
		instructionalDensity: number;
	};
}

export interface ProblemExtractionEntry {
	problemId: string;
	documentId: string;
	sourceFileName: string;
	text: string;
	concepts: string[];
	representations: string[];
	difficulty: ExtractedProblemDifficulty;
	cognitiveDemand: ExtractedProblemCognitiveDemand;
	misconceptions: string[];
	anchorNodeIds: string[];
}

export interface ProblemExtractionProduct {
	kind: "problem-extraction";
	focus: string | null;
	totalProblemCount: number;
	documents: ProductDocumentSummary[];
	problems: ProblemExtractionEntry[];
	generatedAt: string;
}

export interface ConceptExtractionEntry {
	concept: string;
	frequency: number;
	documentIds: string[];
	sourceFileNames: string[];
	representations: string[];
	difficulties: ExtractedProblemDifficulty[];
	sampleProblemTexts: string[];
}

export interface ConceptExtractionProduct {
	kind: "concept-extraction";
	focus: string | null;
	totalConceptCount: number;
	coverageSummary: {
		totalConcepts: number;
		conceptGaps: string[];
		docsPerConcept: Record<string, number>;
	};
	concepts: ConceptExtractionEntry[];
	generatedAt: string;
}

export interface SummaryDocumentEntry {
	documentId: string;
	sourceFileName: string;
	summary: string;
	keyConcepts: string[];
	problemCount: number;
	instructionalProfile: {
		exampleCount: number;
		explanationCount: number;
		questionCount: number;
	};
}

export interface SummaryProduct {
	kind: "summary";
	focus: string | null;
	overallSummary: string;
	documents: SummaryDocumentEntry[];
	crossDocumentTakeaways: string[];
	generatedAt: string;
}

export interface ReviewSection {
	concept: string;
	priority: "core" | "reinforce" | "extension";
	sourceDocumentIds: string[];
	rationale: string;
	reviewPoints: string[];
	practicePrompts: string[];
}

export interface ReviewProduct {
	kind: "review";
	focus: string | null;
	title: string;
	overview: string;
	sections: ReviewSection[];
	generatedAt: string;
}

export interface TestItem {
	itemId: string;
	prompt: string;
	concept: string;
	sourceDocumentId: string;
	sourceFileName: string;
	difficulty: ExtractedProblemDifficulty;
	cognitiveDemand: ExtractedProblemCognitiveDemand;
	answerGuidance: string;
}

export interface TestSection {
	concept: string;
	sourceDocumentIds: string[];
	items: TestItem[];
}

export interface TestProduct {
	kind: "test";
	focus: string | null;
	title: string;
	overview: string;
	estimatedDurationMinutes: number;
	sections: TestSection[];
	totalItemCount: number;
	generatedAt: string;
}

export interface CompareDocumentConceptEntry {
	concept: string;
	documentIds: string[];
}

export interface CompareDocumentMetricEntry {
	documentId: string;
	sourceFileName: string;
	problemCount: number;
	dominantDifficulty: ExtractedProblemDifficulty;
	averageDifficultyScore: number;
	representations: string[];
	instructionalDensity: number;
	uniqueConcepts: string[];
	sharedConcepts: string[];
}

export interface CompareDocumentsProduct {
	kind: "compare-documents";
	focus: string | null;
	sharedConcepts: string[];
	conceptOverlap: CompareDocumentConceptEntry[];
	documents: CompareDocumentMetricEntry[];
	difficultyComparison: CompareDocumentMetricEntry[];
	representationComparison: CompareDocumentMetricEntry[];
	instructionalDensityComparison: CompareDocumentMetricEntry[];
	problemDistributionComparison: Array<{
		documentId: string;
		sourceFileName: string;
		totalProblems: number;
		byDifficulty: Record<ExtractedProblemDifficulty, number>;
	}>;
	documentSimilarity: Array<{
		leftDocumentId: string;
		rightDocumentId: string;
		score: number;
		sharedConcepts: string[];
	}>;
	sourceAnchors: ProductSourceAnchor[];
	generatedAt: string;
}

export interface MergedProblemEntry {
	mergedProblemId: string;
	text: string;
	concepts: string[];
	representations: string[];
	difficulty: ExtractedProblemDifficulty;
	sourceDocumentIds: string[];
	sourceFileNames: string[];
	sourceAnchors: ProductSourceAnchor[];
}

export interface MergedFragmentEntry {
	mergedFragmentId: string;
	text: string;
	instructionalRole: string;
	contentType: string;
	sourceDocumentIds: string[];
	sourceAnchors: ProductSourceAnchor[];
}

export interface MergeDocumentsProduct {
	kind: "merge-documents";
	focus: string | null;
	mergedConcepts: string[];
	mergedProblems: MergedProblemEntry[];
	mergedFragments: MergedFragmentEntry[];
	mergedInsights: {
		totalDocuments: number;
		totalProblems: number;
		totalFragments: number;
		totalConcepts: number;
		coverageSummary: {
			totalConcepts: number;
			conceptGaps: string[];
			docsPerConcept: Record<string, number>;
		};
	};
	mergedCanonicalOrder: Array<{
		documentId: string;
		sourceFileName: string;
		surfaceCount: number;
		nodeCount: number;
	}>;
	sourceAnchors: ProductSourceAnchor[];
	generatedAt: string;
}

export interface SequenceStep {
	position: number;
	documentId: string;
	sourceFileName: string;
	rationale: string;
	bridgingConcepts: string[];
	missingPrerequisites: string[];
	anchorNodeIds: string[];
}

export interface SequenceProduct {
	kind: "sequence";
	focus: string | null;
	recommendedOrder: SequenceStep[];
	bridgingConcepts: string[];
	missingPrerequisites: string[];
	sourceAnchors: ProductSourceAnchor[];
	generatedAt: string;
}

export interface LessonSegment {
	title: string;
	description: string;
	documentId: string;
	sourceFileName: string;
	anchorNodeIds: string[];
	concepts: string[];
}

export interface LessonProduct {
	kind: "lesson";
	focus: string | null;
	title: string;
	learningObjectives: string[];
	prerequisiteConcepts: string[];
	warmUp: LessonSegment[];
	conceptIntroduction: LessonSegment[];
	guidedPractice: LessonSegment[];
	independentPractice: LessonSegment[];
	exitTicket: LessonSegment[];
	misconceptions: Array<{
		trigger: string;
		correction: string;
		documentIds: string[];
	}>;
	scaffolds: Array<{
		concept: string;
		level: "low" | "medium" | "high";
		strategy: string;
		documentIds: string[];
	}>;
	extensions: string[];
	teacherNotes: string[];
	sourceAnchors: ProductSourceAnchor[];
	generatedAt: string;
}

export interface UnitLessonEntry {
	position: number;
	documentId: string;
	sourceFileName: string;
	focusConcepts: string[];
	rationale: string;
	anchorNodeIds: string[];
}

export interface UnitProduct {
	kind: "unit";
	focus: string | null;
	title: string;
	lessonSequence: UnitLessonEntry[];
	conceptMap: Array<{
		concept: string;
		documentIds: string[];
		prerequisites: string[];
	}>;
	difficultyCurve: Array<{
		documentId: string;
		sourceFileName: string;
		averageDifficultyScore: number;
	}>;
	representationCurve: Array<{
		documentId: string;
		sourceFileName: string;
		representations: string[];
	}>;
	misconceptionMap: Array<{
		concept: string;
		triggers: string[];
		documentIds: string[];
	}>;
	suggestedAssessments: string[];
	suggestedReviews: string[];
	suggestedPracticeSets: string[];
	sourceAnchors: ProductSourceAnchor[];
	generatedAt: string;
}

export interface GraphEdge {
	from: string;
	to: string;
	weight: number;
	sharedDocumentIds?: string[];
}

export interface InstructionalMapProduct {
	kind: "instructional-map";
	focus: string | null;
	conceptGraph: {
		nodes: string[];
		edges: GraphEdge[];
	};
	representationGraph: {
		nodes: string[];
		edges: GraphEdge[];
	};
	misconceptionGraph: {
		nodes: string[];
		edges: GraphEdge[];
	};
	difficultyCurve: Array<{
		documentId: string;
		sourceFileName: string;
		averageDifficultyScore: number;
	}>;
	documentConceptAlignment: Array<{
		documentId: string;
		sourceFileName: string;
		concepts: string[];
	}>;
	unitConceptAlignment: Array<{
		unitId: string;
		title: string;
		concepts: string[];
		documentIds: string[];
		sourceFileNames: string[];
		anchorNodeIds: string[];
	}>;
	problemConceptAlignment: Array<{
		problemId: string;
		documentId: string;
		concepts: string[];
		anchorNodeIds: string[];
	}>;
	instructionalRoleDistribution: Array<{
		documentId: string;
		sourceFileName: string;
		roles: Record<string, number>;
	}>;
	sourceAnchors: ProductSourceAnchor[];
	generatedAt: string;
}

export interface CurriculumAlignmentProduct {
	kind: "curriculum-alignment";
	focus: string | null;
	standardsCoverage: Array<{
		standardId: string;
		concept: string;
		documentIds: string[];
		coverage: "partial" | "full";
	}>;
	gaps: string[];
	redundancies: string[];
	suggestedFixes: string[];
	sourceAnchors: ProductSourceAnchor[];
	generatedAt: string;
}

export interface IntentPayloadByType {
	"extract-problems": ProblemExtractionProduct;
	"extract-concepts": ConceptExtractionProduct;
	"summarize": SummaryProduct;
	"build-review": ReviewProduct;
	"build-test": TestProduct;
	"compare-documents": CompareDocumentsProduct;
	"merge-documents": MergeDocumentsProduct;
	"build-sequence": SequenceProduct;
	"build-lesson": LessonProduct;
	"build-unit": UnitProduct;
	"build-instructional-map": InstructionalMapProduct;
	"curriculum-alignment": CurriculumAlignmentProduct;
}

export type IntentProductPayload = IntentPayloadByType[BuiltIntentType];

export interface IntentProduct<T extends BuiltIntentType = BuiltIntentType> {
	sessionId: string;
	intentType: IntentType;
	documentIds: string[];
	productId: string;
	productType: T;
	schemaVersion: string;
	payload: IntentPayloadByType[T];
	createdAt: string;
}
