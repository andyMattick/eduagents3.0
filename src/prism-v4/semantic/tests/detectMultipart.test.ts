import { describe, expect, it } from "vitest";

import type { Problem } from "../../schema/domain";
import { detectMultipart } from "../structure/detectMultipart";

function makeProblem(problemId: string, teacherLabel?: string): Problem {
	return {
		problemId,
		rawText: teacherLabel ?? problemId,
		cleanedText: teacherLabel ?? problemId,
		sourceType: "document",
		teacherLabel,
	};
}

describe("detectMultipart", () => {
	it("leaves standalone numbered problems as roots", () => {
		const problems = detectMultipart([
			makeProblem("p1", "1."),
			makeProblem("p2", "2."),
			makeProblem("p3", "3."),
		]);

		expect(problems.map((problem) => problem.partIndex)).toEqual([0, 0, 0]);
		expect(problems.map((problem) => problem.parentProblemId)).toEqual([null, null, null]);
	});

	it("normalizes numeric-prefixed multipart labels to the detected parent", () => {
		const problems = detectMultipart([
			makeProblem("p2", "2."),
			makeProblem("p2a", "2a)"),
			makeProblem("p2b", "2b)"),
			makeProblem("p3", "3."),
		]);

		expect(problems.map((problem) => problem.partIndex)).toEqual([0, 1, 2, 0]);
		expect(problems.map((problem) => problem.parentProblemId)).toEqual([null, "p2", "p2", null]);
		expect(problems.map((problem) => problem.rootProblemId)).toEqual(["p2", "p2", "p2", "p3"]);
	});

	it("preserves existing multipart structure and defaults malformed labels safely", () => {
		const child: Problem = {
			...makeProblem("p1a", "a)"),
			partIndex: 1,
			parentProblemId: "p1",
			problemGroupId: "p1",
			rootProblemId: "p1",
		};

		const problems = detectMultipart([
			{ ...makeProblem("p1", "1."), rootProblemId: "p1", problemGroupId: "p1", parentProblemId: null, partIndex: 0 },
			child,
			makeProblem("px", "malformed"),
		]);

		expect(problems[1]).toMatchObject({ partIndex: 1, parentProblemId: "p1", rootProblemId: "p1" });
		expect(problems[2]).toMatchObject({ partIndex: 0, parentProblemId: null, rootProblemId: "px", problemGroupId: "px" });
	});
});