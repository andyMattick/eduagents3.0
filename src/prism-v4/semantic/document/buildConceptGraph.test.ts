import { describe, expect, it } from "vitest";
import { buildConceptGraph } from "./buildConceptGraph";
import type { Problem } from "../../schema/domain";
import type { ProblemTagVector } from "../../schema/semantic/ProblemTagVector";

describe("buildConceptGraph", () => {
	it("weights nodes and edges using concept scores and multipart recurrence", () => {
		const vectors: ProblemTagVector[] = [
			{ concepts: { fractions: 1.2, ratios: 0.8 }, standards: {}, misconceptionTriggers: {}, subject: "math", domain: "math", difficulty: 0.5, linguisticLoad: 0.3, bloom: { remember: 0, understand: 1, apply: 0, analyze: 0, evaluate: 0, create: 0 }, frustrationRisk: 0.2 },
			{ concepts: { fractions: 1.1, ratios: 0.7 }, standards: {}, misconceptionTriggers: {}, subject: "math", domain: "math", difficulty: 0.6, linguisticLoad: 0.4, bloom: { remember: 0, understand: 0, apply: 1, analyze: 0, evaluate: 0, create: 0 }, frustrationRisk: 0.2 },
		];
		const problems: Problem[] = [
			{ problemId: "p1", problemGroupId: "g1", rawText: "", sourceType: "document", sourceDocumentId: "doc-1", sourcePageNumber: 1, tags: vectors[0] },
			{ problemId: "p2", problemGroupId: "g1", rawText: "", sourceType: "document", sourceDocumentId: "doc-1", sourcePageNumber: 1, tags: vectors[1] },
		];
		const graph = buildConceptGraph(vectors, problems);
		expect(graph.nodes.find((node) => node.id === "fractions")?.weight).toBeGreaterThan(2);
		expect(graph.edges[0]?.weight).toBeGreaterThan(2);
	});
});