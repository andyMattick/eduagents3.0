/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { runSemanticPipelineMock } = vi.hoisted(() => ({
  runSemanticPipelineMock: vi.fn(),
}));

vi.mock("../../../prism-v4/semantic/pipeline/runSemanticPipeline", () => ({
  runSemanticPipeline: runSemanticPipelineMock,
}));

import { DocumentUpload } from "../DocumentUpload";

function buildSemanticOutput(overridesApplied = false) {
  const firstVector = {
    subject: "math",
    domain: "number",
    concepts: { "math.number": 1 },
    problemType: {},
    multiStep: 0,
    steps: 1,
    representation: "paragraph",
    representationCount: 1,
    linguisticLoad: 0.1,
    vocabularyTier: 1,
    sentenceComplexity: 0.1,
    wordProblem: 0,
    passiveVoice: 0,
    abstractLanguage: 0,
    bloom: { remember: 0.1, understand: 0.2, apply: 0.7, analyze: 0, evaluate: 0, create: 0 },
    difficulty: overridesApplied ? 0.85 : 0.3,
    distractorDensity: 0,
    abstractionLevel: 0.2,
    misconceptionTriggers: {},
    frustrationRisk: 0.2,
    engagementPotential: 0.4,
    cognitive: {
      bloom: overridesApplied
        ? { remember: 0, understand: 0.1, apply: 0.1, analyze: 0.8, evaluate: 0, create: 0 }
        : { remember: 0.1, understand: 0.2, apply: 0.2, analyze: 0.05, evaluate: 0.05, create: 0 },
      difficulty: overridesApplied ? 0.85 : 0.3,
      linguisticLoad: 0.1,
      abstractionLevel: 0.2,
      multiStep: 0.1,
      representationComplexity: 0.2,
      misconceptionRisk: 0,
    },
    reasoning: {
      azureBloom: { remember: 0.1, understand: 0.2, apply: 0.7, analyze: 0, evaluate: 0, create: 0 },
      structuralBloom: { apply: 0.4 },
      templateIds: ["math-computation"],
      teacherTemplateIds: overridesApplied ? ["teacher-anomalous-phrase"] : [],
      overridesApplied,
      structuralMultiStep: 0.1,
    },
    teacherAdjustments: overridesApplied ? { overrideVersion: 1, lastUpdatedAt: "2025-01-01T00:00:00.000Z" } : undefined,
  };
  const secondVector = {
    subject: "math",
    domain: "number",
    concepts: { "math.number": 1 },
    problemType: {},
    multiStep: 0,
    steps: 1,
    representation: "paragraph",
    representationCount: 1,
    linguisticLoad: 0.12,
    vocabularyTier: 1,
    sentenceComplexity: 0.12,
    wordProblem: 0,
    passiveVoice: 0,
    abstractLanguage: 0,
    bloom: { remember: 0.1, understand: 0.4, apply: 0.5, analyze: 0, evaluate: 0, create: 0 },
    difficulty: 0.35,
    distractorDensity: 0,
    abstractionLevel: 0.2,
    misconceptionTriggers: {},
    frustrationRisk: 0.2,
    engagementPotential: 0.45,
    cognitive: { bloom: { remember: 0.05, understand: 0.26, apply: 0.22, analyze: 0.23, evaluate: 0.13, create: 0 }, difficulty: 0.11, linguisticLoad: 0.12, abstractionLevel: 0.2, multiStep: 0.1, representationComplexity: 0.2, misconceptionRisk: 0.05 },
    reasoning: {
      azureBloom: { remember: 0.1, understand: 0.4, apply: 0.5, analyze: 0, evaluate: 0, create: 0 },
      structuralBloom: { understand: 0.3 },
      templateIds: ["math-explain-strategy"],
      teacherTemplateIds: [],
      overridesApplied: false,
      structuralMultiStep: 0.1,
    },
  };

  return {
    documentId: "doc-1",
    documentInsights: {
      documentId: "doc-1",
      title: "Sample semantic title",
      subject: "math",
      rawText: "1. What is 2 + 2?",
      sections: [
        { sectionId: "p1a", title: "Problem 1 a): Add the ones digits.", text: "What is 2 + 2?\nAdd the ones digits.", concepts: { "math.number": 1 }, difficulty: 0.3, linguisticLoad: 0.1 },
        { sectionId: "p1b", title: "Problem 1 b): Explain the strategy.", text: "What is 2 + 2?\nExplain the strategy.", concepts: { "math.number": 1 }, difficulty: 0.35, linguisticLoad: 0.12 },
      ],
      problems: [
        { problemId: "p1a", canonicalProblemId: "doc-1::p1a", rootProblemId: "p1", parentProblemId: "p1", problemNumber: 1, partLabel: "a", teacherLabel: "a)", stemText: "What is 2 + 2?", partText: "Add the ones digits.", rawText: "1. What is 2 + 2?\na) Add the ones digits.", cleanedText: "What is 2 + 2?\nAdd the ones digits.", sourceType: "document", sourceDocumentId: "doc-1", sourcePageNumber: 1, tags: undefined },
        { problemId: "p1b", canonicalProblemId: "doc-1::p1b", rootProblemId: "p1", parentProblemId: "p1", problemNumber: 1, partLabel: "b", teacherLabel: "b)", stemText: "What is 2 + 2?", partText: "Explain the strategy.", rawText: "1. What is 2 + 2?\nb) Explain the strategy.", cleanedText: "What is 2 + 2?\nExplain the strategy.", sourceType: "document", sourceDocumentId: "doc-1", sourcePageNumber: 1, tags: undefined },
      ],
      documentConcepts: { "math.number": 1 },
      documentStandards: undefined,
      overallDifficulty: overridesApplied ? 0.6 : 0.3,
      overallLinguisticLoad: 0.1,
      conceptGraph: {
        nodes: [{ id: "math.number", label: "math.number", weight: 1 }],
        edges: [],
      },
      semantics: { topic: "math", concepts: ["math.number"], relationships: [], misconceptions: [] },
      confidence: { extractionQuality: 0.9, taggingQuality: 0.8 },
      flags: { unreadable: false, lowQualityScan: false, missingPages: false },
    },
    problems: [
      { problemId: "p1a", canonicalProblemId: "doc-1::p1a", rootProblemId: "p1", parentProblemId: "p1", problemNumber: 1, partLabel: "a", teacherLabel: "a)", stemText: "What is 2 + 2?", partText: "Add the ones digits.", rawText: "1. What is 2 + 2?\na) Add the ones digits.", cleanedText: "What is 2 + 2?\nAdd the ones digits.", sourceType: "document", sourceDocumentId: "doc-1", sourcePageNumber: 1, tags: firstVector },
      { problemId: "p1b", canonicalProblemId: "doc-1::p1b", rootProblemId: "p1", parentProblemId: "p1", problemNumber: 1, partLabel: "b", teacherLabel: "b)", stemText: "What is 2 + 2?", partText: "Explain the strategy.", rawText: "1. What is 2 + 2?\nb) Explain the strategy.", cleanedText: "What is 2 + 2?\nExplain the strategy.", sourceType: "document", sourceDocumentId: "doc-1", sourcePageNumber: 1, tags: secondVector },
    ],
    problemVectors: [firstVector, secondVector],
  };
}

