import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { runIngestionPipelineMock } = vi.hoisted(() => ({
  runIngestionPipelineMock: vi.fn(),
}));

vi.mock("../../../prism-v4/ingestion/runIngestionPipeline", () => ({
  runIngestionPipeline: runIngestionPipelineMock,
}));

import handler from "../../../pages/api/v4/ingest";

function createTestApp() {
  const app = express();
  app.post("/api/v4/ingest", (req, res) => handler(req, res));
  return app;
}

describe("v4 ingest route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns exactly the canonical TaggingPipelineInput shape", async () => {
    runIngestionPipelineMock.mockResolvedValue({
      canonical: {
        fileName: "sample.pdf",
        content: "1. Solve the fraction problem.",
        pages: [{ pageNumber: 1, text: "1. Solve the fraction problem." }],
        paragraphs: [{ text: "1. Solve the fraction problem.", pageNumber: 1 }],
        tables: [],
        readingOrder: ["1. Solve the fraction problem."],
      },
      sections: [{ sectionId: "sec-1", text: "1. Solve the fraction problem." }],
      rawAzureRetained: false,
    });

    const app = createTestApp();
    const response = await request(app)
      .post("/api/v4/ingest")
      .attach("file", Buffer.from("%PDF-1.4 sample"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(["azureExtract", "documentId", "fileName"]);
    expect(response.body.fileName).toBe("sample.pdf");
    expect(response.body.documentId).toMatch(/^sample-/);
    expect(response.body.azureExtract).toEqual({
      fileName: "sample.pdf",
      content: "1. Solve the fraction problem.",
      pages: [{ pageNumber: 1, text: "1. Solve the fraction problem." }],
      paragraphs: [{ text: "1. Solve the fraction problem.", pageNumber: 1 }],
      tables: [],
      readingOrder: ["1. Solve the fraction problem."],
    });
    expect(runIngestionPipelineMock).toHaveBeenCalledTimes(1);
    expect(runIngestionPipelineMock).toHaveBeenCalledWith(expect.any(Buffer), "sample.pdf");
  });
});