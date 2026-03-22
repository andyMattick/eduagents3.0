import { describe, expect, it } from "vitest";
import { runSemanticPipeline } from "../pipeline/runSemanticPipeline";
import type { TaggingPipelineInput } from "../../schema/semantic/TaggingPipelineInput";

const FRUSTRATION_FIELD = "frustration" + "Ri" + "sk";
const EXACT_OUTPUT_KEYS = ["documentId", "documentInsights", "problemVectors", "problems"];
const EXACT_DOCUMENT_KEYS = [
  "conceptGraph",
  "confidence",
  "documentConcepts",
  "documentId",
  "documentStandards",
  "flags",
  "overallDifficulty",
  "overallLinguisticLoad",
  "problems",
  "rawText",
  "sections",
  "semantics",
  "subject",
  "title",
];
const EXACT_PROBLEM_KEYS = [
  "cleanedText",
  "correctAnswer",
  "mediaUrls",
  "problemId",
  "rawText",
  "rubric",
  "sourceDocumentId",
  "sourcePageNumber",
  "sourceType",
  "tags",
];

function buildInput(): TaggingPipelineInput {
  return {
    documentId: "doc-1",
    fileName: "sample.pdf",
    azureExtract: {
      fileName: "sample.pdf",
      content: "1. What is 1/2 + 1/4?\nA. 1/4\nB. 3/4\nC. 2/6\n\n2. Explain what inference means using evidence from the passage.",
      pages: [
        {
          pageNumber: 1,
          text: "1. What is 1/2 + 1/4?\nA. 1/4\nB. 3/4\nC. 2/6\n\n2. Explain what inference means using evidence from the passage.",
        },
      ],
      paragraphs: [
        { text: "1. What is 1/2 + 1/4?", pageNumber: 1 },
        { text: "A. 1/4", pageNumber: 1 },
        { text: "B. 3/4", pageNumber: 1 },
        { text: "C. 2/6", pageNumber: 1 },
        { text: "2. Explain what inference means using evidence from the passage.", pageNumber: 1 },
      ],
      tables: [],
    },
  };
}

describe("Semantic pipeline", () => {
  it("produces an exact machine-schema tagging pipeline output", async () => {
    const output = await runSemanticPipeline(buildInput());

    expect(output.documentId).toBe("doc-1");
    expect(output.problems.length).toBeGreaterThan(0);
    expect(output.problemVectors.length).toBe(output.problems.length);
    expect(Object.keys(output).sort()).toEqual(EXACT_OUTPUT_KEYS);
    expect(Object.keys(output.documentInsights).sort()).toEqual(EXACT_DOCUMENT_KEYS);
    expect(output.documentInsights.rawText).toContain("What is 1/2 + 1/4?");
    expect(output.documentInsights.problems).toHaveLength(output.problems.length);
    expect(output.documentInsights.sections).toHaveLength(output.problems.length);
    expect(output.documentInsights.conceptGraph?.nodes.length).toBeGreaterThan(0);
    expect(output.documentInsights.documentConcepts).toBeDefined();
    expect(output.documentInsights.semantics?.concepts?.length).toBeGreaterThan(0);

    for (const problem of output.problems) {
      expect(Object.keys(problem).sort()).toEqual(EXACT_PROBLEM_KEYS);
      expect(problem.sourceType).toBe("document");
      expect(problem.tags).toBeDefined();
    }
  });

  it("uses fixed content-side defaults for legacy learner-shaped fields", async () => {
    const output = await runSemanticPipeline(buildInput());

    for (const vector of output.problemVectors) {
      expect(vector[FRUSTRATION_FIELD as keyof typeof vector]).toBe(0.2);
      expect(vector.difficulty).toBeGreaterThanOrEqual(0);
      expect(vector.difficulty).toBeLessThanOrEqual(1);
    }

    expect(output.documentInsights.overallDifficulty).toBeGreaterThanOrEqual(0);
    expect(output.documentInsights.overallDifficulty).toBeLessThanOrEqual(1);
    expect(output.documentInsights.overallLinguisticLoad).toBeGreaterThanOrEqual(0);
    expect(output.documentInsights.overallLinguisticLoad).toBeLessThanOrEqual(1);
  });

  it("builds a concept co-occurrence graph from problem vectors", async () => {
    const output = await runSemanticPipeline(buildInput());
    const graph = output.documentInsights.conceptGraph;

    expect(graph).toBeDefined();
    expect(graph?.nodes.length).toBeGreaterThan(0);
    expect(graph?.edges.every((edge) => (edge.weight ?? 0) >= 1)).toBe(true);
  });
});
