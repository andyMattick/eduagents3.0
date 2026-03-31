import { describe, expect, it } from "vitest";
import { buildInstructionalBlueprint } from "./buildInstructionalBlueprint";
import type { AssessmentFingerprint } from "../teacherFeedback";
import type { InstructionalAnalysis } from "./InstructionalIntelligenceSession";

const assessment: AssessmentFingerprint = {
	teacherId: "teacher-1",
	assessmentId: "assessment-1",
	unitId: "unit-1",
	conceptProfiles: [
		{ conceptId: "fractions", displayName: "Fractions", frequencyWeight: 0.5, absoluteItemHint: 2, lowEmphasis: false, bloomDistribution: { remember: 0, understand: 1, apply: 0, analyze: 0, evaluate: 0, create: 0 }, scenarioPatterns: ["abstract-symbolic"], itemModes: ["explain"], maxBloomLevel: "understand" },
	],
	flowProfile: { sectionOrder: ["fractions"], typicalLengthRange: [3, 5], cognitiveLadderShape: ["understand", "apply"] },
	itemCount: 4,
	sourceType: "generated",
	lastUpdated: new Date().toISOString(),
	version: 1,
};

const analysis: InstructionalAnalysis = {
	concepts: [
		{ concept: "fractions", documentCount: 2, problemCount: 2, coverage: 1, score: 2.2, overlapStrength: 2.5, gapScore: 1.2, coverageScore: 2.1, multipartPresence: 0.2, groupCount: 2, isCrossDocumentAnchor: true },
		{ concept: "ratios", documentCount: 1, problemCount: 1, coverage: 0.5, score: 1.8, overlapStrength: 0.8, gapScore: 1.7, coverageScore: 0.9, multipartPresence: 0, groupCount: 1 },
	],
	problems: [],
	misconceptions: [],
	bloomSummary: { remember: 0, understand: 1, apply: 1, analyze: 0, evaluate: 0, create: 0 },
	modeSummary: {},
	scenarioSummary: {},
	difficultySummary: { low: 0, medium: 0, high: 0, averageInstructionalDensity: 0 },
	domain: "Mathematics",
};

describe("buildInstructionalBlueprint", () => {
	it("orders and quotas concepts from analysis metadata", () => {
		const blueprint = buildInstructionalBlueprint({ assessment, analysis });
		expect(blueprint.concepts[0]?.id).toBe("fractions");
		expect((blueprint.concepts[0]?.quota ?? 0)).toBeGreaterThanOrEqual(blueprint.concepts[1]?.quota ?? 0);
	});
});