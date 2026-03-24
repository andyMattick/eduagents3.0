import type { Problem } from "../../schema/domain";
import type { AzureExtractResult } from "../../schema/semantic";
import { normalizeWhitespace } from "../utils/textUtils";

interface ParagraphBlock {
	text: string;
	pageNumber: number;
	role?: string;
}

interface ProblemPartDraft {
	partLabel: string;
	partIndex: number;
	teacherLabel: string;
	pageNumber: number;
	textLines: string[];
}

interface ProblemGroupDraft {
	problemNumber: number;
	rootProblemId: string;
	teacherLabel: string;
	pageNumber: number;
	stemLines: string[];
	parts: ProblemPartDraft[];
}

interface TopLevelMatch {
	problemNumber: number;
	body: string;
}

interface SubpartMatch {
	partLabel: string;
	body: string;
}

function looksLikeProblemBoundary(text: string) {
	return /^(?:\d+[.)\]]|q\s*\d+[.)\]]|question\s*\d+[:.]|[A-Z][.)])\s+/i.test(text);
}

function matchTopLevelProblem(text: string): TopLevelMatch | null {
	const match = text.match(/^(?:problem\s+)?(\d+)(?:\s*[:.)-])?(?:\s+(.*))?$/i);
	if (!match) {
		return null;
	}

	return {
		problemNumber: Number(match[1]),
		body: normalizeWhitespace(match[2] ?? ""),
	};
}

function matchSubpart(text: string): SubpartMatch | null {
	const match = text.match(/^(?:\(([a-z])\)|([a-z])[.)])\s+(.*)$/);
	if (!match) {
		return null;
	}

	const partLabel = (match[1] ?? match[2] ?? "").toLowerCase();
	if (!partLabel) {
		return null;
	}

	return {
		partLabel,
		body: normalizeWhitespace(match[3] ?? ""),
	};
}

function alphabetIndex(partLabel: string) {
	const normalized = partLabel.trim().toLowerCase();
	if (!/^[a-z]$/.test(normalized)) {
		return 0;
	}

	return normalized.charCodeAt(0) - 96;
}

function looksLikeHeader(text: string, role?: string) {
	if (role === "title") {
		return true;
	}

	const normalized = normalizeWhitespace(text);
	if (!normalized || normalized.length > 90 || /[.!?]$/.test(normalized)) {
		return false;
	}

	if (/^(?:name|date|teacher|class|period|directions)\b/i.test(normalized)) {
		return true;
	}

	const words = normalized.split(/\s+/);
	return words.length > 1 && words.length <= 12 && !/^\d/.test(normalized);
}

function createProblem(params: {
	problemId: string;
	rootProblemId: string;
	parentProblemId?: string | null;
	problemNumber: number;
	partIndex: number;
	partLabel?: string;
	teacherLabel: string;
	stemText: string;
	partText?: string;
	rawText: string;
	cleanedText: string;
	fileName: string;
	sourcePageNumber: number;
	displayOrder: number;
}): Problem {
	const createdAt = new Date().toISOString();
	const localProblemId = params.problemId;
	const problemGroupId = params.rootProblemId;

	return {
		problemId: params.problemId,
		localProblemId,
		problemGroupId,
		canonicalProblemId: undefined,
		rootProblemId: params.rootProblemId,
		parentProblemId: params.parentProblemId,
		problemNumber: params.problemNumber,
		partIndex: params.partIndex,
		partLabel: params.partLabel,
		teacherLabel: params.teacherLabel,
		stemText: params.stemText,
		partText: params.partText,
		displayOrder: params.displayOrder,
		createdAt,
		rawText: params.rawText,
		cleanedText: params.cleanedText,
		mediaUrls: extractMediaUrls(params.rawText),
		sourceType: "document",
		sourceDocumentId: params.fileName,
		sourcePageNumber: params.sourcePageNumber,
	};
}

function extractMediaUrls(text: string) {
	const urls = text.match(/https?:\/\/\S+/g) ?? [];
	const figureRefs = [...text.matchAll(/\b(?:figure|image|diagram|graph|table)\s+\d+/gi)].map((match) => match[0]);
	return [...new Set([...urls, ...figureRefs])];
}

function buildProblemGroupProblems(group: ProblemGroupDraft, fileName: string): Problem[] {
	const stemText = normalizeWhitespace(group.stemLines.join("\n"));
	const rootDisplayOrder = group.problemNumber * 1000;
	const rootProblem = createProblem({
		problemId: group.rootProblemId,
		rootProblemId: group.rootProblemId,
		parentProblemId: null,
		problemNumber: group.problemNumber,
		partIndex: 0,
		teacherLabel: group.teacherLabel,
		stemText,
		rawText: `${group.teacherLabel} ${stemText}`.trim(),
		cleanedText: stemText,
		fileName,
		sourcePageNumber: group.pageNumber,
		displayOrder: rootDisplayOrder,
	});

	if (group.parts.length === 0) {
		return [rootProblem];
	}

	return [
		rootProblem,
		...group.parts.map((part) => {
		const partText = normalizeWhitespace(part.textLines.join("\n"));
		const rawText = [
			`${group.teacherLabel} ${stemText}`.trim(),
			`${part.teacherLabel} ${partText}`.trim(),
		].filter(Boolean).join("\n");
		const cleanedText = [stemText, partText].filter(Boolean).join("\n");

		return createProblem({
			problemId: `${group.rootProblemId}${part.partLabel}`,
			rootProblemId: group.rootProblemId,
			parentProblemId: group.rootProblemId,
			problemNumber: group.problemNumber,
			partIndex: part.partIndex,
			partLabel: part.partLabel,
			teacherLabel: part.teacherLabel,
			stemText,
			partText,
			rawText,
			cleanedText,
			fileName,
			sourcePageNumber: part.pageNumber,
			displayOrder: group.problemNumber * 1000 + part.partIndex * 100,
		});
		}),
	];
}

