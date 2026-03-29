import type { ExtractedProblemDifficulty } from "../schema/semantic";
import type { BloomLevel, ItemMode, ScenarioType } from "../teacherFeedback";

export interface StudentAssessmentEvent {
	eventId: string;
	studentId: string;
	assessmentId: string;
	unitId?: string;
	itemId?: string;
	conceptId: string;
	conceptDisplayName?: string;
	bloomLevel: BloomLevel;
	itemMode?: ItemMode;
	scenarioType?: ScenarioType;
	difficulty?: ExtractedProblemDifficulty;
	correct: boolean;
	responseTimeSeconds?: number;
	confidence?: number;
	misconceptionKey?: string;
	incorrectResponse?: string;
	occurredAt: string;
	metadata?: Record<string, unknown>;
}

export interface StudentMisconceptionCluster {
	misconceptionKey: string;
	occurrences: number;
	lastSeenAt: string;
	examples: string[];
	relatedBloomLevels: BloomLevel[];
	relatedModes: ItemMode[];
}

export interface StudentPerformanceProfile {
	studentId: string;
	unitId?: string;
	lastUpdated: string;
	totalEvents: number;
	totalAssessments: number;
	assessmentIds: string[];
	overallMastery: number;
	overallConfidence: number;
	averageResponseTimeSeconds: number;
	conceptMastery: Record<string, number>;
	conceptExposure: Record<string, number>;
	bloomMastery: Partial<Record<BloomLevel, number>>;
	modeMastery: Partial<Record<ItemMode, number>>;
	scenarioMastery: Partial<Record<ScenarioType, number>>;
	conceptBloomMastery: Record<string, Partial<Record<BloomLevel, number>>>;
	conceptModeMastery: Record<string, Partial<Record<ItemMode, number>>>;
	conceptScenarioMastery: Record<string, Partial<Record<ScenarioType, number>>>;
	conceptAverageResponseTimeSeconds: Record<string, number>;
	conceptConfidence: Record<string, number>;
	misconceptions: Record<string, StudentMisconceptionCluster[]>;
}
