import { describe, expect, it } from "vitest";

import { hybridSegment } from "./hybridSegmenter";

describe("hybridSegment answer-key and footer suppression", () => {
  it("drops answer-key region after three consecutive numbered letter entries", () => {
    const paragraphs = [
      { text: "1. Which of the following is correct?" },
      { text: "A) Option one" },
      { text: "B) Option two" },
      { text: "C) Option three" },
      { text: "D) Option four" },
      { text: "1. C" },
      { text: "2. B" },
      { text: "3. A" },
      { text: "A. 4" },
      { text: "B. 2" },
    ];

    const segments = hybridSegment({ paragraphs });
    expect(segments).toHaveLength(1);
    expect(segments[0]?.text).toContain("Which of the following");
    expect(segments[0]?.text).not.toContain("1. C");
    expect(segments[0]?.text).not.toContain("A. 4");
  });

  it("removes page furniture lines from segmented text", () => {
    const paragraphs = [
      { text: "1. Solve the equation." },
      { text: "Page 1" },
      { text: "Spring Exam Review Page 2" },
      { text: "A) x = 2" },
      { text: "B) x = 3" },
      { text: "C) x = 4" },
    ];

    const segments = hybridSegment({ paragraphs });
    expect(segments).toHaveLength(1);
    expect(segments[0]?.text).toContain("Solve the equation");
    expect(segments[0]?.text).not.toContain("Page 1");
    expect(segments[0]?.text).not.toContain("Spring Exam Review Page 2");
  });

  it("does not treat normal numbered question stems as answer-key entries", () => {
    const paragraphs = [
      { text: "1. For which count would a binomial probability model be reasonable?" },
      { text: "2. A tire manufacturer claims fewer than 10% are defective." },
      { text: "3. Compute the expected value for the random variable." },
      { text: "4. Determine whether the sample supports the claim." },
      { text: "5. Compare two strategies and justify your answer." },
    ];

    const segments = hybridSegment({ paragraphs });
    expect(segments).toHaveLength(5);
    expect(segments.map((entry) => entry.itemNumber)).toEqual([1, 2, 3, 4, 5]);
  });
});
