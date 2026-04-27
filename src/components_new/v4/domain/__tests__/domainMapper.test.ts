import { describe, test, expect } from "vitest";
import { mapConceptsToCanonical } from "../domainMapper";
import statsJson from "../ontologies/stats.json";
import bioJson from "../ontologies/biology.json";
import elaJson from "../ontologies/ela.json";

describe("mapConceptsToCanonical — stats", () => {
	test("maps 'Null Hypothesis' to stats.null_hypothesis with confidence > 0.7", () => {
		const extracted = [{ id: "null-hyp", label: "Null Hypothesis", weight: 2.0 }];
		const mappings = mapConceptsToCanonical(extracted, statsJson.concepts);
		expect(mappings[0].canonicalId).toBe("stats.null_hypothesis");
		expect(mappings[0].confidence).toBeGreaterThan(0.7);
	});

	test("maps 'P-value' to stats.p_value", () => {
		const extracted = [{ id: "p-val", label: "P-value", weight: 2.4 }];
		const mappings = mapConceptsToCanonical(extracted, statsJson.concepts);
		expect(mappings[0].canonicalId).toBe("stats.p_value");
	});

	test("maps 'Alternative hypothesis' to stats.alternative_hypothesis", () => {
		const extracted = [{ id: "alt-hyp", label: "Alternative hypothesis", weight: 2.0 }];
		const mappings = mapConceptsToCanonical(extracted, statsJson.concepts);
		expect(mappings[0].canonicalId).toBe("stats.alternative_hypothesis");
	});

	test("maps multiple concepts in one call", () => {
		const extracted = [
			{ id: "null-hyp", label: "Null hypothesis", weight: 2.5 },
			{ id: "p-val", label: "P-value", weight: 2.4 },
		];
		const mappings = mapConceptsToCanonical(extracted, statsJson.concepts);
		expect(mappings).toHaveLength(2);
		expect(mappings[0].conceptId).toBe("null-hyp");
		expect(mappings[1].conceptId).toBe("p-val");
	});
});

describe("mapConceptsToCanonical — cross-domain", () => {
	test("maps biology concept to bio ontology", () => {
		const extracted = [{ id: "photo", label: "Photosynthesis", weight: 2.6 }];
		const mappings = mapConceptsToCanonical(extracted, bioJson.concepts);
		expect(mappings[0].canonicalId).toBe("bio.photosynthesis");
		expect(mappings[0].confidence).toBe(1);
	});

	test("maps ELA concept to ela ontology", () => {
		const extracted = [{ id: "fig-lang", label: "Figurative language", weight: 2.2 }];
		const mappings = mapConceptsToCanonical(extracted, elaJson.concepts);
		expect(mappings[0].canonicalId).toBe("ela.figurative_language");
		expect(mappings[0].confidence).toBe(1);
	});

	test("returns a mapping for every extracted node", () => {
		const extracted = [
			{ id: "a", label: "Glycolysis", weight: 1.8 },
			{ id: "b", label: "ATP synthesis", weight: 1.6 },
			{ id: "c", label: "Krebs cycle", weight: 1.5 },
		];
		const mappings = mapConceptsToCanonical(extracted, bioJson.concepts);
		expect(mappings).toHaveLength(3);
		for (const m of mappings) {
			expect(m.canonicalId).toBeTruthy();
			expect(m.confidence).toBeGreaterThan(0);
		}
	});
});
