import type { Problem } from "../../schema/domain";

const PARENT_LABEL = /^(\d+)\.\s*$/;
const CHILD_LABEL = /^(\d+)\s*([a-z])\)?\s*$/;

function letterIndex(letter: string) {
	return letter.toLowerCase().charCodeAt(0) - 96;
}

function preserveExistingStructure(problem: Problem) {
	if (typeof problem.partIndex === "number" && problem.partIndex > 0) {
		return true;
	}

	return Boolean(problem.parentProblemId || problem.rootProblemId || problem.problemGroupId);
}

export function detectMultipart(problems: Problem[]): Problem[] {
	const parentsByNumber: Record<string, Problem> = {};

	for (const problem of problems) {
		if (typeof problem.problemNumber === "number" && (problem.partIndex ?? 0) === 0) {
			parentsByNumber[String(problem.problemNumber)] = problem;
		}
	}

	for (const problem of problems) {
		const label = (problem.teacherLabel ?? "").trim();

		const parentMatch = label.match(PARENT_LABEL);
		if (parentMatch) {
			const num = parentMatch[1];
			parentsByNumber[num] = problem;
			problem.partIndex = 0;
			problem.parentProblemId = null;
			problem.problemGroupId = problem.problemId;
			problem.rootProblemId = problem.problemId;
			continue;
		}

		const childMatch = label.match(CHILD_LABEL);
		if (childMatch) {
			const num = childMatch[1];
			const letter = childMatch[2];
			const parent = parentsByNumber[num];

			if (parent) {
				problem.partIndex = letterIndex(letter);
				problem.parentProblemId = parent.problemId;
				problem.problemGroupId = parent.problemGroupId ?? parent.problemId;
				problem.rootProblemId = parent.rootProblemId ?? parent.problemId;
				continue;
			}
		}

		if (preserveExistingStructure(problem)) {
			continue;
		}

		problem.partIndex = 0;
		problem.parentProblemId = null;
		problem.problemGroupId = problem.problemId;
		problem.rootProblemId = problem.problemId;
	}

	return problems;
}