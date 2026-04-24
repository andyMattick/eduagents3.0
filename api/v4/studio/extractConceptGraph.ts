/**
 * extractConceptGraph.ts — 5-layer upgraded concept extractor
 *
 * Transforms an AnalyzedDocument into a richly-weighted concept graph and
 * item plans, enabling multi-concept, multi-part, chapter-faithful assessments.
 *
 * Layer 1 – Structure-aware parsing   → DocumentChunk[]
 * Layer 2 – Semantic chunking          → ProblemCluster[]
 * Layer 3 – Concept extraction + graph → ConceptNode[] + ConceptEdge[]
 * Layer 4 – Concept weighting          → WeightedConceptNode[]
 * Layer 5 – Concept fusion + planning  → ItemPlan[]
 *
 * Fully additive: does not modify any existing AnalyzedDocument fields.
 * Every layer degrades gracefully; LLM enrichment is optional.
 */

import type { AnalyzedDocument, DocumentNode } from "../../../src/prism-v4/schema/semantic";
import type { ProblemFormat } from "./generateScenarios";

// ── Layer 1 Types ─────────────────────────────────────────────────────────────

export type ChunkType = "title" | "header" | "stem" | "subpart" | "note";

export interface DocumentChunk {
	type: ChunkType;
	/** Unit/chapter title in scope when this chunk was parsed. */
	unitTitle?: string;
	/** Nearest preceding section header. */
	sectionTitle?: string;
	/** Numeric problem ID if this chunk is a problem stem (e.g. "2"). */
	problemId?: string;
	/** Alphabetic subpart ID if this is a subpart (e.g. "a"). */
	subpartId?: string;
	rawText: string;
}

// ── Layer 2 Types ─────────────────────────────────────────────────────────────

export interface ProblemCluster {
	/** Stable identifier (problemGroupId or generated). */
	id: string;
	/** Primary stem text (the numbered question). */
	stem: string;
	/** Detected sub-parts (a–g). */
	subparts: Array<{ id: string; text: string }>;
	/** Sequential headers seen before this cluster (chapter, section, unit). */
	contextHeaders: string[];
	/** True when ≥2 sub-parts are detected or problemGroupId groups ≥2 items. */
	isMultiPart: boolean;
	/** Full concatenation of stem + subpart text for pattern matching. */
	allText: string;
}

// ── Layer 3 Types ─────────────────────────────────────────────────────────────

export type ConceptRelation =
	| "compared-with"
	| "controlled-by"
	| "inverse-relationship"
	| "paired"
	| "co-occurs";

export interface ConceptNode {
	id: string;
	label: string;
	/** Normalised surface forms that map to this concept. */
	aliases: string[];
	/** Number of clusters in which this concept appears. */
	frequency: number;
	/** True when this concept appears in a multi-part cluster. */
	appearsInMultiPartCluster: boolean;
	/** IDs of clusters this concept appeared in. */
	clusterIds: string[];
}

export interface ConceptEdge {
	from: string;
	to: string;
	relation: ConceptRelation;
	/** 0.0–1.0; co-occurrence edges start at 0.5, named relation edges at 0.8+. */
	strength: number;
}

// ── Layer 4 Types ─────────────────────────────────────────────────────────────

export interface WeightedConceptNode extends ConceptNode {
	/** Similarity to unit / chapter title (0–1). */
	titleMatchScore: number;
	/** Max similarity across section headers (0–1). */
	headerMatchScore: number;
	/** 1 when appears in a multi-part cluster, 0 otherwise. */
	multiPartScore: number;
	/** Estimated Bloom level of the concept (0.2 recall → 1.0 evaluate/create). */
	bloomScore: number;
	/** Degree in concept graph / max degree (0–1). */
	centralityScore: number;
	/** min(frequency, 3) / 3 — capped so "mean" doesn't dominate. */
	frequencyScore: number;
	/** Final composite weight. */
	weight: number;
}

// ── Layer 5 Types ─────────────────────────────────────────────────────────────

export type ItemPlanType = "single" | "multi-concept" | "frq";

export interface ItemPlan {
	id: string;
	type: ItemPlanType;
	/** Concept IDs covered by this item. */
	concepts: string[];
	/** Suggested format (may be overridden by teacher choice). */
	suggestedFormat?: ProblemFormat;
	/** FRQ sub-part labels (e.g. ["a", "b", "c"]). */
	parts?: string[];
	/** Source cluster ID when the plan is derived from a multi-part cluster. */
	sourceClusterId?: string;
	/** Estimated completion time in seconds. */
	estimatedTimeSeconds?: number;
}

// ── Full Output Type ──────────────────────────────────────────────────────────

