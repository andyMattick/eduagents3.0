import { analyzeRegisteredDocument, buildDocumentCollectionAnalysis } from "../analysis";
import {
	buildDefaultCollectionAnalysis,
	getAnalyzedDocument,
	getCollectionAnalysis,
	getDocumentSession,
	getRegisteredDocument,
	saveAnalyzedDocument,
} from "../registry";
import type { AnalyzedDocument, DocumentCollectionAnalysis } from "../../schema/semantic";
import type {
	BuiltIntentType,
	ConceptExtractionEntry,
	IntentPayloadByType,
	IntentRequest,
	ProductDocumentSummary,
	ProblemExtractionEntry,
	ReviewSection,
	TestItem,
} from "../../schema/integration";

class IntentBuildError extends Error {
	statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);
		this.statusCode = statusCode;
	}
}

interface BuilderContext<T extends BuiltIntentType> {
	request: IntentRequest & { intentType: T };
	analyzedDocuments: AnalyzedDocument[];
	collectionAnalysis: DocumentCollectionAnalysis;
	sourceFileNames: Record<string, string>;
	documentSummaries: ProductDocumentSummary[];
}

const SUPPORTED_INTENTS: BuiltIntentType[] = ["extract-problems", "extract-concepts", "summarize", "build-review", "build-test"];

function joinList(values: string[]) {
	return values.filter(Boolean).join(", ");
}

function unique<T>(values: T[]) {
	return [...new Set(values)];
}

function getFocus(options: Record<string, unknown> | undefined) {
	const focus = options?.focus;
	return typeof focus === "string" && focus.trim().length > 0 ? focus.trim() : null;
}

