import type { Problem } from "../../schema/domain";
import type { CognitiveProfile } from "../../schema/semantic";
import { clamp01 } from "../utils/heuristics";
import type { StructuralCognitionInput } from "./fuseCognition";

const DIRECTIVE_PATTERNS = [
	/\bsolve\b/gi,
	/\bexplain\b/gi,
	/\bjustify\b/gi,
	/\bcompare\b/gi,
	/\banalyze\b/gi,
	/\bshow\b/gi,
	/\bdescribe\b/gi,
	/\binterpret\b/gi,
	/\bevaluate\b/gi,
	/\bprove\b/gi,
	/\bcalculate\b/gi,
	/\bdetermine\b/gi,
];

function countDirectiveMatches(text: string) {
	return DIRECTIVE_PATTERNS.reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0);
}

function clampStepCount(value: number) {
	return Math.min(6, Math.max(1, value));
}

export interface StructuralInferenceContext {
	isMultipartParent?: boolean;
}

export function inferStructuralCognition(problem: Problem, context: StructuralInferenceContext = {}): StructuralCognitionInput {
	const isMultipartChild = problem.partIndex !== null && problem.partIndex !== undefined && problem.partIndex > 0;
	const isMultipartParent = context.isMultipartParent === true;
	const problemText = `${problem.stemText ?? ""}\n${problem.partText ?? ""}\n${problem.cleanedText ?? problem.rawText ?? ""}`;
	const directiveCount = countDirectiveMatches(problemText);
	const extractedSteps = Math.max(1, problem.tags?.steps ?? 1);
	const representationType = problem.tags?.representation ?? "paragraph";
	const representationCount = problem.tags?.representationCount ?? 1;
	const structuralStepEstimate = clampStepCount(
		1 + Math.max(0, extractedSteps - 1) * 0.6 + representationCount * 0.2 + (isMultipartParent ? 1 : 0),
	);
	const representationComplexity = clamp01(0.2 + Math.max(0, representationCount - 1) * 0.2);
	const constructedResponse = Boolean(problem.tags?.problemType.constructedResponse || problem.tags?.problemType.shortAnswer);
	const responseBoost = constructedResponse ? 0.06 : 0.02;
	const stepBoost = Math.min(0.28, Math.max(0, extractedSteps - 1) * 0.14);
	const directiveBoost = Math.min(0.2, Math.max(0, directiveCount - 1) * 0.1);
	const multipartBoost = isMultipartChild ? 0.08 : isMultipartParent ? 0.12 : 0;
	const representationTypeBoost = representationType === "paragraph"
		? 0
		: representationType === "equation"
			? 0.02
			: 0.04;
	const representationBoost = Math.min(0.12, Math.max(0, representationCount - 1) * 0.05 + representationTypeBoost);
	const multiStep = clamp01(0.08 + stepBoost + directiveBoost + multipartBoost + representationBoost + responseBoost);

	const bloom: CognitiveProfile["bloom"] = {
		remember: 0.1,
		understand: 0.2,
		apply: clamp01(0.08 + multiStep * 0.35),
		analyze: clamp01(0.04 + multiStep * 0.28),
		evaluate: 0.05,
		create: 0,
	};

	return {
		bloom,
		multiStep,
		representationComplexity,
		reasoning: {
			structuralStepEstimate,
			extractedSteps,
			representationCount,
			directiveCount,
			isMultipartParent,
			isMultipartChild,
		},
	};
}