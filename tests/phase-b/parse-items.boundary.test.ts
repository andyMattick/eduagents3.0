import { describe, expect, it } from "vitest";

import { parseItems, parsePhaseBResult } from "../../src/simulation/phase-b/parseItems";

describe("phase-b parse-items boundary", () => {
  it("parses pure MC exam as single MC items", () => {
    const lines = [
      "1. Which of the following best describes osmosis?",
      "A. Movement of water across membrane",
      "B. Random molecular motion",
      "C. Protein synthesis",
      "D. Photosynthesis",
      "2. What is 2 + 2?",
      "A. 1",
      "B. 2",
      "C. 3",
      "D. 4",
    ];

    const items = parseItems(lines);
    const parents = items.filter((item) => item.isParent);
    const children = items.filter((item) => !item.isParent);

    expect(parents).toHaveLength(2);
    expect(children).toHaveLength(0);
    expect(parents.every((item) => item.type === "mc")).toBe(true);
  });

  it("parses multipart free-response with lettered children", () => {
    const lines = [
      "2.",
      "a. Identify p1 and p2.",
      "b. Determine the interval.",
      "c. Interpret the result.",
    ];

    const items = parseItems(lines);
    const labels = items.map((item) => item.logicalLabel);
    expect(labels).toEqual(["2", "2a", "2b", "2c"]);
    expect(items[0]?.type).toBe("multipart_parent");
  });

  it("handles mixed MC + FR + multipart", () => {
    const lines = [
      "1. Which option is correct?",
      "A. One",
      "B. Two",
      "2. Explain how photosynthesis works.",
      "3) Solve the following:",
      "(a) Find the mean.",
      "(b) Find the median.",
      "(c) Find the mode.",
    ];

    const items = parseItems(lines);
    const parent1 = items.find((item) => item.logicalLabel === "1");
    const parent2 = items.find((item) => item.logicalLabel === "2");
    const parent3 = items.find((item) => item.logicalLabel === "3");

    expect(parent1?.type).toBe("mc");
    expect(parent2?.type).toBe("free_response");
    expect(parent3?.type).toBe("multipart_parent");
    expect(items.some((item) => item.logicalLabel === "3a")).toBe(true);
  });

  it("parses weird formatting and casing", () => {
    const lines = [
      "4.",
      "a) Explain.",
      "B) Describe.",
      "c) Evaluate.",
    ];

    const items = parseItems(lines);
    expect(items.map((item) => item.logicalLabel)).toEqual(["4", "4a", "4b", "4c"]);
  });

  it("ignores answer-key and notes sections and computes confidence", () => {
    const lines = [
      "1. What is the capital of France?",
      "A. Berlin",
      "B. Madrid",
      "C. Paris",
      "D. Rome",
      "Notes: give students 10 minutes",
      "Answer Key:",
      "1) C",
    ];

    const result = parsePhaseBResult("doc-1", lines);
    expect(result.items.filter((item) => item.isParent)).toHaveLength(1);
    expect(result.documentConfidence).toBeGreaterThan(0.7);
  });
});
