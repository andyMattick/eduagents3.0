import type { AssessmentDocument } from "../../prism-v4/schema/domain/Preparedness";

function collapseRepeatedHalf(text: string): string {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (normalized.length < 40 || normalized.length % 2 !== 0) {
		return normalized;
	}

	const midpoint = normalized.length / 2;
	const left = normalized.slice(0, midpoint).trim();
	const right = normalized.slice(midpoint).trim();
	if (left && right && left.toLowerCase() === right.toLowerCase()) {
		return left;
	}

	return normalized;
}

function dedupeAdjacentSentences(text: string): string {
	const parts = text
		.split(/(?<=[.!?])\s+/)
		.map((part) => part.trim())
		.filter(Boolean);

	const deduped: string[] = [];
	for (const part of parts) {
		const previous = deduped[deduped.length - 1];
		if (previous && previous.toLowerCase() === part.toLowerCase()) {
			continue;
		}
		deduped.push(part);
	}

	return deduped.join(" ");
}

function normalizeAssessmentDisplayText(text: string): string {
	return dedupeAdjacentSentences(collapseRepeatedHalf(text));
}

function normalizeAssessmentParagraphs(rawText: string): string[] {
	return rawText
		.split(/\n{2,}|\r\n{2,}/)
		.map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
		.filter(Boolean);
}

function parseAssessmentItemsFromParagraphs(paragraphs: string[]): AssessmentDocument["items"] {
	if (paragraphs.length === 0) {
		return [];
	}

	const items: Array<{ itemNumber: number; text: string }> = [];
	let current: string[] = [];

	const pushCurrent = () => {
		const text = current.join(" ").replace(/\s+/g, " ").trim();
		if (text) {
			items.push({ itemNumber: items.length + 1, text });
		}
		current = [];
	};

	for (const paragraph of paragraphs) {
		const value = paragraph.trim();
		if (!value) {
			continue;
		}

		const isQuestionStart = /^\d{1,2}[.)]\s+/.test(value);
		const isSubpart = /^\d{1,2}[a-zA-Z][.)]?\s+/.test(value);
		const isChoice = /^[(]?[a-eA-E][.)]\s+/.test(value);
		const isDataRow = /^\d+\s+(\d+(?:\.\d+)?\s+){2,}/.test(value);

		if (isQuestionStart && !isDataRow) {
			pushCurrent();
			current.push(value.replace(/^\d{1,2}[.)]\s+/, ""));
			continue;
		}

		if (isSubpart || isChoice || isDataRow) {
			current.push(value);
			continue;
		}

		if (current.length > 0) {
			current.push(value);
		}
	}

	pushCurrent();

	return items
		.map((item, index) => ({
			itemNumber: index + 1,
			text: normalizeAssessmentDisplayText(item.text),
		}))
		.filter((item) => item.text.length > 0);
}

export function buildPreparednessAssessmentItems(rawText: string): AssessmentDocument["items"] {
	const paragraphs = normalizeAssessmentParagraphs(rawText);
	const paragraphItems = parseAssessmentItemsFromParagraphs(paragraphs);
	if (paragraphItems.length > 0) {
		return paragraphItems;
	}

	const lines = rawText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	const grouped = new Map<number, string[]>();
	let currentItem: number | null = null;

	for (const line of lines) {
		const numbered = line.match(/^(\d{1,2})[.)]\s+(.*)$/);
		if (numbered) {
			currentItem = Number(numbered[1]);
			const text = numbered[2]?.trim() ?? "";
			if (!grouped.has(currentItem)) {
				grouped.set(currentItem, []);
			}
			if (text) {
				grouped.get(currentItem)?.push(text);
			}
			continue;
		}

		if (currentItem !== null) {
			grouped.get(currentItem)?.push(line);
		}
	}

	if (grouped.size === 0) {
		return [];
	}

	return Array.from(grouped.entries())
		.sort(([left], [right]) => left - right)
		.map(([_, chunks], index) => ({
			itemNumber: index + 1,
			text: normalizeAssessmentDisplayText(chunks.join(" ").trim()),
		}))
		.filter((item) => item.text.length > 0);
}