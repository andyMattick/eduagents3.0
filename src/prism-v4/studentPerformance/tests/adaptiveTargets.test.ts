import { describe, expect, it } from "vitest";

import { deriveAdaptiveTargets } from "../../documents/intents/adaptiveTargets";
import type { StudentPerformanceProfile } from "../StudentPerformanceProfile";
import type { ConceptProfile, TeacherFingerprint } from "../../teacherFeedback";

const conceptProfiles: ConceptProfile[] = [
	{
		conceptId: "fractions",
		displayName: "Fractions",
		frequencyWeight: 0.7,
		absoluteItemHint: 2,
		lowEmphasis: false,
		bloomDistribution: { remember: 0, understand: 0.3, apply: 0.3, analyze: 0.4, evaluate: 0, create: 0 },
		scenarioPatterns: ["real-world", "graphical"],
		itemModes: ["identify", "explain", "analyze"],
		maxBloomLevel: "analyze",
	},
	{
		conceptId: "ratios",
		displayName: "Ratios",
		frequencyWeight: 0.3,
		absoluteItemHint: 1,
		lowEmphasis: false,
		bloomDistribution: { remember: 0, understand: 0.5, apply: 0.5, analyze: 0, evaluate: 0, create: 0 },
		scenarioPatterns: ["real-world"],
		itemModes: ["identify", "apply"],
		maxBloomLevel: "apply",
	},
];

const teacherFingerprint: TeacherFingerprint = {
	teacherId: "teacher-1",
	globalConceptProfiles: conceptProfiles,
	defaultBloomDistribution: { remember: 0.1, understand: 0.3, apply: 0.3, analyze: 0.3, evaluate: 0, create: 0 },
	defaultScenarioPreferences: ["real-world", "graphical"],
	defaultItemModes: ["identify", "explain", "analyze"],
	flowProfile: {
		sectionOrder: ["fractions", "ratios"],
		typicalLengthRange: [4, 6],
		cognitiveLadderShape: ["understand", "apply", "analyze"],
	},
	lastUpdated: "2026-03-29T00:00:00.000Z",
	version: 1,
};

const studentProfile: StudentPerformanceProfile = {
	studentId: "student-1",
	unitId: "unit-1",
	lastUpdated: "2026-03-29T00:00:00.000Z",
	totalEvents: 8,
	totalAssessments: 2,
	assessmentIds: ["assessment-1", "assessment-2"],
	overallMastery: 0.48,
	overallConfidence: 0.52,
	averageResponseTimeSeconds: 38,
	conceptMastery: { fractions: 0.25, ratios: 0.82 },
	conceptExposure: { fractions: 1.2, ratios: 0.8 },
	bloomMastery: { understand: 0.8, apply: 0.55, analyze: 0.22 },
	modeMastery: { identify: 0.8, explain: 0.25, analyze: 0.3, apply: 0.7 },
	scenarioMastery: { "real-world": 0.8, graphical: 0.35 },
	conceptBloomMastery: { fractions: { understand: 0.7, apply: 0.42, analyze: 0.15 }, ratios: { apply: 0.82 } },
	conceptModeMastery: { fractions: { identify: 0.75, explain: 0.2, analyze: 0.28 }, ratios: { apply: 0.85 } },
	conceptScenarioMastery: { fractions: { "real-world": 0.7, graphical: 0.22 }, ratios: { "real-world": 0.8 } },
	conceptAverageResponseTimeSeconds: { fractions: 46, ratios: 29 },
	conceptConfidence: { fractions: 0.4, ratios: 0.72 },
	misconceptions: {
		fractions: [{ misconceptionKey: "denominator-swap", occurrences: 2, lastSeenAt: "2026-03-29T00:00:00.000Z", examples: ["Added denominators"], relatedBloomLevels: ["apply", "analyze"], relatedModes: ["explain"] }],
	},
};

describe("adaptiveTargets", () => {
	it("increases quotas for lower-mastery concepts", () => {
		const targets = deriveAdaptiveTargets(studentProfile, conceptProfiles, { teacherFingerprint }, 5);
		expect(targets.conceptQuotas.fractions).toBeGreaterThan(targets.conceptQuotas.ratios);
	});

	it("prioritizes weaker bloom levels inside a concept", () => {
		const targets = deriveAdaptiveTargets(studentProfile, conceptProfiles, { teacherFingerprint }, 5);
		expect(targets.bloomTargets.fractions?.[0]).toBe("analyze");
	});

	it("surfaces weaker modes and scenarios first", () => {
		const targets = deriveAdaptiveTargets(studentProfile, conceptProfiles, { teacherFingerprint }, 5);
		expect(targets.modePreferences.fractions?.[0]).toBe("explain");
		expect(targets.scenarioPreferences.fractions?.[0]).toBe("graphical");
		expect(targets.difficultyTargets.fractions?.[0]).toBeLessThan(targets.difficultyTargets.fractions?.at(-1) ?? 1);
	});
});