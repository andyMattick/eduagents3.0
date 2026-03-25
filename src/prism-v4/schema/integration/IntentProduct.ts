import type { ExtractedProblemCognitiveDemand, ExtractedProblemDifficulty } from "../semantic";
import type { IntentType } from "./IntentRequest";

export type BuiltIntentType = "extract-problems" | "extract-concepts" | "summarize" | "build-review" | "build-test";

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

export interface IntentPayloadByType {
	"extract-problems": ProblemExtractionProduct;
	"extract-concepts": ConceptExtractionProduct;
	"summarize": SummaryProduct;
	"build-review": ReviewProduct;
	"build-test": TestProduct;
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
