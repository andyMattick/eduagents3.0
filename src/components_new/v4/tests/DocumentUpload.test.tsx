/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DocumentUpload } from "../DocumentUpload";

vi.mock("../../Auth/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "teacher-auth-1",
      email: "teacher@example.com",
      name: "Teacher Example",
      isAdmin: false,
    },
    session: null,
    isLoading: false,
    error: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    logout: vi.fn(),
  }),
}));

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

function buildCollectionAnalysis(sessionId: string, analyzedDocuments: ReturnType<typeof buildAnalyzedDocument>[]) {
  const documentIds = analyzedDocuments.map((document) => document.document.id);
  const docsPerConcept = analyzedDocuments.reduce<Record<string, number>>((accumulator, document) => {
    for (const concept of document.insights.concepts) {
      accumulator[concept] = (accumulator[concept] ?? 0) + 1;
    }
    return accumulator;
  }, {});

  return {
    sessionId,
    documentIds,
    conceptOverlap: Object.fromEntries(Object.keys(docsPerConcept).map((concept) => [concept, documentIds])),
    conceptGaps: [],
    difficultyProgression: {},
    representationProgression: {},
    redundancy: Object.fromEntries(documentIds.map((documentId) => [documentId, []])),
    coverageSummary: {
      totalConcepts: Object.keys(docsPerConcept).length,
      docsPerConcept,
      perDocument: Object.fromEntries(analyzedDocuments.map((document) => [document.document.id, {
        documentId: document.document.id,
        conceptCount: document.insights.concepts.length,
        problemCount: document.problems.length,
        instructionalDensity: document.insights.instructionalDensity,
        representations: document.insights.representations,
        dominantDifficulty: "medium",
      }])),
    },
    documentSimilarity: analyzedDocuments.length > 1 ? [{
      leftDocumentId: analyzedDocuments[0]!.document.id,
      rightDocumentId: analyzedDocuments[1]!.document.id,
      score: 1,
      sharedConcepts: analyzedDocuments[0]!.insights.concepts.filter((concept) => analyzedDocuments[1]!.insights.concepts.includes(concept)),
    }] : [],
    conceptToDocumentMap: Object.fromEntries(Object.keys(docsPerConcept).map((concept) => [concept, analyzedDocuments.filter((document) => document.insights.concepts.includes(concept)).map((document) => document.document.id)])),
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
}

function buildInstructionalAnalysisResponse(sessionId: string, analyzedDocuments: ReturnType<typeof buildAnalyzedDocument>[]) {
  const rawAnalysis = buildCollectionAnalysis(sessionId, analyzedDocuments);
  const conceptCounts = analyzedDocuments.reduce<Record<string, { documentIds: Set<string>; problemCount: number }>>((accumulator, document) => {
    for (const concept of document.insights.concepts) {
      const current = accumulator[concept] ?? { documentIds: new Set<string>(), problemCount: 0 };
      current.documentIds.add(document.document.id);
      current.problemCount += document.problems.filter((problem) => problem.concepts.includes(concept)).length;
      accumulator[concept] = current;
    }
    return accumulator;
  }, {});
  const misconceptionCounts = analyzedDocuments.reduce<Record<string, { occurrences: number; concepts: Set<string> }>>((accumulator, document) => {
    const misconception = document.insights.misconceptionThemes[0] ?? `common mistake with ${document.insights.concepts[0]}`;
    const current = accumulator[misconception] ?? { occurrences: 0, concepts: new Set<string>() };
    current.occurrences += 1;
    for (const concept of document.insights.concepts) {
      current.concepts.add(concept);
    }
    accumulator[misconception] = current;
    return accumulator;
  }, {});

  return {
    sessionId,
    documentIds: analyzedDocuments.map((document) => document.document.id),
    analysis: {
      concepts: Object.entries(conceptCounts).map(([concept, summary]) => ({
        concept,
        documentCount: summary.documentIds.size,
        problemCount: summary.problemCount,
        coverage: Number((summary.documentIds.size / Math.max(analyzedDocuments.length, 1)).toFixed(2)),
      })),
      problems: analyzedDocuments.map((document) => ({
        documentId: document.document.id,
        sourceFileName: document.document.sourceFileName,
        problemCount: document.problems.length,
        dominantDemand: document.problems[0]?.cognitiveDemand ?? "mixed",
        difficultyDistribution: { low: 0, medium: document.problems.length, high: 0 },
      })),
      misconceptions: Object.entries(misconceptionCounts).map(([misconception, summary]) => ({
        misconception,
        occurrences: summary.occurrences,
        concepts: [...summary.concepts],
      })),
      bloomSummary: { remember: 0, understand: 0, apply: analyzedDocuments.length, analyze: 0, evaluate: 0, create: 0 },
      modeSummary: { apply: analyzedDocuments.length },
      scenarioSummary: { "abstract-symbolic": analyzedDocuments.length },
      difficultySummary: { low: 0, medium: analyzedDocuments.length, high: 0, averageInstructionalDensity: 0.75 },
      domain: "Mathematics",
    },
    rawAnalysis,
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
    const collectionAnalysis = buildInstructionalAnalysisResponse("session-1", analyzedDocuments);
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
        return jsonResponse(collectionAnalysis);
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

  it("sends teacher, unit, student, and adaptive context for assessment builds", async () => {
    const documents = [
      { documentId: "doc-1", sourceFileName: "lesson-notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createdAt: "2025-01-01T00:00:00.000Z" },
    ];
    const analyzedDocuments = [buildAnalyzedDocument("doc-1", "lesson-notes.docx", "fractions")];
    const session = {
      sessionId: "session-1",
      documentIds: ["doc-1"],
      documentRoles: { "doc-1": ["notes"] },
      sessionRoles: { "doc-1": ["unit-member"] },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const buildTestProduct = {
      sessionId: "session-1",
      intentType: "build-test",
      documentIds: ["doc-1"],
      productId: "product-test-1",
      productType: "build-test",
      schemaVersion: "wave3-v1",
      payload: {
        kind: "test",
        focus: null,
        domain: "Mathematics",
        title: "Assessment Draft",
        overview: "This draft assessment includes 1 item focused on fractions.",
        estimatedDurationMinutes: 5,
        totalItemCount: 1,
        sections: [{
          concept: "fractions",
          sourceDocumentIds: ["doc-1"],
          items: [{
            itemId: "item-1",
            prompt: "Explain fractions.",
            concept: "fractions",
            sourceDocumentId: "doc-1",
            sourceFileName: "lesson-notes.docx",
            difficulty: "medium",
            cognitiveDemand: "conceptual",
            answerGuidance: "Show your reasoning.",
          }],
        }],
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/v4/documents/upload") {
        return jsonResponse({ documentId: "doc-1", documentIds: ["doc-1"], sessionId: "session-1", registered: documents });
      }
      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }
      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents, analyzedDocuments });
      }
      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse(buildInstructionalAnalysisResponse("session-1", analyzedDocuments));
      }
      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: [buildTestProduct] });
      }
      if (input === "/api/v4/documents/intent" && init?.method === "POST") {
        return jsonResponse(buildTestProduct);
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentUpload />);

    fireEvent.change(screen.getByLabelText("Teaching materials"), {
      target: {
        files: [
          new File(["docx"], "lesson-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByRole("heading", { name: "Your workspace" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("What would you like to build?"), { target: { value: "build-test" } });
    fireEvent.change(screen.getByLabelText("Unit ID"), { target: { value: "unit-fractions-1" } });
    fireEvent.change(screen.getByLabelText("Student ID"), { target: { value: "student-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Create document" }));

    await screen.findByRole("heading", { name: "Assessment Draft" });

    const buildRequest = fetchMock.mock.calls.find(([input, init]) => input === "/api/v4/documents/intent" && init?.method === "POST");
    expect(buildRequest).toBeTruthy();
    const payload = JSON.parse(String(buildRequest?.[1]?.body ?? "{}"));
    expect(payload.intentType).toBe("build-test");
    expect(payload.options.teacherId).toBe("teacher-auth-1");
    expect(payload.options.unitId).toBe("unit-fractions-1");
    expect(payload.studentId).toBe("student-42");
    expect(payload.enableAdaptiveConditioning).toBe(true);
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
        return jsonResponse(buildInstructionalAnalysisResponse("session-1", [analyzedDocument]));
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
        return jsonResponse(buildInstructionalAnalysisResponse("session-1", analyzedDocuments));
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

  it("renders the Act 1 analysis summary after upload", async () => {
    const documents = [
      { documentId: "doc-1", sourceFileName: "fractions-notes.docx", sourceMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", createdAt: "2025-01-01T00:00:00.000Z" },
    ];
    const analyzedDocuments = [buildAnalyzedDocument("doc-1", "fractions-notes.docx", "fractions")];
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
        return jsonResponse({ documentId: "doc-1", documentIds: ["doc-1"], sessionId: "session-1", registered: documents });
      }
      if (input === "/api/v4/documents/session" && init?.method === "POST") {
        return jsonResponse(session);
      }
      if (input === "/api/v4/documents/session?sessionId=session-1") {
        return jsonResponse({ session, documents, analyzedDocuments });
      }
      if (input === "/api/v4/documents/session-analysis?sessionId=session-1") {
        return jsonResponse(buildInstructionalAnalysisResponse("session-1", analyzedDocuments));
      }
      if (input === "/api/v4/documents/intent?sessionId=session-1") {
        return jsonResponse({ sessionId: "session-1", products: [] });
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    render(<DocumentUpload />);

    fireEvent.change(screen.getByLabelText("Teaching materials"), {
      target: { files: [new File(["docx"], "fractions-notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByRole("heading", { name: "Document analysis" })).toBeInTheDocument();
    expect(screen.getByText("Mathematics")).toBeInTheDocument();
    expect(screen.getByLabelText("Analysis concepts")).toHaveTextContent("fractions");
    expect(screen.getByText("Bloom levels")).toBeInTheDocument();
    expect(screen.getByLabelText("Bloom summary")).toHaveTextContent("Apply");
  });
});