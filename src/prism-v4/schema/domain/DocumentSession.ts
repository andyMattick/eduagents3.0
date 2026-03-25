export type DocumentRole =
	| "notes"
	| "slides"
	| "article"
	| "worksheet"
	| "review"
	| "test"
	| "mixed"
	| "unknown";

export type SessionRole =
	| "source-material"
	| "target-assessment"
	| "target-review"
	| "unit-member"
	| "comparison-target";

export interface DocumentSession {
	sessionId: string;
	documentIds: string[];
	documentRoles: Record<string, DocumentRole[]>;
	sessionRoles: Record<string, SessionRole[]>;
	createdAt: string;
	updatedAt: string;
}
