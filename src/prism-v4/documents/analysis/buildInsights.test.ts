import { describe, expect, it } from "vitest";
import { buildAnalyzedDocumentInsights } from "./buildInsights";
import type { ExtractedProblem, FragmentSemanticRecord } from "../../schema/semantic";

function buildProblem(overrides: Partial<ExtractedProblem>): ExtractedProblem {
	return {
		id: overrides.id ?? "problem-1",
		documentId: overrides.documentId ?? "doc-1",
		anchors: overrides.anchors ?? [],
		text: overrides.text ?? "Solve the fractions problem.",
		extractionMode: overrides.extractionMode ?? "authored",
		sourceSpan: overrides.sourceSpan,
		problemGroupId: overrides.problemGroupId,
		concepts: overrides.concepts ?? [],
		representations: overrides.representations ?? ["symbolic"],
		difficulty: overrides.difficulty ?? "medium",
		misconceptions: overrides.misconceptions ?? [],
		cognitiveDemand: overrides.cognitiveDemand ?? "conceptual",
	};
}

function buildFragment(overrides: Partial<FragmentSemanticRecord>): FragmentSemanticRecord {
	return {
		id: overrides.id ?? "fragment-1",
		documentId: overrides.documentId ?? "doc-1",
		anchors: overrides.anchors ?? [],
		isInstructional: overrides.isInstructional ?? true,
		instructionalRole: overrides.instructionalRole ?? "example",
		contentType: overrides.contentType ?? "text",
		learningTarget: overrides.learningTarget ?? null,
		prerequisiteConcepts: overrides.prerequisiteConcepts ?? [],
		scaffoldLevel: overrides.scaffoldLevel,
		exampleType: overrides.exampleType,
		misconceptionTriggers: overrides.misconceptionTriggers ?? [],
		confidence: overrides.confidence ?? 0.9,
		classifierVersion: overrides.classifierVersion ?? "test",
		strategy: overrides.strategy ?? "rule-based",
		evidence: overrides.evidence,
		semanticTags: overrides.semanticTags,
	};
}

describe("buildAnalyzedDocumentInsights", () => {
	it("merges near-duplicate concepts and filters low-signal noise from the primary concept list", () => {
		const insights = buildAnalyzedDocumentInsights({
			problems: [
				buildProblem({
					id: "p1",
					concepts: ["Fractions", "Chapter 3 Review"],
					sourceSpan: { firstPage: 1, lastPage: 1 },
				}),
				buildProblem({
					id: "p2",
					problemGroupId: "group-1",
					concepts: ["fraction", "Equivalent fractions"],
					sourceSpan: { firstPage: 2, lastPage: 2 },
				}),
				buildProblem({
					id: "p3",
					problemGroupId: "group-1",
					concepts: ["fractions"],
					sourceSpan: { firstPage: 2, lastPage: 3 },
				}),
			],
			fragments: [
				buildFragment({ prerequisiteConcepts: ["fractions"] }),
				buildFragment({ id: "fragment-2", prerequisiteConcepts: ["chapter 3 review"] }),
			],
		});

		expect(insights.scoredConcepts).toBeDefined();
		expect(insights.concepts).not.toContain("chapter 3 review");

		const primaryConcept = insights.scoredConcepts?.find((concept) => ["fraction", "fractions"].includes(concept.concept));
		expect(primaryConcept).toBeDefined();
		expect(primaryConcept?.freqProblems).toBe(3);
		expect(primaryConcept?.freqPages).toBe(3);
		expect(primaryConcept?.multipartPresence).toBeGreaterThan(0);
		expect(primaryConcept?.isNoise).toBe(false);

		const noiseConcept = insights.scoredConcepts?.find((concept) => concept.concept === "chapter 3 review");
		expect(noiseConcept?.isNoise).toBe(true);
		expect((primaryConcept?.score ?? 0)).toBeGreaterThan(noiseConcept?.score ?? 0);
	});
});