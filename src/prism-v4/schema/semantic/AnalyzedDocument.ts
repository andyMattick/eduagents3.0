import type { CanonicalDocument } from "./CanonicalDocument";
import type { ExtractedProblem, ExtractedProblemDifficulty } from "./ExtractedProblem";
import type { FragmentSemanticRecord } from "./FragmentSemanticRecord";

export interface DocumentInsights {
	concepts: string[];
	scoredConcepts?: ScoredDocumentConcept[];
	conceptFrequencies: Record<string, number>;
	representations: string[];
	difficultyDistribution: Record<ExtractedProblemDifficulty, number>;
	misconceptionThemes: string[];
	instructionalDensity: number;
	problemCount: number;
	exampleCount: number;
	explanationCount: number;
}

export interface ScoredDocumentConcept {
  concept: string;
  aliases?: string[];
  freqProblems: number;
  freqPages: number;
  freqDocuments: number;
  semanticDensity: number;
  multipartPresence: number;
  crossDocumentRecurrence: number;
  score: number;
  isNoise: boolean;
}

export interface AnalyzedDocument {
	document: CanonicalDocument;
	fragments: FragmentSemanticRecord[];
	problems: ExtractedProblem[];
	insights: DocumentInsights;
	contentHash?: string;
	contentHashV1?: string;
	contentHashV2?: string;
	updatedAt: string;
}
