import { describe, expect, it } from "vitest";

import {
	filterAndClassifySuggestions,
	validateSuggestionSelection,
	getActionableSelectedTexts,
} from "../../api/v4/rewrite/suggestionEngine";
import {
	classifyActionable,
	generateSuggestionId,
	getNonActionableSelectedSuggestions,
	getActionableSelectedSuggestions,
	getSelectedSuggestions,
	separateBySuggestionSource,
} from "../../src/types/v4/suggestions";
import type { RewriteSuggestion } from "../../src/types/v4/suggestions";

function makeSuggestion(overrides: Partial<RewriteSuggestion>): RewriteSuggestion {
	return {
		id: "test-id",
		scope: "testLevel",
		text: "clarify the instructions",
		source: "system",
		actionable: true,
		selected: true,
		...overrides,
	};
}

describe("classifyActionable", () => {
	it("classifies keyword-matching suggestions as actionable", () => {
		expect(classifyActionable("add example to item 3")).toBe(true);
		expect(classifyActionable("clarify the instructions")).toBe(true);
		expect(classifyActionable("simplify the vocabulary")).toBe(true);
		expect(classifyActionable("add a definition for perpendicular")).toBe(true);
		expect(classifyActionable("rephrase item 2 stem")).toBe(true);
	});

	it("classifies classroom-action suggestions as non-actionable", () => {
		expect(classifyActionable("review with students")).toBe(false);
		expect(classifyActionable("reteach this concept")).toBe(false);
		expect(classifyActionable("encourage students to show work")).toBe(false);
		expect(classifyActionable("have students discuss in groups")).toBe(false);
		expect(classifyActionable("use manipulatives")).toBe(false);
	});

	it("defaults unknown suggestions to actionable (optimistic)", () => {
		// Short teacher-added suggestion without matching keywords
		expect(classifyActionable("break item into two parts")).toBe(true);
		expect(classifyActionable("add a number line")).toBe(true);
	});

	it("rejects empty suggestions", () => {
		expect(classifyActionable("")).toBe(false);
		expect(classifyActionable("   ")).toBe(false);
	});
});

describe("filterAndClassifySuggestions", () => {
	it("classifies suggestions server-side regardless of client value", () => {
		// Client claims suggestion is actionable, but server says no
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ text: "review with students", actionable: true, selected: true }),
		];
		const result = filterAndClassifySuggestions(suggestions);
		expect(result.allSuggestions[0].actionable).toBe(false);
	});

	it("overrides client actionable=false for actually-actionable suggestions", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ text: "clarify the instructions", actionable: false, selected: true }),
		];
		const result = filterAndClassifySuggestions(suggestions);
		expect(result.allSuggestions[0].actionable).toBe(true);
	});

	it("separates actionable and non-actionable selected suggestions", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ id: "s1", text: "add definition for ogive", selected: true }),
			makeSuggestion({ id: "s2", text: "review with students", selected: true }),
			makeSuggestion({ id: "s3", text: "rephrase item 5", selected: true }),
		];
		const result = filterAndClassifySuggestions(suggestions);
		expect(result.actionableSelected.map((s) => s.id)).toContain("s1");
		expect(result.actionableSelected.map((s) => s.id)).toContain("s3");
		expect(result.nonActionableSelected.map((s) => s.id)).toContain("s2");
	});

	it("excludes unselected suggestions from selected buckets", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ id: "a", text: "clarify", selected: true }),
			makeSuggestion({ id: "b", text: "add example", selected: false }),
		];
		const result = filterAndClassifySuggestions(suggestions);
		expect(result.selectedSuggestions.map((s) => s.id)).toEqual(["a"]);
		expect(result.allSuggestions).toHaveLength(2);
	});

	it("handles teacher-added suggestions through the same pipeline", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ text: "add a number line reference", source: "teacher", selected: true }),
			makeSuggestion({ text: "monitor student progress", source: "teacher", selected: true }),
		];
		const result = filterAndClassifySuggestions(suggestions);
		const teacherSelected = result.teacherSuggestions;
		expect(teacherSelected).toHaveLength(2);
		// Number line reference should be actionable; monitor student progress should not
		const numberLine = teacherSelected.find((s) => s.text.includes("number line"));
		const monitor = teacherSelected.find((s) => s.text.includes("monitor"));
		expect(numberLine?.actionable).toBe(true);
		expect(monitor?.actionable).toBe(false);
	});

	it("generates stable IDs when missing", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ id: "", text: "clarify", scope: "testLevel" }),
		];
		const result = filterAndClassifySuggestions(suggestions);
		expect(result.allSuggestions[0].id).toBeTruthy();
		expect(result.allSuggestions[0].id).not.toBe("");
	});

	it("preserves scope and itemId for item-level suggestions", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ scope: "itemLevel", itemId: "3", text: "rephrase item 3 stem" }),
		];
		const result = filterAndClassifySuggestions(suggestions);
		expect(result.allSuggestions[0].scope).toBe("itemLevel");
		expect(result.allSuggestions[0].itemId).toBe("3");
	});
});

