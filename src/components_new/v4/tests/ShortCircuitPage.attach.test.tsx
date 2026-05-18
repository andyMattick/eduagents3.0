/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShortCircuitPage } from "../ShortCircuitPage";

const teacherStudioMocks = vi.hoisted(() => ({
  attachSavedCompanionDocumentsApi: vi.fn(),
  listSavedDocumentsApi: vi.fn(),
  loadDocumentStatusApi: vi.fn(),
  loadSessionDocumentsApi: vi.fn(),
}));

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

vi.mock("../../../lib/teacherStudioApi", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/teacherStudioApi")>("../../../lib/teacherStudioApi");
  return {
    ...actual,
    attachSavedCompanionDocumentsApi: teacherStudioMocks.attachSavedCompanionDocumentsApi,
    listSavedDocumentsApi: teacherStudioMocks.listSavedDocumentsApi,
    loadDocumentStatusApi: teacherStudioMocks.loadDocumentStatusApi,
    loadSessionDocumentsApi: teacherStudioMocks.loadSessionDocumentsApi,
  };
});

vi.mock("../../../lib/phaseCApi", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/phaseCApi")>("../../../lib/phaseCApi");
  return {
    ...actual,
    listClassesApi: vi.fn(async () => ({ classes: [] })),
    getClassDetailApi: vi.fn(async () => ({ students: [] })),
    getSimulationViewApi: vi.fn(),
    runSimulationUnifiedApi: vi.fn(),
  };
});

vi.mock("../ShortCircuitGraph", () => ({
  ShortCircuitGraph: () => <div>graph</div>,
}));

vi.mock("../StudentSummaryTable", () => ({
  StudentSummaryTable: () => <div>student summary</div>,
}));

vi.mock("../DocumentPicker", () => ({
  DocumentPicker: () => <div>document picker</div>,
}));

vi.mock("./phase-c/StudentProfileTooltip", () => ({
  StudentProfileTooltip: () => null,
}));

vi.mock("../IngestionLayersModal", () => ({
  IngestionLayersModal: () => null,
}));

function jsonResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  };
}

beforeEach(() => {
  window.history.pushState({}, "", "/simulation?documentId=doc-test-1");
  teacherStudioMocks.attachSavedCompanionDocumentsApi.mockReset();
  teacherStudioMocks.listSavedDocumentsApi.mockReset();
  teacherStudioMocks.loadDocumentStatusApi.mockReset();
  teacherStudioMocks.loadSessionDocumentsApi.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ShortCircuitPage saved companions", () => {
  it("attaches saved companion docs to the loaded saved test and reruns analysis", async () => {
    teacherStudioMocks.listSavedDocumentsApi.mockResolvedValue({
      documents: [
        {
          documentId: "doc-test-1",
          sourceFileName: "Unit 4 Test.pdf",
          createdAt: "2026-05-12T00:00:00.000Z",
          docType: "problem",
          declaredRole: "test",
          sessionId: "session-owning-1",
        },
        {
          documentId: "doc-ak-1",
          sourceFileName: "Unit 4 Answer Key.pdf",
          createdAt: "2026-05-11T00:00:00.000Z",
          docType: "notes",
          declaredRole: "answer-key",
        },
      ],
    });
    teacherStudioMocks.loadDocumentStatusApi.mockResolvedValue({
      documentId: "doc-test-1",
      docType: "problem",
      analysisAvailable: true,
      rewriteEligible: true,
      sessionId: "session-owning-1",
    });
    teacherStudioMocks.loadSessionDocumentsApi.mockResolvedValue({
      session: {
        sessionId: "session-owning-1",
        documentIds: ["doc-test-1"],
        documentRoles: { "doc-test-1": ["test"] },
        sessionRoles: { "doc-test-1": ["target-assessment"] },
        resourceLinks: [],
        createdAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
      },
      documents: [],
      analyzedDocuments: [],
    });
    teacherStudioMocks.attachSavedCompanionDocumentsApi.mockResolvedValue({ ok: true });

    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/v4/documents") {
        return jsonResponse({
          documents: [{ documentId: "doc-test-1", sourceFileName: "Unit 4 Test.pdf" }],
        });
      }
      if (input === "/api/v4/simulator/shortcircuit") {
        return jsonResponse({ items: [], itemTrees: [], sections: [], documentConfidence: 0.8 });
      }
      if (input === "/api/v4/usage/today") {
        return jsonResponse({ count: 32500, limit: 40000, remaining: 7500 });
      }
      if (input === "/api/v4/simulations/usage-today") {
        return jsonResponse({ simulationsRun: 0, maxSimulationsPerDay: 10, remainingSimulations: 10, adminOverride: false });
      }
      throw new Error(`Unexpected fetch call: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ShortCircuitPage />);

    await waitFor(() => expect(screen.getByText("Companion Documents")).toBeInTheDocument());
    expect(await screen.findByText("7,500 tokens remaining today.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Unit 4 Answer Key.pdf")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/Unit 4 Answer Key.pdf/i));
    fireEvent.click(screen.getByRole("button", { name: "Attach and rerun washover" }));

    await waitFor(() => expect(teacherStudioMocks.attachSavedCompanionDocumentsApi).toHaveBeenCalled());
    expect(teacherStudioMocks.attachSavedCompanionDocumentsApi).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "session-owning-1",
      targetDocumentId: "doc-test-1",
      documentIds: ["doc-test-1"],
      resourceLinks: [
        {
          documentId: "doc-test-1",
          resourceDocumentId: "doc-ak-1",
          resourceType: "answer-key",
        },
      ],
    }));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([input]) => input === "/api/v4/simulator/shortcircuit").length).toBeGreaterThan(1));
  });
});