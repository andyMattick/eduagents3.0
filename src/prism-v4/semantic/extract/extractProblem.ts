import type { Problem } from "../../schema/domain";
import type { AzureExtractResult } from "../../schema/semantic";
import { normalizeWhitespace } from "../utils/textUtils";

let problemIdCounter = 0;

function nextProblemId() {
	problemIdCounter += 1;
	return `prob-${problemIdCounter}`;
}

function looksLikeProblemBoundary(text: string) {
	return /^(?:\d+[.)\]]|q\s*\d+[.)\]]|question\s*\d+[:.]|[A-Z][.)])\s+/i.test(text);
}

function extractMediaUrls(text: string) {
	const urls = text.match(/https?:\/\/\S+/g) ?? [];
	const figureRefs = [...text.matchAll(/\b(?:figure|image|diagram|graph|table)\s+\d+/gi)].map((match) => match[0]);
	return [...new Set([...urls, ...figureRefs])];
}

function buildProblem(
	rawText: string,
	cleanedText: string,
	fileName: string,
	sourcePageNumber: number,
): Problem {
	return {
		problemId: nextProblemId(),
		rawText,
		cleanedText,
		mediaUrls: extractMediaUrls(rawText),
		sourceType: "document",
		sourceDocumentId: fileName,
		sourcePageNumber,
	};
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
			? [buildProblem(azureExtract.content, fallbackText, azureExtract.fileName, 1)]
			: [];
	}

	const problems: Problem[] = [];
	let currentLines: string[] = [];
	let currentPageNumber = blocks[0]?.pageNumber ?? 1;

	for (const block of blocks) {
		const isBoundary = block.role === "title" ? false : looksLikeProblemBoundary(block.text);

		if (isBoundary && currentLines.length > 0) {
			const rawText = currentLines.join("\n");
			problems.push(buildProblem(rawText, normalizeWhitespace(rawText), azureExtract.fileName, currentPageNumber));
			currentLines = [];
		}

		if (currentLines.length === 0) {
			currentPageNumber = block.pageNumber;
		}

		currentLines.push(block.text);
	}

	if (currentLines.length > 0) {
		const rawText = currentLines.join("\n");
		problems.push(buildProblem(rawText, normalizeWhitespace(rawText), azureExtract.fileName, currentPageNumber));
	}

	if (problems.length === 0 && fallbackText.length > 0) {
		return [buildProblem(azureExtract.content, fallbackText, azureExtract.fileName, 1)];
	}

	return problems;
}

