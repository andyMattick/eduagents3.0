import type { Problem } from "../../schema/domain";
import type { AzureExtractResult, CanonicalDocument, ExtractedProblem, FragmentSemanticRecord } from "../../schema/semantic";
import { extractProblems } from "../../semantic/extract/extractProblem";
import { extractProblemMetadata } from "../../semantic/extract/extractProblemMetadata";
import { tagBloom } from "../../semantic/tag/tagBloom";
import { tagConcepts } from "../../semantic/tag/tagConcepts";
import { tagLinguisticLoad } from "../../semantic/tag/tagLinguisticLoad";
import { tagMisconceptionTriggers } from "../../semantic/tag/tagMisconceptionTriggers";
import { tagRepresentation } from "../../semantic/tag/tagRepresentation";
import { normalizeWhitespace } from "../../semantic/utils/textUtils";

function anchorsForProblem(problem: Problem, document: CanonicalDocument) {
	const targetText = normalizeWhitespace(problem.cleanedText ?? problem.rawText);
	const matchingNodes = document.nodes.filter((node) => {
		const nodeText = node.normalizedText ?? normalizeWhitespace(node.text ?? "");
		return nodeText.length > 0 && (targetText.includes(nodeText) || nodeText.includes(targetText));
	});

	if (matchingNodes.length > 0) {
		return matchingNodes.map((node) => ({
			documentId: document.id,
			surfaceId: node.surfaceId,
			nodeId: node.id,
		}));
	}

	const instructionalNode = document.nodes.find((node) => {
		const nodeText = node.normalizedText ?? "";
		return nodeText.length > 0 && targetText.toLowerCase().includes(nodeText.toLowerCase().slice(0, Math.min(nodeText.length, 20)));
	});

	return instructionalNode
		? [{ documentId: document.id, surfaceId: instructionalNode.surfaceId, nodeId: instructionalNode.id }]
		: [];
}

function difficultyLabel(score: number): ExtractedProblem["difficulty"] {
	if (score >= 0.67) {
		return "high";
	}
	if (score >= 0.34) {
		return "medium";
	}
	return "low";
}

function cognitiveDemandLabel(problemText: string, bloomScores: Record<string, number>): ExtractedProblem["cognitiveDemand"] {
	const lower = problemText.toLowerCase();
	if (/\bmodel\b|\bdesign\b|\breal world\b/.test(lower)) {
		return "modeling";
	}
	if ((bloomScores.analyze ?? 0) >= 1 || (bloomScores.evaluate ?? 0) >= 1) {
		return "analysis";
	}
	if ((bloomScores.understand ?? 0) >= 1 || /\bexplain\b|\bwhy\b|\bjustify\b/.test(lower)) {
		return "conceptual";
	}
	if ((bloomScores.apply ?? 0) >= 1 || /\bsolve\b|\bcalculate\b|\bdetermine\b/.test(lower)) {
		return "procedural";
	}
	return "recall";
}

export function extractAnchoredProblems(args: {
	document: CanonicalDocument;
	fragments: FragmentSemanticRecord[];
	azureExtract: AzureExtractResult;
}) {
	const problems = extractProblems(args.azureExtract);
	const metadata = extractProblemMetadata(problems, {});
	const concepts = tagConcepts(metadata);
	const representations = tagRepresentation(metadata);
	const misconceptions = tagMisconceptionTriggers(metadata);
	const bloom = tagBloom(metadata);
	const linguistic = tagLinguisticLoad(metadata);

	const extractedProblems: ExtractedProblem[] = metadata.map((problem) => {
		const problemAnchors = anchorsForProblem(problem, args.document);
		const instructionalFragments = args.fragments.filter((fragment) => fragment.anchors.some((anchor) => problemAnchors.some((problemAnchor) => problemAnchor.nodeId === anchor.nodeId)));
		const extractionMode: ExtractedProblem["extractionMode"] = instructionalFragments.some((fragment) => fragment.instructionalRole === "example")
			? "inferred"
			: "authored";
		const difficultyScore = Math.max(problem.multiStep, problem.abstractionLevel, linguistic.linguisticLoad[problem.problemId] ?? 0);

		return {
			id: problem.problemId,
			documentId: args.document.id,
			anchors: problemAnchors,
			text: problem.cleanedText ?? problem.rawText,
			extractionMode,
			concepts: Object.keys(concepts[problem.problemId] ?? {}),
			representations: [representations[problem.problemId] ?? "paragraph"],
			difficulty: difficultyLabel(difficultyScore),
			misconceptions: Object.keys(misconceptions[problem.problemId] ?? {}),
			cognitiveDemand: cognitiveDemandLabel(problem.cleanedText ?? problem.rawText, bloom[problem.problemId] ?? {}),
		};
	});

	return { extractedProblems, sourceProblems: problems };
}
