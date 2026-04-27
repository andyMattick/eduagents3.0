import type { FragmentSemanticRecord } from "./FragmentSemanticRecord";

export interface InstructionalUnit {
	unitId: string;
	fragments: FragmentSemanticRecord[];
	concepts: string[];
	skills: string[];
	learningTargets: string[];
	misconceptions: string[];
	contentComplexity: number;
	linguisticLoad: number;
	sourceSections: string[];
	confidence: number;
	title?: string;
}