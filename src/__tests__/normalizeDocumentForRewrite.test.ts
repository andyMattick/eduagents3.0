import { describe, expect, it } from "vitest";

import { normalizeDocumentForRewrite } from "../../lib/rewrite/normalizeDocumentForRewrite";

describe("normalizeDocumentForRewrite", () => {
  it("keeps one canonical version per item and preserves order", () => {
    const input = [
      "1.",
      "Find the area of the rectangle with side lengths 3 and 4",
      "",
      "1. Find the area of the rectangle with side lengths 3 and 4.",
      "",
      "2) Compute 7 + 8.",
      "",
      "2)",
      "Compute 7 + 8",
    ].join("\n");

    const output = normalizeDocumentForRewrite(input);

    expect(output).toBe(
      [
        "1. Find the area of the rectangle with side lengths 3 and 4.",
        "",
        "2. Compute 7 + 8.",
      ].join("\n")
    );
  });

  it("drops number-only fragments when a complete version exists", () => {
    const input = [
      "3.",
      "",
      "3. Explain why equivalent fractions represent the same value.",
    ].join("\n");

    const output = normalizeDocumentForRewrite(input);

    expect(output).toBe("3. Explain why equivalent fractions represent the same value.");
  });

  it("returns trimmed original when no numbered items are detected", () => {
    const input = "  Teacher notes only\nwithout numbered prompts.  \n";
    const output = normalizeDocumentForRewrite(input);
    expect(output).toBe("Teacher notes only\nwithout numbered prompts.");
  });
});
