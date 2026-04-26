import { describe, expect, it, vi } from "vitest";

vi.mock("../../api/v4/simulator/shared", () => ({
  saveItems: vi.fn(async () => undefined),
  saveSections: vi.fn(async () => undefined),
  saveAnalysis: vi.fn(async () => undefined),
  setDocType: vi.fn(async () => undefined),
}));

import { ingestDocument } from "../../src/prism-v4/ingestion/ingestDocument";
import { analyzeRegisteredDocument } from "../../src/prism-v4/documents/analysis";
import { saveItems } from "../../api/v4/simulator/shared";

function buildAzureExtract() {
  const content = [
    "1) Apply the slope formula to the two points.",
    "2) Analyze the graph and explain the trend.",
  ].join("\n");

  return {
    fileName: "analysis-fixture.pdf",
    content,
    pages: [{ pageNumber: 1, text: content }],
    paragraphs: [
      { pageNumber: 1, text: "1) Apply the slope formula to the two points." },
      { pageNumber: 1, text: "2) Analyze the graph and explain the trend." },
    ],
    tables: [],
    readingOrder: [],
  };
}

describe("Phase B->C boundary (DB mapping)", () => {
  it("persists numeric traits into v4_items metadata", async () => {
    const analyzedDocument = await analyzeRegisteredDocument({
      documentId: "doc-boundary-b-c",
      sourceFileName: "analysis-fixture.pdf",
      sourceMimeType: "application/pdf",
      azureExtract: buildAzureExtract(),
    });

    const result = await ingestDocument({
      source: "teacher-upload",
      documentId: "doc-boundary-b-c",
      analyzedDocument,
      azureExtract: buildAzureExtract(),
    });

    expect(result.items.length).toBeGreaterThan(0);

    for (const item of result.items) {
      const metadata = item.metadata ?? {};
      expect(metadata.bloomLevel).toEqual(expect.any(Number));
      expect(metadata.cognitiveLoad).toEqual(expect.any(Number));
      expect(metadata.linguisticLoad).toEqual(expect.any(Number));
      expect(metadata.representationLoad).toEqual(expect.any(Number));

      expect((metadata.phaseB as { bloomLevel?: number } | undefined)?.bloomLevel).toEqual(expect.any(Number));
      expect((metadata.phaseB as { cognitiveLoad?: number } | undefined)?.cognitiveLoad).toEqual(expect.any(Number));
      expect((metadata.phaseB as { linguisticLoad?: number } | undefined)?.linguisticLoad).toEqual(expect.any(Number));
      expect((metadata.phaseB as { representationLoad?: number } | undefined)?.representationLoad).toEqual(expect.any(Number));

      expect((metadata.metrics as { bloom_level?: number } | undefined)?.bloom_level).toEqual(expect.any(Number));
      expect((metadata.metrics as { cognitive_load?: number } | undefined)?.cognitive_load).toEqual(expect.any(Number));
      expect((metadata.metrics as { linguistic_load?: number } | undefined)?.linguistic_load).toEqual(expect.any(Number));
      expect((metadata.metrics as { representation_load?: number } | undefined)?.representation_load).toEqual(expect.any(Number));
    }

    const saveItemsMock = vi.mocked(saveItems);
    expect(saveItemsMock).toHaveBeenCalledTimes(1);
    expect(saveItemsMock.mock.calls[0]?.[0]).toBe("doc-boundary-b-c");
  });
});