describe("DocumentUpload", () => {
  afterEach(() => {
    cleanup();
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

    runSemanticPipelineMock.mockResolvedValue(buildSemanticOutput());

    render(<DocumentUpload />);

    const fileInput = screen.getByLabelText("Source document");
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["pdf-data"], "sample.pdf", { type: "application/pdf" })],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Run v4 ingestion" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4-ingest",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/pdf",
          "x-file-name": "sample.pdf",
        }),
        body: expect.any(ArrayBuffer),
      }),
    );

    expect(await screen.findByText("Sample semantic title")).toBeInTheDocument();
    expect(screen.getByText("Problem semantic vectors")).toBeInTheDocument();
    expect(screen.queryByText(/legacy/i)).toBeNull();
    expect(screen.getByText("Problem 1")).toBeInTheDocument();
    expect(screen.getByText("a) p1a")).toBeInTheDocument();
    expect(screen.getByText("b) p1b")).toBeInTheDocument();
    expect(screen.getAllByText("Challenge or correct this")).toHaveLength(2);
    expect(screen.getAllByTestId("ai-understanding")).toHaveLength(2);
    const cognitiveDebugBlocks = await screen.findAllByTestId("cognitive-debug");
    expect(cognitiveDebugBlocks).toHaveLength(2);
    expect(cognitiveDebugBlocks[0]).toHaveTextContent("Bloom:");
    expect(cognitiveDebugBlocks[0]).toHaveTextContent("Difficulty:");
    expect(cognitiveDebugBlocks[0]).toHaveTextContent("Multi-step:");
    expect(screen.getByTestId("document-cognitive-summary")).toHaveTextContent("Average difficulty");
    expect(screen.getByText("Co-occurrence map")).toBeInTheDocument();
  });

  it("reruns cognition after teacher correction and can reset to AI defaults", async () => {
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === "/api/v4-ingest") {
        return Promise.resolve({
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
      }

      if (input === "/api/v4/teacher-feedback") {
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      }

      if (input === "/api/v4/problem-overrides/doc-1%3A%3Ap1a" && init?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: async () => ({ deleted: true }) });
      }

      return Promise.reject(new Error(`Unexpected fetch call: ${input}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    runSemanticPipelineMock
      .mockResolvedValueOnce(buildSemanticOutput(false))
      .mockResolvedValueOnce(buildSemanticOutput(true))
      .mockResolvedValueOnce(buildSemanticOutput(false));

    render(<DocumentUpload />);

    fireEvent.change(screen.getAllByLabelText("Source document")[0]!, {
      target: { files: [new File(["pdf-data"], "sample.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run v4 ingestion" }));

    expect(await screen.findByText("Sample semantic title")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Challenge or correct this" })[0]!);
    fireEvent.change(screen.getAllByLabelText("Difficulty")[0]!, { target: { value: "0.85" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit correction" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/teacher-feedback",
      expect.objectContaining({ method: "POST" }),
    ));

    fireEvent.click(screen.getAllByRole("button", { name: "Re-run cognition" })[0]!);
    expect(await screen.findByText("Override version: 1")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Why this interpretation?" })[0]!);
    expect(await screen.findByTestId("reasoning-panel")).toHaveTextContent("math-computation");
    expect(screen.getByTestId("reasoning-panel")).toHaveTextContent("teacher-anomalous-phrase");

    fireEvent.click(screen.getByRole("button", { name: "Reset to AI defaults" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/problem-overrides/doc-1%3A%3Ap1a",
      expect.objectContaining({ method: "DELETE" }),
    ));
    await waitFor(() => expect(screen.queryByText("Override version: 1")).not.toBeInTheDocument());
  });
});