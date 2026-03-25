import { describe, expect, it } from "vitest";

import { runDocumentView } from "../pipeline/orchestrator/document";

describe("runDocumentView", () => {
  it("handles raw document input without analyzer arrays", () => {
    const result = runDocumentView("summary", {
      fileName: "sample.pdf",
      text: "Photosynthesis is the process plants use to convert light into energy.",
    });

    expect(result.view).toBe("summary");
    expect(result.schema.items).toEqual([]);
    expect(result.schema.structure).toEqual([]);
    expect(Array.isArray(result.documentInsights.pages)).toBe(true);
    expect(Array.isArray(result.documentInsights.sections)).toBe(true);
  });

  it("reuses provided document insights instead of rebuilding them", () => {
    const providedInsights = {
      rawText: "Structured Azure output",
      pages: [{ pageNumber: 1, text: "Page 1" }],
      sections: [{ id: "section-1", heading: "Intro", content: "Overview" }],
      vocab: ["chlorophyll"],
      formulas: [],
      entities: [],
      examples: [],
      concepts: ["photosynthesis"],
      tables: [{ id: "table-1", preview: "Leaf | Light" }],
      diagrams: [],
      metadata: {
        gradeEstimate: "8",
        subjectEstimate: "Science",
        topicCandidates: ["Photosynthesis"],
        difficulty: "medium",
        readingLevel: 8,
      },
      confidence: { extraction: 0.92 },
      flags: {
        unreadable: false,
        scanned: false,
        lowConfidence: false,
      },
    };

    const result = runDocumentView("raw", {
      fileName: "sample.pdf",
      text: "Fallback text",
      documentInsights: providedInsights,
    });

    expect(result.documentInsights.pages).toEqual(providedInsights.pages);
    expect(result.documentInsights.tables).toEqual(providedInsights.tables);
    expect(result.documentInsights.metadata.subjectEstimate).toBe("Science");
  });
});