export interface WeightedConceptGraph {
	nodes: WeightedConceptNode[];
	edges: ConceptEdge[];
	clusters: ProblemCluster[];
	itemPlans: ItemPlan[];
}

// ── Layer 1 – Structure-Aware Parsing ────────────────────────────────────────

/** Patterns that identify a top-level numbered problem stem. */
const PROBLEM_STEM_RE = /^(?:\(?\d+\)?[.)]\s*|Q\d+[.)]\s*)/i;
/** Patterns that identify a lettered subpart (a. b) (a) a– etc.). */
const SUBPART_RE = /^(?:\(?([a-g])\)?[.)]\s*|([a-g])[–-]\s*)/i;
/** Minimum text length to be considered a meaningful chunk. */
const MIN_CHUNK_LENGTH = 8;

function nodeTextOrEmpty(node: DocumentNode): string {
	return (node.text ?? node.normalizedText ?? "").trim();
}

/**
 * Layer 1: Convert CanonicalDocument.nodes into an ordered list of typed
 * DocumentChunks, annotated with the running unit/section context.
 */
export function parseDocumentStructure(
	doc: AnalyzedDocument["document"],
	externalTitles?: { unitTitle?: string; chapterTitle?: string },
): DocumentChunk[] {
	const chunks: DocumentChunk[] = [];

	let currentUnitTitle: string | undefined = externalTitles?.unitTitle ?? externalTitles?.chapterTitle;
	let currentSectionTitle: string | undefined;
	let currentProblemId: string | undefined;
	let problemCounter = 0;

	// Sort nodes by surfaceId then orderIndex for reading-order traversal.
	const sorted = [...doc.nodes].sort((a, b) => {
		const surfaceCmp = a.surfaceId.localeCompare(b.surfaceId);
		return surfaceCmp !== 0 ? surfaceCmp : a.orderIndex - b.orderIndex;
	});

	for (const node of sorted) {
		const text = nodeTextOrEmpty(node);
		if (text.length < MIN_CHUNK_LENGTH) continue;

		const headingLevel = node.metadata?.headingLevel as number | undefined;
		const isHeading = node.nodeType === "heading" || (typeof headingLevel === "number" && headingLevel <= 3);

		if (isHeading) {
			const lowerText = text.toLowerCase();
			// Heuristic: level 1–2 headings = unit/chapter titles; level 3+ = section titles
			if ((headingLevel ?? 99) <= 2 || lowerText.match(/^(chapter|unit|module|part)\s+\d+/i)) {
				currentUnitTitle = text;
				currentSectionTitle = undefined;
				chunks.push({ type: "title", rawText: text, unitTitle: text });
			} else {
				currentSectionTitle = text;
				chunks.push({
					type: "header",
					rawText: text,
					unitTitle: currentUnitTitle,
					sectionTitle: text,
				});
			}
			currentProblemId = undefined;
			continue;
		}

		// Check for subpart before stem (subparts are nested list items)
		const subpartMatch = text.match(SUBPART_RE);
		if (subpartMatch && currentProblemId) {
			const subpartId = (subpartMatch[1] ?? subpartMatch[2] ?? "a").toLowerCase();
			chunks.push({
				type: "subpart",
				rawText: text,
				unitTitle: currentUnitTitle,
				sectionTitle: currentSectionTitle,
				problemId: currentProblemId,
				subpartId,
			});
			continue;
		}

		// Check for numbered stem
		const stemMatch = text.match(PROBLEM_STEM_RE);
		if (stemMatch) {
			problemCounter += 1;
			currentProblemId = String(problemCounter);
			chunks.push({
				type: "stem",
				rawText: text,
				unitTitle: currentUnitTitle,
				sectionTitle: currentSectionTitle,
				problemId: currentProblemId,
			});
			continue;
		}

		// Anything else in a list item with a current problem context may be a continuation
		if (node.nodeType === "listItem" && currentProblemId) {
			chunks.push({
				type: "note",
				rawText: text,
				unitTitle: currentUnitTitle,
				sectionTitle: currentSectionTitle,
				problemId: currentProblemId,
			});
		} else {
			chunks.push({
				type: "note",
				rawText: text,
				unitTitle: currentUnitTitle,
				sectionTitle: currentSectionTitle,
			});
		}
	}

	return chunks;
}

// ── Layer 2 – Semantic Chunking & Multi-Part Detection ────────────────────────

/**
 * Layer 2: Group DocumentChunks into ProblemCluster objects.
 * Uses both the structural parser output and ExtractedProblem.problemGroupId.
 */
