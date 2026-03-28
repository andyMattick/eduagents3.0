import { cleanupProductPayload, dedupeLines, dedupeParagraphs } from "./cleanupProductPayload";
import type { AnalyzedDocument, DocumentCollectionAnalysis, InstructionalUnit } from "../../schema/semantic";
import type {
	BuiltIntentType,
	CompareDocumentsProduct,
	ConceptExtractionEntry,
	CurriculumAlignmentProduct,
	IntentPayloadByType,
	IntentRequest,
	InstructionalMapProduct,
	LessonSegment,
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
import type { PrismSessionContext } from "../registryStore";

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
	instructionalUnits: InstructionalUnit[];
	collectionAnalysis: DocumentCollectionAnalysis;
	sourceFileNames: Record<string, string>;
	documentSummaries: ProductDocumentSummary[];
}

interface InstructionalUnitEntry {
	unit: InstructionalUnit;
	text: string;
	questionTexts: string[];
	documentIds: string[];
	sourceFileNames: string[];
	anchorNodeIds: string[];
	roles: string[];
	contentTypes: string[];
	primaryDocumentId: string;
	primarySourceFileName: string;
	difficultyBand: "low" | "medium" | "high";
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

function buildDocumentSummaries(analyzedDocuments: AnalyzedDocument[], sourceFileNames: Record<string, string>, unitEntries: InstructionalUnitEntry[] = []): ProductDocumentSummary[] {
	const effectiveDocumentConceptMap = buildEffectiveDocumentConceptMap({ analyzedDocuments, sourceFileNames }, unitEntries);
	return analyzedDocuments.map((analyzed) => ({
		documentId: analyzed.document.id,
		sourceFileName: sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
		problemCount: analyzed.problems.length,
		concepts: effectiveDocumentConceptMap.get(analyzed.document.id) ?? analyzed.insights.concepts,
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

function toDifficultyBand(value: number): "low" | "medium" | "high" {
	if (value >= 0.67) {
		return "high";
	}
	if (value >= 0.4) {
		return "medium";
	}
	return "low";
}

function collectInstructionalUnitEntries(units: InstructionalUnit[], analyzedDocuments: AnalyzedDocument[], sourceFileNames: Record<string, string>): InstructionalUnitEntry[] {
	const analyzedById = new Map(analyzedDocuments.map((analyzed) => [analyzed.document.id, analyzed]));

	return units.map((unit) => {
		const orderedFragments = [...unit.fragments].sort((left, right) => left.id.localeCompare(right.id));
		const fragmentTexts = orderedFragments.map((fragment) => {
			const analyzed = analyzedById.get(fragment.documentId);
			return analyzed ? getFragmentText(analyzed, fragment) : "";
		}).filter(Boolean);
		const text = unique(orderedFragments.map((fragment) => {
			const analyzed = analyzedById.get(fragment.documentId);
			return analyzed ? getFragmentText(analyzed, fragment) : "";
		}).filter(Boolean)).join(" ").trim();
		const questionTexts = unique(orderedFragments
			.filter((fragment) => fragment.contentType === "question")
			.map((fragment) => {
				const analyzed = analyzedById.get(fragment.documentId);
				return analyzed ? getFragmentText(analyzed, fragment) : "";
			})
			.filter(Boolean));
		const documentIds = unique(orderedFragments.map((fragment) => fragment.documentId));
		const derivedSourceFileNames = documentIds.map((documentId) => sourceFileNames[documentId] ?? analyzedById.get(documentId)?.document.sourceFileName ?? documentId);
		return {
			unit,
			text: text || fragmentTexts.join(" ").trim() || unit.title || joinList(unit.learningTargets) || joinList(unit.concepts),
			questionTexts,
			documentIds,
			sourceFileNames: unique(derivedSourceFileNames),
			anchorNodeIds: unique(orderedFragments.flatMap((fragment) => fragment.anchors.map((anchor) => anchor.nodeId))),
			roles: unique(orderedFragments.map((fragment) => fragment.instructionalRole)),
			contentTypes: unique(orderedFragments.map((fragment) => fragment.contentType)),
			primaryDocumentId: documentIds[0] ?? "unknown-document",
			primarySourceFileName: derivedSourceFileNames[0] ?? "Unknown source",
			difficultyBand: toDifficultyBand(unit.difficulty),
		};
	});
}

function buildEffectiveDocumentConceptMap(context: { analyzedDocuments: AnalyzedDocument[]; sourceFileNames: Record<string, string> }, unitEntries: InstructionalUnitEntry[]) {
	const byDocument = new Map<string, string[]>();

	for (const analyzed of context.analyzedDocuments) {
		const unitConcepts = unique(unitEntries
			.filter((entry) => entry.documentIds.includes(analyzed.document.id))
			.flatMap((entry) => entry.unit.concepts));
		byDocument.set(analyzed.document.id, unitConcepts.length > 0 ? unitConcepts : analyzed.insights.concepts);
	}

	return byDocument;
}

function buildEffectiveConceptToDocumentMap(context: { analyzedDocuments: AnalyzedDocument[] }, unitEntries: InstructionalUnitEntry[], collectionAnalysis: DocumentCollectionAnalysis) {
	const conceptToDocumentMap = new Map<string, string[]>();

	for (const entry of unitEntries) {
		for (const concept of entry.unit.concepts) {
			conceptToDocumentMap.set(concept, unique([...(conceptToDocumentMap.get(concept) ?? []), ...entry.documentIds]));
		}
	}

	if (conceptToDocumentMap.size > 0) {
		return Object.fromEntries([...conceptToDocumentMap.entries()].sort((left, right) => left[0].localeCompare(right[0])));
	}

	if (Object.keys(collectionAnalysis.conceptToDocumentMap).length > 0) {
		return collectionAnalysis.conceptToDocumentMap;
	}

	const fallback = new Map<string, string[]>();
	for (const analyzed of context.analyzedDocuments) {
		for (const concept of analyzed.insights.concepts) {
			fallback.set(concept, unique([...(fallback.get(concept) ?? []), analyzed.document.id]));
		}
	}

	return Object.fromEntries([...fallback.entries()].sort((left, right) => left[0].localeCompare(right[0])));
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

function buildConceptBuckets(context: BuilderContext<"build-instructional-map">, unitEntries: InstructionalUnitEntry[], focus: string | null) {
	const unitBuckets = unique(unitEntries.flatMap((entry) => entry.unit.concepts))
		.filter((concept) => matchesFocus([concept], focus))
		.map((concept) => ({
			node: concept,
			documentIds: unique(unitEntries.filter((entry) => entry.unit.concepts.includes(concept)).flatMap((entry) => entry.documentIds)),
		}));
	if (unitBuckets.length > 0) {
		return unitBuckets;
	}

	const collectionBuckets = Object.entries(context.collectionAnalysis.conceptToDocumentMap)
		.filter(([concept]) => matchesFocus([concept], focus))
		.map(([concept, documentIds]) => ({ node: concept, documentIds }));
	if (collectionBuckets.length > 0) {
		return collectionBuckets;
	}

	return unique(context.analyzedDocuments.flatMap((analyzed) => analyzed.insights.concepts))
		.filter((concept) => matchesFocus([concept], focus))
		.map((concept) => ({
			node: concept,
			documentIds: context.analyzedDocuments
				.filter((analyzed) => analyzed.insights.concepts.includes(concept))
				.map((analyzed) => analyzed.document.id),
		}));
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

function buildProblemEntries(context: { analyzedDocuments: AnalyzedDocument[]; sourceFileNames: Record<string, string> }, focus: string | null) {
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

function buildConceptEntries(context: { analyzedDocuments: AnalyzedDocument[]; sourceFileNames: Record<string, string>; instructionalUnits?: InstructionalUnit[] }, focus: string | null) {
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits ?? [], context.analyzedDocuments, context.sourceFileNames);
	const concepts = new Map<string, ConceptExtractionEntry>();

	for (const entry of unitEntries) {
		for (const concept of entry.unit.concepts) {
			if (!matchesFocus([concept], focus)) {
				continue;
			}

			const existing = concepts.get(concept);
			concepts.set(concept, {
				concept,
				frequency: (existing?.frequency ?? 0) + entry.documentIds.length,
				documentIds: unique([...(existing?.documentIds ?? []), ...entry.documentIds]),
				sourceFileNames: unique([...(existing?.sourceFileNames ?? []), ...entry.sourceFileNames]),
				representations: unique([...(existing?.representations ?? []), ...entry.contentTypes]),
				difficulties: unique([...(existing?.difficulties ?? []), entry.difficultyBand]),
				sampleProblemTexts: unique([...(existing?.sampleProblemTexts ?? []), ...entry.questionTexts, entry.text]).filter(Boolean).slice(0, 3),
			});
		}
	}

	if (concepts.size > 0) {
		return [...concepts.values()].sort((left, right) => right.frequency - left.frequency || left.concept.localeCompare(right.concept));
	}

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
	const effectiveConceptToDocumentMap = buildEffectiveConceptToDocumentMap(context, collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames), context.collectionAnalysis);

	return {
		kind: "concept-extraction",
		focus,
		totalConceptCount: concepts.length,
		coverageSummary: {
			totalConcepts: Object.keys(effectiveConceptToDocumentMap).length,
			conceptGaps: focus
				? context.collectionAnalysis.conceptGaps.filter((concept) => concept.toLowerCase().includes(focus.toLowerCase()))
				: context.collectionAnalysis.conceptGaps,
			docsPerConcept: Object.fromEntries(Object.entries(effectiveConceptToDocumentMap).map(([concept, documentIds]) => [concept, documentIds.length])),
		},
		concepts,
		generatedAt: new Date().toISOString(),
	};
}

function buildSummaryProduct(context: BuilderContext<"summarize">): IntentPayloadByType["summarize"] {
	const focus = getFocus(context.request.options);
	const conceptEntries = buildConceptEntries(context, focus);
	const topConcepts = conceptEntries.slice(0, 3).map((entry) => entry.concept);
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);
	const effectiveDocumentConceptMap = buildEffectiveDocumentConceptMap(context, unitEntries);

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
					? `${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName} covers ${joinList((effectiveDocumentConceptMap.get(analyzed.document.id) ?? analyzed.insights.concepts).slice(0, 3)) || "the uploaded material"} through ${analyzed.problems.length} extracted problems.`
					: `${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName} is mainly explanatory material with ${analyzed.insights.exampleCount} examples and ${analyzed.insights.explanationCount} explanations.`,
			keyConcepts: effectiveDocumentConceptMap.get(analyzed.document.id) ?? analyzed.insights.concepts,
			problemCount: analyzed.problems.length,
			instructionalProfile: {
				exampleCount: analyzed.insights.exampleCount,
				explanationCount: analyzed.insights.explanationCount,
				questionCount: unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id) && entry.contentTypes.includes("question")).length,
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

function inferUnitCognitiveDemand(entry: InstructionalUnitEntry): TestItem["cognitiveDemand"] {
	if (entry.roles.includes("reflection")) {
		return "analysis";
	}
	if (entry.roles.includes("objective") || entry.roles.includes("explanation")) {
		return "conceptual";
	}
	if (entry.contentTypes.includes("diagram") || entry.contentTypes.includes("graph") || entry.contentTypes.includes("table")) {
		return "modeling";
	}
	if (entry.roles.includes("problem-stem") || entry.roles.includes("problem-part")) {
		return entry.difficultyBand === "high" ? "analysis" : "procedural";
	}
	return entry.difficultyBand === "high" ? "conceptual" : "procedural";
}

function prioritizeAssessmentUnits(entries: InstructionalUnitEntry[]) {
	return [...entries].sort((left, right) => {
		const leftQuestionLike = left.questionTexts.length > 0 || left.contentTypes.includes("question") || left.roles.includes("problem-stem") || left.roles.includes("problem-part");
		const rightQuestionLike = right.questionTexts.length > 0 || right.contentTypes.includes("question") || right.roles.includes("problem-stem") || right.roles.includes("problem-part");
		if (leftQuestionLike !== rightQuestionLike) {
			return leftQuestionLike ? -1 : 1;
		}
		return left.unit.unitId.localeCompare(right.unit.unitId);
	});
}

function buildAssessmentPrompts(entry: InstructionalUnitEntry, concept: string) {
	const prompts = entry.questionTexts.length > 0
		? entry.questionTexts
		: [entry.text || entry.unit.title || `Explain ${concept}.`];
	return unique(prompts.filter(Boolean));
}

function buildProblemBackedAssessmentEntries(context: BuilderContext<"build-test">, focus: string | null): InstructionalUnitEntry[] {
	return buildProblemEntries(context, focus).map((problem) => ({
		unit: {
			unitId: `problem-unit-${problem.problemId}`,
			fragments: [],
			concepts: problem.concepts,
			skills: [problem.cognitiveDemand, "problem-stem", "question"],
			learningTargets: [],
			misconceptions: problem.misconceptions,
			difficulty: problem.difficulty === "high" ? 1 : problem.difficulty === "medium" ? 0.5 : 0.2,
			linguisticLoad: 0.5,
			sourceSections: [],
			confidence: 1,
			title: problem.text,
		},
		text: problem.text,
		questionTexts: [problem.text],
		documentIds: [problem.documentId],
		sourceFileNames: [problem.sourceFileName],
		anchorNodeIds: problem.anchorNodeIds,
		roles: ["problem-stem"],
		contentTypes: ["question"],
		primaryDocumentId: problem.documentId,
		primarySourceFileName: problem.sourceFileName,
		difficultyBand: problem.difficulty,
	}));
}

function chooseTestItems(context: BuilderContext<"build-test">, focus: string | null, itemCount: number) {
	const groupedUnitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames)
		.filter((entry) => matchesFocus([entry.text, ...entry.unit.concepts, ...entry.unit.learningTargets], focus));
	const unitEntries = groupedUnitEntries.length > 0 ? groupedUnitEntries : buildProblemBackedAssessmentEntries(context, focus);
	const conceptEntries = buildConceptEntries(context, focus);
	const conceptNames = conceptEntries.map((entry) => entry.concept);
	const effectiveConceptNames = conceptNames.length > 0
		? conceptNames
		: unique(unitEntries.flatMap((entry) => entry.unit.concepts.length > 0 ? entry.unit.concepts : ["general"]));
	const itemsByConcept = new Map<string, TestItem[]>();
	const emittedPromptKeys = new Set<string>();
	let emitted = 0;

	for (const concept of effectiveConceptNames) {
		const conceptUnits = prioritizeAssessmentUnits(unitEntries.filter((entry) =>
			concept === "general"
				? true
				: entry.unit.concepts.includes(concept) || matchesFocus([entry.text, ...entry.unit.learningTargets], concept),
		));
		for (const unitEntry of conceptUnits) {
			if (emitted >= itemCount) {
				break;
			}

			for (const [promptIndex, prompt] of buildAssessmentPrompts(unitEntry, concept).entries()) {
				if (emitted >= itemCount) {
					break;
				}
				const promptKey = `${unitEntry.unit.unitId}:${prompt}`;
				if (emittedPromptKeys.has(promptKey)) {
					continue;
				}
				const item: TestItem = {
					itemId: `item-${unitEntry.unit.unitId}-${promptIndex + 1}`,
					prompt,
					concept,
					sourceDocumentId: unitEntry.primaryDocumentId,
					sourceFileName: unitEntry.primarySourceFileName,
					difficulty: unitEntry.difficultyBand,
					cognitiveDemand: inferUnitCognitiveDemand(unitEntry),
					answerGuidance: unitEntry.unit.learningTargets.length > 0
						? `Look for evidence that the student can ${joinList(unitEntry.unit.learningTargets).toLowerCase()}.`
						: `Look for accurate reasoning about ${concept}.`,
				};
				itemsByConcept.set(concept, [...(itemsByConcept.get(concept) ?? []), item]);
				emittedPromptKeys.add(promptKey);
				emitted += 1;
			}
		}

		if (conceptUnits.length === 0 && emitted < itemCount) {
			const sourceDocument = conceptEntries.find((entry) => entry.concept === concept)?.documentIds[0] ?? context.analyzedDocuments[0]?.document.id ?? "unknown-document";
			const sourceFileName = conceptEntries.find((entry) => entry.concept === concept)?.sourceFileNames[0]
				?? context.sourceFileNames[sourceDocument]
				?? context.analyzedDocuments[0]?.document.sourceFileName
				?? "Unknown source";
			const fallbackKey = `concept-fallback:${concept}`;
			if (!emittedPromptKeys.has(fallbackKey)) {
				const item: TestItem = {
					itemId: `item-concept-${concept.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "general"}`,
					prompt: `Explain ${concept} and show how you would apply it.`,
					concept,
					sourceDocumentId: sourceDocument,
					sourceFileName,
					difficulty: "medium",
					cognitiveDemand: "conceptual",
					answerGuidance: `Look for accurate reasoning about ${concept} and a valid application example.`,
				};
				itemsByConcept.set(concept, [...(itemsByConcept.get(concept) ?? []), item]);
				emittedPromptKeys.add(fallbackKey);
				emitted += 1;
			}
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
			? `This draft assessment pulls ${totalItemCount} items from grouped instructional units and organizes them by concept.`
			: "No grouped instructional units were available to build an assessment draft.",
		estimatedDurationMinutes: Math.max(5, totalItemCount * 3),
		sections,
		totalItemCount,
		generatedAt: new Date().toISOString(),
	};
}

function buildCompareMetricEntries(context: BuilderContext<"compare-documents">) {
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);
	const effectiveConceptToDocumentMap = buildEffectiveConceptToDocumentMap(context, unitEntries, context.collectionAnalysis);
	const effectiveDocumentConceptMap = buildEffectiveDocumentConceptMap(context, unitEntries);
	return context.analyzedDocuments.map((analyzed) => ({
		documentId: analyzed.document.id,
		sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
		problemCount: analyzed.problems.length,
		dominantDifficulty: dominantDifficulty(analyzed),
		averageDifficultyScore: average(analyzed.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
		representations: analyzed.insights.representations,
		instructionalDensity: analyzed.insights.instructionalDensity,
		uniqueConcepts: (effectiveDocumentConceptMap.get(analyzed.document.id) ?? analyzed.insights.concepts).filter((concept) => (effectiveConceptToDocumentMap[concept] ?? []).length === 1),
		sharedConcepts: (effectiveDocumentConceptMap.get(analyzed.document.id) ?? analyzed.insights.concepts).filter((concept) => (effectiveConceptToDocumentMap[concept] ?? []).length >= 2),
	}));
}

function buildCompareDocumentsProduct(context: BuilderContext<"compare-documents">): CompareDocumentsProduct {
	const focus = getFocus(context.request.options);
	const metrics = buildCompareMetricEntries(context);
	const filteredOverlap = Object.entries(buildEffectiveConceptToDocumentMap(context, collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames), context.collectionAnalysis))
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
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);

	for (const entry of unitEntries) {
		if (!entry.text || !matchesFocus([entry.text, ...entry.unit.concepts, ...entry.unit.learningTargets, ...entry.roles], focus)) {
			continue;
		}

		const key = `${entry.text.toLowerCase()}::${entry.roles.slice().sort().join("|")}::${entry.contentTypes.slice().sort().join("|")}::${entry.unit.concepts.slice().sort().join("|")}`;
		const existing = merged.get(key);
		const sourceAnchors = entry.documentIds.map((documentId) => ({
			documentId,
			anchorNodeIds: unique(entry.unit.fragments.filter((fragment) => fragment.documentId === documentId).flatMap((fragment) => fragment.anchors.map((anchor) => anchor.nodeId))),
		}));

		if (!existing) {
			merged.set(key, {
				mergedFragmentId: `merged-fragment-${entry.unit.unitId}`,
				text: entry.text,
				instructionalRole: entry.roles[0] ?? "other",
				contentType: entry.contentTypes[0] ?? "text",
				sourceDocumentIds: entry.documentIds,
				sourceAnchors,
			});
			continue;
		}

		existing.sourceDocumentIds = unique([...existing.sourceDocumentIds, ...entry.documentIds]);
		for (const sourceAnchor of sourceAnchors) {
			existing.sourceAnchors = existing.sourceAnchors.some((existingAnchor) => existingAnchor.documentId === sourceAnchor.documentId)
				? existing.sourceAnchors.map((existingAnchor) => existingAnchor.documentId === sourceAnchor.documentId
					? { ...existingAnchor, anchorNodeIds: unique([...existingAnchor.anchorNodeIds, ...sourceAnchor.anchorNodeIds]).sort() }
					: existingAnchor)
				: [...existing.sourceAnchors, sourceAnchor];
		}
	}

	return [...merged.values()];
}

function buildMergeDocumentsProduct(context: BuilderContext<"merge-documents">): MergeDocumentsProduct {
	const focus = getFocus(context.request.options);
	const mergedProblems = mergeProblemEntries(context, focus);
	const mergedFragments = mergeFragmentEntries(context, focus);
	const effectiveConceptToDocumentMap = buildEffectiveConceptToDocumentMap(context, collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames), context.collectionAnalysis);

	return {
		kind: "merge-documents",
		focus,
		mergedConcepts: Object.keys(effectiveConceptToDocumentMap).filter((concept) => matchesFocus([concept], focus)).sort(),
		mergedProblems,
		mergedFragments,
		mergedInsights: {
			totalDocuments: context.analyzedDocuments.length,
			totalProblems: mergedProblems.length,
			totalFragments: mergedFragments.length,
			totalConcepts: Object.keys(effectiveConceptToDocumentMap).length,
			coverageSummary: {
				totalConcepts: Object.keys(effectiveConceptToDocumentMap).length,
				conceptGaps: context.collectionAnalysis.conceptGaps,
				docsPerConcept: Object.fromEntries(Object.entries(effectiveConceptToDocumentMap).map(([concept, documentIds]) => [concept, documentIds.length])),
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
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);
	const effectiveConceptToDocumentMap = buildEffectiveConceptToDocumentMap(context, unitEntries, context.collectionAnalysis);
	const orderedDocuments = [...context.analyzedDocuments].sort((left, right) => {
		const leftDifficulty = average(unitEntries.filter((entry) => entry.documentIds.includes(left.document.id)).map((entry) => entry.unit.difficulty * 3))
			|| average(left.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		const rightDifficulty = average(unitEntries.filter((entry) => entry.documentIds.includes(right.document.id)).map((entry) => entry.unit.difficulty * 3))
			|| average(right.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
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
		const currentConcepts = unique(unitEntries
			.filter((entry) => entry.documentIds.includes(analyzed.document.id))
			.flatMap((entry) => entry.unit.concepts))
			.filter((concept) => matchesFocus([concept], focus));
		const bridgingConcepts = currentConcepts.filter((concept) => seenConcepts.has(concept));
		const missingPrerequisites = currentConcepts.filter((concept) => !seenConcepts.has(concept) && (effectiveConceptToDocumentMap[concept] ?? []).length === 1);

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
			anchorNodeIds: unique(unitEntries
				.filter((entry) => entry.documentIds.includes(analyzed.document.id))
				.flatMap((entry) => entry.anchorNodeIds)).slice(0, 12),
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

function buildLessonProduct(context: BuilderContext<"build-lesson">): LessonProduct {
	const focus = getFocus(context.request.options);
	const analyzed = context.analyzedDocuments[0]!;
	const sourceFileName = context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName;
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, [analyzed], context.sourceFileNames)
		.filter((entry) => matchesFocus([entry.text, ...entry.unit.concepts, ...entry.unit.learningTargets], focus));
	const problemEntries = buildProblemEntries(context, focus);
	const objectiveEntries = unique(unitEntries.flatMap((entry) => entry.unit.learningTargets));
	const prerequisiteConcepts = unique(unitEntries.flatMap((entry) => entry.unit.concepts).filter(Boolean));
	const misconceptionTriggers = unique(unitEntries.flatMap((entry) => entry.unit.misconceptions).filter(Boolean));
	const coreConcepts = unique([...(focus ? [focus] : []), ...prerequisiteConcepts, ...analyzed.insights.concepts].filter(Boolean)).slice(0, 3);
	const sourceAnchorNodeIds = unique([
		...unitEntries.flatMap((entry) => entry.anchorNodeIds),
		...problemEntries.flatMap((problem) => problem.anchorNodeIds),
	]);
	const isMinimalContentMode = analyzed.insights.instructionalDensity < 0.45
		|| (analyzed.insights.exampleCount + analyzed.insights.explanationCount === 0 && problemEntries.length < 2)
		|| (unitEntries.length < 3 && problemEntries.length < 2);
	const scaffoldEntries = unitEntries
		.map((entry) => ({
			concepts: entry.unit.concepts.length > 0 ? entry.unit.concepts : coreConcepts,
			level: entry.difficultyBand === "high" ? "low" as const : entry.difficultyBand === "low" ? "high" as const : "medium" as const,
			strategy: entry.text || entry.unit.title || `Scaffold ${entry.difficultyBand}`,
			documentIds: entry.documentIds,
			roles: entry.roles,
			misconceptions: entry.unit.misconceptions,
		}));
	const noteEntries = unitEntries
		.filter((entry) => entry.roles.includes("note") || entry.roles.includes("reflection") || entry.roles.includes("objective"))
		.map((entry) => entry.text)
		.filter(Boolean);

	function stripLessonLabel(text: string) {
		return text
			.replace(/^(section\s*\d+\s*[-:]\s*)/i, "")
			.replace(/^(learning target|warm[- ]up|concept introduction|guided practice|independent practice|exit ticket|teacher notes?)\s*[:\-]\s*/i, "")
			.trim();
	}

	function normalizeLessonText(text: string) {
		return dedupeParagraphs(stripLessonLabel(text))
			.split(/\n+/)
			.map((line) => line.trim())
			.filter(Boolean)
			.join(" ")
			.trim();
	}

	function splitLessonSentences(text: string) {
		const normalized = normalizeLessonText(text);
		if (!normalized) {
			return [];
		}

		const matches = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
		return dedupeLines(matches.map((sentence) => {
			const trimmed = sentence.trim();
			if (!trimmed) {
				return "";
			}
			return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
		}).filter(Boolean));
	}

	function joinCoreConcepts(limit = 2) {
		return joinList(coreConcepts.slice(0, limit)) || "the main concept";
	}

	function buildLessonSegment(title: string, description: string, options?: Partial<LessonSegment>): LessonSegment {
		return {
			title,
			description: normalizeLessonText(description),
			documentId: options?.documentId ?? analyzed.document.id,
			sourceFileName: options?.sourceFileName ?? sourceFileName,
			anchorNodeIds: options?.anchorNodeIds ?? sourceAnchorNodeIds,
			concepts: options?.concepts ?? coreConcepts,
		};
	}

	function ensureQuestion(text: string) {
		const normalized = normalizeLessonText(text).replace(/[.!]+$/g, "").trim();
		if (!normalized) {
			return `What do you already know about ${joinCoreConcepts(1)}?`;
		}
		return /\?$/.test(normalized) ? normalized : `${normalized}?`;
	}

	function fallbackExplanationSentence() {
		return coreConcepts.length > 1
			? `Connect ${joinCoreConcepts(2)} before students move into independent practice.`
			: `Connect ${joinCoreConcepts(1)} to a concrete example before students practice on their own.`;
	}

	const explanationEntries = unitEntries.filter((entry) => entry.roles.includes("explanation") && entry.text.trim().length > 0);
	const exampleEntries = unitEntries.filter((entry) => entry.roles.includes("example") && entry.text.trim().length > 0);
	const reflectionEntries = unitEntries.filter((entry) => entry.roles.includes("reflection") && entry.text.trim().length > 0);
	const problemMisconceptions = dedupeLines(problemEntries.flatMap((problem) => problem.misconceptions).filter(Boolean));
	const uniqueProblems = problemEntries.filter((problem, index, entries) => {
		const normalized = normalizeLessonText(problem.text);
		return normalized.length > 0 && entries.findIndex((entry) => normalizeLessonText(entry.text) === normalized) === index;
	});

	function titleCaseConcept(value: string) {
		return value
			.trim()
			.replace(/[.!?]+$/g, "")
			.split(/\s+/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	function buildCuratedScaffolds() {
		const grouped = new Map<string, { level: "low" | "medium" | "high"; strategies: string[]; documentIds: string[] }>();

		for (const entry of scaffoldEntries) {
			for (const concept of entry.concepts.length > 0 ? entry.concepts : coreConcepts) {
				const normalizedConcept = normalizeLessonText(concept);
				if (!normalizedConcept) {
					continue;
				}

				const group = grouped.get(normalizedConcept) ?? {
					level: entry.level,
					strategies: [],
					documentIds: [],
				};

				group.level = group.level === "medium" ? entry.level : group.level;
				group.strategies = dedupeLines([
					...group.strategies,
					entry.roles.includes("example")
						? `Model one concise example for ${normalizedConcept} before students try it independently.`
						: "",
					entry.roles.includes("explanation") || entry.roles.includes("objective")
						? `Restate ${normalizedConcept} in student-friendly language and highlight the key vocabulary.`
						: "",
					entry.misconceptions[0]
						? `Contrast ${normalizedConcept} with ${entry.misconceptions[0].toLowerCase()} before releasing students to practice.`
						: "",
					entry.strategy,
				].filter(Boolean)).slice(0, 2);
				group.documentIds = dedupeLines([...group.documentIds, ...entry.documentIds]);
				grouped.set(normalizedConcept, group);
			}
		}

		if (grouped.size === 0) {
			for (const concept of coreConcepts.slice(0, 2)) {
				grouped.set(concept, {
					level: "medium",
					strategies: [`Model one short example for ${concept} and name the strategy students should repeat.`],
					documentIds: [analyzed.document.id],
				});
			}
		}

		return [...grouped.entries()]
			.sort((left, right) => left[0].localeCompare(right[0]))
			.flatMap(([concept, group]) => group.strategies.map((strategy) => ({
				concept: titleCaseConcept(concept),
				level: group.level,
				strategy,
				documentIds: group.documentIds,
			})));
	}

	function buildTeacherNotes() {
		return dedupeLines([
			prerequisiteConcepts.length > 0
				? `Check prerequisite understanding of ${joinList(prerequisiteConcepts.slice(0, 2))} before guided practice begins.`
				: "",
			(problemMisconceptions[0] || misconceptionTriggers[0])
				? `Watch for ${String(problemMisconceptions[0] || misconceptionTriggers[0]).toLowerCase()} and correct it with a quick counterexample.`
				: "",
			coreConcepts.length > 0
				? `Listen for students to explain ${joinCoreConcepts(2)} aloud during the exit ticket, not just produce an answer.`
				: "",
			...noteEntries.slice(0, 2).map((entry) => {
				const sentence = splitLessonSentences(entry)[0];
				return sentence ? `During instruction, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}` : "";
			}),
		].filter(Boolean)).slice(0, 3);
	}

	const curatedScaffolds = buildCuratedScaffolds();
	const curatedTeacherNotes = buildTeacherNotes();

	const warmUp = [buildLessonSegment(
		"Quick Check",
		uniqueProblems[0]
			? `Start with a short retrieval prompt: ${ensureQuestion(uniqueProblems[0].text)}`
			: `Ask students to explain what ${joinCoreConcepts(1)} means and share one example they already know.`,
		uniqueProblems[0]
			? {
				documentId: uniqueProblems[0].documentId,
				sourceFileName: uniqueProblems[0].sourceFileName,
				anchorNodeIds: uniqueProblems[0].anchorNodeIds,
				concepts: uniqueProblems[0].concepts,
			}
			: undefined,
	)];

	const conceptIntroduction: LessonSegment[] = [];
	for (const entry of explanationEntries) {
		const sentences = splitLessonSentences(entry.text).slice(0, 4);
		if (sentences.length === 0) {
			continue;
		}

		if (sentences.length === 1) {
			sentences.push(fallbackExplanationSentence());
		}

		while (sentences.length > 0 && conceptIntroduction.length < 2) {
			const chunk = sentences.splice(0, sentences.length >= 4 ? 2 : Math.min(2, sentences.length));
			if (chunk.length === 1) {
				chunk.push(fallbackExplanationSentence());
			}
			conceptIntroduction.push(buildLessonSegment(`Key Idea ${conceptIntroduction.length + 1}`, chunk.slice(0, 4).join(" "), {
				documentId: entry.primaryDocumentId,
				sourceFileName: entry.primarySourceFileName,
				anchorNodeIds: entry.anchorNodeIds,
				concepts: entry.unit.concepts,
			}));
		}

		if (conceptIntroduction.length >= 2) {
			break;
		}
	}

	if (conceptIntroduction.length === 0) {
		conceptIntroduction.push(
			buildLessonSegment("Key Idea 1", `${joinCoreConcepts(1)} is the central idea for this lesson. State the meaning clearly before students move into practice.`),
			buildLessonSegment("Key Idea 2", fallbackExplanationSentence()),
		);
	}

	const guidedPracticeCandidates = dedupeLines([
		...exampleEntries.map((entry) => normalizeLessonText(entry.text)),
		...uniqueProblems.map((problem) => normalizeLessonText(problem.text)),
	].filter(Boolean));
	const guidedPractice = guidedPracticeCandidates.slice(0, 2).map((text, index) => buildLessonSegment(
		`Worked Example ${index + 1}`,
		text.includes("?")
			? `Model this together: ${ensureQuestion(text)}`
			: `${text} Think aloud as students identify the strategy and justify each step.`,
	));
	if (guidedPractice.length === 0) {
		guidedPractice.push(buildLessonSegment(
			"Worked Example 1",
			`Model one example about ${joinCoreConcepts(1)} and think aloud so students can hear the strategy before they practice independently.`,
		));
	}

	const independentPracticePromptCount = isMinimalContentMode ? 2 : 3;
	const independentPracticePrompts = dedupeLines([
		...uniqueProblems.map((problem) => normalizeLessonText(problem.text)),
		`Solve a new problem about ${joinCoreConcepts(1)} and show each step.`,
		`Explain your reasoning about ${joinCoreConcepts(1)} using words, numbers, or a model.`,
		coreConcepts[1]
			? `Compare ${coreConcepts[0]} and ${coreConcepts[1]} in a short response and justify your thinking.`
			: `Create your own example about ${joinCoreConcepts(1)} and explain why it works.`,
	].filter(Boolean)).slice(0, independentPracticePromptCount);
	const independentPractice = independentPracticePrompts.map((prompt, index) => buildLessonSegment(
		`Practice ${index + 1}`,
		prompt,
	));

	const exitTicketPrompt = reflectionEntries[0]
		? ensureQuestion(reflectionEntries[0].text)
		: misconceptionTriggers[0]
			? `In 2-3 sentences, explain ${joinCoreConcepts(1)} and describe how to avoid ${misconceptionTriggers[0].toLowerCase()}.`
			: `In 2-3 sentences, explain ${joinCoreConcepts(1)} and give one example.`;
	const exitTicket = [buildLessonSegment("Exit Prompt", exitTicketPrompt, reflectionEntries[0]
		? {
			documentId: reflectionEntries[0].primaryDocumentId,
			sourceFileName: reflectionEntries[0].primarySourceFileName,
			anchorNodeIds: reflectionEntries[0].anchorNodeIds,
			concepts: reflectionEntries[0].unit.concepts,
		}
		: undefined)];

	return {
		kind: "lesson",
		focus,
		title: focus ? `Lesson Builder: ${focus}` : `Lesson Builder: ${sourceFileName}`,
		learningObjectives: objectiveEntries.length > 0 ? objectiveEntries : analyzed.insights.concepts.slice(0, 3).map((concept) => `Students will explain and apply ${concept}.`),
		prerequisiteConcepts,
		warmUp,
		conceptIntroduction,
		guidedPractice,
		independentPractice,
		exitTicket,
		misconceptions: misconceptionTriggers.map((trigger) => ({
			trigger,
			correction: `Address ${trigger.toLowerCase()} with a quick model and a corrected example.`,
			documentIds: [analyzed.document.id],
		})),
		scaffolds: curatedScaffolds.length > 0 ? curatedScaffolds : [{ concept: titleCaseConcept(joinCoreConcepts(1)), level: "medium", strategy: "Model the first problem together before releasing to independent work.", documentIds: [analyzed.document.id] }],
		extensions: problemEntries.filter((problem) => problem.difficulty === "high").map((problem) => `Extend with: ${problem.text}`).slice(0, 2),
		teacherNotes: curatedTeacherNotes.length > 0 ? curatedTeacherNotes : [`Use ${sourceFileName} as the core source and emphasize ${joinList(analyzed.insights.concepts.slice(0, 2)) || "the central concepts"}.`],
		sourceAnchors: collectSourceAnchors([analyzed]),
		generatedAt: new Date().toISOString(),
	};
}

function buildUnitProduct(context: BuilderContext<"build-unit">): UnitProduct {
	const focus = getFocus(context.request.options);
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);
	const effectiveConceptToDocumentMap = buildEffectiveConceptToDocumentMap(context, unitEntries, context.collectionAnalysis);
	const orderedDocuments = [...context.analyzedDocuments].sort((left, right) => {
		const leftScore = average(unitEntries.filter((entry) => entry.documentIds.includes(left.document.id)).map((entry) => entry.unit.difficulty * 3))
			|| average(left.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		const rightScore = average(unitEntries.filter((entry) => entry.documentIds.includes(right.document.id)).map((entry) => entry.unit.difficulty * 3))
			|| average(right.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty]));
		return leftScore - rightScore || left.document.id.localeCompare(right.document.id);
	});
	const lessonSequence = orderedDocuments.map((analyzed, index) => {
		const documentUnitEntries = unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id));
		const focusConcepts = unique(documentUnitEntries.flatMap((entry) => entry.unit.concepts));
		const priorDocumentIds = orderedDocuments.slice(0, index).map((document) => document.document.id);
		const priorConcepts = unique(unitEntries
			.filter((entry) => entry.documentIds.some((documentId) => priorDocumentIds.includes(documentId)))
			.flatMap((entry) => entry.unit.concepts));

		return {
			position: index + 1,
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			focusConcepts,
			rationale: index === 0
				? `Open the unit with ${joinList(focusConcepts.slice(0, 2)) || "core concepts"} because this document has the lowest difficulty profile.`
				: `Place this after earlier documents to build from ${joinList(focusConcepts.filter((concept) => priorConcepts.includes(concept))) || "the prior concepts"}.`,
			anchorNodeIds: unique(documentUnitEntries.flatMap((entry) => entry.anchorNodeIds)),
		};
	});
	const conceptMap = Object.entries(effectiveConceptToDocumentMap).map(([concept, documentIds]) => ({
		concept,
		documentIds,
		prerequisites: unique(unitEntries.filter((entry) => entry.unit.concepts.includes(concept)).flatMap((entry) => entry.unit.concepts).filter((item) => item !== concept)),
	}));
	const misconceptionMap = Object.entries(effectiveConceptToDocumentMap).map(([concept, documentIds]) => ({
		concept,
		triggers: unique(unitEntries.filter((entry) => entry.text.toLowerCase().includes(concept.toLowerCase()) || entry.unit.concepts.includes(concept)).flatMap((entry) => entry.unit.misconceptions)).slice(0, 3),
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
			averageDifficultyScore: average(unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id)).map((entry) => entry.unit.difficulty * 3))
				|| average(analyzed.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
		})),
		representationCurve: orderedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			representations: analyzed.insights.representations,
		})),
		misconceptionMap,
		suggestedAssessments: orderedDocuments.map((analyzed) => {
			const documentUnitEntries = unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id));
			return `Assessment checkpoint from ${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName} on ${joinList(unique(documentUnitEntries.flatMap((entry) => entry.unit.concepts)).slice(0, 2)) || "key ideas"}.`;
		}).slice(0, 3),
		suggestedReviews: context.collectionAnalysis.conceptGaps.slice(0, 3).map((concept) => `Review ${concept} before moving to the next lesson.`),
		suggestedPracticeSets: orderedDocuments.map((analyzed) => {
			const documentUnitCount = unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id)).length;
			return `Practice set using ${documentUnitCount || analyzed.problems.length} instructional block(s) from ${context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName}.`;
		}).slice(0, 3),
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function buildInstructionalMapProduct(context: BuilderContext<"build-instructional-map">): InstructionalMapProduct {
	const focus = getFocus(context.request.options);
	const unitEntries = collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames);
	const filteredConceptEntries = buildConceptBuckets(context, unitEntries, focus);
	const resolveUnitAlignmentConcepts = (entry: InstructionalUnitEntry) => {
		const directConcepts = entry.unit.concepts.filter((concept) => matchesFocus([concept], focus));
		if (directConcepts.length > 0) {
			return directConcepts;
		}

		return unique(context.analyzedDocuments
			.filter((analyzed) => entry.documentIds.includes(analyzed.document.id))
			.flatMap((analyzed) => analyzed.insights.concepts)
			.filter((concept) => matchesFocus([concept], focus)));
	};
	const representationBuckets = unique(unitEntries.flatMap((entry) => entry.contentTypes))
		.map((representation) => ({
			node: representation,
			documentIds: unique(unitEntries.filter((entry) => entry.contentTypes.includes(representation)).flatMap((entry) => entry.documentIds)),
		}));
	const misconceptionBuckets = unique(unitEntries.flatMap((entry) => entry.unit.misconceptions))
		.map((trigger) => ({
			node: trigger,
			documentIds: unique(unitEntries.filter((entry) => entry.unit.misconceptions.includes(trigger)).flatMap((entry) => entry.documentIds)),
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
			averageDifficultyScore: average(unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id)).map((entry) => entry.unit.difficulty * 3))
				|| average(analyzed.problems.map((problem) => DIFFICULTY_SCORE[problem.difficulty])),
		})),
		documentConceptAlignment: context.analyzedDocuments.map((analyzed) => ({
			documentId: analyzed.document.id,
			sourceFileName: context.sourceFileNames[analyzed.document.id] ?? analyzed.document.sourceFileName,
			concepts: (() => {
				const unitConcepts = unique(unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id)).flatMap((entry) => entry.unit.concepts));
				if (unitConcepts.length > 0) {
					return unitConcepts;
				}
				return analyzed.insights.concepts.filter((concept) => matchesFocus([concept], focus));
			})(),
		})),
		unitConceptAlignment: unitEntries.map((entry) => ({
			unitId: entry.unit.unitId,
			title: entry.unit.title ?? entry.text,
			concepts: resolveUnitAlignmentConcepts(entry),
			documentIds: entry.documentIds,
			sourceFileNames: entry.sourceFileNames,
			anchorNodeIds: entry.anchorNodeIds,
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
			roles: unitEntries.filter((entry) => entry.documentIds.includes(analyzed.document.id)).reduce<Record<string, number>>((acc, entry) => {
				for (const role of entry.roles) {
					acc[role] = (acc[role] ?? 0) + 1;
				}
				return acc;
			}, {}),
		})),
		sourceAnchors: collectSourceAnchors(context.analyzedDocuments),
		generatedAt: new Date().toISOString(),
	};
}

