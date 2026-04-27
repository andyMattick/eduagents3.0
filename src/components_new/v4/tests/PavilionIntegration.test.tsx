/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function buildInstructionalAnalysisResponse(sessionId: string, analyzedDocuments: ReturnType<typeof buildAnalyzedDocument>[]) {
  return {
    sessionId,
    documentIds: analyzedDocuments.map((document) => document.document.id),
    analysis: {
      concepts: analyzedDocuments.map((document) => ({
        concept: document.insights.concepts[0],
        documentCount: 1,
        problemCount: document.problems.length,
        coverage: 1,
      })),
      problems: analyzedDocuments.map((document) => ({
        documentId: document.document.id,
        sourceFileName: document.document.sourceFileName,
        problemCount: document.problems.length,
        dominantDemand: document.problems[0]?.cognitiveDemand ?? "mixed",
        difficultyDistribution: { low: 0, medium: document.problems.length, high: 0 },
      })),
      misconceptions: [{
        misconception: analyzedDocuments[0]?.insights.misconceptionThemes[0] ?? "denominator-swap",
        occurrences: 1,
        concepts: [analyzedDocuments[0]?.insights.concepts[0] ?? "fractions"],
      }],
      bloomSummary: { remember: 0, understand: 0, apply: 1, analyze: 0, evaluate: 0, create: 0 },
      modeSummary: { compare: 1 },
      scenarioSummary: { "abstract-symbolic": 1 },
      difficultySummary: { low: 0, medium: 1, high: 0, averageInstructionalDensity: 0.75 },
      domain: "Mathematics",
    },
    rawAnalysis: {
      sessionId,
      documentIds: analyzedDocuments.map((document) => document.document.id),
      conceptOverlap: {},
      conceptGaps: [],
      difficultyProgression: {},
      representationProgression: {},
      redundancy: {},
      coverageSummary: { totalConcepts: 1, docsPerConcept: { fractions: 1 }, perDocument: {} },
      documentSimilarity: [],
      conceptToDocumentMap: { fractions: analyzedDocuments.map((document) => document.document.id) },
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Pavilion integration", () => {
  it("loads pavilion tabs through the session runtime and class differentiation flow", async () => {
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
            prompt: "Compare the fractions 2/3 and 3/4.",
            concept: "fractions",
            sourceDocumentId: "doc-1",
            sourceFileName: "fractions-notes.docx",
            difficulty: "medium",
            cognitiveDemand: "conceptual",
            answerGuidance: "Use common denominators.",
          }],
        }],
        generatedAt: "2025-01-01T00:00:00.000Z",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
    };
    let products: typeof buildTestProduct[] = [];

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
        return jsonResponse({ sessionId: "session-1", products });
      }
      if (input === "/api/v4/documents/intent" && init?.method === "POST") {
        products = [buildTestProduct];
        return jsonResponse(buildTestProduct);
      }
      if (input === "/api/v4/sessions/session-1/blueprint") {
        return jsonResponse({
          sessionId: "session-1",
          assessmentId: "assessment-1",
          teacherId: "teacher-auth-1",
          blueprint: {
            concepts: [{ id: "fractions", name: "fractions", order: 0, included: true, quota: 1 }],
            bloomLadder: [{ level: "understand", count: 1 }],
            difficultyRamp: [{ band: "medium", count: 1 }],
            modeMix: [{ mode: "compare", count: 1 }],
            scenarioMix: [{ scenario: "abstract-symbolic", count: 1 }],
          },
          conceptMap: {
            nodes: [{ id: "fractions", label: "fractions", weight: 1 }],
            edges: [],
          },
        });
      }
      if (input === "/api/v4/teachers/teacher-auth-1/fingerprint") {
        return jsonResponse({
          teacherId: "teacher-auth-1",
          fingerprint: {
            teacherId: "teacher-auth-1",
            modePreferences: [{ mode: "compare", count: 2 }],
            scenarioPreferences: [{ scenario: "abstract-symbolic", count: 1 }],
            bloomPreferences: [{ level: "understand", count: 3 }],
            difficultyPreferences: [],
            rawFingerprint: null,
          },
        });
      }
      if (input === "/api/v4/students/student-42/performance") {
        return jsonResponse({
          studentId: "student-42",
          profile: {
            studentId: "student-42",
            lastUpdated: "2026-03-29T00:00:00.000Z",
            totalEvents: 3,
            totalAssessments: 1,
            assessmentIds: ["assessment-1"],
            overallMastery: 0.41,
            overallConfidence: 0.55,
            averageResponseTimeSeconds: 8,
            conceptMastery: { fractions: 0.31 },
            conceptExposure: { fractions: 3 },
            bloomMastery: { understand: 0.35 },
            modeMastery: { compare: 0.4 },
            scenarioMastery: { "abstract-symbolic": 0.33 },
            conceptBloomMastery: { fractions: { understand: 0.35 } },
            conceptModeMastery: { fractions: { compare: 0.4 } },
            conceptScenarioMastery: { fractions: { "abstract-symbolic": 0.33 } },
            conceptAverageResponseTimeSeconds: { fractions: 8 },
            conceptConfidence: { fractions: 0.55 },
            misconceptions: {},
          },
          misconceptions: ["denominator-swap"],
          exposureTimeline: [{ timestamp: "2026-03-29T00:00:00.000Z", conceptId: "fractions", conceptLabel: "fractions" }],
          responseTimes: [{ itemId: "item-1", conceptId: "fractions", ms: 1200 }],
        });
      }
      if (input === "/api/v4/sessions/session-1/builder-plan") {
        return jsonResponse({
          sessionId: "session-1",
          builderPlan: {
            sections: [{ conceptId: "fractions", conceptName: "Fractions", itemCount: 1, bloomSequence: ["understand"], difficultySequence: ["medium"], modeSequence: ["compare"], scenarioSequence: ["abstract-symbolic"] }],
            adaptiveTargets: { boostedConcepts: ["fractions"], suppressedConcepts: [], boostedBloom: ["understand"], suppressedBloom: [] },
          },
        });
      }
      if (input === "/api/v4/sessions/session-1/assessment-preview") {
        return jsonResponse({
          sessionId: "session-1",
          assessmentPreview: {
            items: [{
              itemId: "item-1",
              stem: "Compare the fractions 2/3 and 3/4.",
              answer: "Use common denominators.",
              conceptId: "fractions",
              bloom: "understand",
              difficulty: "medium",
              mode: "compare",
              scenario: "abstract-symbolic",
              misconceptionTag: "denominator-swap",
              teacherReasons: ["Fractions was boosted for support."],
              studentReasons: ["This stays symbolic for scaffolding."],
            }],
          },
        });
      }
      if (input === "/api/v4/sessions/session-1/builder-plan?studentId=student-42") {
        return jsonResponse({
          sessionId: "session-1",
          builderPlan: {
            sections: [{ conceptId: "fractions", conceptName: "Fractions", itemCount: 1, bloomSequence: ["understand"], difficultySequence: ["medium"], modeSequence: ["compare"], scenarioSequence: ["abstract-symbolic"] }],
            adaptiveTargets: {
              boostedConcepts: ["fractions"],
              suppressedConcepts: [],
              boostedBloom: ["understand"],
              suppressedBloom: [],
            },
          },
        });
      }
      if (input === "/api/v4/sessions/session-1/assessment-preview?studentId=student-42") {
        return jsonResponse({
          sessionId: "session-1",
          assessmentPreview: {
            items: [{
              itemId: "item-1",
              stem: "Compare the fractions 2/3 and 3/4.",
              answer: "Use common denominators.",
              conceptId: "fractions",
              bloom: "understand",
              difficulty: "medium",
              mode: "compare",
              scenario: "abstract-symbolic",
              misconceptionTag: "denominator-swap",
              teacherReasons: ["Fractions was boosted for support."],
              studentReasons: ["This stays symbolic for scaffolding."],
            }],
          },
        });
      }
      if (input === "/api/v4/classes/session-1/performance") {
        return jsonResponse({
          classProfile: {
            classId: "session-1",
            students: [
              {
                studentId: "student-42",
                lastUpdated: "2026-03-29T00:00:00.000Z",
                totalEvents: 3,
                totalAssessments: 1,
                assessmentIds: ["assessment-1"],
                overallMastery: 0.31,
                overallConfidence: 0.55,
                averageResponseTimeSeconds: 8,
                conceptMastery: { fractions: 0.31 },
                conceptExposure: { fractions: 3 },
                bloomMastery: { understand: 0.35 },
                modeMastery: { compare: 0.4 },
                scenarioMastery: { "abstract-symbolic": 0.33 },
                conceptBloomMastery: { fractions: { understand: 0.35 } },
                conceptModeMastery: { fractions: { compare: 0.4 } },
                conceptScenarioMastery: { fractions: { "abstract-symbolic": 0.33 } },
                conceptAverageResponseTimeSeconds: { fractions: 8 },
                conceptConfidence: { fractions: 0.55 },
                misconceptions: { fractions: [{ misconceptionKey: "denominator-swap", occurrences: 2, lastSeenAt: "2026-03-29T00:00:00.000Z", examples: ["1/4 + 1/3 = 2/7"], relatedBloomLevels: ["understand"], relatedModes: ["compare"] }] },
              },
            ],
            conceptClusters: [{ conceptId: "fractions", low: ["student-42"], mid: [], high: [] }],
            misconceptionClusters: [{ misconception: "denominator-swap", students: ["student-42"] }],
          },
        });
      }
      if (input === "/api/v4/classes/session-1/differentiated-build") {
        return jsonResponse({
          differentiatedBuild: {
            classId: "session-1",
            versions: [{
              versionId: "support-version",
              label: "Support Version",
              masteryBand: "low",
              studentIds: ["student-42"],
              representativeStudentId: "student-42",
              explanation: "Support Version targets the low mastery band.",
              builderPlan: {
                sections: [{ conceptId: "fractions", conceptName: "Fractions", itemCount: 1, bloomSequence: ["understand"], difficultySequence: ["medium"], modeSequence: ["compare"], scenarioSequence: ["abstract-symbolic"] }],
                adaptiveTargets: { boostedConcepts: ["fractions"], suppressedConcepts: [], boostedBloom: ["understand"], suppressedBloom: [] },
              },
              assessmentPreview: {
                items: [{ itemId: "item-2", stem: "Compare 1/2 and 3/5.", answer: "Use benchmark fractions.", conceptId: "fractions", bloom: "understand", difficulty: "medium", mode: "compare", scenario: "abstract-symbolic", teacherReasons: ["Fractions was boosted for support."], studentReasons: ["Extra scaffolding applied."] }],
              },
            }],
          },
        });
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
    expect(screen.queryByText("What would you like to build?")).not.toBeInTheDocument();
    expect(screen.queryByText("Your recent builds")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Blueprint" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate in Pavilion" }));

    expect(await screen.findByRole("tab", { name: "Builder Plan" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Builder Plan" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Assessment Preview" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Blueprint" }));
    expect(await screen.findByRole("heading", { name: "Blueprint Engine" })).toBeInTheDocument();
    expect(screen.getByText("fractions")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Teacher Fingerprint" }));
    await waitFor(() => expect(screen.getByLabelText("Teacher mode compare")).toHaveValue(2));

    fireEvent.click(screen.getByRole("tab", { name: "Student" }));
    fireEvent.change(screen.getByLabelText("Active student"), { target: { value: "student-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Load Student" }));
    expect(await screen.findByText("denominator-swap")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Builder Plan" }));
    expect(await screen.findByText(/Boosted concepts: fractions/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Living Assessment" }));
    expect(await screen.findByText("Compare the fractions 2/3 and 3/4.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Class" }));
    expect(await screen.findByRole("heading", { name: "Class Mastery Heatmap" })).toBeInTheDocument();
    expect(screen.getByText("denominator-swap")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generate differentiated versions" }));
    expect(await screen.findByText("Support Version")).toBeInTheDocument();

    expect(fetchMock.mock.calls.some(([input]) => input === "/api/v4/sessions/session-1/blueprint")).toBe(true);
    expect(fetchMock.mock.calls.some(([input]) => input === "/api/v4/classes/session-1/performance")).toBe(true);
    expect(fetchMock.mock.calls.some(([input]) => input === "/api/v4/classes/session-1/differentiated-build")).toBe(true);
    expect(fetchMock.mock.calls.some(([input, init]) => input === "/api/v4/documents/intent" && init?.method === "POST")).toBe(true);

    // ── 11a: Document Viewer tab is present ──────────────────────────────────
    const viewerTab = screen.getByRole("tab", { name: "Document Viewer" });
    expect(viewerTab).toBeInTheDocument();

    // ── 11b: Clicking the tab renders ViewerSurface ──────────────────────────
    fireEvent.click(viewerTab);
    const viewerSurface = await screen.findByTestId("v4-viewer-surface");
    expect(viewerSurface).toBeInTheDocument();

    // ── 11c: ViewerSurface receives real ViewerData ──────────────────────────
    // At least one concept ("fractions") is visible inside the viewer surface
    expect(within(viewerSurface).getAllByText("fractions").length).toBeGreaterThan(0);
    // At least one document/group heading (fractions-notes.docx) is visible
    expect(within(viewerSurface).getAllByText("fractions-notes.docx").length).toBeGreaterThan(0);
    // At least one preview item (the extracted problem text) is visible
    expect(within(viewerSurface).getAllByText(/Solve a problem/).length).toBeGreaterThan(0);

    // ── 11d: Switching tabs preserves viewer selection ───────────────────────
    // Click the "fractions" concept button to select it (aria-pressed starts as false)
    const unselectedConceptBtns = within(viewerSurface).getAllByRole("button", { pressed: false });
    const fractionConceptBtn = unselectedConceptBtns.find((btn) => btn.textContent?.includes("fractions"));
    expect(fractionConceptBtn).toBeDefined();
    fireEvent.click(fractionConceptBtn!);

    // Switch to Builder Plan tab then back to Document Viewer
    fireEvent.click(screen.getByRole("tab", { name: "Builder Plan" }));
    fireEvent.click(screen.getByRole("tab", { name: "Document Viewer" }));

    // Selection must survive the remount — aria-pressed=true on the concept button
    const restoredViewerSurface = screen.getByTestId("v4-viewer-surface");
    const pressedBtns = within(restoredViewerSurface)
      .getAllByRole("button")
      .filter((btn) => btn.getAttribute("aria-pressed") === "true" && btn.textContent?.includes("fractions"));
    expect(pressedBtns.length).toBeGreaterThan(0);
  });
});
