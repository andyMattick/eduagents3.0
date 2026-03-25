import type { CanonicalDocument } from "./CanonicalDocument";
import type { ExtractedProblem, ExtractedProblemDifficulty } from "./ExtractedProblem";
import type { FragmentSemanticRecord } from "./FragmentSemanticRecord";

export interface DocumentInsights {
	concepts: string[];
	conceptFrequencies: Record<string, number>;
	representations: string[];
	difficultyDistribution: Record<ExtractedProblemDifficulty, number>;
	misconceptionThemes: string[];
	instructionalDensity: number;
	problemCount: number;
	exampleCount: number;
	explanationCount: number;
}

export interface AnalyzedDocument {
	document: CanonicalDocument;
	fragments: FragmentSemanticRecord[];
	problems: ExtractedProblem[];
	insights: DocumentInsights;
	updatedAt: string;
}
