import { describe, expect, it, vi, beforeEach } from "vitest";

const { authenticateUserMock, extractSemanticsMock, storeDocumentMock } = vi.hoisted(() => ({
  authenticateUserMock: vi.fn(),
  extractSemanticsMock: vi.fn(),
  storeDocumentMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  authenticateUser: authenticateUserMock,
}));

vi.mock("../../lib/semantic/parseQuery", () => ({
  extractSemantics: extractSemanticsMock,
}));

vi.mock("../../lib/rag", () => ({
  storeDocument: storeDocumentMock,
}));

import handler from "../../api/documents/store";

function createResponse() {
  const res: any = {};
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn().mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

describe("documents/store route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success even when RAG storage fails", async () => {
    authenticateUserMock.mockResolvedValue({ userId: "user-1" });
    extractSemanticsMock.mockResolvedValue({ topic: "math" });
    storeDocumentMock.mockRejectedValue(new Error("insert failed"));

    const req: any = {
      method: "POST",
      headers: { authorization: "Bearer token" },
      body: {
        title: "Doc",
        content: "This is enough content to be processed and stored if storage is available.",
        metadata: { source: "test" },
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      docId: null,
      semantics: { topic: "math" },
      ragStatus: "skipped",
    });
  });
});