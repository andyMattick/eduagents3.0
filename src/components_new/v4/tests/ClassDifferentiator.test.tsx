/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ClassProfileModel, DifferentiatedBuildModel } from "../../../types/v4/InstructionalSession";
import { ClassDifferentiator } from "../ClassDifferentiator";

function buildClassProfile(): ClassProfileModel {
	return {
		classId: "class-1",
		students: [{
			studentId: "student-low",
			lastUpdated: "2026-03-29T00:00:00.000Z",
			totalEvents: 2,
			totalAssessments: 1,
			assessmentIds: ["assessment-1"],
			overallMastery: 0.25,
			overallConfidence: 0.5,
			averageResponseTimeSeconds: 10,
			conceptMastery: { fractions: 0.3 },
			conceptExposure: { fractions: 2 },
			bloomMastery: {},
			modeMastery: {},
			scenarioMastery: {},
			conceptBloomMastery: {},
			conceptModeMastery: {},
			conceptScenarioMastery: {},
			conceptAverageResponseTimeSeconds: {},
			conceptConfidence: {},
			misconceptions: {},
		}],
		conceptClusters: [{ conceptId: "fractions", low: ["student-low"], mid: [], high: [] }],
		misconceptionClusters: [{ misconception: "denominator-swap", students: ["student-low"] }],
	};
}

function buildDifferentiatedBuild(): DifferentiatedBuildModel {
	return {
		classId: "class-1",
		versions: [{
			versionId: "low-version",
			label: "Support Version",
			masteryBand: "low",
			studentIds: ["student-low"],
			representativeStudentId: "student-low",
			explanation: "Support Version targets 1 student in the low mastery band using representative profile student-low.",
			builderPlan: {
				sections: [{ conceptId: "fractions", conceptName: "Fractions", itemCount: 1, bloomSequence: ["understand"], difficultySequence: ["medium"], modeSequence: ["compare"], scenarioSequence: ["abstract-symbolic"] }],
				adaptiveTargets: { boostedConcepts: ["fractions"], suppressedConcepts: [], boostedBloom: ["understand"], suppressedBloom: [] },
			},
			assessmentPreview: {
				items: [{ itemId: "item-1", stem: "Compare the fractions 2/3 and 3/4.", answer: "Use common denominators.", conceptId: "fractions", bloom: "understand", difficulty: "medium", mode: "compare", scenario: "abstract-symbolic", teacherReasons: ["Fractions was boosted for support."], studentReasons: ["This stays symbolic for scaffolding."] }],
			},
		}],
	};
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("ClassDifferentiator", () => {
	it("generates and renders differentiated versions", async () => {
		const loadDifferentiatedBuild = vi.fn(async () => buildDifferentiatedBuild());

		function Harness() {
			const [differentiatedBuild, setDifferentiatedBuild] = useState<DifferentiatedBuildModel | null>(null);
			return (
				<ClassDifferentiator
					classId="class-1"
					classProfile={buildClassProfile()}
					differentiatedBuild={differentiatedBuild}
					onLoadDifferentiatedBuild={async (classId) => {
						const payload = await loadDifferentiatedBuild(classId);
						setDifferentiatedBuild(payload);
						return payload;
					}}
				/>
			);
		}

		render(<Harness />);

		fireEvent.click(screen.getByRole("button", { name: "Generate differentiated versions" }));

		await waitFor(() => expect(loadDifferentiatedBuild).toHaveBeenCalledWith("class-1"));
		expect(await screen.findByText("Support Version")).toBeInTheDocument();
		expect(screen.getByText(/Boosted concepts: fractions/i)).toBeInTheDocument();
		expect(screen.getByText("Compare the fractions 2/3 and 3/4.")).toBeInTheDocument();
	});
});