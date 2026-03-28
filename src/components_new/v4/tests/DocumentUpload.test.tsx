/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DocumentUpload } from "../DocumentUpload";

function jsonResponse(payload: unknown, ok = true) {
  const body = JSON.stringify(payload);
  return {
    ok,
    text: async () => body,
    json: async () => payload,
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

  it("shows a teacher-first homepage without developer-facing request details", () => {
    render(<DocumentUpload />);

    expect(screen.getByRole("heading", { name: "Upload your teaching materials" })).toBeInTheDocument();
    expect(screen.getByText("What you can build")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create workspace" })).toBeDisabled();
    expect(screen.queryByText("POST /api/v4/documents/intent")).not.toBeInTheDocument();
    expect(screen.queryByText("Intent request preview")).not.toBeInTheDocument();
    expect(screen.queryByText("Supporting semantics")).not.toBeInTheDocument();
    expect(screen.queryByText("Semantic viewer")).not.toBeInTheDocument();
  });

  it("creates a workspace and builds a teacher-facing document", async () => {
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);

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

    let uploadCount = 0;
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/v4/documents/upload") {
        const nextDocument = documents[uploadCount]!;
        uploadCount += 1;
        return jsonResponse({ documentId: nextDocument.documentId, documentIds: [nextDocument.documentId], sessionId: "session-1", registered: [nextDocument] });
      }
      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }
      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents, analyzedDocuments });
      }
      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse({ session, analysis: collectionAnalysis });
      }
      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: [unitProduct] });
      }
      if (input === "/api/v4/documents/intent" && init?.method === "POST") {
        return jsonResponse(unitProduct);
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentUpload />);

    fireEvent.change(screen.getByLabelText("Teaching materials"), {
      target: {
        files: [
          new File(["docx"], "lesson-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
          new File(["pdf"], "practice.pdf", { type: "application/pdf" }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByRole("heading", { name: "Your workspace" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What would you like to build?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your recent builds" })).toBeInTheDocument();
    expect(screen.queryByText("session-1")).not.toBeInTheDocument();
    expect(screen.queryByText("POST /api/v4/documents/intent")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create document" }));

    expect(await screen.findByRole("heading", { name: "Unit Builder: Fractions" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(openMock).toHaveBeenCalledWith("/print/product-1?returnTo=%2F", "_blank", "noopener,noreferrer");
  });

  it("starts a new session by clearing the teacher workspace", async () => {
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

    fireEvent.change(screen.getByLabelText("Teaching materials"), {
      target: { files: [new File(["docx"], "lesson-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByRole("heading", { name: "Your workspace" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start new session" }));

    expect(screen.queryByRole("heading", { name: "Your workspace" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create workspace" })).toBeDisabled();
  });

  it("saves instructional map concept updates from the teacher-facing product view", async () => {
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
    const mapProduct = {
      sessionId: "session-1",
      intentType: "build-instructional-map",
      documentIds: ["doc-1", "doc-2"],
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

    let uploadCount = 0;
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/v4/documents/upload") {
        const document = documents[uploadCount] ?? documents[0];
        uploadCount += 1;
        return jsonResponse({ documentId: document.documentId, documentIds: [document.documentId], sessionId: "session-1", registered: [document] });
      }
      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }
      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents, analyzedDocuments });
      }
      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse({ analysis: { sessionId: "session-1", documentIds: ["doc-1", "doc-2"], conceptOverlap: {}, conceptGaps: [], difficultyProgression: {}, representationProgression: {}, redundancy: { "doc-1": [], "doc-2": [] }, coverageSummary: { totalConcepts: 2, docsPerConcept: { fractions: 1, equivalence: 1 }, perDocument: { "doc-1": { documentId: "doc-1", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" }, "doc-2": { documentId: "doc-2", conceptCount: 1, problemCount: 1, instructionalDensity: 0.75, representations: ["text"], dominantDifficulty: "medium" } } }, documentSimilarity: [], conceptToDocumentMap: { fractions: ["doc-1"], equivalence: ["doc-2"] }, updatedAt: "2025-01-01T00:00:00.000Z" } });
      }
      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: [mapProduct] });
      }
      if (input === "/api/v4/documents/intent" && init?.method === "POST") {
        return jsonResponse(mapProduct);
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

    fireEvent.change(screen.getByLabelText("Teaching materials"), {
      target: { files: [
        new File(["docx"], "lesson-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
        new File(["pdf"], "practice.pdf", { type: "application/pdf" }),
      ] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByRole("heading", { name: "Your workspace" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("What would you like to build?"), { target: { value: "build-instructional-map" } });
    fireEvent.click(screen.getByRole("button", { name: "Create document" }));

    expect(await screen.findByText("Instructional Units")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Concepts for Instructional Unit: fractions"), { target: { value: "ratios, equivalence" } });
    fireEvent.click(screen.getByRole("button", { name: "Save concepts" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/v4/teacher-feedback",
      expect.objectContaining({ method: "POST" }),
    ));
  });
});