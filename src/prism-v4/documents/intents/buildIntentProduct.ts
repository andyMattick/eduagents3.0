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
	CompareDocumentsProduct,
	ConceptExtractionEntry,
	CurriculumAlignmentProduct,
	IntentPayloadByType,
	IntentRequest,
	InstructionalMapProduct,
	LessonProduct,
	MergeDocumentsProduct,
	ProductDocumentSummary,
	ProductSourceAnchor,
	ProblemExtractionEntry,
	ReviewSection,
	SequenceProduct,
	TestItem,
	UnitProduct,
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

const SUPPORTED_INTENTS: BuiltIntentType[] = [
	"extract-problems",
	"extract-concepts",
	"summarize",
	"build-review",
	"build-test",
	"compare-documents",
	"merge-documents",
	"build-sequence",
	"build-lesson",
	"build-unit",
	"build-instructional-map",
	"curriculum-alignment",
];

const MULTI_DOCUMENT_INTENTS: BuiltIntentType[] = ["compare-documents", "merge-documents", "build-sequence", "build-unit", "build-instructional-map"];
const SINGLE_DOCUMENT_INTENTS: BuiltIntentType[] = ["build-lesson"];
const DIFFICULTY_SCORE: Record<"low" | "medium" | "high", number> = {
	low: 1,
	medium: 2,
	high: 3,
};

function joinList(values: string[]) {
	return values.filter(Boolean).join(", ");
}

function unique<T>(values: T[]) {
	return [...new Set(values)];
}

