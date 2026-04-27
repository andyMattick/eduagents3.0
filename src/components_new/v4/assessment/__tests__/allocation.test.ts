import { describe, test, expect } from "vitest";
import { allocateConcepts } from "../builder/conceptAllocator";
import { allocateTypes } from "../builder/typeAllocator";
import { allocateDifficulty } from "../builder/difficultyAllocator";
import type { ConceptGroup } from "../../conceptGrouping";

const groups: ConceptGroup[] = [
	{ parentId: "a", parentLabel: "A", questionCount: 6, children: [] },
	{ parentId: "b", parentLabel: "B", questionCount: 4, children: [] },
];

// ── allocateConcepts ──────────────────────────────────────────────────────────

describe("allocateConcepts", () => {
	test("total allocation equals req.count", () => {
		const alloc = allocateConcepts(groups, { count: 10, types: ["mc"], difficulty: "easy" });
		const total = Object.values(alloc).reduce((a, b) => a + b, 0);
		expect(total).toBe(10);
	});

	test("every group gets at least 1 item", () => {
		const alloc = allocateConcepts(groups, { count: 5, types: ["mc"], difficulty: "easy" });
		for (const g of groups) {
			expect(alloc[g.parentId]).toBeGreaterThanOrEqual(1);
		}
	});

	test("higher-weight group gets more items than lower-weight group", () => {
		const alloc = allocateConcepts(groups, { count: 10, types: ["mc"], difficulty: "easy" });
		expect(alloc["a"]).toBeGreaterThan(alloc["b"]);
	});

	test("focusConceptIds filters to only those groups", () => {
		const alloc = allocateConcepts(groups, {
			count: 4,
			types: ["mc"],
			difficulty: "easy",
			focusConceptIds: ["a"],
		});
		expect(alloc["a"]).toBeDefined();
		expect(alloc["b"]).toBeUndefined();
	});

	test("returns empty object when groups list is empty", () => {
		const alloc = allocateConcepts([], { count: 5, types: ["mc"], difficulty: "easy" });
		expect(Object.keys(alloc)).toHaveLength(0);
	});
});

// ── allocateTypes ─────────────────────────────────────────────────────────────

describe("allocateTypes", () => {
	test("total allocation equals req.count", () => {
		const alloc = allocateTypes({ count: 9, types: ["mc", "short_answer", "frq"], difficulty: "easy" });
		const total = Object.values(alloc).reduce((a, b) => a + b, 0);
		expect(total).toBe(9);
	});

	test("distributes evenly when divisible", () => {
		const alloc = allocateTypes({ count: 6, types: ["mc", "short_answer"], difficulty: "easy" });
		expect(alloc["mc"]).toBe(3);
		expect(alloc["short_answer"]).toBe(3);
	});

	test("remainder goes to first type(s)", () => {
		const alloc = allocateTypes({ count: 7, types: ["mc", "short_answer", "frq"], difficulty: "easy" });
		const total = alloc["mc"] + alloc["short_answer"] + alloc["frq"];
		expect(total).toBe(7);
	});
});

// ── allocateDifficulty ────────────────────────────────────────────────────────

describe("allocateDifficulty", () => {
	test("non-mixed mode assigns all items to single level", () => {
		const alloc = allocateDifficulty(10, "hard");
		expect(alloc.hard).toBe(10);
		expect(alloc.easy).toBe(0);
		expect(alloc.medium).toBe(0);
	});

	test("mixed sums to exactly count", () => {
		const count = 13;
		const alloc = allocateDifficulty(count, "mixed");
		expect(alloc.easy + alloc.medium + alloc.hard).toBe(count);
	});

	test("mixed: medium is the largest share when count is large", () => {
		const alloc = allocateDifficulty(20, "mixed");
		expect(alloc.medium).toBeGreaterThan(alloc.easy);
		expect(alloc.medium).toBeGreaterThan(alloc.hard);
	});

	test("hard is never negative", () => {
		const alloc = allocateDifficulty(1, "mixed");
		expect(alloc.hard).toBeGreaterThanOrEqual(0);
	});
});
