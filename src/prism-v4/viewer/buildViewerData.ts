import type { IntentProduct, TestProduct } from "../schema/integration";
import type { AnalyzedDocument, DocumentCollectionAnalysis, ExtractedProblemCognitiveDemand, ExtractedProblemDifficulty, ScoredDocumentConcept } from "../schema/semantic";
import { buildInstructionalPreview } from "../session/buildInstructionalPreview";
import type {
	AssessmentPreviewItemModel,
	BlueprintModel,
	ConceptMapModel,
	InstructionalSessionWorkspace,
} from "../session/InstructionalIntelligenceSession";

type ViewerDifficulty = ExtractedProblemDifficulty | "mixed";
type ViewerDemand = ExtractedProblemCognitiveDemand | "mixed";

export interface ViewerDocumentSummary {
	documentId: string;
	sourceFileName: string;
	sourceMimeType: string;
	createdAt: string;
	contentHash?: string;
	contentHashV1?: string;
	contentHashV2?: string;
	problemCount: number;
	conceptCount: number;
	concepts: string[];
	primaryConcepts: string[];
	groupCount: number;
}

export interface ViewerProblemEntry {
	problemId: string;
	text: string;
	concepts: string[];
	representations: string[];
	difficulty: ExtractedProblemDifficulty;
	cognitiveDemand: ExtractedProblemCognitiveDemand;
	sourceSpan?: {
		firstPage: number;
		lastPage: number;
	};
	anchors: Array<{
		surfaceId: string;
		nodeId: string;
		startOffset?: number;
		endOffset?: number;
	}>;
	misconceptions: string[];
}

export interface ViewerProblemGroup {
	groupId: string;
	documentId: string;
	sourceFileName: string;
	sourceSpan?: {
		firstPage: number;
		lastPage: number;
	};
	title: string;
	problemCount: number;
	concepts: string[];
	primaryConcepts: string[];
	representations: string[];
	misconceptions: string[];
	difficulty: ViewerDifficulty;
	cognitiveDemand: ViewerDemand;
	problems: ViewerProblemEntry[];
	previewItems: AssessmentPreviewItemModel[];
	previewItemIds: string[];
	previewConcepts: string[];
	previewSourceDocumentIds: string[];
	previewPageSpans: Array<{
		firstPage: number;
		lastPage: number;
	}>;
	linkedPreviewCount: number;
	linkedPreviewFallbackCount: number;
	linkedBy: "groupId" | "concept" | "none";
	conceptFrequencies: Record<string, number>;
}

export interface ViewerScoredConcept {
	concept: string;
	documentIds: string[];
	sourceFileNames: string[];
	averageScore: number;
	totalScore: number;
	coverageScore: number;
	gapScore: number;
	freqProblems: number;
	freqPages: number;
	freqDocuments: number;
	groupCount: number;
	multipartPresence: number;
	crossDocumentAnchor: boolean;
	gap: boolean;
	noiseCandidate: boolean;
	stability: number;
	overlapStrength: number;
	redundancy: number;
	problemGroupIds: string[];
	previewItemIds: string[];
	previewCount: number;
	previewDocumentIds: string[];
	previewGroups: string[];
	previewPageSpans: Array<{
		firstPage: number;
		lastPage: number;
	}>;
	groupIds: string[];
	problemCount: number;
	previewItems: AssessmentPreviewItemModel[];
	linkedPreviewFallbackCount: number;
	previewCoverage: number;
	conceptCoverageEntry?: NonNullable<DocumentCollectionAnalysis["coverageSummary"]["conceptCoverage"]>[string];
}

export interface ViewerData {
	sessionId: string;
	documents: ViewerDocumentSummary[];
	problemGroups: ViewerProblemGroup[];
	scoredConcepts: ViewerScoredConcept[];
	collectionAnalysis: DocumentCollectionAnalysis | null;
	blueprint: BlueprintModel | null;
	conceptGraph: ConceptMapModel | null;
	previewItems: AssessmentPreviewItemModel[];
	previewSource: "session" | "product" | "none";
	selectedIntent?: InstructionalSessionWorkspace["selectedIntent"];
	productIds: string[];
	productTypes: string[];
	availableSurfaces: Array<"documents" | "analysis" | "blueprint" | "concept-graph" | "preview">;
	generatedAt: string;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const value of values) {
		const normalized = value?.trim();
		if (!normalized || seen.has(normalized)) {
			continue;
		}

		seen.add(normalized);
		result.push(normalized);
	}

	return result;
}

