import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseRestMock = vi.hoisted(() => vi.fn());
const supabaseAdminMock = vi.hoisted(() => vi.fn(() => ({ url: "https://example.supabase.co", key: "service-role-key" })));

const registerDocumentsStoreMock = vi.hoisted(() => vi.fn());
const createDocumentSessionStoreMock = vi.hoisted(() => vi.fn());
const ensureSessionDocumentsStoreMock = vi.hoisted(() => vi.fn());
const saveAnalyzedDocumentStoreMock = vi.hoisted(() => vi.fn());
const analyzeRegisteredDocumentMock = vi.hoisted(() => vi.fn());
const ingestDocumentMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));

const callGeminiMock = vi.hoisted(() => vi.fn());
const callGeminiDetailedMock = vi.hoisted(() => vi.fn());

vi.mock("../../lib/supabase", () => ({
  supabaseRest: supabaseRestMock,
  supabaseAdmin: supabaseAdminMock,
}));

vi.mock("../prism-v4/documents/registryStore", () => ({
  registerDocumentsStore: registerDocumentsStoreMock,
  createDocumentSessionStore: createDocumentSessionStoreMock,
  ensureSessionDocumentsStore: ensureSessionDocumentsStoreMock,
  saveAnalyzedDocumentStore: saveAnalyzedDocumentStoreMock,
}));

vi.mock("../prism-v4/documents/analysis", () => ({
  analyzeRegisteredDocument: analyzeRegisteredDocumentMock,
}));

vi.mock("../prism-v4/ingestion/ingestDocument", () => ({
  ingestDocument: ingestDocumentMock,
}));

vi.mock("../../lib/gemini", () => ({
  callGemini: callGeminiMock,
  callGeminiDetailed: callGeminiDetailedMock,
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
  },
}));

import uploadHandler from "../../api/v4/documents/upload";
import preparednessHandler from "../../api/v4/preparedness";
import { POST as rewritePost } from "../../app/api/rewrite/route";
import { createStudioSessionFromFileApi } from "../lib/teacherStudioApi";

function createResponse() {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  res.setHeader = () => res;
  return res;
}

function buildRewriteRequestBody() {
  return {
    original: "Original assignment text.",
    suggestions: [
      {
        id: "s1",
        label: "Clear wording",
        instruction: "Rewrite the prompt with clearer wording.",
        actionable: true,
      },
    ],
    selectedSuggestionIds: ["s1"],
    docType: "assignment",
  };
}

function buildPreparednessAssessmentItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    itemNumber: index + 1,
    text: `Question ${index + 1}`,
  }));
}

