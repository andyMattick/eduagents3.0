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

function jsonResponse(payload: unknown, ok = true) {
  const body = JSON.stringify(payload);
  return {
    ok,
    text: async () => body,
    json: async () => payload,
  };
}

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

function buildAnalyzedDocument(documentId: string, sourceFileName: string, concept: string) {
  return {
    document: {
      id: documentId,
      sourceFileName,
      sourceMimeType: sourceFileName.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      surfaces: [{ id: `${documentId}-surface-1`, surfaceType: "page", index: 0, label: "Page 1" }],
      nodes: [{ id: `${documentId}-node-1`, documentId, surfaceId: `${documentId}-surface-1`, nodeType: "paragraph", orderIndex: 0, text: `Example about ${concept}.`, normalizedText: `Example about ${concept}.` }],
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    fragments: [{
      id: `${documentId}-fragment-1`,
      documentId,
      anchors: [{ documentId, surfaceId: `${documentId}-surface-1`, nodeId: `${documentId}-node-1` }],
      isInstructional: true,
      instructionalRole: "example",
      contentType: "text",
      learningTarget: `Understand ${concept}`,
      prerequisiteConcepts: [concept],
      scaffoldLevel: "medium",
      exampleType: "worked",
      misconceptionTriggers: [`common mistake with ${concept}`],
      confidence: 0.9,
      classifierVersion: "wave5-v1",
      strategy: "rule-based",
    }],
    problems: [{
      id: `${documentId}-problem-1`,
      documentId,
      anchors: [{ documentId, surfaceId: `${documentId}-surface-1`, nodeId: `${documentId}-node-1` }],
      text: `Solve a problem about ${concept}.`,
      extractionMode: "authored",
      concepts: [concept],
      representations: ["text"],
      difficulty: "medium",
      misconceptions: [],
      cognitiveDemand: "conceptual",
    }],
    insights: {
      concepts: [concept],
      conceptFrequencies: { [concept]: 1 },
      representations: ["text"],
      difficultyDistribution: { low: 0, medium: 1, high: 0 },
      misconceptionThemes: [`common mistake with ${concept}`],
      instructionalDensity: 0.75,
      problemCount: 1,
      exampleCount: 1,
      explanationCount: 1,
    },
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

describe("DocumentUpload", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows disabled-state reasons for build, export, and regenerate actions", async () => {
    const document = { documentId: "doc-1", sourceFileName: "lesson-notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createdAt: "2025-01-01T00:00:00.000Z" };
    const analyzedDocument = buildAnalyzedDocument("doc-1", "lesson-notes.docx", "fractions");
    const session = {
      sessionId: "session-1",
      documentIds: ["doc-1"],
      documentRoles: { "doc-1": ["notes"] },
      sessionRoles: { "doc-1": ["unit-member"] },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/v4/documents/upload") {
        return jsonResponse({ documentId: document.documentId, documentIds: [document.documentId], sessionId: "session-1", registered: [document] });
      }
      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }
      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents: [document], analyzedDocuments: [analyzedDocument] });
      }
      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse({ analysis: { sessionId: "session-1", documentIds: ["doc-1"], conceptOverlap: {}, conceptGaps: [], difficultyProgression: {}, representationProgression: {}, redundancy: { "doc-1": [] }, coverageSummary: { totalConcepts: 1, docsPerConcept: { fractions: 1 }, perDocument: { "doc-1": { documentId: "doc-1", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" } } }, documentSimilarity: [], conceptToDocumentMap: { fractions: ["doc-1"] }, updatedAt: "2025-01-01T00:00:00.000Z" } });
      }
      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: [] });
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentUpload />);

    expect(screen.getByText("Choose one or more files to build a workspace.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build document workspace" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Source documents"), {
      target: { files: [new File(["docx"], "lesson-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Build document workspace" }));

    expect(await screen.findByText("lesson-notes.docx")).toBeInTheDocument();
    expect(screen.getByText("Generate a product before exporting it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Print" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Regenerate" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Regenerate" })).toHaveAttribute("title", "Generate a product once before using regenerate.");
    expect(screen.getByRole("button", { name: "Print" })).toHaveAttribute("title", "Generate a product before opening print view.");
  });

  it("builds a multi-document workspace, creates a session, and generates an intent product", async () => {
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);
    let uploadCount = 0;
    let productHistory: any[] = [];
    const documents = [
      { documentId: "doc-1", sourceFileName: "lesson-notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createdAt: "2025-01-01T00:00:00.000Z" },
      { documentId: "doc-2", sourceFileName: "practice.pdf", sourceMimeType: "application/pdf", createdAt: "2025-01-01T00:00:00.000Z" },
    ];
    const analyzedDocuments = [
      buildAnalyzedDocument("doc-1", "lesson-notes.docx", "fractions"),
      buildAnalyzedDocument("doc-2", "practice.pdf", "fractions"),
    ];
    const session = {
      sessionId: "session-1",
      documentIds: ["doc-1", "doc-2"],
      documentRoles: { "doc-1": ["notes"], "doc-2": ["worksheet"] },
      sessionRoles: { "doc-1": ["unit-member"], "doc-2": ["unit-member"] },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const collectionAnalysis = {
      sessionId: "session-1",
      documentIds: ["doc-1", "doc-2"],
      conceptOverlap: { fractions: ["doc-1", "doc-2"] },
      conceptGaps: [],
      difficultyProgression: {},
      representationProgression: {},
      redundancy: { "doc-1": [], "doc-2": [] },
      coverageSummary: {
        totalConcepts: 1,
        docsPerConcept: { fractions: 2 },
        perDocument: {
          "doc-1": { documentId: "doc-1", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" },
          "doc-2": { documentId: "doc-2", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" },
        },
      },
      documentSimilarity: [{ leftDocumentId: "doc-1", rightDocumentId: "doc-2", score: 1, sharedConcepts: ["fractions"] }],
      conceptToDocumentMap: { fractions: ["doc-1", "doc-2"] },
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const unitProduct = {
      sessionId: "session-1",
      intentType: "build-unit",
      documentIds: ["doc-1", "doc-2"],
      productId: "product-1",
      productType: "build-unit",
      schemaVersion: "wave5-v1",
      payload: {
        kind: "unit",
        focus: null,
        title: "Unit Builder: Fractions",
        lessonSequence: [{ position: 1, documentId: "doc-1", sourceFileName: "lesson-notes.docx", focusConcepts: ["fractions"], rationale: "Start with notes.", anchorNodeIds: ["doc-1-node-1"] }],
        conceptMap: [{ concept: "fractions", documentIds: ["doc-1", "doc-2"], prerequisites: [] }],
        difficultyCurve: [{ documentId: "doc-1", sourceFileName: "lesson-notes.docx", averageDifficultyScore: 2 }],
        representationCurve: [{ documentId: "doc-1", sourceFileName: "lesson-notes.docx", representations: ["text"] }],
        misconceptionMap: [],
        suggestedAssessments: ["Checkpoint 1"],
        suggestedReviews: ["Review fractions"],
        suggestedPracticeSets: ["Practice set A"],
        sourceAnchors: [{ documentId: "doc-1", anchorNodeIds: ["doc-1-node-1"] }, { documentId: "doc-2", anchorNodeIds: ["doc-2-node-1"] }],
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/v4/documents/upload") {
        const nextDocument = documents[uploadCount]!;
        uploadCount += 1;
        return jsonResponse({ documentId: nextDocument.documentId, documentIds: [nextDocument.documentId], sessionId: "session-1", registered: [nextDocument] });
      }

      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }

      if (input === "/api/v4/documents/analyze") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        const analyzedDocument = analyzedDocuments.find((entry) => entry.document.id === body.documentId)!;
        return jsonResponse({ documentId: body.documentId, status: "ready", analyzedDocument });
      }

      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents, analyzedDocuments });
      }

      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse({ session, analysis: collectionAnalysis });
      }

      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: productHistory });
      }

      if (input === "/api/v4/documents/intent" && init?.method === "POST") {
        productHistory = [unitProduct];
        return jsonResponse(unitProduct);
      }

      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentUpload />);

    fireEvent.change(screen.getByLabelText("Source documents"), {
      target: {
        files: [
          new File(["docx"], "lesson-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
          new File(["pdf"], "practice.pdf", { type: "application/pdf" }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Build document workspace" }));

    expect(await screen.findByRole("heading", { name: "Document workspace" })).toBeInTheDocument();
    expect(screen.getAllByText("lesson-notes.docx").length).toBeGreaterThan(0);
    expect(screen.getAllByText("practice.pdf").length).toBeGreaterThan(0);
    expect(screen.getByText("session-1")).toBeInTheDocument();
    expect(screen.getByText("POST /api/v4/documents/intent")).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/documents/session",
      expect.objectContaining({ method: "POST" }),
    ));
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/v4/documents/upload")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Generate product" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/documents/intent",
      expect.objectContaining({ method: "POST" }),
    ));

    expect(await screen.findByLabelText("Last dispatched request payload")).toHaveTextContent('"intentType": "build-unit"');
    expect((await screen.findAllByText("Unit Builder: Fractions")).length).toBeGreaterThan(0);
    expect(screen.getByText("Generated products")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(openMock).toHaveBeenCalledWith("/print/product-1", "_blank", "noopener,noreferrer");
  });

  it("opens the semantic viewer as a supporting panel for an uploaded document", async () => {
    let uploadCount = 0;
    const document = { documentId: "doc-1", sourceFileName: "lesson-notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createdAt: "2025-01-01T00:00:00.000Z" };
    const analyzedDocument = buildAnalyzedDocument("doc-1", "lesson-notes.docx", "fractions");
    const session = {
      sessionId: "session-1",
      documentIds: ["doc-1"],
      documentRoles: { "doc-1": ["notes"] },
      sessionRoles: { "doc-1": ["unit-member"] },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/v4/documents/upload") {
        uploadCount += 1;
        return jsonResponse({ documentId: document.documentId, documentIds: [document.documentId], sessionId: "session-1", registered: [document] });
      }
      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }
      if (input === "/api/v4/documents/analyze") {
        return jsonResponse({ documentId: "doc-1", status: "ready", analyzedDocument });
      }
      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents: [document], analyzedDocuments: [analyzedDocument] });
      }
      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse({ session, analysis: { sessionId: "session-1", documentIds: ["doc-1"], conceptOverlap: {}, conceptGaps: [], difficultyProgression: {}, representationProgression: {}, redundancy: { "doc-1": [] }, coverageSummary: { totalConcepts: 1, docsPerConcept: { fractions: 1 }, perDocument: { "doc-1": { documentId: "doc-1", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" } } }, documentSimilarity: [], conceptToDocumentMap: { fractions: ["doc-1"] }, updatedAt: "2025-01-01T00:00:00.000Z" } });
      }
      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: [] });
      }
      if (input === "/api/v4-ingest") {
        return jsonResponse({
            documentId: "doc-1",
            fileName: "lesson-notes.docx",
            azureExtract: {
              fileName: "lesson-notes.docx",
              content: "1. What is 2 + 2?",
              pages: [{ pageNumber: 1, text: "1. What is 2 + 2?" }],
              paragraphs: [{ text: "1. What is 2 + 2?", pageNumber: 1 }],
              tables: [],
              readingOrder: ["1. What is 2 + 2?"],
            },
          });
      }
      if (input === "/api/v4/narrate-problem") {
        return jsonResponse({
            lens: "what-is-this-asking",
            blocks: { taskEssence: { summary: "determine what the prompt is asking and solve it with clear reasoning", evidence: "What is 2 + 2?" } },
            narrative: "This problem asks students to determine what the prompt is asking and solve it with clear reasoning.",
          });
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    runSemanticPipelineMock.mockResolvedValue(buildSemanticOutput());

    render(<DocumentUpload />);

    fireEvent.change(screen.getByLabelText("Source documents"), {
      target: { files: [new File(["docx"], "lesson-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Build document workspace" }));

    expect(await screen.findByText("lesson-notes.docx")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Inspect semantic viewer" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4-ingest",
      expect.objectContaining({ method: "POST" }),
    ));

    expect(await screen.findByText("Semantic viewer")).toBeInTheDocument();
    expect(await screen.findByText("Teacher narratives")).toBeInTheDocument();
    expect(uploadCount).toBe(1);
  });

  it("saves instructional-unit concept overrides from the instructional map view", async () => {
    const documents = [
      { documentId: "doc-1", sourceFileName: "lesson-notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createdAt: "2025-01-01T00:00:00.000Z" },
      { documentId: "doc-2", sourceFileName: "practice.pdf", sourceMimeType: "application/pdf", createdAt: "2025-01-01T00:00:00.000Z" },
    ];
    const analyzedDocuments = [
      buildAnalyzedDocument("doc-1", "lesson-notes.docx", "fractions"),
      buildAnalyzedDocument("doc-2", "practice.pdf", "equivalence"),
    ];
    const session = {
      sessionId: "session-1",
      documentIds: ["doc-1", "doc-2"],
      documentRoles: { "doc-1": ["notes"], "doc-2": ["worksheet"] },
      sessionRoles: { "doc-1": ["unit-member"], "doc-2": ["unit-member"] },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const instructionalMapProduct = {
      sessionId: "session-1",
      intentType: "build-instructional-map",
      documentIds: ["doc-1"],
      productId: "product-map-1",
      productType: "build-instructional-map",
      schemaVersion: "wave5-v1",
      payload: {
        kind: "instructional-map",
        focus: null,
        conceptGraph: { nodes: ["fractions"], edges: [] },
        representationGraph: { nodes: ["text"], edges: [] },
        misconceptionGraph: { nodes: [], edges: [] },
        difficultyCurve: [{ documentId: "doc-1", sourceFileName: "lesson-notes.docx", averageDifficultyScore: 2 }],
        documentConceptAlignment: [{ documentId: "doc-1", sourceFileName: "lesson-notes.docx", concepts: ["fractions"] }],
        unitConceptAlignment: [{ unitId: "unit-1", title: "Instructional Unit: fractions", concepts: ["fractions"], documentIds: ["doc-1"], sourceFileNames: ["lesson-notes.docx"], anchorNodeIds: ["doc-1-node-1"] }],
        problemConceptAlignment: [{ problemId: "doc-1-problem-1", documentId: "doc-1", concepts: ["fractions"], anchorNodeIds: ["doc-1-node-1"] }],
        instructionalRoleDistribution: [{ documentId: "doc-1", sourceFileName: "lesson-notes.docx", roles: { example: 1 } }],
        sourceAnchors: [{ documentId: "doc-1", anchorNodeIds: ["doc-1-node-1"] }],
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/v4/documents/upload") {
        const uploadCount = fetchMock.mock.calls.filter(([url]) => url === "/api/v4/documents/upload").length - 1;
        const document = documents[uploadCount] ?? documents[0];
        return jsonResponse({ documentId: document.documentId, documentIds: [document.documentId], sessionId: "session-1", registered: [document] });
      }
      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }
      if (input === "/api/v4/documents/analyze") {
        return jsonResponse({ documentId: "doc-1", status: "ready", analyzedDocument: analyzedDocuments[0] });
      }
      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents, analyzedDocuments });
      }
      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse({ session, analysis: { sessionId: "session-1", documentIds: ["doc-1", "doc-2"], conceptOverlap: {}, conceptGaps: [], difficultyProgression: {}, representationProgression: {}, redundancy: { "doc-1": [], "doc-2": [] }, coverageSummary: { totalConcepts: 2, docsPerConcept: { fractions: 1, equivalence: 1 }, perDocument: { "doc-1": { documentId: "doc-1", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" }, "doc-2": { documentId: "doc-2", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" } } }, documentSimilarity: [], conceptToDocumentMap: { fractions: ["doc-1"], equivalence: ["doc-2"] }, updatedAt: "2025-01-01T00:00:00.000Z" } });
      }
      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: [instructionalMapProduct] });
      }
      if (input === "/api/v4/documents/intent" && init?.method === "POST") {
        return jsonResponse(instructionalMapProduct);
      }
      if (typeof input === "string" && input.includes("/api/v4/problem-overrides/")) {
        return jsonResponse({ overrides: null });
      }
      if (input === "/api/v4/teacher-feedback" && init?.method === "POST") {
        return jsonResponse({ ok: true, feedback: { canonicalProblemId: "session-1::instructional-unit::unit-1" } });
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentUpload />);

    fireEvent.change(screen.getByLabelText("Source documents"), {
      target: { files: [
        new File(["docx"], "lesson-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
        new File(["pdf"], "practice.pdf", { type: "application/pdf" }),
      ] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Build document workspace" }));

    expect(await screen.findByText("lesson-notes.docx")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Intent selection"), { target: { value: "build-instructional-map" } });
    expect(screen.getByText("POST /api/v4/documents/intent")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate product" }));

    expect(await screen.findByText("Instructional Units")).toBeInTheDocument();
    expect(screen.getByText("Inferred concepts")).toBeInTheDocument();
    expect(await screen.findByLabelText("Last dispatched request payload")).toHaveTextContent('"intentType": "build-instructional-map"');

    fireEvent.change(screen.getByLabelText("Concepts for Instructional Unit: fractions"), { target: { value: "ratios, equivalence" } });
    fireEvent.click(screen.getByRole("button", { name: "Save concepts" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/teacher-feedback",
      expect.objectContaining({ method: "POST" }),
    ));
  });

  it("uses all workspace documents for multi-document intents when only one document is selected", async () => {
    const documents = [
      { documentId: "doc-1", sourceFileName: "lesson-notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createdAt: "2025-01-01T00:00:00.000Z" },
      { documentId: "doc-2", sourceFileName: "practice.pdf", sourceMimeType: "application/pdf", createdAt: "2025-01-01T00:00:00.000Z" },
    ];
    const analyzedDocuments = [
      buildAnalyzedDocument("doc-1", "lesson-notes.docx", "photosynthesis"),
      buildAnalyzedDocument("doc-2", "practice.pdf", "glucose"),
    ];
    const session = {
      sessionId: "session-1",
      documentIds: ["doc-1", "doc-2"],
      documentRoles: { "doc-1": ["notes"], "doc-2": ["worksheet"] },
      sessionRoles: { "doc-1": ["unit-member"], "doc-2": ["unit-member"] },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const sequenceProduct = {
      sessionId: "session-1",
      intentType: "build-sequence",
      documentIds: ["doc-1", "doc-2"],
      productId: "product-sequence-1",
      productType: "build-sequence",
      schemaVersion: "wave4-v1",
      payload: {
        kind: "sequence",
        focus: null,
        recommendedOrder: [
          { position: 1, documentId: "doc-1", sourceFileName: "lesson-notes.docx", rationale: "Start with concept introduction.", bridgingConcepts: [], missingPrerequisites: ["photosynthesis"], anchorNodeIds: ["doc-1-node-1"] },
          { position: 2, documentId: "doc-2", sourceFileName: "practice.pdf", rationale: "Then reinforce glucose.", bridgingConcepts: ["photosynthesis"], missingPrerequisites: [], anchorNodeIds: ["doc-2-node-1"] },
        ],
        bridgingConcepts: ["photosynthesis"],
        missingPrerequisites: ["glucose"],
        sourceAnchors: [{ documentId: "doc-1", anchorNodeIds: ["doc-1-node-1"] }, { documentId: "doc-2", anchorNodeIds: ["doc-2-node-1"] }],
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/v4/documents/upload") {
        const currentIndex = fetchMock.mock.calls.filter(([url]) => url === "/api/v4/documents/upload").length - 1;
        const document = documents[currentIndex] ?? documents[0];
        return jsonResponse({ documentId: document.documentId, documentIds: [document.documentId], sessionId: "session-1", registered: [document] });
      }
      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }
      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents, analyzedDocuments });
      }
      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse({ analysis: { sessionId: "session-1", documentIds: ["doc-1", "doc-2"], conceptOverlap: {}, conceptGaps: [], difficultyProgression: {}, representationProgression: {}, redundancy: { "doc-1": [], "doc-2": [] }, coverageSummary: { totalConcepts: 2, docsPerConcept: { photosynthesis: 1, glucose: 1 }, perDocument: { "doc-1": { documentId: "doc-1", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" }, "doc-2": { documentId: "doc-2", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" } } }, documentSimilarity: [], conceptToDocumentMap: { photosynthesis: ["doc-1"], glucose: ["doc-2"] }, updatedAt: "2025-01-01T00:00:00.000Z" } });
      }
      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: [sequenceProduct] });
      }
      if (input === "/api/v4/documents/analyze") {
        return jsonResponse({ documentId: "doc-1", status: "ready", analyzedDocument: analyzedDocuments[0] });
      }
      if (input === "/api/v4/documents/intent" && init?.method === "POST") {
        return jsonResponse(sequenceProduct);
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentUpload />);

    fireEvent.change(screen.getByLabelText("Source documents"), {
      target: { files: [
        new File(["docx"], "lesson-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
        new File(["pdf"], "practice.pdf", { type: "application/pdf" }),
      ] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Build document workspace" }));

    expect(await screen.findByText("lesson-notes.docx")).toBeInTheDocument();
    const includeCheckboxes = await screen.findAllByRole("checkbox", { name: "Include" });
    fireEvent.click(includeCheckboxes[1]!);
    fireEvent.change(screen.getByLabelText("Intent selection"), { target: { value: "build-sequence" } });
    expect(screen.getByText("multi-document")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate product" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/documents/intent",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ sessionId: "session-1", documentIds: ["doc-1", "doc-2"], intentType: "build-sequence" }),
      }),
    ));
    expect(await screen.findByLabelText("Last dispatched request payload")).toHaveTextContent('"intentType": "build-sequence"');
    expect(await screen.findAllByText((_, element) => element?.textContent?.includes("Start with concept introduction.") ?? false)).not.toHaveLength(0);
  });

  it("disables instructional-map generation and shows the reason when only one document exists", async () => {
    const document = { documentId: "doc-1", sourceFileName: "test 3271.pdf", sourceMimeType: "application/pdf", createdAt: "2025-01-01T00:00:00.000Z" };
    const analyzedDocument = buildAnalyzedDocument("doc-1", "test 3271.pdf", "fractions");
    const session = {
      sessionId: "session-1",
      documentIds: ["doc-1"],
      documentRoles: { "doc-1": ["worksheet"] },
      sessionRoles: { "doc-1": ["unit-member"] },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/v4/documents/upload") {
        return jsonResponse({ documentId: document.documentId, documentIds: [document.documentId], sessionId: "session-1", registered: [document] });
      }
      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }
      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents: [document], analyzedDocuments: [analyzedDocument] });
      }
      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse({ analysis: { sessionId: "session-1", documentIds: ["doc-1"], conceptOverlap: {}, conceptGaps: [], difficultyProgression: {}, representationProgression: {}, redundancy: { "doc-1": [] }, coverageSummary: { totalConcepts: 1, docsPerConcept: { fractions: 1 }, perDocument: { "doc-1": { documentId: "doc-1", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" } } }, documentSimilarity: [], conceptToDocumentMap: { fractions: ["doc-1"] }, updatedAt: "2025-01-01T00:00:00.000Z" } });
      }
      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: [] });
      }
      if (input === "/api/v4/documents/intent" && init?.method === "POST") {
        throw new Error("Instructional map should not dispatch for a single-document workspace");
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentUpload />);

    fireEvent.change(screen.getByLabelText("Source documents"), {
      target: { files: [new File(["pdf"], "test 3271.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Build document workspace" }));

    expect(await screen.findByText("test 3271.pdf")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Intent selection"), { target: { value: "build-instructional-map" } });

    expect(screen.getByText("Instructional Map requires at least 2 documents in the workspace.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate product" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v4/documents/intent",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("renders assessment prompts instead of only section counts", async () => {
    const document = { documentId: "doc-1", sourceFileName: "lesson-notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createdAt: "2025-01-01T00:00:00.000Z" };
    const analyzedDocument = buildAnalyzedDocument("doc-1", "lesson-notes.docx", "photosynthesis");
    const session = {
      sessionId: "session-1",
      documentIds: ["doc-1"],
      documentRoles: { "doc-1": ["notes"] },
      sessionRoles: { "doc-1": ["unit-member"] },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const testProduct = {
      sessionId: "session-1",
      intentType: "build-test",
      documentIds: ["doc-1"],
      productId: "product-test-1",
      productType: "build-test",
      schemaVersion: "wave3-v1",
      payload: {
        kind: "test",
        focus: null,
        title: "Assessment Draft",
        overview: "This draft assessment pulls 2 items from grouped instructional units and organizes them by concept.",
        estimatedDurationMinutes: 10,
        totalItemCount: 2,
        sections: [
          {
            concept: "photosynthesis",
            sourceDocumentIds: ["doc-1"],
            items: [
              { itemId: "item-1", prompt: "What organelle performs photosynthesis?", concept: "photosynthesis", sourceDocumentId: "doc-1", sourceFileName: "lesson-notes.docx", difficulty: "medium", cognitiveDemand: "conceptual", answerGuidance: "Look for chloroplast." },
              { itemId: "item-2", prompt: "Why is sunlight necessary for photosynthesis?", concept: "photosynthesis", sourceDocumentId: "doc-1", sourceFileName: "lesson-notes.docx", difficulty: "medium", cognitiveDemand: "conceptual", answerGuidance: "Look for light-dependent reactions." },
            ],
          },
        ],
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/v4/documents/upload") {
        return jsonResponse({ documentId: document.documentId, documentIds: [document.documentId], sessionId: "session-1", registered: [document] });
      }
      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }
      if (input === "/api/v4/documents/analyze") {
        return jsonResponse({ documentId: "doc-1", status: "ready", analyzedDocument });
      }
      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents: [document], analyzedDocuments: [analyzedDocument] });
      }
      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse({ analysis: { sessionId: "session-1", documentIds: ["doc-1"], conceptOverlap: {}, conceptGaps: [], difficultyProgression: {}, representationProgression: {}, redundancy: { "doc-1": [] }, coverageSummary: { totalConcepts: 1, docsPerConcept: { photosynthesis: 1 }, perDocument: { "doc-1": { documentId: "doc-1", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" } } }, documentSimilarity: [], conceptToDocumentMap: { photosynthesis: ["doc-1"] }, updatedAt: "2025-01-01T00:00:00.000Z" } });
      }
      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: [testProduct] });
      }
      if (input === "/api/v4/documents/intent" && init?.method === "POST") {
        return jsonResponse(testProduct);
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentUpload />);

    fireEvent.change(screen.getByLabelText("Source documents"), {
      target: { files: [new File(["docx"], "lesson-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Build document workspace" }));

    expect(await screen.findByText("lesson-notes.docx")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Intent selection"), { target: { value: "build-test" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate product" }));

    expect(await screen.findByText("What organelle performs photosynthesis?")).toBeInTheDocument();
    expect(screen.getByText("Why is sunlight necessary for photosynthesis?")).toBeInTheDocument();
  });
});