function mergeSourceSpan(
	left?: { firstPage: number; lastPage: number },
	right?: { firstPage: number; lastPage: number },
) {
	if (!left) {
		return right;
	}
	if (!right) {
		return left;
	}

	return {
		firstPage: Math.min(left.firstPage, right.firstPage),
		lastPage: Math.max(left.lastPage, right.lastPage),
	};
	}

function toTitle(text: string) {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized) {
		return "Untitled problem group";
	}
	return normalized.length > 96 ? `${normalized.slice(0, 93).trimEnd()}...` : normalized;
}

function resolveSharedValue<T extends string>(values: T[]): T | "mixed" {
	const [first, ...rest] = values;
	if (!first) {
		return "mixed";
	}
	return rest.every((value) => value === first) ? first : "mixed";
}

function compareSpans(
	left?: { firstPage: number; lastPage: number },
	right?: { firstPage: number; lastPage: number },
) {
	if (!left && !right) {
		return 0;
	}
	if (!left) {
		return 1;
	}
	if (!right) {
		return -1;
	}
	if (left.firstPage !== right.firstPage) {
		return left.firstPage - right.firstPage;
	}
	return left.lastPage - right.lastPage;
}

function findTestProduct(products: IntentProduct[]): { product: TestProduct; productRecord: IntentProduct<"build-test"> } | null {
	const productRecord = products.find((candidate): candidate is IntentProduct<"build-test"> => candidate.productType === "build-test" && candidate.payload.kind === "test");
	if (!productRecord) {
		return null;
	}

	return {
		product: productRecord.payload,
		productRecord,
	};
}

function resolvePreview(workspace: InstructionalSessionWorkspace) {
	const existing = workspace.instructionalSession?.assessmentPreview;
	if (existing?.items?.length) {
		return {
			items: existing.items,
			source: "session" as const,
		};
	}

	const testProduct = findTestProduct(workspace.products);
	if (testProduct) {
		return {
			items: buildInstructionalPreview(testProduct).items,
			source: "product" as const,
		};
	}

	return {
		items: [] as AssessmentPreviewItemModel[],
		source: "none" as const,
	};
}

function buildDocumentSummaries(workspace: InstructionalSessionWorkspace): ViewerDocumentSummary[] {
	const analyzedById = new Map(workspace.analyzedDocuments.map((document) => [document.document.id, document]));

	return workspace.documents.map((document) => {
		const analyzed = analyzedById.get(document.documentId);
		const concepts = uniqueStrings(analyzed?.insights.scoredConcepts?.map((concept) => concept.concept) ?? analyzed?.insights.concepts ?? []);
		const groupIds = new Set((analyzed?.problems ?? []).map((problem) => problem.problemGroupId ?? problem.id));

		return {
			documentId: document.documentId,
			sourceFileName: document.sourceFileName,
			sourceMimeType: document.sourceMimeType,
			createdAt: document.createdAt,
			contentHash: analyzed?.contentHash,
			contentHashV1: analyzed?.contentHashV1,
			contentHashV2: analyzed?.contentHashV2,
			problemCount: analyzed?.problems.length ?? 0,
			conceptCount: concepts.length,
			concepts,
			primaryConcepts: concepts.slice(0, 5),
			groupCount: groupIds.size,
		};
	});
}