describe("token safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    supabaseRestMock.mockImplementation(async (_table: string, options?: { method?: string; select?: string }) => {
      if (options?.method === "GET" && options.select === "tokens_used") {
        return [];
      }
      return null;
    });

    registerDocumentsStoreMock.mockResolvedValue([
      {
        documentId: "doc-1",
        sourceFileName: "worksheet.pdf",
        sourceMimeType: "application/pdf",
        createdAt: "2026-04-15T00:00:00.000Z",
      },
    ]);
    createDocumentSessionStoreMock.mockResolvedValue({ sessionId: "session-1" });
    ensureSessionDocumentsStoreMock.mockResolvedValue({ sessionId: "session-1" });
    analyzeRegisteredDocumentMock.mockResolvedValue({
      document: { nodes: [] },
      fragments: [],
      problems: [],
      insights: { concepts: [], instructionalDensity: 0 },
    });

    vi.stubGlobal("fetch", vi.fn());
  });

  it("does not deduct tokens on successful upload", async () => {
    const req: any = {
      method: "POST",
      headers: {
        "content-type": "application/pdf",
        "x-file-name": "worksheet.pdf",
        "x-user-id": "11111111-1111-4111-8111-111111111111",
      },
      arrayBuffer: async () => new TextEncoder().encode("%PDF-1.4").buffer,
    };
    const res = createResponse();

    await uploadHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not deduct tokens when upload ingestion fails", async () => {
    registerDocumentsStoreMock.mockRejectedValueOnce(new Error("ingestion failed"));

    const req: any = {
      method: "POST",
      headers: {
        "content-type": "application/pdf",
        "x-file-name": "bad.pdf",
        "x-user-id": "11111111-1111-4111-8111-111111111111",
      },
      arrayBuffer: async () => new TextEncoder().encode("not a real pdf").buffer,
    };
    const res = createResponse();

    await uploadHandler(req, res);

    expect(res.statusCode).toBe(500);
    expect(String(res.body?.error ?? "")).toMatch(/ingestion failed/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("preparedness question-count guard blocks model calls and token usage", async () => {
    const req: any = {
      method: "POST",
      body: {
        phase: "preparedness",
        prep: {
          title: "Prep",
          rawText: [
            "Paragraph one is intentionally verbose to satisfy the minimum ingestion length requirement for preparedness.",
            "Paragraph two continues the same topic while remaining distinct enough to avoid duplicate ratio checks.",
            "Paragraph three adds extra instructional wording so the paragraph counter clears the ingestion guard.",
            "Paragraph four introduces another complete sentence block to keep the payload realistic for prep material.",
            "Paragraph five ensures we exceed the minimum paragraph threshold before testing question-count validation.",
          ].join("\n\n"),
        },
        assessment: {
          title: "Assessment",
          items: buildPreparednessAssessmentItems(60),
        },
      },
    };
    const res = createResponse();

    await preparednessHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(String(res.body?.error ?? "")).toMatch(/question count/i);
    expect(callGeminiMock).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rewrite 500 path does not deduct tokens", async () => {
    callGeminiDetailedMock.mockRejectedValueOnce(new Error("server error"));

    const req = new Request("http://localhost/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "11111111-1111-4111-8111-111111111111" },
      body: JSON.stringify(buildRewriteRequestBody()),
    });

    const res = await rewritePost(req);
    const payload = await res.json();

    expect(res.status).toBe(500);
    expect(String(payload?.message ?? "")).toMatch(/failed/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rewrite success deducts tokens exactly once using usage metadata", async () => {
    callGeminiDetailedMock.mockResolvedValueOnce({
      text: "Rewritten assignment text with actual changes.",
      usageMetadata: { totalTokenCount: 200 },
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(null, { status: 200, headers: { "content-type": "application/json" } }),
    );

    const req = new Request("http://localhost/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "11111111-1111-4111-8111-111111111111" },
      body: JSON.stringify(buildRewriteRequestBody()),
    });

    const res = await rewritePost(req);

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/rest/v1/rpc/increment_token_usage");
    const body = JSON.parse(String(init.body));
    expect(body.p_tokens).toBe(200);
  });

  it("retry after failure only deducts on the successful attempt", async () => {
    callGeminiDetailedMock
      .mockRejectedValueOnce(new Error("429 rate limit"))
      .mockResolvedValueOnce({
        text: "Rewritten assignment text with actual changes.",
        usageMetadata: { totalTokenCount: 123 },
      });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(null, { status: 200, headers: { "content-type": "application/json" } }),
    );

    const first = new Request("http://localhost/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "11111111-1111-4111-8111-111111111111" },
      body: JSON.stringify(buildRewriteRequestBody()),
    });
    const second = new Request("http://localhost/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "11111111-1111-4111-8111-111111111111" },
      body: JSON.stringify(buildRewriteRequestBody()),
    });

    const firstRes = await rewritePost(first);
    const secondRes = await rewritePost(second);

    expect(firstRes.status).toBe(500);
    expect(secondRes.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.p_tokens).toBe(123);
  });

  it("single-file studio helper always forces fresh sessions", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          documentId: "doc-1",
          sessionId: "session-1",
          registered: [
            {
              documentId: "doc-1",
              sourceFileName: "test.pdf",
              sourceMimeType: "application/pdf",
              createdAt: "2026-04-15T00:00:00.000Z",
            },
          ],
          analyzedDocument: {
            document: { nodes: [] },
            fragments: [],
            problems: [],
            insights: { concepts: [], instructionalDensity: 0 },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const file = new File(["test body"], "test.pdf", { type: "application/pdf" });
    const result = await createStudioSessionFromFileApi(file, "11111111-1111-4111-8111-111111111111");

    expect(result.documentId).toBe("doc-1");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get("x-force-new-session")).toBe("true");
    expect(headers.has("x-session-id")).toBe(false);
  });

  it("single-file studio helper rejects merged payloads", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          documentId: "doc-1",
          sessionId: "session-1",
          registered: [
            {
              documentId: "doc-1",
              sourceFileName: "test.pdf",
              sourceMimeType: "application/pdf",
              createdAt: "2026-04-15T00:00:00.000Z",
            },
            {
              documentId: "doc-2",
              sourceFileName: "other.pdf",
              sourceMimeType: "application/pdf",
              createdAt: "2026-04-15T00:00:00.000Z",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const file = new File(["test body"], "test.pdf", { type: "application/pdf" });

    await expect(
      createStudioSessionFromFileApi(file, "11111111-1111-4111-8111-111111111111"),
    ).rejects.toThrow(/exactly one registered document/i);
  });
});
