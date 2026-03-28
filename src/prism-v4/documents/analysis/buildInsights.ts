import type { DocumentInsights, ExtractedProblem, FragmentSemanticRecord } from "../../schema/semantic";

export function buildAnalyzedDocumentInsights(args: {
	fragments: FragmentSemanticRecord[];
	problems: ExtractedProblem[];
}): DocumentInsights {
	const conceptFrequencies: Record<string, number> = {};
	const representations = new Set<string>();
	const misconceptionThemes = new Set<string>();
	const difficultyDistribution: DocumentInsights["difficultyDistribution"] = {
		low: 0,
		medium: 0,
		high: 0,
	};

	for (const problem of args.problems) {
		for (const concept of problem.concepts) {
			conceptFrequencies[concept] = (conceptFrequencies[concept] ?? 0) + 1;
		}
		for (const representation of problem.representations) {
			representations.add(representation);
		}
		for (const misconception of problem.misconceptions) {
			misconceptionThemes.add(misconception);
		}
		difficultyDistribution[problem.difficulty] += 1;
	}

	for (const fragment of args.fragments) {
		representations.add(fragment.contentType);
		for (const concept of fragment.prerequisiteConcepts ?? []) {
			conceptFrequencies[concept] = (conceptFrequencies[concept] ?? 0) + 1;
		}
		for (const misconception of fragment.misconceptionTriggers ?? []) {
			misconceptionThemes.add(misconception);
		}
	}

	const instructionalCount = args.fragments.filter((fragment) => fragment.isInstructional).length;
	return {
		concepts: Object.keys(conceptFrequencies),
		conceptFrequencies,
		representations: [...representations],
		difficultyDistribution,
		misconceptionThemes: [...misconceptionThemes],
		instructionalDensity: args.fragments.length === 0 ? 0 : Number((instructionalCount / args.fragments.length).toFixed(2)),
		problemCount: args.problems.length,
		exampleCount: args.fragments.filter((fragment) => fragment.instructionalRole === "example").length,
		explanationCount: args.fragments.filter((fragment) => fragment.instructionalRole === "explanation").length,
	};
}
