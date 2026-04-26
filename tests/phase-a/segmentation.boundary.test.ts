import { describe, expect, it } from "vitest";

import { analyzeRegisteredDocument } from "../../src/prism-v4/documents/analysis";

function buildAzureExtract() {
  const content = [
    "1) Solve 2x + 3 = 11.",
    "(a) Show your work.",
    "(b) Explain why your method works.",
    "2) Compare two solution strategies and justify which is better.",
  ].join("\n");

  return {
    fileName: "fixture.pdf",
    content,
    pages: [{ pageNumber: 1, text: content }],
    paragraphs: [
      { pageNumber: 1, text: "1) Solve 2x + 3 = 11." },
      { pageNumber: 1, text: "(a) Show your work." },
      { pageNumber: 1, text: "(b) Explain why your method works." },
      { pageNumber: 1, text: "2) Compare two solution strategies and justify which is better." },
    ],
    tables: [],
    readingOrder: [],
  };
}

describe("Phase A->B boundary", () => {
  it("produces analyzed problems with required structural fields", async () => {
    const analyzed = await analyzeRegisteredDocument({
      documentId: "doc-boundary-a-b",
      sourceFileName: "fixture.pdf",
      sourceMimeType: "application/pdf",
      azureExtract: buildAzureExtract(),
    });

    expect(analyzed.problems.length).toBeGreaterThan(0);

    for (const problem of analyzed.problems) {
      expect(problem.id).toBeTruthy();
      expect(problem.documentId).toBe("doc-boundary-a-b");
      expect(problem.text).toEqual(expect.any(String));
      expect(problem.anchors).toEqual(expect.any(Array));
      expect(problem.cognitiveDemand).toBeDefined();
      expect(problem.representations.length).toBeGreaterThan(0);
    }
  });
});
