import { describe, expect, it } from "vitest";
import { validateExtractedText } from "../validateExtractedText";

describe("validateExtractedText", () => {
  it("marks XML/container noise as unreadable", () => {
    const dirty = "<?xml version=\"1.0\"?><w:document>docProps customXml _rels PK</w:document>";
    const result = validateExtractedText(dirty);
    expect(result.unreadable).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("accepts normal classroom prose", () => {
    const clean = "Grade 8 Algebra lesson. Solve linear equations and explain each step in complete sentences.";
    const result = validateExtractedText(clean);
    expect(result.unreadable).toBe(false);
    expect(result.cleanedText.length).toBeGreaterThan(0);
  });
});
