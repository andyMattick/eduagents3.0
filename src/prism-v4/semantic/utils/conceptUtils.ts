import { normalizeWhitespace } from "./textUtils";

const DATE_OR_TIME_PATTERN = /\b(?:mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi;
const LEADING_TRAILING_PUNCTUATION = /^[^a-z0-9]+|[^a-z0-9]+$/gi;

const SCORE_WEIGHTS = {
	freqProblems: 0.55,
	freqPages: 0.35,
	semanticDensity: 0.6,
	multipartPresence: 0.45,
	crossDocumentRecurrence: 0.3,
} as const;

const NOISE_SCORE_THRESHOLD = 1.15;

export interface ScoredConceptMetadata {
	concept: string;
	aliases?: string[];
	freqProblems: number;
	freqPages: number;
	freqDocuments: number;
	semanticDensity: number;
	multipartPresence: number;
	crossDocumentRecurrence: number;
	score: number;
	isNoise: boolean;
}

export function normalizeConceptLabel(value: string) {
	const trimmed = normalizeWhitespace(value).toLowerCase();
	if (!trimmed) {
		return "";
	}

	const preserveTaxonomyId = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/i.test(trimmed);
	if (preserveTaxonomyId) {
		return trimmed;
	}

	return normalizeWhitespace(
		trimmed
			.replace(DATE_OR_TIME_PATTERN, " ")
			.replace(/[“”"'`]+/g, " ")
			.replace(/[^a-z0-9\s-]+/g, " ")
			.replace(LEADING_TRAILING_PUNCTUATION, " ")
			.replace(/\s+/g, " "),
	);
}

export function isLikelyNoiseConcept(value: string) {
	const normalized = normalizeConceptLabel(value);
	if (!normalized) {
		return true;
	}

	if (normalized.length < 3) {
		return true;
	}

	if (/^(?:name|date|teacher|class|period|page|review|unit|chapter)\b/.test(normalized)) {
		return true;
	}

	const alphaTokens = normalized.match(/[a-z]+/g) ?? [];
	return alphaTokens.length === 0;
}

function tokenizeConcept(value: string) {
	return normalizeConceptLabel(value)
		.split(/\s+/)
		.filter(Boolean);
}

function isTaxonomyConcept(value: string) {
	return /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/i.test(value.trim());
}

function levenshteinDistance(left: string, right: string) {
	if (left === right) {
		return 0;
	}

	if (!left.length) {
		return right.length;
	}

	if (!right.length) {
		return left.length;
	}

	const matrix = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0));

	for (let row = 0; row <= left.length; row += 1) {
		matrix[row]![0] = row;
	}

	for (let column = 0; column <= right.length; column += 1) {
		matrix[0]![column] = column;
	}

	for (let row = 1; row <= left.length; row += 1) {
		for (let column = 1; column <= right.length; column += 1) {
			const cost = left[row - 1] === right[column - 1] ? 0 : 1;
			matrix[row]![column] = Math.min(
				matrix[row - 1]![column]! + 1,
				matrix[row]![column - 1]! + 1,
				matrix[row - 1]![column - 1]! + cost,
			);
		}
	}

	return matrix[left.length]![right.length]!;
}

function tokenOverlapRatio(left: string, right: string) {
	const leftTokens = new Set(tokenizeConcept(left));
	const rightTokens = new Set(tokenizeConcept(right));
	if (leftTokens.size === 0 || rightTokens.size === 0) {
		return 0;
	}

	let overlap = 0;
	for (const token of leftTokens) {
		if (rightTokens.has(token)) {
			overlap += 1;
		}
	}

	return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function semanticDensityPenalty(value: string) {
	if (!isLikelyNoiseConcept(value)) {
		return 0;
	}

	if (/^(?:chapter|unit|page|review)\b/.test(normalizeConceptLabel(value))) {
		return 0.45;
	}

	return 0.25;
}

export function shouldMergeConceptLabels(left: string, right: string) {
	const normalizedLeft = normalizeConceptLabel(left);
	const normalizedRight = normalizeConceptLabel(right);

	if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) {
		return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
	}

	if (isTaxonomyConcept(normalizedLeft) || isTaxonomyConcept(normalizedRight)) {
		return false;
	}

	if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
		return tokenOverlapRatio(normalizedLeft, normalizedRight) >= 0.5;
	}

	const distance = levenshteinDistance(normalizedLeft, normalizedRight);
	const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
	const normalizedDistance = maxLength > 0 ? distance / maxLength : 1;

	return tokenOverlapRatio(normalizedLeft, normalizedRight) >= 0.75 || normalizedDistance <= 0.18;
}

export function chooseCanonicalConceptLabel(left: string, right: string) {
	const normalizedLeft = normalizeConceptLabel(left);
	const normalizedRight = normalizeConceptLabel(right);

	if (!normalizedLeft) {
		return normalizedRight;
	}

	if (!normalizedRight) {
		return normalizedLeft;
	}

	if (isTaxonomyConcept(normalizedLeft) || isTaxonomyConcept(normalizedRight)) {
		return normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
	}

	const leftTokens = tokenizeConcept(normalizedLeft).length;
	const rightTokens = tokenizeConcept(normalizedRight).length;

	if (leftTokens !== rightTokens) {
		return leftTokens < rightTokens ? normalizedLeft : normalizedRight;
	}

	if (normalizedLeft.length !== normalizedRight.length) {
		return normalizedLeft.length < normalizedRight.length ? normalizedLeft : normalizedRight;
	}

	return normalizedLeft.localeCompare(normalizedRight) <= 0 ? normalizedLeft : normalizedRight;
}

export function scoreConceptMetadata(input: {
	freqProblems: number;
	freqPages: number;
	freqDocuments?: number;
	semanticDensity: number;
	multipartPresence: number;
	crossDocumentRecurrence?: number;
	label?: string;
}) {
	const freqDocuments = Math.max(1, input.freqDocuments ?? 1);
	const crossDocumentRecurrence = Math.max(0, input.crossDocumentRecurrence ?? freqDocuments);
	const score =
		SCORE_WEIGHTS.freqProblems * Math.log1p(Math.max(0, input.freqProblems)) +
		SCORE_WEIGHTS.freqPages * Math.log1p(Math.max(0, input.freqPages)) +
		SCORE_WEIGHTS.semanticDensity * Math.max(0, input.semanticDensity) +
		SCORE_WEIGHTS.multipartPresence * Math.max(0, input.multipartPresence) +
		SCORE_WEIGHTS.crossDocumentRecurrence * Math.log1p(Math.max(0, crossDocumentRecurrence)) -
		semanticDensityPenalty(input.label ?? "");

	const isNoise = Math.max(0, input.freqProblems) <= 1 && score < NOISE_SCORE_THRESHOLD;

	return {
		score: Number(score.toFixed(4)),
		isNoise,
		freqDocuments,
		crossDocumentRecurrence,
	};
}