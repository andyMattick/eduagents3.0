import { describe, expect, it } from "vitest";

import { buildSections, type SegmentedBlock } from "./sectioning";

describe("buildSections", () => {
  it("does not promote post-item stems into new headers", () => {
    const blocks: SegmentedBlock[] = [
      { itemNumber: 1, text: "Statistics" },
      { itemNumber: 2, text: "A tire manufacturer claims that fewer than 10% of tires are defective. Determine whether the sample supports this claim." },
      { itemNumber: 3, text: "A cafeteria manager surveys students about lunch quality and records the sample proportion." },
      { itemNumber: 4, text: "A random sample of tortilla chip bags is weighed to estimate the mean weight." },
      { itemNumber: 5, text: "ACT scores from randomly selected students were collected for analysis." },
      { itemNumber: 6, text: "A building inspector reviewed homes and recorded code violations by neighborhood." },
    ];

    const result = buildSections(blocks);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]?.header).toBe("Statistics");
    expect(result.sections[0]?.itemNumbers).toEqual([2, 3, 4, 5, 6]);
    expect(result.itemBlocks.map((item) => item.itemNumber)).toEqual([2, 3, 4, 5, 6]);
    for (const itemNumber of [2, 3, 4, 5, 6]) {
      expect(result.itemToSectionId.get(itemNumber)).toBe("section-1");
    }
  });
});
