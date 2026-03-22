/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { runSemanticPipelineMock } = vi.hoisted(() => ({
  runSemanticPipelineMock: vi.fn(),
}));

vi.mock("../../../prism-v4/semantic/pipeline/runSemanticPipeline", () => ({
  runSemanticPipeline: runSemanticPipelineMock,
}));

import { DocumentUpload } from "../DocumentUpload";

describe("DocumentUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads to the v4 ingest route and renders semantic output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        documentId: "doc-1",
        fileName: "sample.pdf",
        azureExtract: {
          fileName: "sample.pdf",
          content: "1. What is 2 + 2?",
          pages: [{ pageNumber: 1, text: "1. What is 2 + 2?" }],
          paragraphs: [{ text: "1. What is 2 + 2?", pageNumber: 1 }],
          tables: [],
          readingOrder: ["1. What is 2 + 2?"],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    runSemanticPipelineMock.mockResolvedValue({
      documentId: "doc-1",
      documentInsights: {
        documentId: "doc-1",
        title: "Sample semantic title",
        subject: "math",
        rawText: "1. What is 2 + 2?",
        sections: [{ sectionId: "problem-1", title: "Problem 1", text: "1. What is 2 + 2?", concepts: { "math.number": 1 }, difficulty: 0.3, linguisticLoad: 0.1 }],
        problems: [{ problemId: "problem-1", rawText: "1. What is 2 + 2?", sourceType: "document", sourceDocumentId: "doc-1", sourcePageNumber: 1, tags: undefined }],
        documentConcepts: { "math.number": 1 },
        documentStandards: undefined,
        overallDifficulty: 0.3,
        overallLinguisticLoad: 0.1,
        conceptGraph: {
          nodes: [{ id: "math.number", label: "math.number", weight: 1 }],
          edges: [],
        },
        semantics: { topic: "math", concepts: ["math.number"], relationships: [], misconceptions: [] },
        confidence: { extractionQuality: 0.9, taggingQuality: 0.8 },
        flags: { unreadable: false, lowQualityScan: false, missingPages: false },
      },
      problems: [{ problemId: "problem-1", rawText: "1. What is 2 + 2?", sourceType: "document", sourceDocumentId: "doc-1", sourcePageNumber: 1, tags: { subject: "math", domain: "number", concepts: { "math.number": 1 }, problemType: {}, multiStep: 0, steps: 1, representation: "paragraph", representationCount: 1, linguisticLoad: 0.1, vocabularyTier: 1, sentenceComplexity: 0.1, wordProblem: 0, passiveVoice: 0, abstractLanguage: 0, bloom: { remember: 0.1, understand: 0.2, apply: 0.7, analyze: 0, evaluate: 0, create: 0 }, difficulty: 0.3, distractorDensity: 0, abstractionLevel: 0.2, misconceptionTriggers: {}, frustrationRisk: 0.2, engagementPotential: 0.4 } }],
      problemVectors: [{ subject: "math", domain: "number", concepts: { "math.number": 1 }, problemType: {}, multiStep: 0, steps: 1, representation: "paragraph", representationCount: 1, linguisticLoad: 0.1, vocabularyTier: 1, sentenceComplexity: 0.1, wordProblem: 0, passiveVoice: 0, abstractLanguage: 0, bloom: { remember: 0.1, understand: 0.2, apply: 0.7, analyze: 0, evaluate: 0, create: 0 }, difficulty: 0.3, distractorDensity: 0, abstractionLevel: 0.2, misconceptionTriggers: {}, frustrationRisk: 0.2, engagementPotential: 0.4 }],
    });

    render(<DocumentUpload />);

    const fileInput = screen.getByLabelText("Source document");
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["pdf-data"], "sample.pdf", { type: "application/pdf" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Run v4 ingestion" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/v4/ingest", expect.objectContaining({ method: "POST" }));

    expect(await screen.findByText("Sample semantic title")).toBeInTheDocument();
    expect(screen.getByText("Problem semantic vectors")).toBeInTheDocument();
    expect(screen.getByText("Co-occurrence map")).toBeInTheDocument();
  });
});