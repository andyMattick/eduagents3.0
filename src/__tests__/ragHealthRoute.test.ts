import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticateUserMock, probeRagHealthMock } = vi.hoisted(() => ({
  authenticateUserMock: vi.fn(),
  probeRagHealthMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  authenticateUser: authenticateUserMock,
}));

vi.mock("../../lib/rag", () => ({
  probeRagHealth: probeRagHealthMock,
}));

import handler from "../../api/health/rag";

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

describe("health/rag route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns boolean RAG readiness checks", async () => {
    authenticateUserMock.mockResolvedValue({ userId: "user-1" });
    probeRagHealthMock.mockResolvedValue({
      documentsTable: true,
      contentHashColumn: false,
      canInsert: true,
    });

    const req: any = {
      method: "GET",
      headers: { authorization: "Bearer token" },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      documents_table: true,
      content_hash_column: false,
      can_insert: true,
    });
  });
});