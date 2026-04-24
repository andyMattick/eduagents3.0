import { describe, expect, it } from "vitest";

import { extractParentStem } from "../ShortCircuitPage";

describe("extractParentStem", () => {
  it("returns only the parent stem before a) style sub-items", () => {
    const text = [
      "Read the prompt and answer all parts.",
      "a) State the null hypothesis.",
      "b) Find the p-value.",
    ].join("\n");

    const stem = extractParentStem(text);
    expect(stem).toBe("Read the prompt and answer all parts.");
    expect(stem).not.toContain("a)");
    expect(stem).not.toContain("b)");
  });

  it("handles inline a) marker fallback", () => {
    const text = "Read the scenario carefully a) State the null hypothesis. b) Find the p-value.";
    const stem = extractParentStem(text);
    expect(stem).toBe("Read the scenario carefully");
  });
});
