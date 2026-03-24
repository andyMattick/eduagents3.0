import type { CognitiveProfile } from "../schema/semantic";

export interface EvidenceHighlight {
	text: string;
	startIndex?: number;
	endIndex?: number;
}

export type FeedbackTarget =
	| "bloom"
	| "difficulty"
	| "linguisticLoad"
	| "abstractionLevel"
	| "multiStep"
	| "representationComplexity"
	| "misconceptionRisk"
	| "concepts"
	| "subject"
	| "domain"
	| "stemText"
	| "partText"
	| "segmentation"
	| "problemGrouping"
	| "tags"
	| "other";

export interface TeacherFeedback {
	feedbackId: string;
	teacherId: string;
	documentId: string;
	canonicalProblemId: string;
	target: FeedbackTarget;
	aiValue: unknown;
	teacherValue: unknown;
	rationale?: string;
	evidence?: EvidenceHighlight;
	createdAt: string;
}

export interface ProblemOverrideRecord {
	bloom?: CognitiveProfile["bloom"];
	difficulty?: number;
	linguisticLoad?: number;
	abstractionLevel?: number;
	multiStep?: number;
	representationComplexity?: number;
	misconceptionRisk?: number;
	concepts?: Record<string, number>;
	subject?: string;
	domain?: string;
	stemText?: string;
	partText?: string;
	segmentation?: Record<string, unknown>;
	problemGrouping?: Record<string, unknown>;
	tags?: Record<string, unknown>;
	misconceptionTriggers?: Record<string, number>;
	other?: unknown;
	overrideVersion?: number;
	lastUpdatedAt?: string;
}

export interface ValidatedOverrides extends ProblemOverrideRecord {
	overrideVersion: number;
	lastUpdatedAt: string;
}

export interface TeacherDerivedTemplateRecord {
	id: string;
	teacherId: string;
	sourceFeedbackId: string;
	evidenceText: string;
	subject?: string;
	domain?: string;
	bloom?: Partial<CognitiveProfile["bloom"]>;
	difficultyBoost?: number;
	misconceptionRiskBoost?: number;
	createdAt: string;
}

export interface TeacherFeedbackPayload {
	teacherId: string;
	documentId: string;
	canonicalProblemId: string;
	target: FeedbackTarget;
	aiValue: unknown;
	teacherValue: unknown;
	rationale?: string;
	evidence?: EvidenceHighlight;
}