function average(values: number[]) {
	if (values.length === 0) {
		return 0;
	}

	return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
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

function getFragmentText(analyzed: AnalyzedDocument, fragment: AnalyzedDocument["fragments"][number]) {
	return fragment.anchors
		.map((anchor) => analyzed.document.nodes.find((node) => node.id === anchor.nodeId)?.text?.trim() ?? "")
		.filter(Boolean)
		.join(" ")
		.trim();
}

function collectFragmentEntries(analyzedDocuments: AnalyzedDocument[], sourceFileNames: Record<string, string>) {
	return analyzedDocuments.flatMap((analyzed) =>
		analyzed.fragments.map((fragment) => ({
			fragment,
			analyzed,
			documentId: analyzed.document.id,
			sourceFileName: sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			text: getFragmentText(analyzed, fragment),
			anchorNodeIds: unique(fragment.anchors.map((anchor) => anchor.nodeId)),
		})),
	);
}

function toStandardId(concept: string) {
	return `STD-${concept.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "GENERAL"}`;
}

function buildGraphEdgesFromBuckets(buckets: Array<{ node: string; documentIds: string[] }>) {
	const edges: Array<{ from: string; to: string; weight: number; sharedDocumentIds: string[] }> = [];
	for (let index = 0; index < buckets.length; index += 1) {
		for (let offset = index + 1; offset < buckets.length; offset += 1) {
			const left = buckets[index]!;
			const right = buckets[offset]!;
			const sharedDocumentIds = left.documentIds.filter((documentId) => right.documentIds.includes(documentId));
			if (sharedDocumentIds.length === 0) {
				continue;
			}
			edges.push({
				from: left.node,
				to: right.node,
				weight: sharedDocumentIds.length,
				sharedDocumentIds,
			});
		}
	}
	return edges;
}

function collectSourceAnchors(analyzedDocuments: AnalyzedDocument[]): ProductSourceAnchor[] {
	return analyzedDocuments.map((analyzed) => ({
		documentId: analyzed.document.id,
		anchorNodeIds: unique([
			...analyzed.problems.flatMap((problem) => problem.anchors.map((anchor) => anchor.nodeId)),
			...analyzed.fragments.flatMap((fragment) => fragment.anchors.map((anchor) => anchor.nodeId)),
		]).sort(),
	}));
}

function dominantDifficulty(analyzed: AnalyzedDocument) {
	return (["high", "medium", "low"] as const).reduce((winner, candidate) => {
		if (analyzed.insights.difficultyDistribution[candidate] > analyzed.insights.difficultyDistribution[winner]) {
			return candidate;
		}
		return winner;
	}, "low");
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

function buildCompareMetricEntries(context: BuilderContext<"compare-documents">) {
	return context.analyzedDocuments.map((analyzed) => ({
		documentId: analyzed.document.id,
		sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
		problemCount: analyzed.problems.length,
		dominantDifficulty: dominantDifficulty(analyzed),
		averageDifficultyScore: average(analyzed.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
		representations: analyzed.insights.representations,
		instructionalDensity: analyzed.insights.instructionalDensity,
		uniqueConcepts: analyzed.insights.concepts.filter((concept) => (context.collectionAnalysis.conceptToDocumentMap[concept] ?? []).length === 1),
		sharedConcepts: analyzed.insights.concepts.filter((concept) => (context.collectionAnalysis.conceptToDocumentMap[concept] ?? []).length >= 2),
	}));
}

function buildCompareDocumentsProduct(context: BuilderContext<"compare-documents">): CompareDocumentsProduct {
	const focus = getFocus(context.request.options);
	const metrics = buildCompareMetricEntries(context);
	const filteredOverlap = Object.entries(context.collectionAnalysis.conceptOverlap)
		.filter(([concept]) => matchesFocus([concept], focus))
		.map(([concept, documentIds]) => ({ concept, documentIds }));

	return {
		kind: "compare-documents",
		focus,
		sharedConcepts: filteredOverlap.map((entry) => entry.concept),
		conceptOverlap: filteredOverlap,
		documents: metrics,
		difficultyComparison: [...metrics].sort((left, right) => left.averageDifficultyScore - right.averageDifficultyScore || left.documentId.localeCompare(right.documentId)),
		representationComparison: [...metrics].sort((left, right) => left.representations.length - right.representations.length || left.documentId.localeCompare(right.documentId)),
		instructionalDensityComparison: [...metrics].sort((left, right) => right.instructionalDensity - left.instructionalDensity || left.documentId.localeCompare(right.documentId)),
		problemDistributionComparison: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			totalProblems: analyzed.problems.length,
			byDifficulty: analyzed.insights.difficultyDistribution,
		})),
		documentSimilarity: context.collectionAnalysis.documentSimilarity,
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function mergeProblemEntries(context: BuilderContext<"merge-documents">, focus: string | null) {
	const merged = new Map<string, MergeDocumentsProduct["mergedProblems"][number]>();

	for (const analyzed of context.analyzedDocuments) {
		for (const problem of analyzed.problems) {
			if (!matchesFocus([problem.text, ...problem.concepts, ...problem.representations], focus)) {
				continue;
			}

			const key = `${problem.text.toLowerCase()}::${problem.concepts.slice().sort().join("|")}`;
			const existing = merged.get(key);
			const sourceFileName = context.sourceFileNames[problem.documentId] ?? analyzed.document.sourceFileName;
			const sourceAnchor = {
				documentId: problem.documentId,
				anchorNodeIds: unique(problem.anchors.map((anchor) => anchor.nodeId)),
			};

			if (!existing) {
				merged.set(key, {
					mergedProblemId: `merged-problem-${problem.id}`,
					text: problem.text,
					concepts: problem.concepts,
					representations: problem.representations,
					difficulty: problem.difficulty,
					sourceDocumentIds: [problem.documentId],
					sourceFileNames: [sourceFileName],
					sourceAnchors: [sourceAnchor],
				});
				continue;
			}

			existing.sourceDocumentIds = unique([...existing.sourceDocumentIds, problem.documentId]);
			existing.sourceFileNames = unique([...existing.sourceFileNames, sourceFileName]);
			existing.sourceAnchors = existing.sourceAnchors.some((entry) => entry.documentId === sourceAnchor.documentId)
				? existing.sourceAnchors.map((entry) => entry.documentId === sourceAnchor.documentId
					? { ...entry, anchorNodeIds: unique([...entry.anchorNodeIds, ...sourceAnchor.anchorNodeIds]).sort() }
					: entry)
				: [...existing.sourceAnchors, sourceAnchor];
		}
	}

	return [...merged.values()];
}

function mergeFragmentEntries(context: BuilderContext<"merge-documents">, focus: string | null) {
	const merged = new Map<string, MergeDocumentsProduct["mergedFragments"][number]>();

	for (const analyzed of context.analyzedDocuments) {
		for (const fragment of analyzed.fragments) {
			const text = fragment.anchors
				.map((anchor) => analyzed.document.nodes.find((node) => node.id === anchor.nodeId)?.text?.trim() ?? "")
				.filter(Boolean)
				.join(" ");

			if (!text || !matchesFocus([text, fragment.instructionalRole, fragment.contentType], focus)) {
				continue;
			}

			const key = `${text.toLowerCase()}::${fragment.instructionalRole}::${fragment.contentType}`;
			const existing = merged.get(key);
			const sourceAnchor = {
				documentId: fragment.documentId,
				anchorNodeIds: unique(fragment.anchors.map((anchor) => anchor.nodeId)),
			};

			if (!existing) {
				merged.set(key, {
					mergedFragmentId: `merged-fragment-${fragment.id}`,
					text,
					instructionalRole: fragment.instructionalRole,
					contentType: fragment.contentType,
					sourceDocumentIds: [fragment.documentId],
					sourceAnchors: [sourceAnchor],
				});
				continue;
			}

			existing.sourceDocumentIds = unique([...existing.sourceDocumentIds, fragment.documentId]);
			existing.sourceAnchors = existing.sourceAnchors.some((entry) => entry.documentId === sourceAnchor.documentId)
				? existing.sourceAnchors.map((entry) => entry.documentId === sourceAnchor.documentId
					? { ...entry, anchorNodeIds: unique([...entry.anchorNodeIds, ...sourceAnchor.anchorNodeIds]).sort() }
					: entry)
				: [...existing.sourceAnchors, sourceAnchor];
		}
	}

	return [...merged.values()];
}

function buildMergeDocumentsProduct(context: BuilderContext<"merge-documents">): MergeDocumentsProduct {
	const focus = getFocus(context.request.options);
	const mergedProblems = mergeProblemEntries(context, focus);
	const mergedFragments = mergeFragmentEntries(context, focus);

	return {
		kind: "merge-documents",
		focus,
		mergedConcepts: Object.keys(context.collectionAnalysis.conceptToDocumentMap).filter((concept) => matchesFocus([concept], focus)).sort(),
		mergedProblems,
		mergedFragments,
		mergedInsights: {
			totalDocuments: context.analyzedDocuments.length,
			totalProblems: mergedProblems.length,
			totalFragments: mergedFragments.length,
			totalConcepts: Object.keys(context.collectionAnalysis.conceptToDocumentMap).length,
			coverageSummary: {
				totalConcepts: context.collectionAnalysis.coverageSummary.totalConcepts,
				conceptGaps: context.collectionAnalysis.conceptGaps,
				docsPerConcept: context.collectionAnalysis.coverageSummary.docsPerConcept,
			},
		},
		mergedCanonicalOrder: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			surfaceCount: analyzed.document.surfaces.length,
			nodeCount: analyzed.document.nodes.length,
		})),
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function buildSequenceProduct(context: BuilderContext<"build-sequence">): SequenceProduct {
	const focus = getFocus(context.request.options);
	const orderedDocuments = [...context.analyzedDocuments].sort((left, right) => {
		const leftDifficulty = average(left.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		const rightDifficulty = average(right.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		if (leftDifficulty !== rightDifficulty) {
			return leftDifficulty - rightDifficulty;
		}
		if (left.insights.instructionalDensity !== right.insights.instructionalDensity) {
			return right.insights.instructionalDensity - left.insights.instructionalDensity;
		}
		return left.document.id.localeCompare(right.document.id);
	});
	const seenConcepts = new Set<string>();
	const allBridgingConcepts = new Set<string>();
	const allMissingPrerequisites = new Set<string>();

	const recommendedOrder = orderedDocuments.map((analyzed, index) => {
		const currentConcepts = analyzed.insights.concepts.filter((concept) => matchesFocus([concept], focus));
		const bridgingConcepts = currentConcepts.filter((concept) => seenConcepts.has(concept));
		const missingPrerequisites = currentConcepts.filter((concept) => !seenConcepts.has(concept) && (context.collectionAnalysis.conceptToDocumentMap[concept] ?? []).length === 1);

		for (const concept of bridgingConcepts) {
			allBridgingConcepts.add(concept);
		}
		for (const concept of missingPrerequisites) {
			allMissingPrerequisites.add(concept);
		}
		for (const concept of currentConcepts) {
			seenConcepts.add(concept);
		}

		return {
			position: index + 1,
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			rationale: bridgingConcepts.length > 0
				? `Build on ${joinList(bridgingConcepts)} before introducing ${joinList(missingPrerequisites) || "new practice"}.`
				: `Start here because the document has lighter difficulty and an instructional density of ${analyzed.insights.instructionalDensity}.`,
			bridgingConcepts,
			missingPrerequisites,
			anchorNodeIds: unique([
				...analyzed.problems.flatMap((problem) => problem.anchors.map((anchor) => anchor.nodeId)),
				...analyzed.fragments.flatMap((fragment) => fragment.anchors.map((anchor) => anchor.nodeId)),
			]).slice(0, 12),
		};
	});

	return {
		kind: "sequence",
		focus,
		recommendedOrder,
		bridgingConcepts: [...allBridgingConcepts],
		missingPrerequisites: [...allMissingPrerequisites],
		sourceAnchors: collectSourceAnchors(orderedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function buildLessonSegments(args: {
	fragments: ReturnType<typeof collectFragmentEntries>;
	problems: ProblemExtractionEntry[];
	role: string;
	title: string;
	limit: number;
	sourceFileName: string;
	sourceDocumentId: string;
}) {
	const matchingFragments = args.fragments
		.filter((entry) => entry.fragment.instructionalRole === args.role && entry.text.length > 0)
		.slice(0, args.limit)
		.map((entry, index) => ({
			title: `${args.title} ${index + 1}`,
			description: entry.text,
			documentId: entry.documentId,
			sourceFileName: entry.sourceFileName,
			anchorNodeIds: entry.anchorNodeIds,
			concepts: entry.fragment.prerequisiteConcepts ?? [],
		}));

	if (matchingFragments.length > 0) {
		return matchingFragments;
	}

	return args.problems.slice(0, args.limit).map((problem, index) => ({
		title: `${args.title} ${index + 1}`,
		description: problem.text,
		documentId: problem.documentId,
		sourceFileName: problem.sourceFileName,
		anchorNodeIds: problem.anchorNodeIds,
		concepts: problem.concepts,
	}));
}

function buildLessonProduct(context: BuilderContext<"build-lesson">): LessonProduct {
	const focus = getFocus(context.request.options);
	const analyzed = context.analyzedDocuments[0]!;
	const fragmentEntries = collectFragmentEntries([analyzed], context.sourceFileNames).filter((entry) => matchesFocus([entry.text, ...(entry.fragment.prerequisiteConcepts ?? [])], focus));
	const problemEntries = buildProblemEntries(context as BuilderContext<"extract-problems">, focus);
	const objectiveEntries = fragmentEntries.filter((entry) => entry.fragment.learningObjective).map((entry) => entry.fragment.learningObjective!).filter(Boolean);
	const prerequisiteConcepts = unique(fragmentEntries.flatMap((entry) => entry.fragment.prerequisiteConcepts ?? []).filter(Boolean));
	const misconceptionTriggers = unique(fragmentEntries.flatMap((entry) => entry.fragment.misconceptionTriggers ?? []).filter(Boolean));
	const scaffoldEntries = fragmentEntries
		.filter((entry) => entry.fragment.scaffoldLevel)
		.map((entry) => ({
			level: entry.fragment.scaffoldLevel!,
			strategy: entry.text || `Scaffold ${entry.fragment.scaffoldLevel}`,
			documentIds: [entry.documentId],
		}));
	const noteEntries = fragmentEntries
		.filter((entry) => entry.fragment.instructionalRole === "note" || entry.fragment.instructionalRole === "reflection" || entry.fragment.instructionalRole === "objective")
		.map((entry) => entry.text)
		.filter(Boolean);

	return {
		kind: "lesson",
		focus,
		title: focus ? `Lesson Builder: ${focus}` : `Lesson Builder: ${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName}`,
		learningObjectives: objectiveEntries.length > 0 ? objectiveEntries : analyzed.insights.concepts.slice(0, 3).map((concept) => `Students will explain and apply ${concept}.`),
		prerequisiteConcepts,
		warmUp: buildLessonSegments({ fragments: fragmentEntries, problems: problemEntries, role: "objective", title: "Warm-Up", limit: 1, sourceFileName: analyzed.document.sourceFileName, sourceDocumentId: analyzed.document.id }),
		conceptIntroduction: buildLessonSegments({ fragments: fragmentEntries, problems: problemEntries, role: "explanation", title: "Concept Introduction", limit: 2, sourceFileName: analyzed.document.sourceFileName, sourceDocumentId: analyzed.document.id }),
		guidedPractice: buildLessonSegments({ fragments: fragmentEntries, problems: problemEntries, role: "example", title: "Guided Practice", limit: 2, sourceFileName: analyzed.document.sourceFileName, sourceDocumentId: analyzed.document.id }),
		independentPractice: buildLessonSegments({ fragments: fragmentEntries, problems: problemEntries, role: "problem-stem", title: "Independent Practice", limit: 3, sourceFileName: analyzed.document.sourceFileName, sourceDocumentId: analyzed.document.id }),
		exitTicket: buildLessonSegments({ fragments: fragmentEntries, problems: problemEntries.slice(-1), role: "reflection", title: "Exit Ticket", limit: 1, sourceFileName: analyzed.document.sourceFileName, sourceDocumentId: analyzed.document.id }),
		misconceptions: misconceptionTriggers.map((trigger) => ({
			trigger,
			correction: `Address ${trigger.toLowerCase()} with a quick model and a corrected example.`,
			documentIds: [analyzed.document.id],
		})),
		scaffolds: scaffoldEntries.length > 0 ? scaffoldEntries : [{ level: "medium", strategy: "Model the first problem together before releasing to independent work.", documentIds: [analyzed.document.id] }],
		extensions: problemEntries.filter((problem) => problem.difficulty === "high").map((problem) => `Extend with: ${problem.text}`).slice(0, 2),
		teacherNotes: noteEntries.length > 0 ? noteEntries : [`Use ${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName} as the core source and emphasize ${joinList(analyzed.insights.concepts.slice(0, 2)) || "the central concepts"}.`],
		sourceAnchors: collectSourceAnchors([analyzed]),
		generatedAt: new Date().toISOString(),
	};
}

function buildUnitProduct(context: BuilderContext<"build-unit">): UnitProduct {
	const focus = getFocus(context.request.options);
	const orderedDocuments = [...context.analyzedDocuments].sort((left, right) => {
		const leftScore = average(left.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		const rightScore = average(right.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		return leftScore - rightScore || left.document.id.localeCompare(right.document.id);
	});
	const fragmentEntries = collectFragmentEntries(context.analyzedDocuments, context.sourceFileNames);
	const lessonSequence = orderedDocuments.map((analyzed, index) => ({
		position: index + 1,
		documentId: analyzed.document.id,
		sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
		focusConcepts: analyzed.insights.concepts,
		rationale: index === 0
			? `Open the unit with ${joinList(analyzed.insights.concepts.slice(0, 2)) || "core concepts"} because this document has the lowest difficulty profile.`
			: `Place this after earlier documents to build from ${joinList(analyzed.insights.concepts.filter((concept) => orderedDocuments.slice(0, index).some((previous) => previous.insights.concepts.includes(concept)))) || "the prior concepts"}.`,
		anchorNodeIds: collectSourceAnchors([analyzed])[0]?.anchorNodeIds ?? [],
	}));
	const conceptMap = Object.entries(context.collectionAnalysis.conceptToDocumentMap).map(([concept, documentIds]) => ({
		concept,
		documentIds,
		prerequisites: unique(fragmentEntries.filter((entry) => (entry.fragment.prerequisiteConcepts ?? []).includes(concept)).flatMap((entry) => entry.fragment.prerequisiteConcepts ?? []).filter((item) => item !== concept)),
	}));
	const misconceptionMap = Object.entries(context.collectionAnalysis.conceptToDocumentMap).map(([concept, documentIds]) => ({
		concept,
		triggers: unique(fragmentEntries.filter((entry) => entry.text.toLowerCase().includes(concept.toLowerCase()) || (entry.fragment.prerequisiteConcepts ?? []).includes(concept)).flatMap((entry) => entry.fragment.misconceptionTriggers ?? [])).slice(0, 3),
		documentIds,
	})).filter((entry) => entry.triggers.length > 0);

	return {
		kind: "unit",
		focus,
		title: focus ? `Unit Builder: ${focus}` : `Unit Builder: ${context.analyzedDocuments.length} Documents`,
		lessonSequence,
		conceptMap,
		difficultyCurve: orderedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			averageDifficultyScore: average(analyzed.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
		})),
		representationCurve: orderedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			representations: analyzed.insights.representations,
		})),
		misconceptionMap,
		suggestedAssessments: context.analyzedDocuments.map((analyzed) => `Assessment checkpoint from ${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName} on ${joinList(analyzed.insights.concepts.slice(0, 2)) || "key ideas"}.`).slice(0, 3),
		suggestedReviews: context.collectionAnalysis.conceptGaps.slice(0, 3).map((concept) => `Review ${concept} before moving to the next lesson.`),
		suggestedPracticeSets: orderedDocuments.map((analyzed) => `Practice set using ${analyzed.problems.length} problem(s) from ${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName}.`).slice(0, 3),
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function buildInstructionalMapProduct(context: BuilderContext<"build-instructional-map">): InstructionalMapProduct {
	const focus = getFocus(context.request.options);
	const filteredConceptEntries = Object.entries(context.collectionAnalysis.conceptToDocumentMap)
		.filter(([concept]) => matchesFocus([concept], focus))
		.map(([concept, documentIds]) => ({ node: concept, documentIds }));
	const representationBuckets = unique(context.analyzedDocuments.flatMap((analyzed) => analyzed.insights.representations))
		.map((representation) => ({
			node: representation,
			documentIds: context.analyzedDocuments.filter((analyzed) => analyzed.insights.representations.includes(representation)).map((analyzed) => analyzed.document.id),
		}));
	const fragmentEntries = collectFragmentEntries(context.analyzedDocuments, context.sourceFileNames);
	const misconceptionBuckets = unique(fragmentEntries.flatMap((entry) => entry.fragment.misconceptionTriggers ?? []))
		.map((trigger) => ({
			node: trigger,
			documentIds: fragmentEntries.filter((entry) => (entry.fragment.misconceptionTriggers ?? []).includes(trigger)).map((entry) => entry.documentId),
		}));

	return {
		kind: "instructional-map",
		focus,
		conceptGraph: {
			nodes: filteredConceptEntries.map((entry) => entry.node),
			edges: buildGraphEdgesFromBuckets(filteredConceptEntries),
		},
		representationGraph: {
			nodes: representationBuckets.map((entry) => entry.node),
			edges: buildGraphEdgesFromBuckets(representationBuckets),
		},
		misconceptionGraph: {
			nodes: misconceptionBuckets.map((entry) => entry.node),
			edges: buildGraphEdgesFromBuckets(misconceptionBuckets),
		},
		difficultyCurve: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			averageDifficultyScore: average(analyzed.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
		})),
		documentConceptAlignment: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			concepts: analyzed.insights.concepts,
		})),
		problemConceptAlignment: context.analyzedDocuments.flatMap((analyzed) => analyzed.problems.map((problem) => ({
			problemId: problem.id,
			documentId: problem.documentId,
			concepts: problem.concepts,
			anchorNodeIds: unique(problem.anchors.map((anchor) => anchor.nodeId)),
		}))),
		instructionalRoleDistribution: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			roles: analyzed.fragments.reduce<Record<string, number>>((acc, fragment) => {
				acc[fragment.instructionalRole] = (acc[fragment.instructionalRole] ?? 0) + 1;
				return acc;
			}, {}),
		})),
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function buildCurriculumAlignmentProduct(context: BuilderContext<"curriculum-alignment">): CurriculumAlignmentProduct {
	const focus = getFocus(context.request.options);
	const concepts = Object.entries(context.collectionAnalysis.conceptToDocumentMap).filter(([concept]) => matchesFocus([concept], focus));
	const standardsCoverage = concepts.map(([concept, documentIds]) => ({
		standardId: toStandardId(concept),
		concept,
		documentIds,
		coverage: documentIds.length >= 2 ? "full" as const : "partial" as const,
	}));
	const redundancies = Object.entries(context.collectionAnalysis.redundancy)
		.flatMap(([documentId, entries]) => entries.map((entry) => `${documentId} overlaps with ${entry.otherDocumentId} on ${joinList(entry.sharedConcepts.slice(0, 2)) || "shared concepts"}.`));

	return {
		kind: "curriculum-alignment",
		focus,
		standardsCoverage,
		gaps: context.collectionAnalysis.conceptGaps.map((concept) => `${toStandardId(concept)} has partial coverage for ${concept}.`),
		redundancies: redundancies.slice(0, 5),
		suggestedFixes: [
			...context.collectionAnalysis.conceptGaps.slice(0, 3).map((concept) => `Add another source or assessment artifact to fully cover ${concept}.`),
			...redundancies.slice(0, 2).map((entry) => `Reduce duplicate treatment where ${entry.toLowerCase()}`),
		],
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

const BUILDERS: { [K in BuiltIntentType]: (context: BuilderContext<K>) => IntentPayloadByType[K] } = {
	"extract-problems": buildExtractProblemsProduct,
	"extract-concepts": buildExtractConceptsProduct,
	"summarize": buildSummaryProduct,
	"build-review": buildReviewProduct,
	"build-test": buildTestProduct,
	"compare-documents": buildCompareDocumentsProduct,
	"merge-documents": buildMergeDocumentsProduct,
	"build-sequence": buildSequenceProduct,
	"build-lesson": buildLessonProduct,
	"build-unit": buildUnitProduct,
	"build-instructional-map": buildInstructionalMapProduct,
	"curriculum-alignment": buildCurriculumAlignmentProduct,
};

export function isBuiltIntentType(intentType: IntentRequest["intentType"]): intentType is BuiltIntentType {
	return SUPPORTED_INTENTS.includes(intentType as BuiltIntentType);
}

async function loadBuilderContext<T extends BuiltIntentType>(request: IntentRequest & { intentType: T }): Promise<BuilderContext<T>> {
	const session = getDocumentSession(request.sessionId);
	if (!session) {
		throw new IntentBuildError(404, "Session not found");
	}

	if (SINGLE_DOCUMENT_INTENTS.includes(request.intentType) && request.documentIds.length !== 1) {
		throw new IntentBuildError(400, `${request.intentType} requires exactly 1 document`);
	}

	if (MULTI_DOCUMENT_INTENTS.includes(request.intentType) && request.documentIds.length < 2) {
		throw new IntentBuildError(400, `${request.intentType} requires at least 2 documents`);
	}

	for (const documentId of request.documentIds) {
		if (!session.documentIds.includes(documentId)) {
			throw new IntentBuildError(400, `Document ${documentId} is not part of session ${request.sessionId}`);
		}
		if ((session.sessionRoles[documentId] ?? []).length === 0) {
			throw new IntentBuildError(400, `Document ${documentId} is missing session roles`);
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
	return BUILDERS[request.intentType](context as BuilderContext<T>);
}

export function getIntentBuildErrorStatus(error: unknown) {
	return error instanceof IntentBuildError ? error.statusCode : 500;
}