function buildProblemGroups(
	analyzedDocuments: AnalyzedDocument[],
	previewItems: AssessmentPreviewItemModel[],
): ViewerProblemGroup[] {
	const previewByGroup = new Map<string, AssessmentPreviewItemModel[]>();
	const previewByConcept = new Map<string, AssessmentPreviewItemModel[]>();

	for (const item of previewItems) {
		if (item.groupId) {
			previewByGroup.set(item.groupId, [...(previewByGroup.get(item.groupId) ?? []), item]);
		}
		for (const concept of uniqueStrings(item.primaryConcepts ?? [item.conceptId])) {
			previewByConcept.set(concept, [...(previewByConcept.get(concept) ?? []), item]);
		}
	}

	const groups = new Map<string, ViewerProblemGroup>();

	for (const analyzed of analyzedDocuments) {
		for (const problem of analyzed.problems) {
			const groupId = problem.problemGroupId ?? problem.id;
			const key = `${problem.documentId}::${groupId}`;
			const existing = groups.get(key);
			const problemEntry: ViewerProblemEntry = {
				problemId: problem.id,
				text: problem.text,
				concepts: uniqueStrings(problem.concepts),
				representations: uniqueStrings(problem.representations),
				difficulty: problem.difficulty,
				cognitiveDemand: problem.cognitiveDemand,
				sourceSpan: problem.sourceSpan,
				anchors: problem.anchors.map((anchor) => ({
					surfaceId: anchor.surfaceId,
					nodeId: anchor.nodeId,
					startOffset: anchor.startOffset,
					endOffset: anchor.endOffset,
				})),
				misconceptions: uniqueStrings(problem.misconceptions),
			};

			if (!existing) {
				groups.set(key, {
					groupId,
					documentId: problem.documentId,
					sourceFileName: analyzed.document.sourceFileName,
					sourceSpan: problem.sourceSpan,
					title: toTitle(problem.text),
					problemCount: 1,
					concepts: uniqueStrings(problem.concepts),
					primaryConcepts: uniqueStrings(problem.concepts).slice(0, 4),
					representations: uniqueStrings(problem.representations),
					misconceptions: uniqueStrings(problem.misconceptions),
					difficulty: problem.difficulty,
					cognitiveDemand: problem.cognitiveDemand,
					problems: [problemEntry],
					previewItems: [],
					previewItemIds: [],
					previewConcepts: [],
					previewSourceDocumentIds: [],
					previewPageSpans: [],
					linkedPreviewCount: 0,
					linkedPreviewFallbackCount: 0,
					linkedBy: "none",
					conceptFrequencies: Object.fromEntries(uniqueStrings(problem.concepts).map((concept) => [concept, 1])),
				});
				continue;
			}

			existing.sourceSpan = mergeSourceSpan(existing.sourceSpan, problem.sourceSpan);
			existing.problemCount += 1;
			existing.problems.push(problemEntry);
			existing.concepts = uniqueStrings([...existing.concepts, ...problem.concepts]);
			existing.primaryConcepts = existing.concepts.slice(0, 4);
			existing.representations = uniqueStrings([...existing.representations, ...problem.representations]);
			existing.misconceptions = uniqueStrings([...existing.misconceptions, ...problem.misconceptions]);
			existing.difficulty = resolveSharedValue(existing.problems.map((entry) => entry.difficulty));
			existing.cognitiveDemand = resolveSharedValue(existing.problems.map((entry) => entry.cognitiveDemand));
			for (const concept of uniqueStrings(problem.concepts)) {
				existing.conceptFrequencies[concept] = (existing.conceptFrequencies[concept] ?? 0) + 1;
			}
		}
	}

	for (const group of groups.values()) {
		group.problems.sort((left, right) => compareSpans(left.sourceSpan, right.sourceSpan) || left.problemId.localeCompare(right.problemId));
		const directMatches = previewByGroup.get(group.groupId) ?? [];
		const conceptMatches = directMatches.length > 0
			? []
			: uniqueStrings(group.concepts)
				.flatMap((concept) => previewByConcept.get(concept) ?? [])
				.filter((item) => !item.sourceDocumentId || item.sourceDocumentId === group.documentId);
		const linked = directMatches.length > 0 ? directMatches : conceptMatches;
		group.previewItems = linked;
		group.previewItemIds = uniqueStrings(linked.map((item) => item.itemId));
		group.previewConcepts = uniqueStrings(linked.flatMap((item) => item.primaryConcepts ?? [item.conceptId]));
		group.previewSourceDocumentIds = uniqueStrings(linked.map((item) => item.sourceDocumentId));
		group.previewPageSpans = linked.flatMap((item) => item.sourceSpan ? [item.sourceSpan] : []);
		group.linkedPreviewCount = linked.length;
		group.linkedPreviewFallbackCount = conceptMatches.length;
		group.linkedBy = directMatches.length > 0 ? "groupId" : conceptMatches.length > 0 ? "concept" : "none";
		group.primaryConcepts = Object.entries(group.conceptFrequencies)
			.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
			.map(([concept]) => concept)
			.slice(0, 4);
	}

	return [...groups.values()].sort((left, right) => left.sourceFileName.localeCompare(right.sourceFileName) || compareSpans(left.sourceSpan, right.sourceSpan) || left.groupId.localeCompare(right.groupId));
}

