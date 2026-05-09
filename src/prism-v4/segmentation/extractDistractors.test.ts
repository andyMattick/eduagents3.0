import { describe, expect, it } from "vitest";

import { detectMultiPart } from "./detectMultiPart";
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

  it("detects multiple-choice when options appear in the same parent paragraph", () => {
    const text = "2. Compute the value. A. 4 B. 2 C. 1";

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

  it("treats inline A-E choices in parent paragraph as multiple choice", () => {
    const text = "4. Which value is correct? A. 12 B. 15 C. 18 D. 21 E. 24";

    expect(detectMultipleChoice(text)).toBe(true);
    expect(detectMultiPart(text)).toBe(false);
  });

  it("treats separate lettered paragraphs as multipart sub-items", () => {
    const text = [
      "3. Use the paragraph about tortilla chips to answer.",
      "A. Explain the trend in sales over time.",
      "B. Compare weekend and weekday demand.",
      "C. Identify one outlier and justify.",
      "D. State one limitation of the model.",
    ].join("\n");

    expect(detectMultipleChoice(text)).toBe(false);
    expect(detectMultiPart(text)).toBe(true);
  });
});
