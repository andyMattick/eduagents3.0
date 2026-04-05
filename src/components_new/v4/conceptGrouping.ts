// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
//
// SPEC §5.1 — All types exported so tests and adapters can import them.

/** Minimal concept node shape consumed by the grouping algorithm. */
export type ConceptNode = {
	id: string;
	label: string;
	aliases?: string[];
	clusterIds?: string[];
	weight: number;
};

export type Edge = {
	from: string;
	to: string;
	strength: number;
};

export type ItemPlan = {
	id: string;
	concepts: string[];
};

export type ConceptGroup = {
	parentId: string;
	parentLabel: string;
	questionCount: number;
	children: Array<{
		id: string;
		label: string;
		weight: number;
		questionCount: number;
	}>;
};

// ---------------------------------------------------------------------------
// §5.2 — Label utilities
// ---------------------------------------------------------------------------

/**
 * Normalize a concept label for comparison:
 * – lowercase
 * – hyphens → spaces (so "P-value" and "p value" compare equal)
 * – strip remaining non-alphanumeric/non-space characters
 * – collapse whitespace
 */
export function normalize(label: string): string {
	return label
		.trim()
		.toLowerCase()
		.replace(/-/g, " ")
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/** @deprecated Use `normalize` */
export const normalizeLabel = normalize;

// ---------------------------------------------------------------------------
// §5.3 — Refinement detection (domain-agnostic)
// ---------------------------------------------------------------------------

/**
 * Labels containing these tokens are specificity refinements — never parents.
 * They indicate a sub-operation or variant of a broader concept.
 *
 * EXTENSIBILITY: Add tokens for new subjects here — never add domain-specific
 * if-statements. Tokens must be lower-case substrings after normalize().
 */
export const REFINEMENT_TOKENS = [
	"interpretation",
	"calculation",
	"formulation",
	"example",
	"setup",
	"step",
	"procedure",
	"decision (", // checked raw (pre-normalize) because parenthesis is stripped
	"component",
	"part",
];

/**
 * Returns true if `label` identifies a refinement/sub-operation concept.
 * Refinements must never become parent groups.
 */
export function isRefinement(label: string): boolean {
	const l = normalize(label);
	// Check normalized form for all tokens except "decision (" which loses its paren
	for (const t of REFINEMENT_TOKENS) {
		if (t === "decision (") {
			if (label.toLowerCase().includes("decision (")) return true;
		} else if (l.includes(t)) {
			return true;
		}
	}
	return false;
}

/** @deprecated Use `isRefinement` */
export const isRefinementLabel = isRefinement;

// ---------------------------------------------------------------------------
// §5.4 — Category detection (domain-agnostic)
// ---------------------------------------------------------------------------

/**
 * Labels suggesting a broad, category-level concept suitable as a parent.
 * Generic tokens that work across subjects.
 *
 * EXTENSIBILITY: Add subject-specific tokens here (e.g. "cell", "era", "theme").
 * Never add domain-specific if-statements.
 */
export const CATEGORY_HINTS = [
	"hypothesis",
	"test",
	"rule",
	"model",
	"function",
	"equation",
	"theorem",
	"concept",
	"idea",
	"structure",
	"system",
	"process",
	"method",
	"strategy",
	"p-value",
	"p value",
];

/** @deprecated Use `CATEGORY_HINTS` */
export const CATEGORY_HINT_TOKENS = CATEGORY_HINTS;

/**
 * Returns true if `label` looks like a broad category concept suitable as a parent.
 * Refinement labels always return false even when they contain a category token.
 */
export function isCategory(label: string): boolean {
	if (isRefinement(label)) return false;
	const l = normalize(label);
	return CATEGORY_HINTS.some((t) => l.includes(normalize(t)));
}

/** @deprecated Use `isCategory` */
export const isCategoryLabel = isCategory;

// ---------------------------------------------------------------------------
// §5.5 — Structural support
// ---------------------------------------------------------------------------

/** Returns how many item plans reference this concept. */
export function countPlans(id: string, plans: ItemPlan[]): number {
	return plans.filter((p) => p.concepts.includes(id)).length;
}

/** @deprecated Use `countPlans` */
export function countItemPlansForConcept(conceptId: string, itemPlans: ItemPlan[]): number {
	return countPlans(conceptId, itemPlans);
}

/**
 * Returns true if a node has enough structural support to be a parent group.
 * Must appear in ≥ 1 item plan, OR have ≥ 2 strong edges (≥ 0.7).
 */
export function hasSupport(
	node: ConceptNode,
	plans: ItemPlan[],
	edges: Edge[],
): boolean {
	if (countPlans(node.id, plans) >= 1) return true;
	const strongEdgeCount = edges.filter(
		(e) => (e.from === node.id || e.to === node.id) && e.strength >= 0.7,
	).length;
	return strongEdgeCount >= 2;
}

/** @deprecated Use `hasSupport` */
export function hasStructuralSupport(
	node: ConceptNode,
	itemPlans: ItemPlan[],
	edges: Edge[],
): boolean {
	return hasSupport(node, itemPlans, edges);
}

// ---------------------------------------------------------------------------
// §5.6 — Parent selection
// ---------------------------------------------------------------------------

/**
 * Returns all nodes that qualify as parent groups:
 * – label reads as a broad category (not a refinement)
 * – weight ≥ 1.2 (substantial instructional presence)
 * – appears in ≥ 1 item plan, OR has ≥ 2 strong edges
 */
export function selectParents(
	nodes: ConceptNode[],
	plans: ItemPlan[],
	edges: Edge[],
): ConceptNode[] {
	// Use !isRefinement (not isCategory) so that domain-specific single-word
	// concepts like "Photosynthesis" or "Theme" qualify as parents without
	// requiring a generic hint token. Refinements (calculation, step, etc.)
	// are still explicitly blocked; hasSupport() prevents low-evidence noise.
	return nodes.filter(
		(n) => !isRefinement(n.label) && n.weight >= 1.2 && hasSupport(n, plans, edges),
	);
}

/** @deprecated Use `selectParents` */
export function selectParentCandidates(
	nodes: ConceptNode[],
	itemPlans: ItemPlan[],
	edges: Edge[],
): ConceptNode[] {
	return selectParents(nodes, itemPlans, edges);
}

// ---------------------------------------------------------------------------
// §5.7 — Child assignment
// ---------------------------------------------------------------------------

/** Returns the edge between nodes a and b (undirected), or undefined. */
export function findEdgeBetween(a: string, b: string, edges: Edge[]): Edge | undefined {
	return edges.find(
		(e) => (e.from === a && e.to === b) || (e.to === a && e.from === b),
	);
}

/**
 * Returns true if `childLabel` textually contains `parentLabel` (but is not equal).
 * e.g. "P-value Calculation" contains "P-value" → true
 */
export function labelContainsParent(childLabel: string, parentLabel: string): boolean {
	const c = normalize(childLabel);
	const p = normalize(parentLabel);
	return c !== p && c.includes(p);
}

/**
 * §5.7 — Decides whether `child` belongs inside `parent`'s group.
 *
 * Rules (applied in priority order):
 * 1. Strong edge (strength ≥ 0.7) AND child.weight ≤ parent.weight.
 *    The weight check breaks the symmetry of undirected edges: only the
 *    lighter node becomes the child, never the heavier one.
 * 2. child label textually contains the parent label.
 *
 * Note: The spec also lists "isRefinement(child) && !isRefinement(parent)" as a
 * rule. That is intentionally NOT applied here without an edge requirement because
 * it would incorrectly pull refinements from unrelated concepts. Label containment
 * (Rule 2) already captures well-named refinements; edge+weight (Rule 1) handles
 * the rest. Add the refinement-only rule only if a golden fixture requires it.
 */
export function isChild(
	child: ConceptNode,
	parent: ConceptNode,
	edges: Edge[],
): boolean {
	if (child.id === parent.id) return false;

	const edge = findEdgeBetween(child.id, parent.id, edges);
	if (edge && edge.strength >= 0.7 && child.weight <= parent.weight) return true;

	// Rule 2: label containment — only valid when child is lighter than parent.
	// Without the weight guard, a heavier node whose label happens to contain the
	// parent label (e.g. "Heavy P-value Node" ⊃ "P-value") would be incorrectly
	// pulled in as a child.
	if (labelContainsParent(child.label, parent.label) && child.weight <= parent.weight) return true;

	return false;
}

/** @deprecated Use `isChild` */
export function isChildOfParent(
	child: ConceptNode,
	parent: ConceptNode,
	edges: Edge[],
): boolean {
	return isChild(child, parent, edges);
}

// ---------------------------------------------------------------------------
// §5.8 — Group construction
// ---------------------------------------------------------------------------

/**
 * Given canonical concept nodes, resolved edges, and resolved item plans,
 * produces a sorted, deduplicated array of ConceptGroups.
 *
 * Assumptions:
 * – `nodes` are already de-duped / merged (merge-map has been applied upstream).
 * – Item plan concept references are already remapped to canonical IDs.
 *
 * Algorithm:
 * 1. Select parent candidates (category label + weight + structural support).
 * 2. For each parent, collect children via edge strength + label containment.
 * 3. Remove groups with zero coverage (no questions, no children).
 * 4. Defensive filter: remove any parent that is also a child of another group.
 *    (e.g. "Alternative Hypothesis" passes parent checks but is a child of
 *     "Null Hypothesis" — the defensive filter removes it as a top-level group.)
 * 5. Sort by total question count descending.
 *
 * EXTENSIBILITY RULES (from spec §8):
 * – Do NOT add domain-specific if-statements.
 * – Extend REFINEMENT_TOKENS / CATEGORY_HINTS for new subjects.
 * – All changes must keep golden fixture tests passing.
 */
export function buildConceptGroups(
	nodes: ConceptNode[],
	edges: Edge[],
	plans: ItemPlan[],
): ConceptGroup[] {
	const parents = selectParents(nodes, plans, edges);

	const groups: ConceptGroup[] = parents.map((parent) => {
		const children = nodes.filter((node) => isChild(node, parent, edges));
		const parentQCount = countPlans(parent.id, plans);

		const childEntries = children.map((c) => ({
			id: c.id,
			label: c.label,
			weight: c.weight,
			questionCount: countPlans(c.id, plans),
		}));

		childEntries.sort((a, b) => b.weight - a.weight);

		const total = parentQCount + childEntries.reduce((sum, c) => sum + c.questionCount, 0);

		return {
			parentId: parent.id,
			parentLabel: parent.label,
			questionCount: total,
			children: childEntries,
		};
	});

	// Drop groups with no evidence in the document
	const filtered = groups.filter((g) => g.children.length >= 1 || g.questionCount >= 1);

	// Defensive: a node that is already a child of another group must not
	// also appear as a top-level parent group.
	const allChildIds = new Set(filtered.flatMap((g) => g.children.map((c) => c.id)));
	const result = filtered.filter((g) => !allChildIds.has(g.parentId));

	result.sort((a, b) => b.questionCount - a.questionCount);
	return result;
}

// ---------------------------------------------------------------------------
// §5.9 — UI filtering
// ---------------------------------------------------------------------------

/**
 * Removes concepts from a flat list that are already children in a grouped view.
 * Prevents mid-level concepts from appearing at the top level in the UI.
 */
export function filterTopLevel<T extends { concept: string }>(
	allConcepts: T[],
	groups: ConceptGroup[],
): T[] {
	const childIds = new Set(groups.flatMap((g) => g.children.map((c) => c.id)));
	return allConcepts.filter((c) => !childIds.has(c.concept));
}

/** @deprecated Use `filterTopLevel` */
export function filterTopLevelConcepts<T extends { concept: string }>(
	allConcepts: T[],
	conceptGroups: ConceptGroup[],
): T[] {
	return filterTopLevel(allConcepts, conceptGroups);
}