function buildFallbackConceptCoverage(workspace: InstructionalSessionWorkspace) {
	const documentNameById = new Map(workspace.documents.map((document) => [document.documentId, document.sourceFileName]));
	const concepts = new Map<string, {
		documentIds: Set<string>;
		sourceFileNames: Set<string>;
		totalScore: number;
		freqProblems: number;
		freqPages: number;
		groupIds: Set<string>;
		multipartPresenceTotal: number;
		noiseHits: number;
	}>();

	for (const analyzed of workspace.analyzedDocuments) {
		const scoredConcepts = analyzed.insights.scoredConcepts ?? [];
		for (const concept of scoredConcepts) {
			const current = concepts.get(concept.concept) ?? {
				documentIds: new Set<string>(),
				sourceFileNames: new Set<string>(),
				totalScore: 0,
				freqProblems: 0,
				freqPages: 0,
				groupIds: new Set<string>(),
				multipartPresenceTotal: 0,
				noiseHits: 0,
			};
			current.documentIds.add(analyzed.document.id);
			current.sourceFileNames.add(documentNameById.get(analyzed.document.id) ?? analyzed.document.sourceFileName);
			current.totalScore += concept.score;
			current.freqProblems += concept.freqProblems;
			current.freqPages += concept.freqPages;
			current.multipartPresenceTotal += concept.multipartPresence;
			if (concept.isNoise) {
				current.noiseHits += 1;
			}
			for (const problem of analyzed.problems.filter((problem) => problem.concepts.includes(concept.concept))) {
				current.groupIds.add(problem.problemGroupId ?? problem.id);
			}
			concepts.set(concept.concept, current);
		}
	}

	return concepts;
}

