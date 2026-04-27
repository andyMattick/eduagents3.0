import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const analyzeDocumentMock = vi.fn();
const storeDocumentForRAGMock = vi.fn();
const runOrchestratorMock = vi.fn();

vi.mock("../pipeline/agents/documentAnalyzer", () => ({
  analyzeDocument: analyzeDocumentMock,
}));

vi.mock("../pipeline/agents/documentAnalyzer/storeDocumentForRAG", () => ({
  storeDocumentForRAG: storeDocumentForRAGMock,
}));

vi.mock("../pipeline/orchestrator", () => ({
  runOrchestrator: runOrchestratorMock,
}));

describe("pipeline stability", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  it("full pipeline works with document", async () => {
    analyzeDocumentMock.mockResolvedValue({
      rawText: "Sample extracted document text that is long enough to store for retrieval.",
    });
    runOrchestratorMock.mockResolvedValue({
      questions: [{ id: "q1", prompt: "Question 1" }],
    });

    const { runPipeline } = await import("../pipeline/runPipeline");
    const sampleDoc = new File(["sample"], "sample.pdf", { type: "application/pdf" });

    const result = await runPipeline({
      intent: "create",
      input: {
        mode: "create",
        userId: "user-1",
        subscriptionTier: "free",
        gradeLevels: ["8"],
        course: "Science",
        unitName: "Plants",
        lessonName: "Photosynthesis",
        topic: "Photosynthesis",
        assessmentType: "worksheet",
        studentLevel: "standard",
        time: 20,
        additionalDetails: "Create a worksheet",
        sourceDocuments: [],
      },
      file: sampleDoc,
    } as any);

    expect(result).toBeDefined();
    expect(result.questions.length).toBeGreaterThan(0);
    expect(storeDocumentForRAGMock).toHaveBeenCalledWith(
      "sample.pdf",
      "Sample extracted document text that is long enough to store for retrieval.",
      expect.objectContaining({ source: "runPipeline", intent: "create" })
    );
    expect(runOrchestratorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "create",
        input: expect.objectContaining({
          sourceDocuments: [
            expect.objectContaining({
              name: "sample.pdf",
              content: "Sample extracted document text that is long enough to store for retrieval.",
            }),
          ],
        }),
      })
    );
  });

  it("retrieval falls back when Gemini is unavailable", async () => {
    delete process.env.STUB_LLM_KEY;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { retrieveRelevantChunks } = await import("../../../../lib/rag");

    await expect(
      retrieveRelevantChunks({
        query: "Create a worksheet",
        userId: "user-1",
      })
    ).resolves.toEqual([]);

    expect(warnSpy).toHaveBeenCalled();
  });

  it("document insert succeeds without embeddings", async () => {
    vi.useFakeTimers();

    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STUB_LLM_KEY;

    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (url.includes("/rest/v1/documents?") && !options?.method) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/rest/v1/documents") && options?.method === "POST") {
        return new Response(JSON.stringify([{ id: "doc-123" }]), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", fetchMock);

    const { storeDocument } = await import("../../../../lib/rag");
    const docId = await storeDocument({
      userId: "user-1",
      title: "Test",
      content: "This is enough content to be inserted even when embeddings are unavailable.",
      metadata: {},
    });

    await vi.runAllTimersAsync();

    expect(docId).toBe("doc-123");
    expect(warnSpy).toHaveBeenCalled();

    vi.useRealTimers();
  });
});