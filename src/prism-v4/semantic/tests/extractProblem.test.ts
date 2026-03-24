import { describe, expect, it } from "vitest";

import { extractProblems } from "../extract/extractProblem";

describe("extractProblems", () => {
  it("builds stable hierarchical ids for numbered problems and subparts", () => {
    const problems = extractProblems({
      fileName: "quiz.pdf",
      content: [
        "Statistics Unit 9.1 Quiz Name",
        "1. Bob has a magic coin that lands on heads 70% of the time.",
        "a) Describe the parameter in this situation.",
        "b) Describe the statistic a student would record.",
        "2. A sample of 40 students was surveyed.",
        "(a) Estimate the margin of error.",
        "(b) Explain whether the sample is representative.",
        "3. Write one conclusion based on the data.",
      ].join("\n"),
      pages: [{ pageNumber: 1, text: "quiz" }],
      paragraphs: [
        { text: "Statistics Unit 9.1 Quiz Name", pageNumber: 1 },
        { text: "1. Bob has a magic coin that lands on heads 70% of the time.", pageNumber: 1 },
        { text: "a) Describe the parameter in this situation.", pageNumber: 1 },
        { text: "b) Describe the statistic a student would record.", pageNumber: 1 },
        { text: "2. A sample of 40 students was surveyed.", pageNumber: 1 },
        { text: "(a) Estimate the margin of error.", pageNumber: 1 },
        { text: "(b) Explain whether the sample is representative.", pageNumber: 1 },
        { text: "3. Write one conclusion based on the data.", pageNumber: 1 },
      ],
      tables: [],
      readingOrder: [],
    });

    expect(problems.map((problem) => problem.problemId)).toEqual(["p1a", "p1b", "p2a", "p2b", "p3"]);
    expect(problems.map((problem) => problem.rootProblemId)).toEqual(["p1", "p1", "p2", "p2", "p3"]);
    expect(problems.map((problem) => problem.teacherLabel)).toEqual(["a)", "b)", "a)", "b)", "3."]);
    expect(problems[0]?.stemText).toBe("Bob has a magic coin that lands on heads 70% of the time.");
    expect(problems[0]?.partText).toBe("Describe the parameter in this situation.");
    expect(problems[4]?.cleanedText).toBe("Write one conclusion based on the data.");
  });

  it("merges continuation lines into the active part", () => {
    const problems = extractProblems({
      fileName: "quiz.pdf",
      content: "1. Use the graph to answer the questions.\na) State the trend.\nSupport your answer with one value.",
      pages: [{ pageNumber: 1, text: "quiz" }],
      paragraphs: [
        { text: "1. Use the graph to answer the questions.", pageNumber: 1 },
        { text: "a) State the trend.", pageNumber: 1 },
        { text: "Support your answer with one value.", pageNumber: 1 },
      ],
      tables: [],
      readingOrder: [],
    });

    expect(problems).toHaveLength(1);
    expect(problems[0]?.problemId).toBe("p1a");
    expect(problems[0]?.partText).toBe("State the trend.\nSupport your answer with one value.");
  });
});