export function buildProblemClusters(
	chunks: DocumentChunk[],
	problems: AnalyzedDocument["problems"],
): ProblemCluster[] {
	const clusters: ProblemCluster[] = [];
	// Group existing extracted problems by problemGroupId first
	const problemGroups = new Map<string, AnalyzedDocument["problems"]>();
	for (const p of problems) {
		const groupKey = p.problemGroupId ?? p.id;
		const group = problemGroups.get(groupKey) ?? [];
		group.push(p);
		problemGroups.set(groupKey, group);
	}

	// Build clusters from extracted problem groups
	for (const [groupId, groupProblems] of problemGroups) {
		const isMultiPart = groupProblems.length > 1;
		const stemProblem = groupProblems[0]!;
		const stem = stemProblem.text;
		const subparts: ProblemCluster["subparts"] = groupProblems.length > 1
			? groupProblems.slice(1).map((p, i) => ({ id: String.fromCharCode(97 + i), text: p.text }))
			: [];
		// Collect headers from structural chunks whose problemId maps to this problem
		const contextHeaders = deriveContextHeaders(chunks, stemProblem);
		const allText = [stem, ...subparts.map((sp) => sp.text)].join(" ");
		clusters.push({
			id: groupId,
			stem,
			subparts,
			contextHeaders,
			isMultiPart,
			allText,
		});
	}

	// Also build clusters from structural stems not covered by extracted problems
	const seenIds = new Set(clusters.map((c) => c.id));
	const stemChunks = chunks.filter((c) => c.type === "stem");
	for (const stemChunk of stemChunks) {
		if (!stemChunk.problemId || seenIds.has(stemChunk.problemId)) continue;
		const chunkSubparts = chunks.filter(
			(c) => c.type === "subpart" && c.problemId === stemChunk.problemId,
		);
		const subparts = chunkSubparts.map((c) => ({
			id: c.subpartId ?? "a",
			text: c.rawText,
		}));
		const isMultiPart = subparts.length >= 2;
		const allText = [stemChunk.rawText, ...subparts.map((sp) => sp.text)].join(" ");
		const contextHeaders: string[] = [];
		// Walk backwards through chunks to find preceding headers
		const stemIdx = chunks.indexOf(stemChunk);
		for (let i = stemIdx - 1; i >= 0 && contextHeaders.length < 3; i--) {
			const c = chunks[i]!;
			if (c.type === "header" || c.type === "title") {
				contextHeaders.unshift(c.rawText);
			}
		}
		clusters.push({
			id: stemChunk.problemId,
			stem: stemChunk.rawText,
			subparts,
			contextHeaders,
			isMultiPart,
			allText,
		});
	}

	return clusters;
}

function deriveContextHeaders(
	chunks: DocumentChunk[],
	problem: AnalyzedDocument["problems"][number],
): string[] {
	// Use problem's sourceSpan to approximate position; fall back to first chunk
	const headers: string[] = [];
	// Walk chunks backwards looking for headers — collect up to 3
	for (let i = chunks.length - 1; i >= 0; i--) {
		const c = chunks[i]!;
		if (c.type === "header" || c.type === "title") {
			// Accept if same fragment context
			if (c.unitTitle) headers.unshift(c.unitTitle);
			if (c.sectionTitle && c.sectionTitle !== c.unitTitle) headers.unshift(c.sectionTitle);
			if (headers.length >= 3) break;
		}
	}

	// Also include surface-level unit from problem text matches
	if (problem.text && headers.length === 0) {
		const docHeader = chunks.find((c) => c.type === "title");
		if (docHeader?.rawText) headers.push(docHeader.rawText);
	}
	return [...new Set(headers)].slice(0, 3);
}

// ── Layer 3 – Concept Extraction & Graph Building ─────────────────────────────

// Known inferential statistics concepts with surface-form triggers
interface ConceptPattern {
	id: string;
	label: string;
	triggers: string[];
	/** Estimated Bloom level (higher = more analytical) */
	bloomLevel: number; // 1=recall, 2=understand, 3=apply, 4=analyze, 5=evaluate, 6=create
}