function getPositiveNumberOption(options: Record<string, unknown> | undefined, key: string, fallback: number) {
	const value = options?.[key];
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function matchesFocus(textParts: string[], focus: string | null) {
	if (!focus) {
		return true;
	}
	const normalizedFocus = focus.toLowerCase();
	return textParts.some((value) => value.toLowerCase().includes(normalizedFocus));
}

function buildDocumentSummaries(analyzedDocuments: AnalyzedDocument[], sourceFileNames: Record<string, string>): ProductDocumentSummary[] {
	return analyzedDocuments.map((analyzed) => ({
		documentId: analyzed.document.id,
		sourceFileName: sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
		problemCount: analyzed.problems.length,
		concepts: analyzed.insights.concepts,
		instructionalProfile: {
			exampleCount: analyzed.insights.exampleCount,
			explanationCount: analyzed.insights.explanationCount,
			instructionalDensity: analyzed.insights.instructionalDensity,
		},
	}));
}

function buildProblemEntries(context: BuilderContext<"extract-problems" | "build-review" | "build-test">, focus: string | null) {
	return context.analyzedDocuments.flatMap<ProblemExtractionEntry>((analyzed) =>
		analyzed.problems
			.filter((problem) => matchesFocus([problem.text, ...problem.concepts, ...problem.representations], focus))
			.map((problem) => ({
				problemId: problem.id,
				documentId: problem.documentId,
				sourceFileName: context.sourceFileNames[problem.documentId] ?? analyzed.document.sourceFileName,
				text: problem.text,
				concepts: problem.concepts,
				representations: problem.representations,
				difficulty: problem.difficulty,
				cognitiveDemand: problem.cognitiveDemand,
				misconceptions: problem.misconceptions,
				anchorNodeIds: problem.anchors.map((anchor) => anchor.nodeId),
			})),
	);
}

function buildConceptEntries(context: BuilderContext<"extract-concepts" | "summarize" | "build-review" | "build-test">, focus: string | null) {
	const concepts = new Map<string, ConceptExtractionEntry>();

	for (const analyzed of context.analyzedDocuments) {
		for (const concept of analyzed.insights.concepts) {
			if (!matchesFocus([concept], focus)) {
				continue;
			}

			const matchingProblems = analyzed.problems.filter((problem) => problem.concepts.includes(concept));
			const existing = concepts.get(concept);
			concepts.set(concept, {
				concept,
				frequency: (existing?.frequency ?? 0) + Math.max(analyzed.insights.conceptFrequencies[concept] ?? 0, matchingProblems.length),
				documentIds: unique([...(existing?.documentIds ?? []), analyzed.document.id]),
				sourceFileNames: unique([...(existing?.sourceFileNames ?? []), context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName]),
				representations: unique([...(existing?.representations ?? []), ...matchingProblems.flatMap((problem) => problem.representations)]),
				difficulties: unique([...(existing?.difficulties ?? []), ...matchingProblems.map((problem) => problem.difficulty)]),
				sampleProblemTexts: unique([...(existing?.sampleProblemTexts ?? []), ...matchingProblems.map((problem) => problem.text)]).slice(0, 3),
			});
		}
	}

	return [...concepts.values()].sort((left, right) => right.frequency - left.frequency || left.concept.localeCompare(right.concept));
}

function buildExtractProblemsProduct(context: BuilderContext<"extract-problems">): IntentPayloadByType["extract-problems"] {
	const focus = getFocus(context.request.options);
	const maxItems = getPositiveNumberOption(context.request.options, "maxItems", Number.MAX_SAFE_INTEGER);
	const problems = buildProblemEntries(context, focus).slice(0, maxItems);

	return {
		kind: "problem-extraction",
		focus,
		totalProblemCount: problems.length,
		documents: context.documentSummaries,
		problems,
		generatedAt: new Date().toISOString(),
	};
}

function buildExtractConceptsProduct(context: BuilderContext<"extract-concepts">): IntentPayloadByType["extract-concepts"] {
	const focus = getFocus(context.request.options);
	const maxConcepts = getPositiveNumberOption(context.request.options, "maxConcepts", Number.MAX_SAFE_INTEGER);
	const concepts = buildConceptEntries(context, focus).slice(0, maxConcepts);

	return {
		kind: "concept-extraction",
		focus,
		totalConceptCount: concepts.length,
		coverageSummary: {
			totalConcepts: context.collectionAnalysis.coverageSummary.totalConcepts,
			conceptGaps: focus
				? context.collectionAnalysis.conceptGaps.filter((concept) => concept.toLowerCase().includes(focus.toLowerCase()))
				: context.collectionAnalysis.conceptGaps,
			docsPerConcept: context.collectionAnalysis.coverageSummary.docsPerConcept,
		},
		concepts,
		generatedAt: new Date().toISOString(),
	};
}

function buildSummaryProduct(context: BuilderContext<"summarize">): IntentPayloadByType["summarize"] {
	const focus = getFocus(context.request.options);
	const conceptEntries = buildConceptEntries(context, focus);
	const topConcepts = conceptEntries.slice(0, 3).map((entry) => entry.concept);

	return {
		kind: "summary",
		focus,
		overallSummary: topConcepts.length > 0
			? `Selected documents emphasize ${joinList(topConcepts)} and contain ${context.analyzedDocuments.reduce((sum, analyzed) => sum + analyzed.problems.length, 0)} extracted problems across the session.`
			: "Selected documents have been analyzed, but there is not enough problem structure yet to produce a concept-led summary.",
		documents: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			summary:
				analyzed.problems.length > 0
					? `${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName} covers ${joinList(analyzed.insights.concepts.slice(0, 3)) || "the uploaded material"} through ${analyzed.problems.length} extracted problems.`
					: `${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName} is mainly explanatory material with ${analyzed.insights.exampleCount} examples and ${analyzed.insights.explanationCount} explanations.`,
			keyConcepts: analyzed.insights.concepts,
			problemCount: analyzed.problems.length,
			instructionalProfile: {
				exampleCount: analyzed.insights.exampleCount,
				explanationCount: analyzed.insights.explanationCount,
				questionCount: analyzed.fragments.filter((fragment) => fragment.contentType === "question").length,
			},
		})),
		crossDocumentTakeaways: [
			`${context.analyzedDocuments.length} document${context.analyzedDocuments.length === 1 ? "" : "s"} contribute to this summary.`,
			topConcepts.length > 0 ? `Most visible concepts: ${joinList(topConcepts)}.` : "No strong concept signal was extracted yet.",
			context.collectionAnalysis.conceptGaps.length > 0 ? `Concept gaps remain around ${joinList(context.collectionAnalysis.conceptGaps.slice(0, 3))}.` : "Core concepts are broadly reinforced across the selected documents.",
		],
		generatedAt: new Date().toISOString(),
	};
}

