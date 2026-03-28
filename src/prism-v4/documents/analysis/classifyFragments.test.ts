import { describe, expect, it } from "vitest";

import { classifyFragments } from "./classifyFragments";
import type { CanonicalDocument } from "../../schema/semantic";

function buildDocument(texts: Array<{ id: string; nodeType: CanonicalDocument["nodes"][number]["nodeType"]; text: string }>): CanonicalDocument {
	return {
		id: "doc-test",
		sourceFileName: "lesson.pdf",
		sourceMimeType: "application/pdf",
		surfaces: [{ id: "surface-1", surfaceType: "page", index: 0, label: "Page 1" }],
		nodes: texts.map((entry, index) => ({
			id: entry.id,
			documentId: "doc-test",
			surfaceId: "surface-1",
			nodeType: entry.nodeType,
			orderIndex: index,
			text: entry.text,
			normalizedText: entry.text,
		})),
		createdAt: new Date().toISOString(),
	};
}

describe("classifyFragments", () => {
	it("extracts domain concepts from science and algebra vocabulary", () => {
		const fragments = classifyFragments(buildDocument([
			{ id: "node-1", nodeType: "heading", text: "Unit 4: Photosynthesis and the Calvin Cycle" },
			{ id: "node-2", nodeType: "paragraph", text: "Inside the chloroplast, plants use light-dependent reactions to produce glucose." },
			{ id: "node-3", nodeType: "paragraph", text: "Solve linear equations and isolate the variable in each step." },
		]));

		const concepts = [...new Set(fragments.flatMap((fragment) => fragment.prerequisiteConcepts ?? []))];
		expect(concepts).toEqual(expect.arrayContaining([
			"photosynthesis",
			"calvin cycle",
			"chloroplast",
			"light-dependent reactions",
			"glucose",
			"linear equations",
			"isolate variable",
		]));
	});

	it("extracts starter concepts across additional core subjects", () => {
		const fragments = classifyFragments(buildDocument([
			{ id: "node-1", nodeType: "paragraph", text: "Use algebra to compare fractions, equivalent fractions, and decimal operations on a number line." },
			{ id: "node-2", nodeType: "paragraph", text: "Use slope and the y-intercept to graph the function and describe its rate of change." },
			{ id: "node-3", nodeType: "paragraph", text: "Apply the Pythagorean theorem to triangles and justify the area of the polygon." },
			{ id: "node-4", nodeType: "paragraph", text: "Explain the water cycle, including evaporation, condensation, and precipitation." },
			{ id: "node-5", nodeType: "paragraph", text: "Describe how atoms form molecules during chemical reactions on the periodic table." },
			{ id: "node-6", nodeType: "paragraph", text: "Find the main idea, support it with text evidence, and explain the author's purpose." },
			{ id: "node-7", nodeType: "paragraph", text: "Compare democracy with the branches of government using primary sources and a timeline." },
			{ id: "node-8", nodeType: "paragraph", text: "Explain how cells in an ecosystem depend on producers, consumers, and decomposers." },
			{ id: "node-9", nodeType: "paragraph", text: "Describe how geography, culture, and historical periods shape a society." },
		]));

		const concepts = [...new Set(fragments.flatMap((fragment) => fragment.prerequisiteConcepts ?? []))];
		expect(concepts).toEqual(expect.arrayContaining([
			"algebra",
			"fractions",
			"equivalent fractions",
			"decimal operations",
			"number line reasoning",
			"slope",
			"y-intercept",
			"functions",
			"rate of change",
			"pythagorean theorem",
			"triangles",
			"area",
			"polygons",
			"water cycle",
			"evaporation",
			"condensation",
			"precipitation",
			"atoms",
			"molecules",
			"chemical reactions",
			"periodic table",
			"main idea",
			"text evidence",
			"author's purpose",
			"government",
			"democracy",
			"government branches",
			"primary sources",
			"timelines",
			"cells",
			"ecosystems",
			"producers and consumers",
			"decomposers",
			"geography",
			"culture",
			"historical periods",
		]));
	});
});