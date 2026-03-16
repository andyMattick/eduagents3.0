import { describe, expect, it } from "vitest";
import { buildDocumentInsights } from "../buildDocumentInsights";

describe("buildDocumentInsights", () => {
  it("returns empty semantic arrays for unreadable content", () => {
    const unreadable = "<?xml version=\"1.0\"?><rels>docProps customXml PK word/_rels</rels>";
    const insights = buildDocumentInsights(unreadable);
    expect(insights.flags.unreadable).toBe(true);
    expect(insights.concepts).toEqual([]);
    expect(insights.vocab).toEqual([]);
    expect(insights.formulas).toEqual([]);
    expect(insights.examples).toEqual([]);
    expect(insights.sections).toEqual([]);
    expect(insights.tables).toEqual([]);
    expect(insights.diagrams).toEqual([]);
  });

  it("extracts semantic and metadata fields from readable content", () => {
    const readable = [
      "Grade 9 Algebra",
      "Unit 3: Linear Equations",
      "Solve the equation 2x + 5 = 17 and justify your steps.",
      "Example: Graph the solution on a number line.",
    ].join("\n");

    const insights = buildDocumentInsights(readable);
    expect(insights.flags.unreadable).toBe(false);
    expect(insights.concepts.length).toBeGreaterThan(0);
    expect(insights.examples.length).toBeGreaterThan(0);
    expect(insights.metadata.gradeEstimate).toBeTruthy();
  });
});
