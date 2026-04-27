import { describe, expect, it } from "vitest";

import { blueprintToRequestParams } from "../../api/v4/studio/shared";
import type { BlueprintModel } from "../prism-v4/session/InstructionalIntelligenceSession";

function makeBlueprint(concepts: Array<{ id: string; included: boolean; quota: number }>): BlueprintModel {
	return {
		concepts: concepts.map((c, i) => ({
			id: c.id,
			name: c.id,
			order: i,
			included: c.included,
			quota: c.quota,
		})),
		bloomLadder: [],
		difficultyRamp: [],
		modeMix: [],
		scenarioMix: [],
	};
}

describe("blueprintToRequestParams", () => {
	it("maps three included concepts to sectionOrder and itemCountOverrides", () => {
		const blueprint = makeBlueprint([
			{ id: "math.fractions", included: true, quota: 3 },
			{ id: "math.decimals", included: true, quota: 2 },
			{ id: "math.ratios", included: true, quota: 4 },
		]);

		const result = blueprintToRequestParams({
			blueprint,
			blueprintId: "bp-001",
			teacherId: "teacher-1",
			unitId: "unit-1",
			fallbackItemCount: 5,
		});

		expect(result.sectionOrder).toEqual(["math.fractions", "math.decimals", "math.ratios"]);
		expect(result.itemCountOverrides).toEqual({
			"math.fractions": 3,
			"math.decimals": 2,
			"math.ratios": 4,
		});
		expect(result.totalItems).toBe(9); // 3 + 2 + 4
	});

	it("preserves blueprint concept ordering as sectionOrder", () => {
		const blueprint = makeBlueprint([
			{ id: "z-concept", included: true, quota: 1 },
			{ id: "a-concept", included: true, quota: 1 },
			{ id: "m-concept", included: true, quota: 1 },
		]);

		const result = blueprintToRequestParams({
			blueprint,
			blueprintId: "bp-002",
			fallbackItemCount: 3,
		});

		// Order must reflect blueprint.concepts order, not alphabetical
		expect(result.sectionOrder).toEqual(["z-concept", "a-concept", "m-concept"]);
	});

	it("sets conceptBlueprintOption with correct assessmentId, teacherId, and edits", () => {
		const blueprint = makeBlueprint([
			{ id: "science.cells", included: true, quota: 2 },
		]);

		const result = blueprintToRequestParams({
			blueprint,
			blueprintId: "bp-003",
			teacherId: "teacher-99",
			unitId: "unit-bio",
			fallbackItemCount: 5,
		});

		expect(result.conceptBlueprintOption).toBeDefined();
		expect(result.conceptBlueprintOption?.assessmentId).toBe("bp-003");
		expect(result.conceptBlueprintOption?.teacherId).toBe("teacher-99");
		expect(result.conceptBlueprintOption?.unitId).toBe("unit-bio");
		expect(result.conceptBlueprintOption?.edits.sectionOrder).toEqual(["science.cells"]);
		expect(result.conceptBlueprintOption?.edits.itemCountOverrides).toEqual({ "science.cells": 2 });
	});

	it("excludes concepts with included=false from sectionOrder and overrides", () => {
		const blueprint = makeBlueprint([
			{ id: "math.fractions", included: true, quota: 3 },
			{ id: "math.noise", included: false, quota: 0 },
			{ id: "math.ratios", included: true, quota: 2 },
		]);

		const result = blueprintToRequestParams({
			blueprint,
			blueprintId: "bp-004",
			fallbackItemCount: 5,
		});

		expect(result.sectionOrder).toEqual(["math.fractions", "math.ratios"]);
		expect(Object.keys(result.itemCountOverrides)).not.toContain("math.noise");
		expect(result.totalItems).toBe(5); // 3 + 2
	});

	it("excludes concepts with quota=0 even when included=true", () => {
		const blueprint = makeBlueprint([
			{ id: "math.fractions", included: true, quota: 0 },
			{ id: "math.ratios", included: true, quota: 2 },
		]);

		const result = blueprintToRequestParams({
			blueprint,
			blueprintId: "bp-005",
			fallbackItemCount: 5,
		});

		expect(result.sectionOrder).toEqual(["math.ratios"]);
		expect(result.itemCountOverrides).toEqual({ "math.ratios": 2 });
	});

	it("returns undefined conceptBlueprintOption and uses fallbackItemCount when no concepts are included", () => {
		const blueprint = makeBlueprint([
			{ id: "math.noise", included: false, quota: 0 },
		]);

		const result = blueprintToRequestParams({
			blueprint,
			blueprintId: "bp-006",
			fallbackItemCount: 7,
		});

		expect(result.conceptBlueprintOption).toBeUndefined();
		expect(result.sectionOrder).toHaveLength(0);
		expect(result.totalItems).toBe(7);
	});

	it("uses DEFAULT_TEACHER_ID when no teacherId is provided", () => {
		const blueprint = makeBlueprint([
			{ id: "reading.inference", included: true, quota: 1 },
		]);

		const result = blueprintToRequestParams({
			blueprint,
			blueprintId: "bp-007",
			fallbackItemCount: 1,
		});

		// Should use the module default, not undefined
		expect(result.conceptBlueprintOption?.teacherId).toBeTruthy();
		expect(typeof result.conceptBlueprintOption?.teacherId).toBe("string");
	});
});
