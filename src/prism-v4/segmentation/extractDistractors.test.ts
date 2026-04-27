import { describe, expect, it } from "vitest";

import { detectMultipleChoice } from "./detectMultipleChoice";
import { extractDistractors } from "./extractDistractors";

describe("multiple-choice option parsing", () => {
  it("parses A-E labels and dedupes equivalent label/text pairs", () => {
    const text = [
      "1. Which option is correct?",
      "A) Blue",
      "B) Green",
      "C) Red",
      "D) Yellow",
      "E) Purple",
      "A. Blue",
      "(B) Green",
    ].join("\n");

    const options = extractDistractors(text);
    expect(options).toHaveLength(5);
    expect(options.map((entry) => entry.label)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("detects multiple-choice when at least three unique option labels exist", () => {
    const text = [
      "2. Compute the value.",
      "A. 4",
      "B. 2",
      "C. 1",
    ].join("\n");

    expect(detectMultipleChoice(text)).toBe(true);
  });

  it("captures option A when it starts on the same line as the stem", () => {
    const text = [
      "3. If X is binomial with parameters n = 9 and p = 1/3, the mean of X is A) 6.",
      "B) 3.",
      "C) 2.",
      "D) 1.414.",
      "E) 1.732.",
    ].join("\n");

    const options = extractDistractors(text);
    expect(options.map((entry) => entry.label)).toEqual(["A", "B", "C", "D", "E"]);
    expect(options[0]?.text).toBe("6.");
  });
});