describe("validateSuggestionSelection", () => {
	it("passes when there are actionable selected suggestions", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ text: "clarify instructions", selected: true }),
		];
		const filter = filterAndClassifySuggestions(suggestions);
		const result = validateSuggestionSelection(filter);
		expect(result.valid).toBe(true);
		expect(result.errors).toBeUndefined();
	});

	it("fails when nothing is selected", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ selected: false }),
		];
		const filter = filterAndClassifySuggestions(suggestions);
		const result = validateSuggestionSelection(filter);
		expect(result.valid).toBe(false);
		expect(result.errors?.some((e) => e.includes("No suggestions selected"))).toBe(true);
	});

	it("fails with clear message when selected suggestions are all non-actionable", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ text: "review with students", selected: true }),
			makeSuggestion({ text: "reteach this section", selected: true }),
		];
		const filter = filterAndClassifySuggestions(suggestions);
		const result = validateSuggestionSelection(filter);
		expect(result.valid).toBe(false);
		expect(result.errors?.some((e) => e.includes("non-actionable"))).toBe(true);
		// Should include the names of rejected suggestions
		expect(result.errors?.some((e) => e.includes("review with students"))).toBe(true);
	});
});

describe("getActionableSelectedTexts", () => {
	it("returns only texts of actionable selected suggestions", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ id: "a", text: "clarify instructions", selected: true }),
			makeSuggestion({ id: "b", text: "review with students", selected: true }),  // non-actionable
			makeSuggestion({ id: "c", text: "add example", selected: false }),
		];
		const filter = filterAndClassifySuggestions(suggestions);
		const texts = getActionableSelectedTexts(filter);
		expect(texts).toContain("clarify instructions");
		expect(texts).not.toContain("review with students");
		expect(texts).not.toContain("add example");
	});
});

describe("separateBySuggestionSource", () => {
	it("correctly separates system and teacher suggestions", () => {
		const suggestions: RewriteSuggestion[] = [
			makeSuggestion({ source: "system" }),
			makeSuggestion({ source: "teacher" }),
			makeSuggestion({ source: "system" }),
		];
		const { system, teacher } = separateBySuggestionSource(suggestions);
		expect(system).toHaveLength(2);
		expect(teacher).toHaveLength(1);
	});
});

describe("generateSuggestionId", () => {
	it("generates deterministic IDs for the same input", () => {
		const id1 = generateSuggestionId("testLevel", "clarify instructions");
		const id2 = generateSuggestionId("testLevel", "clarify instructions");
		expect(id1).toBe(id2);
	});

	it("generates different IDs for different inputs", () => {
		const id1 = generateSuggestionId("testLevel", "clarify instructions");
		const id2 = generateSuggestionId("itemLevel", "clarify instructions", "3");
		expect(id1).not.toBe(id2);
	});
});
