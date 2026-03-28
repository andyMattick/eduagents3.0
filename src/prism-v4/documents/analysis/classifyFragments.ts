import type { CanonicalDocument, FragmentSemanticRecord } from "../../schema/semantic";

function unique<T>(values: T[]) {
	return [...new Set(values)];
}

function normalizeConceptName(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const SUBJECT_CONCEPT_PATTERNS: Record<string, Array<{ concept: string; pattern: RegExp }>> = {
	algebra: [
		{ concept: "algebra", pattern: /\balgebra\b/ },
		{ concept: "linear equations", pattern: /\blinear equation(s)?\b/ },
		{ concept: "slope", pattern: /\bslope\b/ },
		{ concept: "y-intercept", pattern: /\by[- ]intercept\b/ },
		{ concept: "systems of equations", pattern: /\bsystem(s)? of equation(s)?\b/ },
		{ concept: "inequalities", pattern: /\binequalit(y|ies)\b/ },
		{ concept: "factoring", pattern: /\bfactor(ing|ed)?\b/ },
		{ concept: "quadratic equations", pattern: /\bquadratic( equation(s)?)?\b/ },
		{ concept: "exponents", pattern: /\bexponent(s)?\b/ },
		{ concept: "functions", pattern: /\bfunction(s)?\b/ },
		{ concept: "domain and range", pattern: /\bdomain and range\b/ },
		{ concept: "proportional relationships", pattern: /\bproportional relationship(s)?\b/ },
		{ concept: "rate of change", pattern: /\brate of change\b/ },
		{ concept: "variable isolation", pattern: /\bvariable isolation\b/ },
		{ concept: "distributive property", pattern: /\bdistributive property\b/ },
		{ concept: "solving for x", pattern: /\bsolv(e|ing) for x\b/ },
		{ concept: "equation solving", pattern: /\bequation(s)?\b|\binverse operation(s)?\b/ },
		{ concept: "isolate variable", pattern: /\bisolate (the )?variable\b|\bsolve for the variable\b/ },
		{ concept: "ratios", pattern: /\bratio(s)?\b/ },
		{ concept: "decimal operations", pattern: /\bdecimal(s)?\b|\b0\.\d+/ },
		{ concept: "operations", pattern: /\boperation(s)?\b|\badd\b|\bsubtract\b|\bmultiply\b|\bdivide\b/ },
	],
	geometry: [
		{ concept: "angles", pattern: /\bangle(s)?\b/ },
		{ concept: "triangles", pattern: /\btriangle(s)?\b/ },
		{ concept: "congruence", pattern: /\bcongruen(t|ce)\b/ },
		{ concept: "similarity", pattern: /\bsimilarit(y|ies)\b|\bsimilar figures\b/ },
		{ concept: "Pythagorean theorem", pattern: /\bpythagorean theorem\b|\bpythagorean\b/ },
		{ concept: "area", pattern: /\barea\b/ },
		{ concept: "perimeter", pattern: /\bperimeter\b/ },
		{ concept: "volume", pattern: /\bvolume\b/ },
		{ concept: "transformations", pattern: /\btransformation(s)?\b/ },
		{ concept: "symmetry", pattern: /\bsymmetr(y|ical)\b/ },
		{ concept: "circles", pattern: /\bcircle(s)?\b/ },
		{ concept: "radius and diameter", pattern: /\bradius\b|\bdiameter\b/ },
		{ concept: "polygons", pattern: /\bpolygon(s)?\b/ },
		{ concept: "coordinate geometry", pattern: /\bcoordinate geometry\b|\bcoordinate plane\b/ },
		{ concept: "proofs", pattern: /\bproof(s)?\b/ },
	],
	biology: [
		{ concept: "cells", pattern: /\bcell(s)?\b/ },
		{ concept: "photosynthesis", pattern: /\bphotosynthesis\b/ },
		{ concept: "cellular respiration", pattern: /\bcellular respiration\b/ },
		{ concept: "chloroplast", pattern: /\bchloroplast(s)?\b/ },
		{ concept: "mitochondria", pattern: /\bmitochondria\b|\bmitochondrion\b/ },
		{ concept: "cell membrane", pattern: /\bcell membrane\b/ },
		{ concept: "DNA", pattern: /\bdna\b/ },
		{ concept: "mitosis", pattern: /\bmitosis\b/ },
		{ concept: "osmosis", pattern: /\bosmosis\b/ },
		{ concept: "diffusion", pattern: /\bdiffusion\b/ },
		{ concept: "enzymes", pattern: /\benzyme(s)?\b/ },
		{ concept: "ecosystems", pattern: /\becosystem(s)?\b/ },
		{ concept: "food chains", pattern: /\bfood chain(s)?\b/ },
		{ concept: "producers and consumers", pattern: /\bproducer(s)?\b|\bconsumer(s)?\b/ },
		{ concept: "decomposers", pattern: /\bdecomposer(s)?\b/ },
		{ concept: "energy transfer", pattern: /\benergy transfer\b/ },
		{ concept: "homeostasis", pattern: /\bhomeostasis\b/ },
	],
	physics: [
		{ concept: "forces and motion", pattern: /\bforce(s)?\b|\bmotion\b/ },
		{ concept: "gravity", pattern: /\bgravity\b/ },
		{ concept: "speed and velocity", pattern: /\bspeed\b|\bvelocity\b/ },
	],
	earth_science: [
		{ concept: "water cycle", pattern: /\bwater cycle\b/ },
		{ concept: "evaporation", pattern: /\bevaporation\b/ },
		{ concept: "condensation", pattern: /\bcondensation\b/ },
		{ concept: "precipitation", pattern: /\bprecipitation\b/ },
		{ concept: "weathering", pattern: /\bweathering\b/ },
		{ concept: "erosion", pattern: /\berosion\b/ },
		{ concept: "plate tectonics", pattern: /\bplate tectonics\b/ },
		{ concept: "rock cycle", pattern: /\brock cycle\b/ },
		{ concept: "atmosphere", pattern: /\batmosphere\b/ },
		{ concept: "climate", pattern: /\bclimate\b/ },
		{ concept: "weather patterns", pattern: /\bweather pattern(s)?\b/ },
		{ concept: "ocean currents", pattern: /\bocean current(s)?\b/ },
		{ concept: "carbon cycle", pattern: /\bcarbon cycle\b/ },
		{ concept: "renewable energy", pattern: /\brenewable energy\b/ },
		{ concept: "natural resources", pattern: /\bnatural resource(s)?\b/ },
	],
	chemistry: [
		{ concept: "atoms", pattern: /\batom(s)?\b/ },
		{ concept: "molecules", pattern: /\bmolecule(s)?\b/ },
		{ concept: "chemical reactions", pattern: /\bchemical reaction(s)?\b/ },
		{ concept: "periodic table", pattern: /\bperiodic table\b/ },
		{ concept: "valence electrons", pattern: /\bvalence electron(s)?\b|\bvalence\b/ },
		{ concept: "ionic bonds", pattern: /\bionic bond(s)?\b/ },
		{ concept: "covalent bonds", pattern: /\bcovalent bond(s)?\b/ },
		{ concept: "pH", pattern: /\bph\b/ },
		{ concept: "acids and bases", pattern: /\bacid(s)?\b|\bbase(s)?\b/ },
		{ concept: "solutions", pattern: /\bsolution(s)?\b/ },
		{ concept: "mixtures", pattern: /\bmixture(s)?\b/ },
		{ concept: "conservation of mass", pattern: /\bconservation of mass\b/ },
		{ concept: "endothermic reactions", pattern: /\bendothermic\b/ },
		{ concept: "exothermic reactions", pattern: /\bexothermic\b/ },
		{ concept: "states of matter", pattern: /\bstate(s)? of matter\b/ },
	],
	ela: [
		{ concept: "main idea", pattern: /\bmain idea\b/ },
		{ concept: "theme", pattern: /\btheme\b/ },
		{ concept: "inference", pattern: /\binference(s)?\b|\binfer\b/ },
		{ concept: "character analysis", pattern: /\bcharacter analysis\b|\bcharacter trait(s)?\b/ },
		{ concept: "plot structure", pattern: /\bplot structure\b|\bplot\b/ },
		{ concept: "conflict", pattern: /\bconflict\b/ },
		{ concept: "setting", pattern: /\bsetting\b/ },
		{ concept: "author's purpose", pattern: /\bauthor['’]s purpose\b/ },
		{ concept: "figurative language", pattern: /\bfigurative language\b/ },
		{ concept: "tone", pattern: /\btone\b/ },
		{ concept: "summarizing", pattern: /\bsummar(y|ize|izing)\b/ },
		{ concept: "text evidence", pattern: /\btext evidence\b/ },
	],
	statistics: [
		{ concept: "hypothesis testing", pattern: /\bhypothesis test(ing)?\b|\bnull hypothesis\b|\balternative hypothesis\b|\bh0\b|\bha\b/ },
		{ concept: "p-values & decision rules", pattern: /\bp-?value(s)?\b|\bdecision rule\b|(?:\balpha\b|α)\s*[=:]?\s*0?\.\d+/ },
		{ concept: "one-sample proportion test", pattern: /\bone-?sample proportion test\b|\bsample proportion\b|\bkissing couples\b/ },
		{ concept: "one-sample mean test", pattern: /\bone-?sample mean test\b|\bsample mean\b|\brestaurant income\b|\bconstruction zone speed(s)?\b/ },
		{ concept: "simulation-based inference", pattern: /\bsimulation-based inference\b|\bsimulation\b|\bsampling distribution\b|\bdotplot\b|\brepeated samples?\b/ },
		{ concept: "parameters & statistics", pattern: /\bparameter(s)?\b|\bstatistic(s)?\b/ },
		{ concept: "type i and type ii errors", pattern: /\btype i\b|\btype ii\b|\bfalse positive\b|\bfalse negative\b/ },
	],
	social_studies: [
		{ concept: "government", pattern: /\bgovernment\b/ },
		{ concept: "government branches", pattern: /\bbranch(es)? of government\b|\bgovernment branch(es)?\b/ },
		{ concept: "constitution", pattern: /\bconstitution\b/ },
		{ concept: "democracy", pattern: /\bdemocrac(y|ies)\b/ },
		{ concept: "economy", pattern: /\beconom(y|ic)\b/ },
		{ concept: "supply and demand", pattern: /\bsupply and demand\b/ },
		{ concept: "geography", pattern: /\bgeograph(y|ic)\b/ },
		{ concept: "culture", pattern: /\bculture\b/ },
		{ concept: "historical periods", pattern: /\bhistorical period(s)?\b|\bancient\b|\bmedieval\b|\bindustrial revolution\b/ },
		{ concept: "historical events", pattern: /\bhistorical event(s)?\b|\bhistory\b/ },
		{ concept: "primary sources", pattern: /\bprimary source(s)?\b/ },
		{ concept: "secondary sources", pattern: /\bsecondary source(s)?\b/ },
		{ concept: "citizenship", pattern: /\bcitizenship\b/ },
		{ concept: "rights and responsibilities", pattern: /\bright(s)?\b|\bresponsibilit(y|ies)\b/ },
		{ concept: "global trade", pattern: /\bglobal trade\b|\btrade\b/ },
		{ concept: "conflict and cooperation", pattern: /\bconflict\b|\bcooperation\b/ },
		{ concept: "timelines", pattern: /\btimeline(s)?\b/ },
	],
};

const CONCEPT_PATTERNS: Array<{ concept: string; pattern: RegExp }> = [
	...Object.values(SUBJECT_CONCEPT_PATTERNS).flat(),
	{ concept: "fractions", pattern: /\bfraction(s)?\b/ },
	{ concept: "equivalent fractions", pattern: /\bequivalent\b/ },
	{ concept: "number line reasoning", pattern: /\bnumber line\b/ },
	{ concept: "equation solving", pattern: /\bequation(s)?\b|\binverse operation(s)?\b/ },
	{ concept: "common denominators", pattern: /\bdenominator(s)?\b/ },
	{ concept: "linear equations", pattern: /\blinear equation(s)?\b/ },
	{ concept: "isolate variable", pattern: /\bisolate (the )?variable\b|\bsolve for the variable\b/ },
	{ concept: "photosynthesis", pattern: /\bphotosynthesis\b/ },
	{ concept: "chloroplast", pattern: /\bchloroplast(s)?\b/ },
	{ concept: "glucose", pattern: /\bglucose\b/ },
	{ concept: "light-dependent reactions", pattern: /\blight[- ]dependent\b/ },
	{ concept: "calvin cycle", pattern: /\bcalvin cycle\b/ },
];

function extractLearningTarget(text: string, instructionalRole: FragmentSemanticRecord["instructionalRole"]) {
	if (instructionalRole !== "objective") {
		return null;
	}

	return text
		.replace(/^(learning objective|objective|learning target|i can)[:\s-]*/i, "")
		.trim() || text.trim();
}

function extractPrerequisiteConcepts(text: string) {
	const lower = text.toLowerCase();
	const concepts = CONCEPT_PATTERNS
		.filter(({ pattern }) => pattern.test(lower))
		.map(({ concept }) => normalizeConceptName(concept));
	const normalized = new Set(concepts);
	const hasStatisticalSignal = [
		"hypothesis testing",
		"p-values & decision rules",
		"one-sample proportion test",
		"one-sample mean test",
		"simulation-based inference",
		"parameters & statistics",
		"type i and type ii errors",
	].some((concept) => normalized.has(concept));
	if (hasStatisticalSignal) {
		normalized.delete("decimal operations");
		normalized.delete("rights and responsibilities");
		if (normalized.has("inference")) {
			normalized.delete("inference");
			if (/\bsimulation\b|\bsampling distribution\b|\bdotplot\b/.test(lower)) {
				normalized.add("simulation-based inference");
			}
		}
	}
	if (/review|before|prior|remember/.test(lower)) {
		return unique(normalized.size > 0 ? [...normalized] : [text.trim().slice(0, 48)]);
	}

	return unique([...normalized]);
}

function inferScaffoldLevel(text: string, instructionalRole: FragmentSemanticRecord["instructionalRole"]) {
	const lower = text.toLowerCase();
	if (instructionalRole === "objective" || /independent|exit ticket|extension/.test(lower)) {
		return "low" as const;
	}
	if (instructionalRole === "example" || /step|guided|together|model/.test(lower)) {
		return "high" as const;
	}
	if (instructionalRole === "instruction" || /practice|support|hint/.test(lower)) {
		return "medium" as const;
	}
	return "medium" as const;
}

function inferExampleType(text: string, instructionalRole: FragmentSemanticRecord["instructionalRole"]) {
	if (instructionalRole !== "example") {
		return undefined;
	}
	const lower = text.toLowerCase();
	if (/counterexample|not this|incorrect/.test(lower)) {
		return "counterexample" as const;
	}
	if (/worked example|step|showing each step|model/.test(lower)) {
		return "worked" as const;
	}
	return "non-worked" as const;
}

function extractMisconceptionTriggers(text: string) {
	const lower = text.toLowerCase();
	const triggers: string[] = [];
	if (/common mistake|mistake|error|misconception/.test(lower)) {
		triggers.push(text.trim());
	}
	if (/denominator/.test(lower)) {
		triggers.push("confusing numerator and denominator roles");
	}
	if (/number line/.test(lower)) {
		triggers.push("misreading scale or interval spacing");
	}
	if (/inverse operation|equation/.test(lower)) {
		triggers.push("forgetting inverse operations");
	}
	return unique(triggers);
}

function inferContentType(nodeType: CanonicalDocument["nodes"][number]["nodeType"], text: string): FragmentSemanticRecord["contentType"] {
	if (nodeType === "figure") {
		return "image";
	}
	if (nodeType === "caption") {
		return "text";
	}
	if (nodeType === "table" || nodeType === "tableCell") {
		return "table";
	}
	if (nodeType === "heading") {
		return "heading";
	}
	if (/\?$/.test(text) || /\bsolve\b|\bexplain\b|\bshow\b|\bjustify\b/i.test(text)) {
		return "question";
	}
	if (/\bgraph\b|\bchart\b|\bplot\b/i.test(text)) {
		return "graph";
	}
	if (/\bdiagram\b|\bfigure\b|\billustration\b/i.test(text)) {
		return "diagram";
	}
	return "text";
}

function classifyRole(text: string, contentType: FragmentSemanticRecord["contentType"]): Pick<FragmentSemanticRecord, "isInstructional" | "instructionalRole" | "evidence" | "confidence"> {
	const lower = text.toLowerCase();
	if (!text.trim()) {
		return { isInstructional: false, instructionalRole: "metadata", confidence: 0.98, evidence: "Empty text node." };
	}
	if (contentType === "image") {
		return { isInstructional: false, instructionalRole: "metadata", confidence: 0.82, evidence: "Figure/image node classified as non-instructional by default." };
	}
	if (/^page\s+\d+$/i.test(text) || /^name[:\s]/i.test(text) || /^date[:\s]/i.test(text)) {
		return { isInstructional: false, instructionalRole: "metadata", confidence: 0.95, evidence: "Detected page or form metadata." };
	}
	if (/\bobjective\b|\blearning target\b|\bi can\b/i.test(lower)) {
		return { isInstructional: true, instructionalRole: "objective", confidence: 0.94, evidence: "Objective cue detected." };
	}
	if (/\bexample\b|\bfor example\b|\bworked example\b/i.test(lower)) {
		return { isInstructional: true, instructionalRole: "example", confidence: 0.9, evidence: "Example cue detected." };
	}
	if (contentType === "question") {
		return { isInstructional: true, instructionalRole: "problem-stem", confidence: 0.88, evidence: "Question or directive cue detected." };
	}
	if (/\bdirections\b|\binstructions\b|\bcomplete the following\b/i.test(lower)) {
		return { isInstructional: true, instructionalRole: "instruction", confidence: 0.9, evidence: "Instruction cue detected." };
	}
	if (/\breflect\b|\breflection\b|\bjournal\b/i.test(lower)) {
		return { isInstructional: true, instructionalRole: "reflection", confidence: 0.88, evidence: "Reflection cue detected." };
	}
	if (/\bnote\b|\bremember\b|\bimportant\b/i.test(lower)) {
		return { isInstructional: true, instructionalRole: "note", confidence: 0.8, evidence: "Note cue detected." };
	}
	return { isInstructional: true, instructionalRole: "explanation", confidence: 0.62, evidence: "Default instructional explanation classification." };
}

export function classifyFragments(document: CanonicalDocument): FragmentSemanticRecord[] {
	return document.nodes.map((node) => {
		const text = node.normalizedText ?? node.text ?? "";
		const contentType = inferContentType(node.nodeType, text);
		const classification = classifyRole(text, contentType);
		const learningTarget = extractLearningTarget(text, classification.instructionalRole);
		const prerequisiteConcepts = extractPrerequisiteConcepts(text);
		const scaffoldLevel = inferScaffoldLevel(text, classification.instructionalRole);
		const exampleType = inferExampleType(text, classification.instructionalRole);
		const misconceptionTriggers = extractMisconceptionTriggers(text);
		return {
			id: `${document.id}-fragment-${node.id}`,
			documentId: document.id,
			anchors: [{ documentId: document.id, surfaceId: node.surfaceId, nodeId: node.id }],
			isInstructional: classification.isInstructional,
			instructionalRole: classification.instructionalRole,
			contentType,
			learningTarget,
			prerequisiteConcepts,
			scaffoldLevel,
			exampleType,
			misconceptionTriggers,
			confidence: classification.confidence,
			classifierVersion: "wave5-v1",
			strategy: "rule-based",
			evidence: classification.evidence,
			semanticTags: classification.isInstructional
				? unique([
					classification.instructionalRole,
					...(learningTarget ? ["learning-target"] : []),
					...(prerequisiteConcepts.length > 0 ? ["prerequisite"] : []),
					...(misconceptionTriggers.length > 0 ? ["misconception-trigger"] : []),
				])
				: ["metadata"],
		};
	});
}
