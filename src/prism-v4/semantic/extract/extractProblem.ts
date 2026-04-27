import type { Problem } from "../../schema/domain";
import type { AzureExtractResult } from "../../schema/semantic";
import { classifyParagraphBlocks } from "./classifyParagraphBlocks";
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
	lastPageNumber: number;
	stemLines: string[];
	parts: ProblemPartDraft[];
}

interface TopLevelMatch {
	problemNumber: number;
	body: string;
}

interface SubpartMatch {
	problemNumber?: number;
	partLabel: string;
	body: string;
}

interface InlineSubpartParseResult {
	leadingText?: string;
	parts: ProblemPartDraft[];
}

const INLINE_SUBPART_BOUNDARY = /\s+(?=(?:\d+[a-z][.)]|\([a-z]\)|[a-z][.)]|\d+[a-z])\s+)/i;

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
	const match = text.match(/^(?:(\d+)([a-z])[.)]|\(([a-z])\)|([a-z])[.)]|(\d+)([a-z]))\s+(.*)$/);
	if (!match) {
		return null;
	}

	const numberedProblem = match[1] ?? match[5];
	const partLabel = (match[2] ?? match[3] ?? match[4] ?? match[6] ?? "").toLowerCase();
	if (!partLabel) {
		return null;
	}

	return {
		problemNumber: numberedProblem ? Number(numberedProblem) : undefined,
		partLabel,
		body: normalizeWhitespace(match[7] ?? ""),
	};
}

function alphabetIndex(partLabel: string) {
	const normalized = partLabel.trim().toLowerCase();
	if (!/^[a-z]$/.test(normalized)) {
		return 0;
	}

	return normalized.charCodeAt(0) - 96;
}

function toProblemPartDraft(subpart: SubpartMatch, pageNumber: number): ProblemPartDraft {
	return {
		partLabel: subpart.partLabel,
		partIndex: alphabetIndex(subpart.partLabel),
		teacherLabel: `${subpart.partLabel})`,
		pageNumber,
		textLines: subpart.body ? [subpart.body] : [],
	};
}

function splitInlineSubparts(text: string, pageNumber: number): InlineSubpartParseResult | null {
	const segments = text
		.split(INLINE_SUBPART_BOUNDARY)
		.map((segment) => normalizeWhitespace(segment))
		.filter((segment) => segment.length > 0);

	if (segments.length <= 1) {
		return null;
	}

	const result: InlineSubpartParseResult = { parts: [] };

	for (const segment of segments) {
		const subpart = matchSubpart(segment);
		if (subpart) {
			result.parts.push(toProblemPartDraft(subpart, pageNumber));
			continue;
		}

		if (result.parts.length === 0) {
			result.leadingText = result.leadingText ? `${result.leadingText}\n${segment}` : segment;
			continue;
		}

		result.parts[result.parts.length - 1]!.textLines.push(segment);
	}

	return result.parts.length > 0 ? result : null;
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
	sourceSpan: {
		firstPage: number;
		lastPage: number;
	};
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
		sourceSpan: params.sourceSpan,
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
		sourceSpan: { firstPage: group.pageNumber, lastPage: group.lastPageNumber },
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
			sourceSpan: { firstPage: group.pageNumber, lastPage: group.lastPageNumber },
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
		sourceSpan: { firstPage: sourcePageNumber, lastPage: sourcePageNumber },
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
			const inlineSubparts = splitInlineSubparts(topLevel.body, block.pageNumber);
			currentGroup = {
				problemNumber: topLevel.problemNumber,
				rootProblemId: `p${topLevel.problemNumber}`,
				teacherLabel: `${topLevel.problemNumber}.`,
				pageNumber: block.pageNumber,
				lastPageNumber: block.pageNumber,
				stemLines: inlineSubparts?.leadingText ? [inlineSubparts.leadingText] : topLevel.body ? [topLevel.body] : [],
				parts: inlineSubparts?.parts ?? [],
			};
			groups.push(currentGroup);
			currentPart = currentGroup.parts[currentGroup.parts.length - 1] ?? null;
			continue;
		}

		if (!currentGroup) {
			if (looksLikeHeader(block.text, block.role)) {
				continue;
			}
			continue;
		}

		currentGroup.lastPageNumber = Math.max(currentGroup.lastPageNumber, block.pageNumber);

		const inlineSubparts = splitInlineSubparts(block.text, block.pageNumber);
		if (inlineSubparts) {
			if (inlineSubparts.leadingText) {
				if (currentPart) {
					currentPart.textLines.push(inlineSubparts.leadingText);
				} else {
					currentGroup.stemLines.push(inlineSubparts.leadingText);
				}
			}

			currentGroup.parts.push(...inlineSubparts.parts);
			currentPart = currentGroup.parts[currentGroup.parts.length - 1] ?? currentPart;
			continue;
		}

		const subpart = matchSubpart(block.text);
		if (subpart) {
			if (subpart.problemNumber && subpart.problemNumber !== currentGroup.problemNumber) {
				currentPart = null;
				currentGroup = {
					problemNumber: subpart.problemNumber,
					rootProblemId: `p${subpart.problemNumber}`,
					teacherLabel: `${subpart.problemNumber}.`,
					pageNumber: block.pageNumber,
					lastPageNumber: block.pageNumber,
					stemLines: [],
					parts: [],
				};
				groups.push(currentGroup);
			}

			currentPart = toProblemPartDraft(subpart, block.pageNumber);
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
	const blocks = classifyParagraphBlocks(azureExtract)
		.filter((paragraph) => !paragraph.isSuppressed)
		.map((paragraph) => ({
			text: paragraph.text,
			pageNumber: paragraph.pageNumber,
			role: paragraph.role,
		}));

	const fallbackText = normalizeWhitespace(blocks.map((block) => block.text).join("\n") || azureExtract.content);
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

