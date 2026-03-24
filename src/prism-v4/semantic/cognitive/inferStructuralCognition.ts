import type { Problem } from "../../schema/domain";
import type { CognitiveProfile } from "../../schema/semantic";

export function inferStructuralCognition(problem: Problem): Partial<CognitiveProfile> {
	const isMultipart = problem.partIndex !== null && problem.partIndex !== undefined && problem.partIndex > 0;
	const multiStep = isMultipart ? 0.5 : 0.1;
	const representationCount = problem.tags?.representationCount ?? 1;
  const representationComplexity = representationCount > 1 ? 0.6 : 0.2;

	const bloom: CognitiveProfile["bloom"] = {
		remember: 0.1,
		understand: 0.2,
		apply: multiStep > 0.3 ? 0.3 : 0.1,
		analyze: multiStep > 0.3 ? 0.2 : 0.05,
		evaluate: 0.05,
		create: 0,
	};

	return {
		bloom,
		multiStep,
		representationComplexity,
	};
}