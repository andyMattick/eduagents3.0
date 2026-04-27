import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { runAzureExtractionMock } = vi.hoisted(() => ({
  runAzureExtractionMock: vi.fn(),
}));

vi.mock("../../../prism-v4/ingestion/azure/azureExtractor", () => ({
  runAzureExtraction: runAzureExtractionMock,
}));
import handler from "../../../../api/v4-ingest";

function createTestApp() {
  const app = express();
  app.post("/api/v4-ingest", (req, res) => handler(req, res));
  return app;
}

describe("v4 ingest route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns exactly the canonical TaggingPipelineInput shape", async () => {
    runAzureExtractionMock.mockResolvedValue({
      content: "1. Solve the fraction problem.",
      pages: [{ pageNumber: 1, lines: [{ content: "1. Solve the fraction problem." }] }],
      paragraphs: [{ content: "1. Solve the fraction problem.", boundingRegions: [{ pageNumber: 1 }] }],
      tables: [],
    });

    const app = createTestApp();
    const response = await request(app)
      .post("/api/v4-ingest")
      .set("Content-Type", "application/pdf")
      .set("x-file-name", "sample.pdf")
      .send(Buffer.from("%PDF-1.4 sample"));

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(["azureExtract", "documentId", "fileName"]);
    expect(response.body.fileName).toBe("sample.pdf");
    expect(response.body.documentId).toMatch(/^sample-/);
    expect(response.body).not.toHaveProperty("problems");
    expect(response.body).not.toHaveProperty("problemVectors");
    expect(response.body).not.toHaveProperty("legacyBloom");
    expect(response.body).not.toHaveProperty("oldField");
    expect(response.body.azureExtract).toEqual({
      fileName: "sample.pdf",
      content: "1. Solve the fraction problem.",
      pages: [{ pageNumber: 1, text: "1. Solve the fraction problem." }],
      paragraphs: [{ text: "1. Solve the fraction problem.", pageNumber: 1 }],
      tables: [],
      readingOrder: ["1. Solve the fraction problem."],
    });
    expect(response.body.azureExtract.pages[0]).not.toHaveProperty("lines");
    expect(response.body.azureExtract.paragraphs[0]).not.toHaveProperty("content");
    expect(response.body.azureExtract.paragraphs[0]).not.toHaveProperty("boundingRegions");
    expect(runAzureExtractionMock).toHaveBeenCalledTimes(1);
    expect(runAzureExtractionMock).toHaveBeenCalledWith(expect.any(Buffer));
  });
});