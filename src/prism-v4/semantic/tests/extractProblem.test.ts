import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { inferStructuralCognition } from "../cognitive";
import { extractProblems } from "../extract/extractProblem";

describe("extractProblems", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

    expect(problems.map((problem) => problem.problemId)).toEqual(["p1", "p1a", "p1b", "p2", "p2a", "p2b", "p3"]);
    expect(problems.map((problem) => problem.localProblemId)).toEqual(["p1", "p1a", "p1b", "p2", "p2a", "p2b", "p3"]);
    expect(problems.map((problem) => problem.problemGroupId)).toEqual(["p1", "p1", "p1", "p2", "p2", "p2", "p3"]);
    expect(problems.map((problem) => problem.rootProblemId)).toEqual(["p1", "p1", "p1", "p2", "p2", "p2", "p3"]);
    expect(problems.map((problem) => problem.parentProblemId)).toEqual([null, "p1", "p1", null, "p2", "p2", null]);
    expect(problems.map((problem) => problem.partIndex)).toEqual([0, 1, 2, 0, 1, 2, 0]);
    expect(problems.map((problem) => problem.displayOrder)).toEqual([1000, 1100, 1200, 2000, 2100, 2200, 3000]);
    expect(problems.map((problem) => problem.teacherLabel)).toEqual(["1.", "a)", "b)", "2.", "a)", "b)", "3."]);
    expect(problems.every((problem) => problem.createdAt === "2026-03-24T12:00:00.000Z")).toBe(true);
    expect(problems[0]?.sourceSpan).toEqual({ firstPage: 1, lastPage: 1 });
    expect(problems[1]?.sourceSpan).toEqual({ firstPage: 1, lastPage: 1 });
    expect(problems[1]?.stemText).toBe("Bob has a magic coin that lands on heads 70% of the time.");
    expect(problems[1]?.partText).toBe("Describe the parameter in this situation.");
    expect(problems[6]?.cleanedText).toBe("Write one conclusion based on the data.");

    const structural = inferStructuralCognition(problems[1]!);
    expect(structural.bloom?.apply).toBeGreaterThanOrEqual(0);
    expect(structural.multiStep).toBeGreaterThanOrEqual(0);
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

    expect(problems).toHaveLength(2);
    expect(problems.map((problem) => problem.problemId)).toEqual(["p1", "p1a"]);
    expect(problems[1]?.partText).toBe("State the trend.\nSupport your answer with one value.");
  });

  it("suppresses repeated header and footer noise before problem extraction", () => {
    const problems = extractProblems({
      fileName: "quiz.pdf",
      content: [
        "Chapter 9 Review Monday, April 11, 2022 10:57 AM",
        "1. Explain the null hypothesis.",
        "Page 1",
        "Chapter 9 Review Monday, April 11, 2022 10:57 AM",
        "2. Interpret the p-value.",
        "Page 2",
      ].join("\n"),
      pages: [
        { pageNumber: 1, text: "page 1" },
        { pageNumber: 2, text: "page 2" },
      ],
      paragraphs: [
        { text: "Chapter 9 Review Monday, April 11, 2022 10:57 AM", pageNumber: 1 },
        { text: "1. Explain the null hypothesis.", pageNumber: 1 },
        { text: "Page 1", pageNumber: 1 },
        { text: "Chapter 9 Review Monday, April 11, 2022 10:57 AM", pageNumber: 2 },
        { text: "2. Interpret the p-value.", pageNumber: 2 },
        { text: "Page 2", pageNumber: 2 },
      ],
      tables: [],
      readingOrder: [],
    });

    expect(problems.map((problem) => problem.problemId)).toEqual(["p1", "p2"]);
    expect(problems.map((problem) => problem.cleanedText)).toEqual([
      "Explain the null hypothesis.",
      "Interpret the p-value.",
    ]);
  });

  it("recognizes numeric-prefixed multipart labels without a separate normalization pass", () => {
    const problems = extractProblems({
      fileName: "quiz.pdf",
      content: [
        "2. Use the table to answer the questions.",
        "2a) State the trend.",
        "2b) Explain what the data suggests.",
      ].join("\n"),
      pages: [{ pageNumber: 1, text: "quiz" }],
      paragraphs: [
        { text: "2. Use the table to answer the questions.", pageNumber: 1 },
        { text: "2a) State the trend.", pageNumber: 1 },
        { text: "2b) Explain what the data suggests.", pageNumber: 1 },
      ],
      tables: [],
      readingOrder: [],
    });

    expect(problems.map((problem) => problem.problemId)).toEqual(["p2", "p2a", "p2b"]);
    expect(problems.map((problem) => problem.problemGroupId)).toEqual(["p2", "p2", "p2"]);
    expect(problems.map((problem) => problem.rootProblemId)).toEqual(["p2", "p2", "p2"]);
    expect(problems.map((problem) => problem.parentProblemId)).toEqual([null, "p2", "p2"]);
    expect(problems.map((problem) => problem.partIndex)).toEqual([0, 1, 2]);
    expect(problems.map((problem) => problem.teacherLabel)).toEqual(["2.", "a)", "b)"]);
    expect(problems[1]?.partText).toBe("State the trend.");
    expect(problems[2]?.partText).toBe("Explain what the data suggests.");
  });

  it("segments inline numeric-prefixed subparts embedded in a top-level block", () => {
    const problems = extractProblems({
      fileName: "quiz.pdf",
      content: "2. A researcher is studying a new treatment. 2a. Describe the design. 2b. Identify the variables. 2c. Explain random assignment. 2d. Predict the outcome.",
      pages: [{ pageNumber: 1, text: "quiz" }],
      paragraphs: [
        { text: "2. A researcher is studying a new treatment. 2a. Describe the design. 2b. Identify the variables. 2c. Explain random assignment. 2d. Predict the outcome.", pageNumber: 1 },
      ],
      tables: [],
      readingOrder: [],
    });

    expect(problems.map((problem) => problem.problemId)).toEqual(["p2", "p2a", "p2b", "p2c", "p2d"]);
    expect(problems.map((problem) => problem.teacherLabel)).toEqual(["2.", "a)", "b)", "c)", "d)"]);
    expect(problems[0]?.stemText).toBe("A researcher is studying a new treatment.");
    expect(problems[1]?.partText).toBe("Describe the design.");
    expect(problems[2]?.partText).toBe("Identify the variables.");
    expect(problems[3]?.partText).toBe("Explain random assignment.");
    expect(problems[4]?.partText).toBe("Predict the outcome.");
  });

  it("segments inline numeric-prefixed subparts in a continuation block after the parent", () => {
    const problems = extractProblems({
      fileName: "quiz.pdf",
      content: [
        "9. Put the bill-ordering steps in sequence.",
        "9a. Committee review 9b. Presidential signature 9c. Floor debate 9d. Introduction in Congress",
      ].join("\n"),
      pages: [{ pageNumber: 1, text: "quiz" }],
      paragraphs: [
        { text: "9. Put the bill-ordering steps in sequence.", pageNumber: 1 },
        { text: "9a. Committee review 9b. Presidential signature 9c. Floor debate 9d. Introduction in Congress", pageNumber: 1 },
      ],
      tables: [],
      readingOrder: [],
    });

    expect(problems.map((problem) => problem.problemId)).toEqual(["p9", "p9a", "p9b", "p9c", "p9d"]);
    expect(problems.map((problem) => problem.teacherLabel)).toEqual(["9.", "a)", "b)", "c)", "d)"]);
    expect(problems[1]?.partText).toBe("Committee review");
    expect(problems[2]?.partText).toBe("Presidential signature");
    expect(problems[3]?.partText).toBe("Floor debate");
    expect(problems[4]?.partText).toBe("Introduction in Congress");
  });
});