function buildReviewSections(context: BuilderContext<"build-review">, focus: string | null, maxSections: number) {
	const conceptEntries = buildConceptEntries(context, focus).slice(0, maxSections);
	const problemEntries = buildProblemEntries(context, focus);

	return conceptEntries.map<ReviewSection>((entry) => {
		const practicePrompts = problemEntries
			.filter((problem) => problem.concepts.includes(entry.concept))
			.slice(0, 2)
			.map((problem) => problem.text);
		const coverage = context.collectionAnalysis.coverageSummary.docsPerConcept[entry.concept] ?? entry.documentIds.length;
		const priority = coverage < context.request.documentIds.length ? "core" : entry.frequency > 1 ? "reinforce" : "extension";

		return {
			concept: entry.concept,
			priority,
			sourceDocumentIds: entry.documentIds,
			rationale: coverage < context.request.documentIds.length
				? `${entry.concept} appears unevenly across the selected documents and should be explicitly bridged.`
				: `${entry.concept} is repeated enough to support spaced review and quick checks for retention.`,
			reviewPoints: [
				`Revisit ${entry.concept} through ${joinList(entry.representations) || "text-based explanations"}.`,
				`Connect examples from ${joinList(entry.sourceFileNames)} before moving to independent work.`,
			],
			practicePrompts: practicePrompts.length > 0 ? practicePrompts : [`Explain the key idea behind ${entry.concept} in your own words.`],
		};
	});
}

function buildReviewProduct(context: BuilderContext<"build-review">): IntentPayloadByType["build-review"] {
	const focus = getFocus(context.request.options);
	const maxSections = getPositiveNumberOption(context.request.options, "maxSections", 3);
	const sections = buildReviewSections(context, focus, maxSections);
	const conceptLabels = sections.map((section) => section.concept);

	return {
		kind: "review",
		focus,
		title: conceptLabels.length > 0 ? `Review Pack: ${joinList(conceptLabels.slice(0, 3))}` : "Review Pack",
		overview: sections.length > 0
			? `This review plan targets ${sections.length} concept areas using the analyzed source documents, with emphasis on concepts that need reinforcement across the set.`
			: "There was not enough concept evidence to assemble a structured review plan.",
		sections,
		generatedAt: new Date().toISOString(),
	};
}

function chooseTestItems(context: BuilderContext<"build-test">, focus: string | null, itemCount: number) {
	const concepts = buildConceptEntries(context, focus);
	const problems = buildProblemEntries(context, focus);
	const itemsByConcept = new Map<string, TestItem[]>();
	let emitted = 0;

	for (const conceptEntry of concepts) {
		for (const problem of problems.filter((entry) => entry.concepts.includes(conceptEntry.concept))) {
			if (emitted >= itemCount) {
				break;
			}
			const item: TestItem = {
				itemId: `item-${problem.problemId}`,
				prompt: problem.text,
				concept: conceptEntry.concept,
				sourceDocumentId: problem.documentId,
				sourceFileName: problem.sourceFileName,
				difficulty: problem.difficulty,
				cognitiveDemand: problem.cognitiveDemand,
				answerGuidance: `Look for accurate reasoning about ${conceptEntry.concept}${problem.representations.length > 0 ? ` using ${joinList(problem.representations)}` : ""}.`,
			};
			itemsByConcept.set(conceptEntry.concept, [...(itemsByConcept.get(conceptEntry.concept) ?? []), item]);
			emitted += 1;
		}
		if (emitted >= itemCount) {
			break;
		}
	}

	return [...itemsByConcept.entries()].map(([concept, items]) => ({
		concept,
		sourceDocumentIds: unique(items.map((item) => item.sourceDocumentId)),
		items,
	}));
}

