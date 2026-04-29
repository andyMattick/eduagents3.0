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

function difficultyLabel(score: number): ExtractedProblem["complexityBand"] {
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

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function bloomLevelFromScores(scores: Record<string, number> | undefined): number {
	const safe = scores ?? {};
	const ladder: Array<{ key: string; level: number }> = [
		{ key: "create", level: 6 },
		{ key: "evaluate", level: 5 },
		{ key: "analyze", level: 4 },
		{ key: "apply", level: 3 },
		{ key: "understand", level: 2 },
		{ key: "remember", level: 1 },
	];

	for (const entry of ladder) {
		if ((safe[entry.key] ?? 0) > 0) {
			return entry.level;
		}
	}

	return 2;
}

function representationLoadFromLabel(label: string | undefined): number {
	const value = (label ?? "paragraph").toLowerCase();
	if (value === "paragraph") {
		return 0.25;
	}
	if (value === "equation" || value === "table") {
		return 0.55;
	}
	if (value === "graph" || value === "diagram" || value === "experiment") {
		return 0.75;
	}
	if (value === "map" || value === "timeline" || value === "primarysource") {
		return 0.65;
	}
	return 0.5;
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
		const bloomScores = bloom[problem.problemId] ?? {};
		const representation = representations[problem.problemId] ?? "paragraph";
		const linguisticLoad = clamp01(linguistic.linguisticLoad[problem.problemId] ?? 0.5);
		const representationLoad = clamp01(representationLoadFromLabel(representation));
		const cognitiveLoad = clamp01((problem.multiStep * 0.5) + (problem.abstractionLevel * 0.3) + (representationLoad * 0.2));
		const bloomLevel = bloomLevelFromScores(bloomScores);
		const difficultyScore = Math.max(problem.multiStep, problem.abstractionLevel, linguisticLoad);

		return {
			id: problem.problemId,
			documentId: args.document.id,
			problemGroupId: problem.problemGroupId,
			anchors: problemAnchors,
			text: problem.cleanedText ?? problem.rawText,
			extractionMode,
			sourceSpan: problem.sourceSpan,
			concepts: Object.keys(concepts[problem.problemId] ?? {}),
			representations: [representation],
			complexityBand: difficultyLabel(difficultyScore),
			misconceptions: Object.keys(misconceptions[problem.problemId] ?? {}),
			cognitiveDemand: cognitiveDemandLabel(problem.cleanedText ?? problem.rawText, bloomScores),
			bloomLevel,
			cognitiveLoad,
			linguisticLoad,
			representationLoad,
		};
	});

	return { extractedProblems, sourceProblems: problems };
}
