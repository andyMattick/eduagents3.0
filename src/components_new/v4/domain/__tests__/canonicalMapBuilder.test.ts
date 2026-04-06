import { describe, test, expect } from "vitest";
import { buildCanonicalMap, lookupConcept, getPrerequisiteChain } from "../canonicalMapBuilder";
import statsJson from "../ontologies/stats.json";
import bioJson from "../ontologies/biology.json";

describe("buildCanonicalMap", () => {
	test("produces one edge per prerequisite relationship", () => {
		const map = buildCanonicalMap(statsJson.concepts);
		// stats.p_value has 2 prereqs → 2 edges pointing to it
		const edges = map.edges.filter((e) => e.to === "stats.p_value");
		expect(edges).toHaveLength(2);
	});

	test("all edges carry type 'prereq'", () => {
		const map = buildCanonicalMap(statsJson.concepts);
		for (const edge of map.edges) {
			expect(edge.type).toBe("prereq");
		}
	});

	test("drops edges whose prerequisite ID is not in the concept list", () => {
		const concepts = [
			{
				id: "x.child",
				label: "Child",
				subject: "test",
				prerequisites: ["x.parent", "x.missing"],
				misconceptions: [],
			},
			{
				id: "x.parent",
				label: "Parent",
				subject: "test",
				prerequisites: [],
				misconceptions: [],
			},
		];
		const map = buildCanonicalMap(concepts);
		const dangling = map.edges.find((e) => e.from === "x.missing");
		expect(dangling).toBeUndefined();
	});

	test("preserves all concepts in the map", () => {
		const map = buildCanonicalMap(bioJson.concepts);
		expect(map.concepts).toHaveLength(bioJson.concepts.length);
	});
});

describe("lookupConcept", () => {
	const map = buildCanonicalMap(statsJson.concepts);

	test("finds a concept by ID", () => {
		const c = lookupConcept(map, "stats.null_hypothesis");
		expect(c?.label).toBe("Null hypothesis");
	});

	test("returns undefined for unknown ID", () => {
		expect(lookupConcept(map, "stats.unknown")).toBeUndefined();
	});
});

describe("getPrerequisiteChain", () => {
	const map = buildCanonicalMap(statsJson.concepts);

	test("returns the concept itself when it has no prereqs", () => {
		const chain = getPrerequisiteChain(map, "stats.null_hypothesis");
		expect(chain.map((c) => c.id)).toContain("stats.null_hypothesis");
		expect(chain).toHaveLength(1);
	});

	test("returns full chain for a deeply nested concept", () => {
		// stats.one_proportion_test → p_value → null_hypothesis + alternative_hypothesis,
		// plus decision_rule → p_value (already visited)
		const chain = getPrerequisiteChain(map, "stats.one_proportion_test");
		const ids = chain.map((c) => c.id);
		expect(ids).toContain("stats.one_proportion_test");
		expect(ids).toContain("stats.null_hypothesis");
		expect(ids).toContain("stats.p_value");
		expect(ids).toContain("stats.decision_rule");
	});

	test("never includes duplicate concepts in the chain", () => {
		const chain = getPrerequisiteChain(map, "stats.one_proportion_test");
		const ids = chain.map((c) => c.id);
		expect(ids.length).toBe(new Set(ids).size);
	});
});
