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
	confidence: number;
	classifierVersion: string;
	strategy: FragmentClassificationStrategy;
	evidence?: string;
	semanticTags?: string[];
}
