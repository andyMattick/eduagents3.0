import type { DocumentAnchor } from "./CanonicalDocument";

export type InstructionalRole =
	| "objective"
	| "example"
	| "explanation"
	| "problem-stem"
	| "problem-part"
	| "instruction"
	| "note"
	| "reflection"
	| "metadata"
	| "other";

export type ContentType =
	| "text"
	| "table"
	| "graph"
	| "diagram"
	| "image"
	| "question"
	| "answer"
	| "heading";

export type FragmentClassificationStrategy = "rule-based" | "llm" | "hybrid";

export interface FragmentSemanticRecord {
	id: string;
	documentId: string;
	anchors: DocumentAnchor[];
	isInstructional: boolean;
	instructionalRole: InstructionalRole;
	contentType: ContentType;
	learningTarget?: string | null;
	prerequisiteConcepts?: string[];
	scaffoldLevel?: "low" | "medium" | "high";
	exampleType?: "worked" | "non-worked" | "counterexample";
	misconceptionTriggers?: string[];
	confidence: number;
	classifierVersion: string;
	strategy: FragmentClassificationStrategy;
	evidence?: string;
	semanticTags?: string[];
}
