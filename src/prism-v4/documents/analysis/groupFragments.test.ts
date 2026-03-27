import { describe, expect, it } from "vitest";

import { groupFragments } from "./groupFragments";
import type { FragmentSemanticRecord } from "../../schema/semantic";

function buildFragment(args: {
	id: string;
	documentId?: string;
	nodeId: string;
	surfaceId?: string;
	instructionalRole: FragmentSemanticRecord["instructionalRole"];
	contentType?: FragmentSemanticRecord["contentType"];
	learningTarget?: string;
	concepts?: string[];
	misconceptions?: string[];
	scaffoldLevel?: FragmentSemanticRecord["scaffoldLevel"];
	confidence?: number;
}): FragmentSemanticRecord {
	const documentId = args.documentId ?? "doc-1";
	const surfaceId = args.surfaceId ?? `${documentId}-surface-1`;
	return {
		id: args.id,
		documentId,
		anchors: [{ documentId, surfaceId, nodeId: args.nodeId }],
		isInstructional: true,
		instructionalRole: args.instructionalRole,
		contentType: args.contentType ?? "text",
		learningTarget: args.learningTarget ?? null,
		prerequisiteConcepts: args.concepts ?? [],
		scaffoldLevel: args.scaffoldLevel ?? "medium",
		misconceptionTriggers: args.misconceptions ?? [],
		confidence: args.confidence ?? 0.9,
		classifierVersion: "wave5-test",
		strategy: "rule-based",
	};
}

describe("groupFragments", () => {
	it("groups fragments by shared concept and learning target", () => {
		const units = groupFragments([
			buildFragment({ id: "fragment-1", nodeId: "node-1", instructionalRole: "objective", contentType: "heading", learningTarget: "Explain fractions", concepts: ["fractions"] }),
			buildFragment({ id: "fragment-2", nodeId: "node-2", instructionalRole: "example", contentType: "text", learningTarget: "Explain fractions", concepts: ["fractions"] }),
		]);

		expect(units).toHaveLength(1);
		expect(units[0]?.fragments).toHaveLength(2);
		expect(units[0]?.concepts).toEqual(["fractions"]);
		expect(units[0]?.learningTargets).toEqual(["Explain fractions"]);
	});

	it("merges adjacent fragments with the same instructional band", () => {
		const units = groupFragments([
			buildFragment({ id: "fragment-1", nodeId: "node-10", instructionalRole: "instruction", concepts: ["fractions"], scaffoldLevel: "medium" }),
			buildFragment({ id: "fragment-2", nodeId: "node-11", instructionalRole: "instruction", concepts: ["fractions"], scaffoldLevel: "medium" }),
		]);

		expect(units).toHaveLength(1);
		expect(units[0]?.fragments.map((fragment) => fragment.id)).toEqual(["fragment-1", "fragment-2"]);
	});

	it("deduplicates repeated instructions inside a unit", () => {
		const units = groupFragments([
			buildFragment({ id: "fragment-1", nodeId: "node-1", instructionalRole: "instruction", learningTarget: "Solve fractions", concepts: ["fractions"] }),
			buildFragment({ id: "fragment-2", nodeId: "node-20", instructionalRole: "instruction", learningTarget: "Solve fractions", concepts: ["fractions"] }),
		]);

		expect(units).toHaveLength(1);
		expect(units[0]?.fragments).toHaveLength(1);
	});

	it("produces stable unit ids and deterministic output", () => {
		const fragments = [
			buildFragment({ id: "fragment-2", nodeId: "node-2", instructionalRole: "example", learningTarget: "Compare fractions", concepts: ["fractions"] }),
			buildFragment({ id: "fragment-1", nodeId: "node-1", instructionalRole: "objective", contentType: "heading", learningTarget: "Compare fractions", concepts: ["fractions"] }),
			buildFragment({ id: "fragment-3", documentId: "doc-2", nodeId: "node-1", instructionalRole: "example", learningTarget: "Compare fractions", concepts: ["fractions"] }),
		];

		const firstRun = groupFragments(fragments);
		const secondRun = groupFragments([...fragments].reverse());

		expect(firstRun).toEqual(secondRun);
		expect(firstRun.map((unit) => unit.unitId)).toEqual(secondRun.map((unit) => unit.unitId));
		expect(firstRun[0]?.unitId).toMatch(/^unit-/);
		expect(firstRun.map((unit) => unit.fragments.map((fragment) => fragment.id))).toEqual([
			["fragment-1", "fragment-2", "fragment-3"],
		]);
		expect(firstRun.map((unit) => unit.learningTargets)).toEqual([
			["Compare fractions"],
		]);
	});

	it("groups across multiple documents when the semantic signal matches", () => {
		const units = groupFragments([
			buildFragment({ id: "fragment-1", documentId: "doc-1", nodeId: "node-1", instructionalRole: "objective", contentType: "heading", learningTarget: "Explain fractions", concepts: ["fractions"], misconceptions: ["common fraction error"] }),
			buildFragment({ id: "fragment-2", documentId: "doc-2", nodeId: "node-1", instructionalRole: "example", learningTarget: "Explain fractions", concepts: ["fractions"], misconceptions: ["common fraction error"] }),
			buildFragment({ id: "fragment-3", documentId: "doc-3", nodeId: "node-1", instructionalRole: "example", learningTarget: "Interpret number lines", concepts: ["number line reasoning"] }),
		]);

		expect(units).toHaveLength(2);
		expect(units[0]?.fragments.map((fragment) => fragment.documentId).sort()).toEqual(["doc-1", "doc-2"]);
		expect(units[0]?.misconceptions).toEqual(["common fraction error"]);
	});

	it("does not merge question and table fragments even with semantic overlap", () => {
		const units = groupFragments([
			buildFragment({ id: "fragment-1", nodeId: "node-1", instructionalRole: "problem-stem", contentType: "question", learningTarget: "Interpret fractions", concepts: ["fractions"] }),
			buildFragment({ id: "fragment-2", nodeId: "node-2", instructionalRole: "example", contentType: "table", learningTarget: "Interpret fractions", concepts: ["fractions"] }),
		]);

		expect(units).toHaveLength(2);
		expect(units[0]?.fragments[0]?.contentType).toBe("question");
		expect(units[1]?.fragments[0]?.contentType).toBe("table");
	});
});