function buildCurriculumAlignmentProduct(context: BuilderContext<"curriculum-alignment">): CurriculumAlignmentProduct {
	const focus = getFocus(context.request.options);
	const concepts = Object.entries(buildEffectiveConceptToDocumentMap(context, collectInstructionalUnitEntries(context.instructionalUnits, context.analyzedDocuments, context.sourceFileNames), context.collectionAnalysis)).filter(([concept]) => matchesFocus([concept], focus));
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

function buildBuilderContext<T extends BuiltIntentType>(request: IntentRequest & { intentType: T }, context: PrismSessionContext): BuilderContext<T> {
	const session = context.session;
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

	const analyzedDocuments = request.documentIds.map((documentId) => {
		const analyzedDocument = context.analyzedDocuments.find((document) => document.document.id === documentId);
		if (!analyzedDocument) {
			throw new IntentBuildError(404, `Document ${documentId} has not been analyzed`);
		}
		return analyzedDocument;
	});
	const instructionalUnits = context.groupedUnits
		.filter((unit) => unit.fragments.some((fragment) => request.documentIds.includes(fragment.documentId)))
		.map((unit) => ({
			...unit,
			fragments: unit.fragments.filter((fragment) => request.documentIds.includes(fragment.documentId)),
		}));

	return {
		request,
		analyzedDocuments,
		instructionalUnits,
		collectionAnalysis: context.collectionAnalysis,
		sourceFileNames: context.sourceFileNames,
		documentSummaries: buildDocumentSummaries(analyzedDocuments, context.sourceFileNames, collectInstructionalUnitEntries(instructionalUnits, analyzedDocuments, context.sourceFileNames)),
	};
}

export async function buildIntentPayload<T extends BuiltIntentType>(request: IntentRequest & { intentType: T }, prismSessionContext: PrismSessionContext): Promise<IntentPayloadByType[T]> {
	const context = buildBuilderContext(request, prismSessionContext);
	return cleanupProductPayload(BUILDERS[request.intentType](context as BuilderContext<T>)) as IntentPayloadByType[T];
}

export function getIntentBuildErrorStatus(error: unknown) {
	return error instanceof IntentBuildError ? error.statusCode : 500;
}