function buildTestProduct(context: BuilderContext<"build-test">): IntentPayloadByType["build-test"] {
	const focus = getFocus(context.request.options);
	const itemCount = getPositiveNumberOption(context.request.options, "itemCount", 5);
	const sections = chooseTestItems(context, focus, itemCount);
	const totalItemCount = sections.reduce((sum, section) => sum + section.items.length, 0);

	return {
		kind: "test",
		focus,
		title: focus ? `Assessment Draft: ${focus}` : "Assessment Draft",
		overview: totalItemCount > 0
			? `This draft assessment pulls ${totalItemCount} items from the analyzed documents and groups them by concept.`
			: "No extracted problems were available to build an assessment draft.",
		estimatedDurationMinutes: Math.max(5, totalItemCount * 3),
		sections,
		totalItemCount,
		generatedAt: new Date().toISOString(),
	};
}

const BUILDERS: { [K in BuiltIntentType]: (context: BuilderContext<K>) => IntentPayloadByType[K] } = {
	"extract-problems": buildExtractProblemsProduct,
	"extract-concepts": buildExtractConceptsProduct,
	"summarize": buildSummaryProduct,
	"build-review": buildReviewProduct,
	"build-test": buildTestProduct,
};

export function isBuiltIntentType(intentType: IntentRequest["intentType"]): intentType is BuiltIntentType {
	return SUPPORTED_INTENTS.includes(intentType as BuiltIntentType);
}

async function loadBuilderContext<T extends BuiltIntentType>(request: IntentRequest & { intentType: T }): Promise<BuilderContext<T>> {
	const session = getDocumentSession(request.sessionId);
	if (!session) {
		throw new IntentBuildError(404, "Session not found");
	}

	for (const documentId of request.documentIds) {
		if (!session.documentIds.includes(documentId)) {
			throw new IntentBuildError(400, `Document ${documentId} is not part of session ${request.sessionId}`);
		}
	}

	const registeredDocuments = request.documentIds.map((documentId) => {
		const document = getRegisteredDocument(documentId);
		if (!document) {
			throw new IntentBuildError(404, `Document ${documentId} not found`);
		}
		return document;
	});

	const analyzedDocuments = await Promise.all(registeredDocuments.map(async (document) => {
		const existing = getAnalyzedDocument(document.documentId);
		if (existing) {
			return existing;
		}

		return saveAnalyzedDocument(await analyzeRegisteredDocument({
			documentId: document.documentId,
			sourceFileName: document.sourceFileName,
			sourceMimeType: document.sourceMimeType,
			rawBinary: document.rawBinary,
			azureExtract: document.azureExtract,
			canonicalDocument: document.canonicalDocument,
		}));
	}));

	const collectionAnalysis = getCollectionAnalysis(request.sessionId)
		?? buildDocumentCollectionAnalysis(request.sessionId)
		?? buildDefaultCollectionAnalysis(request.sessionId);

	if (!collectionAnalysis) {
		throw new IntentBuildError(500, "Collection analysis could not be built");
	}

	const sourceFileNames = Object.fromEntries(registeredDocuments.map((document) => [document.documentId, document.sourceFileName]));

	return {
		request,
		analyzedDocuments,
		collectionAnalysis,
		sourceFileNames,
		documentSummaries: buildDocumentSummaries(analyzedDocuments, sourceFileNames),
	};
}

export async function buildIntentPayload<T extends BuiltIntentType>(request: IntentRequest & { intentType: T }): Promise<IntentPayloadByType[T]> {
	const context = await loadBuilderContext(request);
	return BUILDERS[request.intentType](context);
}

export function getIntentBuildErrorStatus(error: unknown) {
	return error instanceof IntentBuildError ? error.statusCode : 500;
}