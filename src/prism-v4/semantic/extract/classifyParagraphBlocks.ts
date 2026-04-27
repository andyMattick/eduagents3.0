import type { AzureExtractResult } from "../../schema/semantic";
import { normalizeWhitespace } from "../utils/textUtils";

export type StructuralBlockRole = "content" | "header" | "footer" | "noise";

export interface ClassifiedParagraphBlock {
	text: string;
	pageNumber: number;
	role?: string;
	structuralRole: StructuralBlockRole;
	isSuppressed: boolean;
	semanticDensity: number;
	signature: string;
}

const DATE_OR_TIME_PATTERN = /\b(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi;
const PAGE_PATTERN = /^\s*(?:page\s+)?\d+(?:\s+of\s+\d+)?\s*$/i;
const METADATA_PATTERN = /^(?:name|date|teacher|class|period|student)\b/i;
const STOPWORDS = new Set(["the", "and", "for", "with", "that", "from", "this", "your", "into", "page"]);

function buildSignature(text: string) {
	return normalizeWhitespace(
		text
			.toLowerCase()
			.replace(DATE_OR_TIME_PATTERN, " ")
			.replace(/\d+/g, " ")
			.replace(/[^a-z\s]+/g, " "),
	);
}

function computeSemanticDensity(text: string) {
	const tokens = (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((token) => token.length > 0);
	if (tokens.length === 0) {
		return 0;
	}

	const meaningfulTokens = tokens.filter((token) => token.length > 2 && !STOPWORDS.has(token));
	return meaningfulTokens.length / tokens.length;
}

function looksLikeHeading(text: string, role?: string) {
	if (role === "title" || role === "sectionHeading") {
		return true;
	}

	if (/[.!?]$/.test(text) || text.length > 90) {
		return false;
	}

	const words = text.split(/\s+/).filter(Boolean);
	return words.length > 0 && words.length <= 10;
}

function classifyBlock(args: {
	text: string;
	role?: string;
	semanticDensity: number;
	isRepeated: boolean;
	signature: string;
}) {
	const { text, role, semanticDensity, isRepeated, signature } = args;

	if (!text) {
		return { structuralRole: "noise" as const, isSuppressed: true };
	}

	if (PAGE_PATTERN.test(text) || DATE_OR_TIME_PATTERN.test(text) || signature.length === 0) {
		return { structuralRole: "footer" as const, isSuppressed: true };
	}

	if (METADATA_PATTERN.test(text)) {
		return { structuralRole: "noise" as const, isSuppressed: true };
	}

	if (isRepeated && looksLikeHeading(text, role)) {
		return { structuralRole: "header" as const, isSuppressed: true };
	}

	if (isRepeated && semanticDensity < 0.5) {
		return { structuralRole: "footer" as const, isSuppressed: true };
	}

	if (semanticDensity < 0.26) {
		return { structuralRole: "noise" as const, isSuppressed: true };
	}

	return { structuralRole: "content" as const, isSuppressed: false };
}

export function classifyParagraphBlocks(azureExtract: AzureExtractResult): ClassifiedParagraphBlock[] {
	const baseBlocks = (azureExtract.paragraphs ?? [])
		.map((paragraph) => ({
			text: normalizeWhitespace(paragraph.text),
			pageNumber: paragraph.pageNumber,
			role: paragraph.role,
		}))
		.filter((paragraph) => paragraph.text.length > 0);

	const signaturePages = new Map<string, Set<number>>();
	for (const block of baseBlocks) {
		const signature = buildSignature(block.text);
		if (!signaturePages.has(signature)) {
			signaturePages.set(signature, new Set());
		}
		signaturePages.get(signature)!.add(block.pageNumber);
	}

	return baseBlocks.map((block) => {
		const signature = buildSignature(block.text);
		const semanticDensity = computeSemanticDensity(block.text);
		const isRepeated = signature.length > 0 && (signaturePages.get(signature)?.size ?? 0) > 1;
		const classification = classifyBlock({
			text: block.text,
			role: block.role,
			semanticDensity,
			isRepeated,
			signature,
		});

		return {
			...block,
			signature,
			semanticDensity: Number(semanticDensity.toFixed(2)),
			structuralRole: classification.structuralRole,
			isSuppressed: classification.isSuppressed,
		};
	});
}