const STATS_CONCEPT_PATTERNS: ConceptPattern[] = [
	{ id: "null-hypothesis",        label: "Null hypothesis",            triggers: ["null hypothesis", "h0", "h₀", "null hyp"],                bloomLevel: 3 },
	{ id: "alternative-hypothesis", label: "Alternative hypothesis",     triggers: ["alternative hypothesis", "ha", "h1", "h₁", "alt hyp", "research hypothesis"],  bloomLevel: 3 },
	{ id: "p-value",                label: "P-value",                    triggers: ["p-value", "p value", "p =", "p<", "p >", "p-val"],        bloomLevel: 4 },
	{ id: "type-i-error",           label: "Type I error",               triggers: ["type i error", "type 1 error", "false positive", "α error", "alpha error"], bloomLevel: 4 },
	{ id: "type-ii-error",          label: "Type II error",              triggers: ["type ii error", "type 2 error", "false negative", "β error", "beta error"],  bloomLevel: 4 },
	{ id: "power",                  label: "Power",                      triggers: ["power of the test", "power =", "1 - β", "1-β", "statistical power"],         bloomLevel: 4 },
	{ id: "significance-level",     label: "Significance level (alpha)", triggers: ["significance level", "alpha =", "α =", "level of significance", "α = 0."],   bloomLevel: 3 },
	{ id: "decision-rule",          label: "Decision rule",              triggers: ["reject the null", "fail to reject", "reject h0", "decision rule"],             bloomLevel: 4 },
	{ id: "test-statistic",         label: "Test statistic",             triggers: ["test statistic", "z-score", "t-statistic", "t-score", "z =", "t ="],          bloomLevel: 3 },
	{ id: "p-value-interpretation", label: "Interpretation of p-value",  triggers: ["interpret", "what does the p-value", "p-value means", "conclude from"],       bloomLevel: 5 },
	{ id: "one-sample-mean-test",   label: "One-sample mean test",       triggers: ["one-sample", "single sample", "mean test", "test for mean"],                  bloomLevel: 3 },
	{ id: "proportion-test",        label: "Proportion test",            triggers: ["proportion test", "test for proportion", "p̂", "sample proportion"],          bloomLevel: 3 },
	{ id: "confidence-interval",    label: "Confidence interval",        triggers: ["confidence interval", "ci", "95% confidence", "margin of error"],             bloomLevel: 3 },
	{ id: "sampling-distribution",  label: "Sampling distribution",      triggers: ["sampling distribution", "distribution of x̄", "distribution of the sample"], bloomLevel: 4 },
	{ id: "central-limit-theorem",  label: "Central Limit Theorem",      triggers: ["central limit theorem", "clt"],                                                bloomLevel: 3 },
	{ id: "standard-error",         label: "Standard error",             triggers: ["standard error", "se =", "standard error of the mean"],                       bloomLevel: 2 },
];

// Known named relation edges between stats concepts
const NAMED_CONCEPT_EDGES: Array<{ from: string; to: string; relation: ConceptRelation; strength: number }> = [
	{ from: "null-hypothesis",    to: "alternative-hypothesis", relation: "paired",              strength: 0.95 },
	{ from: "p-value",            to: "significance-level",     relation: "compared-with",        strength: 0.90 },
	{ from: "type-i-error",       to: "significance-level",     relation: "controlled-by",        strength: 0.90 },
	{ from: "type-ii-error",      to: "power",                  relation: "inverse-relationship", strength: 0.90 },
	{ from: "null-hypothesis",    to: "decision-rule",          relation: "paired",              strength: 0.80 },
	{ from: "p-value",            to: "decision-rule",          relation: "compared-with",        strength: 0.80 },
	{ from: "p-value",            to: "p-value-interpretation", relation: "paired",              strength: 0.85 },
	{ from: "test-statistic",     to: "p-value",                relation: "compared-with",        strength: 0.80 },
	{ from: "significance-level", to: "type-i-error",           relation: "controlled-by",        strength: 0.90 },
	{ from: "sampling-distribution", to: "standard-error",      relation: "co-occurs",            strength: 0.70 },
	{ from: "central-limit-theorem", to: "sampling-distribution", relation: "co-occurs",          strength: 0.75 },
	{ from: "confidence-interval", to: "standard-error",        relation: "co-occurs",            strength: 0.70 },
	{ from: "confidence-interval", to: "significance-level",    relation: "compared-with",        strength: 0.65 },
];

/** Check if a text contains any of the given triggers (case-insensitive). */
function containsAny(text: string, triggers: string[]): boolean {
	const lower = text.toLowerCase();
	return triggers.some((t) => lower.includes(t.toLowerCase()));
}

/**
 * Layer 3 (rule-based pass): extract known concept nodes from a cluster
 * using domain-specific pattern matching.
 */
function extractRuleBasedConcepts(cluster: ProblemCluster): ConceptPattern[] {
	return STATS_CONCEPT_PATTERNS.filter((p) => containsAny(cluster.allText, p.triggers));
}

/**
 * Also extract concepts that were tagged by the existing extraction pipeline
 * (ExtractedProblem.concepts[]) for this cluster's problems.
 */
function fromExistingProblemConcepts(
	cluster: ProblemCluster,
	problems: AnalyzedDocument["problems"],
): string[] {
	const matching = problems.filter(
		(p) => p.problemGroupId === cluster.id || p.id === cluster.id,
	);
	const concepts: string[] = [];
	for (const p of matching) {
		for (const c of p.concepts) {
			if (!concepts.includes(c)) concepts.push(c);
		}
	}
	return concepts;
}

