import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  runAzureExtractionMock,
} = vi.hoisted(() => ({
  runAzureExtractionMock: vi.fn(),
}));

vi.mock("../azure/azureExtractor", () => ({
  runAzureExtraction: runAzureExtractionMock,
}));

import { uploadRouter } from "../upload/uploadRouter";

const azureLayoutFixture = {
  content: "Unit 1\nSolve the problem shown below.",
  pages: [
    {
      pageNumber: 1,
      lines: [
        { content: "Unit 1" },
        { content: "Solve the problem shown below." },
      ],
    },
  ],
  paragraphs: [
    {
      content: "Unit 1",
      role: "title",
      boundingRegions: [{ pageNumber: 1 }],
    },
    {
      content: "Solve the problem shown below.",
      boundingRegions: [{ pageNumber: 1 }],
    },
  ],
  tables: [],
};

function createTestApp() {
  const app = express();
  app.use("/api/ingestion", uploadRouter);
  return app;
}

describe("Phase 2 Ingestion Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads → extracts → normalizes → segments", async () => {
    runAzureExtractionMock.mockResolvedValue(azureLayoutFixture);

    const app = createTestApp();

    const res = await request(app)
      .post("/api/ingestion/upload")
      .attach("file", Buffer.from("%PDF-1.4 sample"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(200);

    const { canonical, sections } = res.body;

    expect(canonical).toBeDefined();
    expect(canonical.pages.length).toBeGreaterThan(0);
    expect(canonical.paragraphs.length).toBeGreaterThan(0);
    expect(canonical.readingOrder).toEqual(["Unit 1", "Solve the problem shown below."]);

    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0].sectionId).toMatch(/^sec-/);
    expect(sections[0].sectionId).toBe("sec-1");
    expect(sections[0].title).toBe("Unit 1");
    expect(sections[0].text).toContain("Solve the problem shown below.");
  });

  it("falls back to page text when Azure paragraphs are absent", async () => {
    runAzureExtractionMock.mockResolvedValue({
      content: "Directions\nAnswer every question.",
      pages: [
        {
          pageNumber: 1,
          lines: [
            { content: "Directions" },
            { content: "Answer every question." },
          ],
        },
      ],
      paragraphs: [],
      tables: [],
    });

    const app = createTestApp();

    const res = await request(app)
      .post("/api/ingestion/upload")
      .attach("file", Buffer.from("%PDF-1.4 sample"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(200);
    expect(res.body.sections).toHaveLength(1);
    expect(res.body.sections[0].sectionId).toBe("sec-1");
    expect(res.body.sections[0].text).toContain("Answer every question.");
  });

  it("rejects unsupported uploads before Azure extraction runs", async () => {
    const app = createTestApp();

    const res = await request(app)
      .post("/api/ingestion/upload")
      .attach("file", Buffer.from("plain text"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Unsupported file type");
    expect(runAzureExtractionMock).not.toHaveBeenCalled();
  });
});
