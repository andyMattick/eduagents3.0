import type { DocumentAnchor } from "./CanonicalDocument";

export type ProblemExtractionMode = "authored" | "inferred" | "converted";
export type ExtractedProblemDifficulty = "low" | "medium" | "high";
export type ExtractedProblemCognitiveDemand = "recall" | "procedural" | "conceptual" | "modeling" | "analysis";

export interface ExtractedProblem {
	id: string;
	documentId: string;
	anchors: DocumentAnchor[];
	text: string;
	extractionMode: ProblemExtractionMode;
	concepts: string[];
	representations: string[];
	difficulty: ExtractedProblemDifficulty;
	misconceptions: string[];
	cognitiveDemand: ExtractedProblemCognitiveDemand;
}
