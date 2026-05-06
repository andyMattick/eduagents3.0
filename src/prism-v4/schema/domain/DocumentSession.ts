export type DocumentRole =
	| "notes"
	| "slides"
	| "article"
	| "worksheet"
	| "review"
	| "test"
	| "answer-key"
	| "worked-solution"
	| "rubric"
	| "mixed"
	| "unknown";

export type SessionRole =
	| "source-material"
	| "target-assessment"
	| "target-review"
	| "unit-member"
	| "comparison-target";

export type DocumentResourceType = "answer-key" | "worked-solution" | "rubric";

export interface DocumentResourceLink {
	documentId: string;
	resourceDocumentId: string;
	resourceType: DocumentResourceType;
	contentText?: string;
}

export interface DocumentSession {
	sessionId: string;
	documentIds: string[];
	documentRoles: Record<string, DocumentRole[]>;
	sessionRoles: Record<string, SessionRole[]>;
	resourceLinks?: DocumentResourceLink[];
	createdAt: string;
	updatedAt: string;
}
