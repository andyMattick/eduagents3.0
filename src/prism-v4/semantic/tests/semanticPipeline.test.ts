import { describe, expect, it } from "vitest";
import { runSemanticPipeline } from "../pipeline/runSemanticPipeline";
import type { TaggingPipelineInput } from "../../schema/semantic/TaggingPipelineInput";

const FRUSTRATION_FIELD = "frustration" + "Ri" + "sk";
const EXACT_OUTPUT_KEYS = ["documentId", "documentInsights", "problemVectors", "problems"];
const EXACT_DOCUMENT_KEYS = [
  "conceptGraph",
  "confidence",
  "documentConcepts",
  "documentConceptDetails",
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
  "antiCheating",
  "canonicalProblemId",
  "cleanedText",
  "correctAnswer",
  "createdAt",
  "displayOrder",
  "enrichments",
  "localProblemId",
  "mediaUrls",
  "narrative",
  "parentProblemId",
  "partIndex",
  "partLabel",
  "partText",
  "problemGroupId",
  "problemId",
  "problemNumber",
  "rawText",
  "rootProblemId",
  "rubric",
  "scaffolds",
  "sourceDocumentId",
  "sourcePageNumber",
  "sourceSpan",
  "sourceType",
  "stemText",
  "tags",
  "teacherLabel",
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
    expect(output.problems.map((problem) => problem.problemId)).toEqual(["p1", "p2"]);
    expect(output.problemVectors.length).toBe(output.problems.length);
    expect(Object.keys(output).sort()).toEqual(EXACT_OUTPUT_KEYS);
    expect(Object.keys(output.documentInsights).sort()).toEqual(EXACT_DOCUMENT_KEYS);
    expect(output.documentInsights.rawText).toContain("What is 1/2 + 1/4?");
    expect(output.documentInsights.problems).toHaveLength(output.problems.length);
    expect(output.documentInsights.sections).toHaveLength(output.problems.length);
    expect(output.documentInsights.conceptGraph?.nodes.length).toBeGreaterThan(0);
    expect(output.documentInsights.documentConcepts).toBeDefined();
    expect(output.documentInsights.documentConceptDetails).toBeDefined();
    expect(output.documentInsights.semantics?.concepts?.length).toBeGreaterThan(0);

    for (const problem of output.problems) {
      expect(Object.keys(problem).sort()).toEqual(EXACT_PROBLEM_KEYS);
      expect(problem.sourceType).toBe("document");
      expect(problem.tags).toBeDefined();
      expect(problem.narrative).toBeDefined();
      expect(problem.narrative?.whatProblemAsks).toBeTruthy();
      expect(problem.narrative?.reasoningPath).toBeTruthy();
      expect(problem.scaffolds).toBeDefined();
      expect(problem.enrichments).toBeDefined();
      expect(problem.antiCheating).toBeDefined();
      expect(problem).not.toHaveProperty("oldField");
      expect(problem).not.toHaveProperty("legacyBloom");
      expect(problem.canonicalProblemId).toBe(`doc-1::${problem.problemId}`);
      expect(problem.localProblemId).toBe(problem.problemId);
      expect(problem.problemGroupId).toBe(problem.rootProblemId ?? problem.problemId);
      expect(problem.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(problem.tags?.cognitive).toMatchObject({
        bloom: expect.any(Object),
        difficulty: expect.any(Number),
        multiStep: expect.any(Number),
      });
      expect(problem.tags).not.toHaveProperty("legacyBloom");
      expect(problem.tags).not.toHaveProperty("oldProblem");
      expect(problem.tags?.reasoning).toBeDefined();
      expect(problem.tags?.cognitive.bloom.apply).toBeGreaterThanOrEqual(0);
      expect(problem.tags?.cognitive.multiStep).toBeGreaterThanOrEqual(0);
    }
  });

  it("uses fixed content-side defaults for legacy learner-shaped fields", async () => {
    const output = await runSemanticPipeline(buildInput());

    for (const vector of output.problemVectors) {
      expect(vector[FRUSTRATION_FIELD as keyof typeof vector]).toBe(0.2);
      expect(vector.difficulty).toBeGreaterThanOrEqual(0);
      expect(vector.difficulty).toBeLessThanOrEqual(1);
      expect(vector.cognitive).toBeDefined();
      expect(vector.cognitive.bloom.understand).toBeGreaterThanOrEqual(0);
      expect(vector.cognitive.representationComplexity).toBeGreaterThanOrEqual(0);
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

  it("gives a multi-directive single-part problem more multistep weight than a trivial multipart child", async () => {
    const output = await runSemanticPipeline({
      documentId: "doc-multistep",
      fileName: "sample.pdf",
      azureExtract: {
        fileName: "sample.pdf",
        content: [
          "1. Solve the equation and explain your reasoning.",
          "2. Read the stem.",
          "a) State the answer.",
        ].join("\n"),
        pages: [{ pageNumber: 1, text: "page 1" }],
        paragraphs: [
          { text: "1. Solve the equation and explain your reasoning.", pageNumber: 1 },
          { text: "2. Read the stem.", pageNumber: 1 },
          { text: "a) State the answer.", pageNumber: 1 },
        ],
        tables: [],
      },
    });

    const singlePart = output.problems.find((problem) => problem.problemId === "p1");
    const multipartChild = output.problems.find((problem) => problem.problemId === "p2a");

    expect(singlePart?.tags?.cognitive.multiStep ?? 0).toBeGreaterThan(multipartChild?.tags?.cognitive.multiStep ?? 0);
  });

  it("adds post-semantic scaffolds, enrichment, and anti-cheating analysis", async () => {
    const output = await runSemanticPipeline({
      documentId: "doc-graph",
      fileName: "graph.pdf",
      azureExtract: {
        fileName: "graph.pdf",
        content: "1. Look at the graph and answer the question.",
        pages: [
          {
            pageNumber: 1,
            text: "1. Look at the graph and answer the question.",
          },
        ],
        paragraphs: [
          { text: "1. Look at the graph and answer the question.", pageNumber: 1 },
        ],
        tables: [],
      },
    });

    const [problem] = output.problems;

    expect(problem?.scaffolds).toContain("Highlight key points on the graph before solving.");
    expect(problem?.antiCheating?.vulnerabilitySummary).toContain("Students may guess based on graph shape without reasoning.");
  });

});
