/**
 * GOLDEN FIXTURE 3 — ELA / Literary Analysis
 *
 * Document: 9th-grade English unit on narrative writing and literary devices.
 * Validates domain-agnostic behavior across a humanities subject with no math.
 */
import type { ConceptGroup, ConceptNode, Edge, ItemPlan } from "../../conceptGrouping";

export const nodes: ConceptNode[] = [
	// Big ideas (parents)
	{ id: "theme", label: "Theme", weight: 2.3 },
	{ id: "narrative-structure", label: "Narrative Structure", weight: 2.2 },
	{ id: "figurative-language", label: "Figurative Language Strategy", weight: 2.1 },

	// Theme children
	{ id: "theme-identification", label: "Theme Identification Example", weight: 1.6 },
	{ id: "theme-development", label: "Theme Development Steps", weight: 1.5 },
	{ id: "universal-theme", label: "Universal Theme Concept", weight: 1.3 },

	// Narrative structure children
	{ id: "plot-structure", label: "Plot Structure", weight: 1.7 },
	{ id: "rising-action-setup", label: "Rising Action Setup", weight: 1.4 },
	{ id: "climax-identification", label: "Climax Identification Example", weight: 1.3 },

	// Figurative language children
	{ id: "metaphor-example", label: "Metaphor Example", weight: 1.5 },
	{ id: "simile-example", label: "Simile Example", weight: 1.4 },
	{ id: "symbolism-interpretation", label: "Symbolism Interpretation", weight: 1.6 },

	// Noise
	{ id: "general-intro", label: "Introduction", weight: 1.5 },
	{ id: "ela.framework", label: "ela.framework", weight: 0.6 },
];

export const edges: Edge[] = [
	{ from: "theme", to: "theme-identification", strength: 0.86 },
	{ from: "theme", to: "theme-development", strength: 0.84 },
	{ from: "theme", to: "universal-theme", strength: 0.78 },

	{ from: "narrative-structure", to: "plot-structure", strength: 0.90 },
	{ from: "narrative-structure", to: "rising-action-setup", strength: 0.82 },
	{ from: "narrative-structure", to: "climax-identification", strength: 0.81 },

	{ from: "figurative-language", to: "metaphor-example", strength: 0.85 },
	{ from: "figurative-language", to: "simile-example", strength: 0.83 },
	{ from: "figurative-language", to: "symbolism-interpretation", strength: 0.87 },
];

export const itemPlans: ItemPlan[] = [
	{ id: "q1",  concepts: ["theme"] },
	{ id: "q2",  concepts: ["theme-identification"] },
	{ id: "q3",  concepts: ["theme-development"] },
	{ id: "q4",  concepts: ["universal-theme"] },

	{ id: "q5",  concepts: ["narrative-structure"] },
	{ id: "q6",  concepts: ["narrative-structure"] },
	{ id: "q7",  concepts: ["plot-structure"] },
	{ id: "q8",  concepts: ["rising-action-setup"] },
	{ id: "q9",  concepts: ["climax-identification"] },

	{ id: "q10", concepts: ["figurative-language"] },
	{ id: "q11", concepts: ["metaphor-example"] },
	{ id: "q12", concepts: ["simile-example"] },
	{ id: "q13", concepts: ["symbolism-interpretation"] },
	{ id: "q14", concepts: ["symbolism-interpretation"] },
];

/**
 * EXPECTED OUTPUT
 * "Introduction" is noise (no CATEGORY_HINTS), "ela.framework" is low-weight.
 * "theme" label alone has no CATEGORY_HINTS token — but fixture validates
 * that the algo doesn't require them for label-containment children.
 *
 * NOTE: "theme" lacks CATEGORY_HINTS — it won't be a parent under current rules
 * unless "theme" is added to CATEGORY_HINTS. This fixture intentionally tests
 * that boundary: if "theme" is NOT in CATEGORY_HINTS, these groups won't appear.
 * The fixture reflects the CURRENT behavior (theme excluded) as a regression anchor.
 * To support ELA fully, add "theme" to CATEGORY_HINTS in conceptGrouping.ts.
 *
 * Current expected: narrative-structure and figurative-language have CATEGORY_HINTS.
 * "theme" does NOT — so its children still appear in the output but under
 * narrative-structure's children (via edge) or as standalone if no edge.
 *
 * ACTUAL expected with current CATEGORY_HINTS:
 * - narrative-structure → plot-structure, rising-action-setup, climax-identification
 * - figurative-language → metaphor-example, simile-example, symbolism-interpretation
 * (theme group absent — "theme" has no category hint token currently)
 */
export const expectedGroups: ConceptGroup[] = [
	{
		parentId: "figurative-language",
		parentLabel: "Figurative Language Strategy",
		questionCount: 5,
		children: [
			{ id: "symbolism-interpretation", label: "Symbolism Interpretation", weight: 1.6, questionCount: 2 },
			{ id: "metaphor-example", label: "Metaphor Example", weight: 1.5, questionCount: 1 },
			{ id: "simile-example", label: "Simile Example", weight: 1.4, questionCount: 1 },
		],
	},
	{
		parentId: "narrative-structure",
		parentLabel: "Narrative Structure",
		questionCount: 5,
		children: [
			{ id: "plot-structure", label: "Plot Structure", weight: 1.7, questionCount: 1 },
			{ id: "rising-action-setup", label: "Rising Action Setup", weight: 1.4, questionCount: 1 },
			{ id: "climax-identification", label: "Climax Identification Example", weight: 1.3, questionCount: 1 },
		],
	},
];

/**
 * Nodes that ARE expected to be children (and must NOT appear top-level).
 * Used in test assertions separately from the group shape.
 */
export const expectedChildIds = new Set([
	"plot-structure",
	"rising-action-setup",
	"climax-identification",
	"metaphor-example",
	"simile-example",
	"symbolism-interpretation",
]);
