import type { IntentProductPayload, LessonProduct, LessonSegment, TestProduct } from "../../schema/integration/IntentProduct";

function normalizeInlineText(value: string) {
	return value.trim().replace(/\s+/g, " ");
}

function normalizeLabelText(value: string) {
	return normalizeInlineText(value).replace(/[.!?]+$/g, "");
}

function splitSentences(value: string) {
	const normalized = normalizeInlineText(value);
	if (!normalized) {
		return [];
	}

	const matches = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
	return uniqueStrings(matches.map((sentence) => {
		const trimmed = normalizeInlineText(sentence);
		if (!trimmed) {
			return "";
		}
		return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
	}).filter(Boolean));
}

function uniqueStrings(values: string[]) {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const value of values) {
		const normalized = normalizeInlineText(value);
		if (!normalized || seen.has(normalized)) {
			continue;
		}

		seen.add(normalized);
		result.push(normalized);
	}

	return result;
}

export function dedupeLines(lines: string[]) {
	return uniqueStrings(lines);
}

export function dedupeParagraphs(text: string) {
	const lines = text
		.split(/\n+/)
		.map((line) => splitSentences(line).join(" "))
		.filter(Boolean);

	return dedupeLines(lines).join("\n");
}

function dedupeLessonSegments(segments: LessonSegment[]) {
	const byKey = new Map<string, LessonSegment>();

	for (const segment of segments) {
		const title = normalizeInlineText(segment.title);
		const description = dedupeParagraphs(segment.description);
		const key = `${title}::${description}`;

		if (!title && !description) {
			continue;
		}

		const existing = byKey.get(key);
		if (existing) {
			existing.anchorNodeIds = uniqueStrings([...existing.anchorNodeIds, ...segment.anchorNodeIds]);
			existing.concepts = uniqueStrings([...existing.concepts, ...segment.concepts]);
			continue;
		}

		byKey.set(key, {
			...segment,
			title,
			description,
			anchorNodeIds: uniqueStrings(segment.anchorNodeIds),
			concepts: uniqueStrings(segment.concepts),
		});
	}

	return [...byKey.values()];
}

function dedupeScaffolds(scaffolds: LessonProduct["scaffolds"]) {
	const byStrategy = new Map<string, LessonProduct["scaffolds"][number]>();

	for (const scaffold of scaffolds) {
		const concept = normalizeLabelText(scaffold.concept);
		const strategy = dedupeParagraphs(scaffold.strategy);
		if (!strategy) {
			continue;
		}

		const key = `${concept}::${strategy}`;
		const existing = byStrategy.get(key);
		if (existing) {
			existing.documentIds = uniqueStrings([...existing.documentIds, ...scaffold.documentIds]);
			continue;
		}

		byStrategy.set(key, {
			...scaffold,
			concept,
			strategy,
			documentIds: uniqueStrings(scaffold.documentIds),
		});
	}

	return [...byStrategy.values()];
}

function dedupeMisconceptions(misconceptions: LessonProduct["misconceptions"]) {
	const byTrigger = new Map<string, LessonProduct["misconceptions"][number]>();

	for (const misconception of misconceptions) {
		const trigger = normalizeInlineText(misconception.trigger);
		const correction = dedupeParagraphs(misconception.correction);
		const key = `${trigger}::${correction}`;

		if (!trigger && !correction) {
			continue;
		}

		const existing = byTrigger.get(key);
		if (existing) {
			existing.documentIds = uniqueStrings([...existing.documentIds, ...misconception.documentIds]);
			continue;
		}

		byTrigger.set(key, {
			...misconception,
			trigger,
			correction,
			documentIds: uniqueStrings(misconception.documentIds),
		});
	}

	return [...byTrigger.values()];
}

function cleanupLessonProduct(product: LessonProduct): LessonProduct {
	return {
		...product,
		learningObjectives: dedupeLines(product.learningObjectives),
		prerequisiteConcepts: dedupeLines(product.prerequisiteConcepts),
		warmUp: dedupeLessonSegments(product.warmUp),
		conceptIntroduction: dedupeLessonSegments(product.conceptIntroduction),
		guidedPractice: dedupeLessonSegments(product.guidedPractice),
		independentPractice: dedupeLessonSegments(product.independentPractice),
		exitTicket: dedupeLessonSegments(product.exitTicket),
		misconceptions: dedupeMisconceptions(product.misconceptions),
		scaffolds: dedupeScaffolds(product.scaffolds),
		extensions: dedupeLines(product.extensions),
		teacherNotes: product.teacherNotes.map(dedupeParagraphs).filter(Boolean).filter((note, index, notes) => notes.indexOf(note) === index),
	};
}

function cleanupTestProduct(product: TestProduct): TestProduct {
	const seenPrompts = new Set<string>();

	const sections = product.sections
		.map((section) => {
			const items = section.items
				.map((item) => ({
					...item,
					prompt: dedupeParagraphs(item.prompt),
					answerGuidance: item.answerGuidance ? dedupeParagraphs(item.answerGuidance) : item.answerGuidance,
				}))
				.filter((item) => {
					if (!item.prompt || seenPrompts.has(item.prompt)) {
						return false;
					}

					seenPrompts.add(item.prompt);
					return true;
				});

			return {
				...section,
				concept: normalizeInlineText(section.concept),
				sourceDocumentIds: uniqueStrings(section.sourceDocumentIds),
				items,
			};
		})
		.filter((section) => section.items.length > 0);

	return {
		...product,
		overview: dedupeParagraphs(product.overview),
		sections,
		totalItemCount: sections.reduce((sum, section) => sum + section.items.length, 0),
	};
}

export function cleanupProductPayload<T extends IntentProductPayload>(payload: T): T {
	if (payload.kind === "lesson") {
		return cleanupLessonProduct(payload) as T;
	}

	if (payload.kind === "test") {
		return cleanupTestProduct(payload) as T;
	}

	return payload;
}