/** Normalise a raw concept label from LLM output. */
function normalizeLLMConcept(raw: string): string {
	return raw.trim().replace(/\s+/g, " ").replace(/["""'`]+/g, "");
}

/**
 * Layer 3 (LLM pass): ask Gemini to tag additional concepts not covered by
 * the rule-based patterns. Returns array of `{ id, label }` objects.
 * Silently returns [] on failure.
 */
async function llmTagConcepts(
	cluster: ProblemCluster,
	context: ExtractionContext,
): Promise<Array<{ id: string; label: string; bloomLevel: number }>> {
	void cluster;
	void context;
	return [];
}

interface ExtractionContext {
	unitTitle?: string;
	chapterTitle?: string;
	sectionHeaders: string[];
}

/**
 * Layer 3: Build the full set of ConceptNodes and ConceptEdges across all clusters.
 */
async function extractConceptsAndEdges(
	clusters: ProblemCluster[],
	problems: AnalyzedDocument["problems"],
	context: ExtractionContext,
	useLLM: boolean,
): Promise<{ nodes: ConceptNode[]; edges: ConceptEdge[] }> {
	// Per-concept accumulator
	const accumulator = new Map<
		string,
		{
			node: ConceptNode;
			bloomLevel: number;
		}
	>();

	function addConcept(
		id: string,
		label: string,
		aliases: string[],
		clusterId: string,
		isMultiPart: boolean,
		bloomLevel: number,
	) {
		const existing = accumulator.get(id);
		if (existing) {
			existing.node.frequency += 1;
			if (!existing.node.clusterIds.includes(clusterId)) {
				existing.node.clusterIds.push(clusterId);
			}
			if (isMultiPart) existing.node.appearsInMultiPartCluster = true;
			for (const a of aliases) {
				if (!existing.node.aliases.includes(a)) existing.node.aliases.push(a);
			}
			existing.bloomLevel = Math.max(existing.bloomLevel, bloomLevel);
		} else {
			accumulator.set(id, {
				node: {
					id,
					label,
					aliases,
					frequency: 1,
					appearsInMultiPartCluster: isMultiPart,
					clusterIds: [clusterId],
				},
				bloomLevel,
			});
		}
	}

	// Process each cluster
	for (const cluster of clusters) {
		// Rule-based stats patterns
		const ruleMatches = extractRuleBasedConcepts(cluster);
		for (const pattern of ruleMatches) {
			addConcept(pattern.id, pattern.label, pattern.triggers.slice(0, 2), cluster.id, cluster.isMultiPart, pattern.bloomLevel);
		}

		// Existing problem concepts from the extraction pipeline
		const existingConcepts = fromExistingProblemConcepts(cluster, problems);
		for (const concept of existingConcepts) {
			const normalized = concept.trim().toLowerCase().replace(/\s+/g, "-");
			if (!accumulator.has(normalized)) {
				addConcept(normalized, concept.trim(), [concept.trim()], cluster.id, cluster.isMultiPart, 2);
			}
		}

		// LLM-assisted tagging
		if (useLLM) {
			const llmConcepts = await llmTagConcepts(cluster, context);
			for (const lc of llmConcepts) {
				if (!accumulator.has(lc.id)) {
					addConcept(lc.id, lc.label, [lc.label], cluster.id, cluster.isMultiPart, lc.bloomLevel);
				} else {
					// Merge: bump bloom level if LLM sees it as higher
					const existing = accumulator.get(lc.id)!;
					existing.bloomLevel = Math.max(existing.bloomLevel, lc.bloomLevel);
				}
			}
		}
	}

	const nodes: ConceptNode[] = [...accumulator.values()].map((e) => e.node);
	const bloomByNode = new Map([...accumulator.entries()].map(([id, e]) => [id, e.bloomLevel]));

	// Build edges: named relations first
	const edges: ConceptEdge[] = [];
	const edgeKeys = new Set<string>();
	function addEdge(from: string, to: string, relation: ConceptRelation, strength: number) {
		if (!accumulator.has(from) || !accumulator.has(to)) return;
		const key = [from, to].sort().join("||");
		if (edgeKeys.has(key)) return;
		edgeKeys.add(key);
		edges.push({ from, to, relation, strength });
	}

	for (const named of NAMED_CONCEPT_EDGES) {
		addEdge(named.from, named.to, named.relation, named.strength);
	}

	// Co-occurrence edges: concepts that appear in the same cluster get a weak edge
	for (const cluster of clusters) {
		const clusterNodeIds = nodes.filter((n) => n.clusterIds.includes(cluster.id)).map((n) => n.id);
		for (let i = 0; i < clusterNodeIds.length; i++) {
			for (let j = i + 1; j < clusterNodeIds.length; j++) {
				addEdge(clusterNodeIds[i]!, clusterNodeIds[j]!, "co-occurs", 0.5);
			}
		}
	}

	// Store bloomByNode on nodes as a side-channel for weighting (temp metadata)
	// We carry it via bloomLevelByNodeId to the weighting step
	(nodes as unknown as Array<ConceptNode & { _bloomLevel?: number }>).forEach((n) => {
		n._bloomLevel = bloomByNode.get(n.id) ?? 2;
	});

	return { nodes, edges };
}

// ── Layer 4 – Concept Weighting ───────────────────────────────────────────────

/**
 * Simple token-overlap similarity between a concept label and a reference string.
 * Returns 0–1; 1 = perfect overlap.
 */
function tokenSimilarity(a: string, b: string): number {
	if (!a || !b) return 0;
	const tokensA = new Set(a.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
	const tokensB = new Set(b.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
	if (tokensA.size === 0 || tokensB.size === 0) return 0;
	let overlap = 0;
	for (const t of tokensA) if (tokensB.has(t)) overlap++;
	return overlap / Math.max(tokensA.size, tokensB.size);
}

/** Returns the maximum token similarity between label and any of the given headers. */
function maxHeaderSimilarity(label: string, headers: string[]): number {
	if (headers.length === 0) return 0;
	return Math.max(...headers.map((h) => tokenSimilarity(label, h)));
}

/**
 * Bloom score: normalise raw bloomLevel (1–6) → 0.2–1.0.
 * Higher analytical/evaluative levels score higher.
 */
function bloomScoreFromLevel(level: number): number {
	return parseFloat(Math.max(0.2, Math.min(1.0, level / 6)).toFixed(3));
}

/**
 * Layer 4: Compute weights for each concept node.
 *
 * weight = 2.0·title + 1.5·header + 1.5·multiPart + 1.5·bloom + 1.0·centrality + 0.5·frequency
 */
export function weightConceptGraph(
	nodes: ConceptNode[],
	edges: ConceptEdge[],
	context: ExtractionContext,
): WeightedConceptNode[] {
	if (nodes.length === 0) return [];

	// Compute centrality (degree) for each node
	const degreeMap = new Map<string, number>();
	for (const e of edges) {
		degreeMap.set(e.from, (degreeMap.get(e.from) ?? 0) + 1);
		degreeMap.set(e.to, (degreeMap.get(e.to) ?? 0) + 1);
	}
	const maxDegree = Math.max(1, ...degreeMap.values());

	// Title/header reference strings
	const titleStrings = [context.unitTitle, context.chapterTitle].filter((s): s is string => Boolean(s));
	const headerStrings = [
		...context.sectionHeaders,
		...titleStrings,
	];

	return nodes.map((rawNode) => {
		const bloomLevel = (rawNode as ConceptNode & { _bloomLevel?: number })._bloomLevel ?? 2;

		const titleMatchScore = titleStrings.length > 0
			? Math.max(...titleStrings.map((t) => tokenSimilarity(rawNode.label, t)))
			: 0;
		const headerMatchScore = maxHeaderSimilarity(rawNode.label, headerStrings);
		const multiPartScore = rawNode.appearsInMultiPartCluster ? 1 : 0;
		const bloomScore = bloomScoreFromLevel(bloomLevel);
		const centralityScore = parseFloat(((degreeMap.get(rawNode.id) ?? 0) / maxDegree).toFixed(4));
		const frequencyScore = parseFloat((Math.min(rawNode.frequency, 3) / 3).toFixed(4));

		const weight = parseFloat((
			2.0 * titleMatchScore +
			1.5 * headerMatchScore +
			1.5 * multiPartScore +
			1.5 * bloomScore +
			1.0 * centralityScore +
			0.5 * frequencyScore
		).toFixed(4));

		// Strip internal _bloomLevel before returning
		const { _bloomLevel: _dropped, ...cleanNode } = rawNode as ConceptNode & { _bloomLevel?: number };
		void _dropped;

		return {
			...cleanNode,
			titleMatchScore,
			headerMatchScore,
			multiPartScore,
			bloomScore,
			centralityScore,
			frequencyScore,
			weight,
		};
	}).sort((a, b) => b.weight - a.weight);
}

// ── Layer 5 – Concept Fusion & Item Planning ──────────────────────────────────

const FRQ_ESTIMATE_SECONDS = 240;   // 4 min
const MULTI_CONCEPT_ESTIMATE_SECONDS = 75;  // 75 s
const SINGLE_CONCEPT_MC_SECONDS = 52;      // 52 s

/**
 * Layer 5: Build ItemPlan[] from the weighted concept graph.
 *
 * Strategy:
 *   1. Top 40% of concepts by weight → single-concept items (MC default)
 *   2. Strongly-connected pairs (strength > 0.7) → multi-concept items
 *   3. Multi-part clusters with top-weighted concepts → FRQ items
 */
export function planItemsFromConceptGraph(
	nodes: WeightedConceptNode[],
	edges: ConceptEdge[],
	clusters: ProblemCluster[],
	options: {
		targetCount: number;
		allowedFormats?: ProblemFormat[];
		targetTimeMinutes?: number;
	},
): ItemPlan[] {
	const plans: ItemPlan[] = [];
	const { targetCount, allowedFormats } = options;
	const frqAllowed = !allowedFormats || allowedFormats.includes("FRQ");
	const multiAllowed = !allowedFormats || allowedFormats.some((f) => ["MC", "MS", "SA"].includes(f));
	let idCounter = 0;

	function nextId(): string {
		return `plan-${++idCounter}`;
	}

	// Sorted copy (already sorted by weight, but safety-sort)
	const sorted = [...nodes].sort((a, b) => b.weight - a.weight);

	// 1. Single-concept seed items (top 40%)
	const singleCount = Math.ceil(targetCount * 0.4);
	for (const concept of sorted.slice(0, singleCount)) {
		const fmt: ProblemFormat = allowedFormats?.find((f) => ["MC", "SA", "TF"].includes(f)) ?? "MC";
		plans.push({
			id: nextId(),
			type: "single",
			concepts: [concept.id],
			suggestedFormat: fmt,
			estimatedTimeSeconds: SINGLE_CONCEPT_MC_SECONDS,
		});
		if (plans.length >= targetCount) break;
	}

	// 2. Multi-concept items from strong edges
	const strongEdges = edges.filter((e) => e.strength > 0.7 && e.relation !== "co-occurs");
	if (multiAllowed) {
		const multiCount = Math.ceil(targetCount * 0.4);
		for (const edge of strongEdges) {
			if (plans.length >= singleCount + multiCount) break;
			// Skip if both concepts already appear together in another multi-concept plan
			const alreadyPlanned = plans.some(
				(p) => p.type === "multi-concept" && p.concepts.includes(edge.from) && p.concepts.includes(edge.to),
			);
			if (alreadyPlanned) continue;
			const fmt: ProblemFormat = allowedFormats?.find((f) => ["MC", "MS", "SA"].includes(f)) ?? "MC";
			plans.push({
				id: nextId(),
				type: "multi-concept",
				concepts: [edge.from, edge.to],
				suggestedFormat: fmt,
				estimatedTimeSeconds: MULTI_CONCEPT_ESTIMATE_SECONDS,
			});
		}
	}

	// 3. FRQ items from multi-part clusters
	if (frqAllowed) {
		const multipartClusters = clusters
			.filter((c) => c.isMultiPart)
			.sort((a, b) => {
				// Score by sum of weights of concepts in the cluster
				const scoreCluster = (cl: ProblemCluster) =>
					nodes
						.filter((n) => n.clusterIds.includes(cl.id))
						.reduce((s, n) => s + n.weight, 0);
				return scoreCluster(b) - scoreCluster(a);
			});

		for (const cluster of multipartClusters) {
			if (plans.length >= targetCount) break;
			const clusterConcepts = nodes
				.filter((n) => n.clusterIds.includes(cluster.id))
				.sort((a, b) => b.weight - a.weight)
				.map((n) => n.id);
			if (clusterConcepts.length === 0) continue;
			const parts = cluster.subparts.length > 0
				? cluster.subparts.map((sp) => sp.id)
				: ["a", "b", "c"];
			plans.push({
				id: nextId(),
				type: "frq",
				concepts: clusterConcepts.slice(0, 4),
				suggestedFormat: "FRQ",
				parts,
				sourceClusterId: cluster.id,
				estimatedTimeSeconds: FRQ_ESTIMATE_SECONDS,
			});
		}
	}

	// Trim to target count
	return plans.slice(0, targetCount);
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

/**
 * Extract a richly-weighted concept graph from a single AnalyzedDocument.
 *
 * @param doc          - Fully-analyzed document (document, problems, fragments fields required).
 * @param context      - Optional unit/chapter title and section headers for weighting.
 * @param options      - LLM toggle, item planning parameters.
 */
export async function extractConceptsFromDocument(
	doc: AnalyzedDocument,
	context?: {
		unitTitle?: string;
		chapterTitle?: string;
		sectionHeaders?: string[];
	},
	options?: {
		/** Whether to use Gemini LLM for additional concept tagging. Default: true. */
		useLLM?: boolean;
		/** Target number of item plans. Default: 10. */
		targetCount?: number;
		targetTimeMinutes?: number;
		allowedFormats?: ProblemFormat[];
	},
): Promise<WeightedConceptGraph> {
	const useLLM = options?.useLLM !== false;
	const targetCount = options?.targetCount ?? 10;

	// Derive context from document structure if not explicitly provided
	const headingChunks = doc.document.nodes
		.filter((n) => n.nodeType === "heading" || ((n.metadata?.headingLevel as number | undefined) ?? 99) <= 2)
		.map((n) => n.text ?? n.normalizedText ?? "")
		.filter(Boolean);

	const extractionCtx: ExtractionContext = {
		unitTitle: context?.unitTitle ?? headingChunks[0],
		chapterTitle: context?.chapterTitle,
		sectionHeaders: context?.sectionHeaders ?? headingChunks.slice(0, 5),
	};

	// Layer 1: parse structure
	const chunks = parseDocumentStructure(doc.document, {
		unitTitle: extractionCtx.unitTitle,
		chapterTitle: extractionCtx.chapterTitle,
	});

	// Layer 2: build clusters
	const clusters = buildProblemClusters(chunks, doc.problems);

	// Layer 3: extract concepts + edges
	const { nodes: rawNodes, edges } = await extractConceptsAndEdges(
		clusters,
		doc.problems,
		extractionCtx,
		useLLM,
	);

	// Layer 4: weight the graph
	const nodes = weightConceptGraph(rawNodes, edges, extractionCtx);

	// Layer 5: plan items
	const itemPlans = planItemsFromConceptGraph(nodes, edges, clusters, {
		targetCount,
		allowedFormats: options?.allowedFormats,
		targetTimeMinutes: options?.targetTimeMinutes,
	});

	return { nodes, edges, clusters, itemPlans };
}

/**
 * Extract and merge concept graphs across multiple documents.
 * Concepts are deduplicated by id; weights are averaged.
 */
export async function extractConceptsFromDocuments(
	docs: AnalyzedDocument[],
	context?: {
		unitTitle?: string;
		chapterTitle?: string;
		sectionHeaders?: string[];
	},
	options?: Parameters<typeof extractConceptsFromDocument>[2],
): Promise<WeightedConceptGraph> {
	if (docs.length === 0) {
		return { nodes: [], edges: [], clusters: [], itemPlans: [] };
	}

	if (docs.length === 1) {
		return extractConceptsFromDocument(docs[0]!, context, options);
	}

	// Per-document extraction (LLM enabled only on first doc to avoid cost × N)
	const graphs = await Promise.all(
		docs.map((doc, i) =>
			extractConceptsFromDocument(doc, context, { ...options, useLLM: i === 0 && (options?.useLLM !== false) }),
		),
	);

	// Merge nodes: accumulate weight per id, keep max individual scores
	const mergedNodes = new Map<string, WeightedConceptNode & { _count: number }>();
	for (const g of graphs) {
		for (const n of g.nodes) {
			const existing = mergedNodes.get(n.id);
			if (existing) {
				existing.weight += n.weight;
				existing._count += 1;
				existing.frequency += n.frequency;
				if (n.appearsInMultiPartCluster) existing.appearsInMultiPartCluster = true;
				existing.titleMatchScore = Math.max(existing.titleMatchScore, n.titleMatchScore);
				existing.headerMatchScore = Math.max(existing.headerMatchScore, n.headerMatchScore);
				existing.bloomScore = Math.max(existing.bloomScore, n.bloomScore);
				existing.centralityScore = Math.max(existing.centralityScore, n.centralityScore);
				for (const cid of n.clusterIds) {
					if (!existing.clusterIds.includes(cid)) existing.clusterIds.push(cid);
				}
			} else {
				mergedNodes.set(n.id, { ...n, _count: 1 });
			}
		}
	}
	// Average weights
	const nodes: WeightedConceptNode[] = [...mergedNodes.values()].map(({ _count, ...n }) => ({
		...n,
		weight: parseFloat((n.weight / _count).toFixed(4)),
	})).sort((a, b) => b.weight - a.weight);

	// Merge edges: keep strongest version of each pair
	const edgeMap = new Map<string, ConceptEdge>();
	for (const g of graphs) {
		for (const e of g.edges) {
			const key = [e.from, e.to].sort().join("||");
			const existing = edgeMap.get(key);
			if (!existing || e.strength > existing.strength) edgeMap.set(key, e);
		}
	}
	const edges = [...edgeMap.values()];

	// Merge clusters + item plans
	const allClusters = graphs.flatMap((g) => g.clusters);
	const targetCount = options?.targetCount ?? 10;
	const itemPlans = planItemsFromConceptGraph(nodes, edges, allClusters, {
		targetCount,
		allowedFormats: options?.allowedFormats,
		targetTimeMinutes: options?.targetTimeMinutes,
	});

	return { nodes, edges, clusters: allClusters, itemPlans };
}
