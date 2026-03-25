export type IntentType =
	| "build-test"
	| "build-review"
	| "build-lesson"
	| "build-practice-set"
	| "extract-problems"
	| "extract-concepts"
	| "summarize"
	| "rewrite"
	| "student-handout"
	| "teacher-guide"
	| "build-test-from-review"
	| "build-review-from-test"
	| "compare-documents"
	| "merge-documents"
	| "build-sequence"
	| "build-unit"
	| "build-instructional-map";

export interface IntentRequest {
	sessionId: string;
	documentIds: string[];
	intentType: IntentType;
	options?: Record<string, unknown>;
}
