import type { DocumentAnchor } from "./CanonicalDocument";

export type ProblemExtractionMode = "authored" | "inferred" | "converted";
export type ExtractedProblemDifficulty = "low" | "medium" | "high";
export type ExtractedProblemCognitiveDemand = "recall" | "procedural" | "conceptual" | "modeling" | "analysis";

export interface ExtractedProblem {
	id: string;
	documentId: string;
	problemGroupId?: string;
	anchors: DocumentAnchor[];
	text: string;
	extractionMode: ProblemExtractionMode;
	sourceSpan?: {
		firstPage: number;
		lastPage: number;
	};
	concepts: string[];
	representations: string[];
	complexityBand: ExtractedProblemDifficulty;
	misconceptions: string[];
	cognitiveDemand: ExtractedProblemCognitiveDemand;
	bloomLevel?: number;
	cognitiveLoad?: number;
	linguisticLoad?: number;
	representationLoad?: number;
}