function buildScoredConcepts(
	workspace: InstructionalSessionWorkspace,
	problemGroups: ViewerProblemGroup[],
	previewItems: AssessmentPreviewItemModel[],
): ViewerScoredConcept[] {
	const previewByConcept = new Map<string, AssessmentPreviewItemModel[]>();
	for (const item of previewItems) {
		for (const concept of uniqueStrings(item.primaryConcepts ?? [item.conceptId])) {
			previewByConcept.set(concept, [...(previewByConcept.get(concept) ?? []), item]);
		}
	}

	const groupIdsByConcept = new Map<string, Set<string>>();
	for (const group of problemGroups) {
		for (const concept of group.concepts) {
			const current = groupIdsByConcept.get(concept) ?? new Set<string>();
			current.add(group.groupId);
			groupIdsByConcept.set(concept, current);
		}
	}

	const coverage = workspace.rawAnalysis?.coverageSummary.conceptCoverage;
	const conceptToDocumentMap = workspace.rawAnalysis?.conceptToDocumentMap ?? {};
	const documentNameById = new Map(workspace.documents.map((document) => [document.documentId, document.sourceFileName]));
	const fallback = buildFallbackConceptCoverage(workspace);
	const conceptNames = uniqueStrings([
		...Object.keys(coverage ?? {}),
		...fallback.keys(),
		...problemGroups.flatMap((group) => group.concepts),
		...previewItems.flatMap((item) => item.primaryConcepts ?? [item.conceptId]),
	]);
	const totalDocuments = Math.max(1, workspace.documents.length);

	return conceptNames.map((concept) => {
		const coverageEntry = coverage?.[concept];
		const fallbackEntry = fallback.get(concept);
		const documentIds = uniqueStrings(coverageEntry?.documentIds ?? [...(fallbackEntry?.documentIds ?? new Set<string>())] ?? conceptToDocumentMap[concept] ?? []);
		const sourceFileNames = uniqueStrings(documentIds.map((documentId) => documentNameById.get(documentId)));
		const previewMatches = previewByConcept.get(concept) ?? [];
		const previewGroups = uniqueStrings(previewMatches.map((item) => item.groupId));
		const previewDocumentIds = uniqueStrings(previewMatches.map((item) => item.sourceDocumentId));
		const problemGroupIds = uniqueStrings([...(groupIdsByConcept.get(concept) ?? new Set<string>())]);
		const totalScore = coverageEntry?.totalScore ?? fallbackEntry?.totalScore ?? 0;
		const freqDocuments = coverageEntry?.freqDocuments ?? documentIds.length;
		const previewCoverage = previewMatches.length / Math.max(problemGroupIds.length || previewMatches.length || 1, 1);

		return {
			concept,
			documentIds,
			sourceFileNames,
			averageScore: coverageEntry?.averageScore ?? Number((totalScore / Math.max(freqDocuments, 1)).toFixed(4)),
			totalScore: Number(totalScore.toFixed(4)),
			coverageScore: coverageEntry?.coverageScore ?? Number((totalScore / Math.max(freqDocuments, 1)).toFixed(4)),
			gapScore: coverageEntry?.gapScore ?? 0,
			freqProblems: coverageEntry?.freqProblems ?? fallbackEntry?.freqProblems ?? 0,
			freqPages: coverageEntry?.freqPages ?? fallbackEntry?.freqPages ?? 0,
			freqDocuments,
			groupCount: coverageEntry?.groupCount ?? fallbackEntry?.groupIds.size ?? problemGroupIds.length,
			multipartPresence: coverageEntry?.multipartPresence ?? Number(((fallbackEntry?.multipartPresenceTotal ?? 0) / Math.max(freqDocuments, 1)).toFixed(4)),
			crossDocumentAnchor: coverageEntry?.crossDocumentAnchor ?? documentIds.length > 1,
			gap: coverageEntry?.gap ?? false,
			noiseCandidate: coverageEntry?.noiseCandidate ?? Boolean(fallbackEntry && fallbackEntry.noiseHits === fallbackEntry.documentIds.size),
			stability: coverageEntry?.stability ?? Number((documentIds.length / totalDocuments).toFixed(4)),
			overlapStrength: coverageEntry?.overlapStrength ?? Number(((documentIds.length - 1) / Math.max(totalDocuments - 1, 1)).toFixed(4)),
			redundancy: coverageEntry?.redundancy ?? 0,
			problemGroupIds,
			previewItemIds: uniqueStrings(previewMatches.map((item) => item.itemId)),
			previewCount: previewMatches.length,
			previewDocumentIds,
			previewGroups,
			previewPageSpans: previewMatches.flatMap((item) => item.sourceSpan ? [item.sourceSpan] : []),
			groupIds: problemGroupIds,
			problemCount: problemGroups.filter((group) => group.concepts.includes(concept)).reduce((sum, group) => sum + group.problemCount, 0),
			previewItems: previewMatches,
			linkedPreviewFallbackCount: previewMatches.filter((item) => !item.groupId).length,
			previewCoverage: Number(previewCoverage.toFixed(4)),
			conceptCoverageEntry: coverageEntry,
		};
	}).sort((left, right) => right.coverageScore - left.coverageScore || right.averageScore - left.averageScore || left.concept.localeCompare(right.concept));
}

export function buildViewerData(workspace: InstructionalSessionWorkspace): ViewerData {
	const preview = resolvePreview(workspace);
	const documents = buildDocumentSummaries(workspace);
	const problemGroups = buildProblemGroups(workspace.analyzedDocuments, preview.items);
	const scoredConcepts = buildScoredConcepts(workspace, problemGroups, preview.items);
	const availableSurfaces: ViewerData["availableSurfaces"] = ["documents"];

	if (workspace.rawAnalysis) {
		availableSurfaces.push("analysis");
	}
	if (workspace.instructionalSession?.blueprint) {
		availableSurfaces.push("blueprint");
	}
	if (workspace.instructionalSession?.conceptMap) {
		availableSurfaces.push("concept-graph");
	}
	if (preview.items.length > 0) {
		availableSurfaces.push("preview");
	}

	return {
		sessionId: workspace.sessionId,
		documents,
		problemGroups,
		scoredConcepts,
		collectionAnalysis: workspace.rawAnalysis,
		blueprint: workspace.instructionalSession?.blueprint ?? null,
		conceptGraph: workspace.instructionalSession?.conceptMap ?? null,
		previewItems: preview.items,
		previewSource: preview.source,
		selectedIntent: workspace.selectedIntent,
		productIds: workspace.products.map((product) => product.productId),
		productTypes: uniqueStrings(workspace.products.map((product) => product.productType)),
		availableSurfaces,
		generatedAt: new Date().toISOString(),
	};
}