function buildLegacyProblem(rawText: string, cleanedText: string, fileName: string, sourcePageNumber: number): Problem {
	const problemId = `p${sourcePageNumber}-${Math.abs(cleanedText.length)}`;
	const createdAt = new Date().toISOString();

	return {
		problemId,
		localProblemId: problemId,
		problemGroupId: problemId,
		canonicalProblemId: undefined,
		rootProblemId: undefined,
		parentProblemId: null,
		problemNumber: undefined,
		partIndex: 0,
		partLabel: undefined,
		teacherLabel: undefined,
		stemText: undefined,
		partText: undefined,
		displayOrder: undefined,
		createdAt,
		rawText,
		cleanedText,
		mediaUrls: extractMediaUrls(rawText),
		sourceType: "document",
		sourceDocumentId: fileName,
		sourcePageNumber,
	};
}

function extractHierarchicalProblems(blocks: ParagraphBlock[], fileName: string): Problem[] {
	const groups: ProblemGroupDraft[] = [];
	let currentGroup: ProblemGroupDraft | null = null;
	let currentPart: ProblemPartDraft | null = null;
	let foundTopLevelProblem = false;

	for (const block of blocks) {
		const topLevel = matchTopLevelProblem(block.text);
		if (topLevel) {
			foundTopLevelProblem = true;
			currentPart = null;
			currentGroup = {
				problemNumber: topLevel.problemNumber,
				rootProblemId: `p${topLevel.problemNumber}`,
				teacherLabel: `${topLevel.problemNumber}.`,
				pageNumber: block.pageNumber,
				stemLines: topLevel.body ? [topLevel.body] : [],
				parts: [],
			};
			groups.push(currentGroup);
			continue;
		}

		if (!currentGroup) {
			if (looksLikeHeader(block.text, block.role)) {
				continue;
			}
			continue;
		}

		const subpart = matchSubpart(block.text);
		if (subpart) {
			currentPart = {
				partLabel: subpart.partLabel,
				partIndex: alphabetIndex(subpart.partLabel),
				teacherLabel: `${subpart.partLabel})`,
				pageNumber: block.pageNumber,
				textLines: subpart.body ? [subpart.body] : [],
			};
			currentGroup.parts.push(currentPart);
			continue;
		}

		if (currentPart) {
			currentPart.textLines.push(block.text);
		} else {
			currentGroup.stemLines.push(block.text);
		}
	}

	if (!foundTopLevelProblem) {
		return [];
	}

	return groups.flatMap((group) => buildProblemGroupProblems(group, fileName));
}

function extractLegacyProblems(blocks: ParagraphBlock[], azureExtract: AzureExtractResult): Problem[] {
	const problems: Problem[] = [];
	let currentLines: string[] = [];
	let currentPageNumber = blocks[0]?.pageNumber ?? 1;

	for (const block of blocks) {
		const isBoundary = block.role === "title" ? false : looksLikeProblemBoundary(block.text);

		if (isBoundary && currentLines.length > 0) {
			const rawText = currentLines.join("\n");
			problems.push(buildLegacyProblem(rawText, normalizeWhitespace(rawText), azureExtract.fileName, currentPageNumber));
			currentLines = [];
		}

		if (currentLines.length === 0) {
			currentPageNumber = block.pageNumber;
		}

		currentLines.push(block.text);
	}

	if (currentLines.length > 0) {
		const rawText = currentLines.join("\n");
		problems.push(buildLegacyProblem(rawText, normalizeWhitespace(rawText), azureExtract.fileName, currentPageNumber));
	}

	return problems;
}

export function extractProblems(azureExtract: AzureExtractResult): Problem[] {
	const blocks = (azureExtract.paragraphs ?? [])
		.map((paragraph) => ({
			text: normalizeWhitespace(paragraph.text),
			pageNumber: paragraph.pageNumber,
			role: paragraph.role,
		}))
		.filter((paragraph) => paragraph.text.length > 0);

	const fallbackText = normalizeWhitespace(azureExtract.content);
	if (blocks.length === 0) {
		return fallbackText.length > 0
			? [buildLegacyProblem(azureExtract.content, fallbackText, azureExtract.fileName, 1)]
			: [];
	}

	const hierarchicalProblems = extractHierarchicalProblems(blocks, azureExtract.fileName);
	const problems = hierarchicalProblems.length > 0 ? hierarchicalProblems : extractLegacyProblems(blocks, azureExtract);

	if (problems.length === 0 && fallbackText.length > 0) {
		return [buildLegacyProblem(azureExtract.content, fallbackText, azureExtract.fileName, 1)];
	}

	return problems;
}

