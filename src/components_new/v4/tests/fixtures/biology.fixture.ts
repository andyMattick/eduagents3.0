/**
 * GOLDEN FIXTURE 2 — Biology / Cellular Respiration
 *
 * Document: High-school biology unit on cellular respiration and photosynthesis.
 * Validates domain-agnostic behavior: no stats-specific logic should be needed.
 */
import type { ConceptGroup, ConceptNode, Edge, ItemPlan } from "../../conceptGrouping";

export const nodes: ConceptNode[] = [
	// Big ideas (parents)
	{ id: "photosynthesis", label: "Photosynthesis", weight: 2.6 },
	{ id: "cellular-respiration", label: "Cellular Respiration Process", weight: 2.4 },
	{ id: "ecosystem", label: "Ecosystem Structure", weight: 2.2 },

	// Photosynthesis children
	{ id: "light-reactions", label: "Light-Dependent Reactions", weight: 1.7 },
	{ id: "calvin-cycle", label: "Calvin Cycle Steps", weight: 1.5 },
	{ id: "chlorophyll-function", label: "Chlorophyll Function Example", weight: 1.3 },

	// Cellular respiration children
	{ id: "glycolysis-steps", label: "Glycolysis Steps", weight: 1.6 },
	{ id: "atp-calculation", label: "ATP Yield Calculation", weight: 1.4 },
	{ id: "krebs-cycle-steps", label: "Krebs Cycle Steps", weight: 1.5 },

	// Ecosystem children
	{ id: "food-web-structure", label: "Food Web Structure", weight: 1.3 },
	{ id: "energy-flow-model", label: "Energy Flow Model", weight: 1.4 },

	// Noise nodes (must never be parents)
	{ id: "general-biology", label: "General Overview", weight: 1.4 },
	{ id: "bio.framework", label: "bio.framework", weight: 0.8 },
];

export const edges: Edge[] = [
	{ from: "photosynthesis", to: "light-reactions", strength: 0.88 },
	{ from: "photosynthesis", to: "calvin-cycle", strength: 0.85 },
	{ from: "photosynthesis", to: "chlorophyll-function", strength: 0.80 },

	{ from: "cellular-respiration", to: "glycolysis-steps", strength: 0.87 },
	{ from: "cellular-respiration", to: "atp-calculation", strength: 0.82 },
	{ from: "cellular-respiration", to: "krebs-cycle-steps", strength: 0.85 },

	{ from: "ecosystem", to: "food-web-structure", strength: 0.81 },
	{ from: "ecosystem", to: "energy-flow-model", strength: 0.84 },
];

export const itemPlans: ItemPlan[] = [
	{ id: "q1",  concepts: ["photosynthesis"] },
	{ id: "q2",  concepts: ["light-reactions"] },
	{ id: "q3",  concepts: ["light-reactions"] },
	{ id: "q4",  concepts: ["calvin-cycle"] },
	{ id: "q5",  concepts: ["chlorophyll-function"] },

	{ id: "q6",  concepts: ["cellular-respiration"] },
	{ id: "q7",  concepts: ["glycolysis-steps"] },
	{ id: "q8",  concepts: ["atp-calculation"] },
	{ id: "q9",  concepts: ["krebs-cycle-steps"] },
	{ id: "q10", concepts: ["krebs-cycle-steps"] },

	{ id: "q11", concepts: ["ecosystem"] },
	{ id: "q12", concepts: ["food-web-structure"] },
	{ id: "q13", concepts: ["energy-flow-model"] },
];

/**
 * EXPECTED OUTPUT
 * Sort: questionCount descending (photosynthesis=5, respiration=5, ecosystem=3).
 * No noise nodes should appear.
 */
export const expectedGroups: ConceptGroup[] = [
	{
		parentId: "photosynthesis",
		parentLabel: "Photosynthesis",
		questionCount: 5,
		children: [
			{ id: "light-reactions", label: "Light-Dependent Reactions", weight: 1.7, questionCount: 2 },
			{ id: "calvin-cycle", label: "Calvin Cycle Steps", weight: 1.5, questionCount: 1 },
			{ id: "chlorophyll-function", label: "Chlorophyll Function Example", weight: 1.3, questionCount: 1 },
		],
	},
	{
		parentId: "cellular-respiration",
		parentLabel: "Cellular Respiration Process",
		questionCount: 5,
		children: [
			{ id: "glycolysis-steps", label: "Glycolysis Steps", weight: 1.6, questionCount: 1 },
			{ id: "krebs-cycle-steps", label: "Krebs Cycle Steps", weight: 1.5, questionCount: 2 },
			{ id: "atp-calculation", label: "ATP Yield Calculation", weight: 1.4, questionCount: 1 },
		],
	},
	{
		parentId: "ecosystem",
		parentLabel: "Ecosystem Structure",
		questionCount: 3,
		children: [
			{ id: "energy-flow-model", label: "Energy Flow Model", weight: 1.4, questionCount: 1 },
			{ id: "food-web-structure", label: "Food Web Structure", weight: 1.3, questionCount: 1 },
		],
	},
];
