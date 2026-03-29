import type { IntentRequestOptions } from "./ConceptBlueprint";
import type { StudentPerformanceProfile } from "../../studentPerformance";

export type IntentType =
	| "build-test"
	| "build-review"
	| "build-lesson"
	| "curriculum-alignment"
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
	options?: IntentRequestOptions;
	studentId?: string;
	studentPerformanceProfile?: StudentPerformanceProfile;
	enableAdaptiveConditioning?: boolean;
}
