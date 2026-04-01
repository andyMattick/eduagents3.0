import type { ViewerData, ViewerScoredConcept } from "../viewer/buildViewerData";

export interface NarrativeSection {
	id: string;
	title: string;
	body: string;
}

export interface TeacherNarrativeOutput {
	sections: NarrativeSection[];
}

export interface WorkspaceMetadata {
	title?: string;
	subject?: string;
	gradeLevel?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function topN<T>(items: T[], n: number): T[] {
	return items.slice(0, n);
}

function conceptsByScore(scoredConcepts: ViewerScoredConcept[]): ViewerScoredConcept[] {
	return [...scoredConcepts].sort((a, b) => b.coverageScore - a.coverageScore);
}

function gapConcepts(scoredConcepts: ViewerScoredConcept[]): ViewerScoredConcept[] {
	// Use the coverage-threshold gap flag computed in buildViewerData after
	// concept normalization.  The old gapScore > 0.5 secondary condition was
	// set on unnormalized data and produced false positives for well-covered concepts.
	return scoredConcepts.filter((c) => !c.noiseCandidate && c.gap);
}

function noiseCandidates(scoredConcepts: ViewerScoredConcept[]): ViewerScoredConcept[] {
	return scoredConcepts.filter((c) => c.noiseCandidate);
}

function allMisconceptions(data: ViewerData): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const group of data.problemGroups) {
		for (const m of group.misconceptions) {
			if (!seen.has(m)) {
				seen.add(m);
				result.push(m);
			}
		}
	}
	for (const item of data.previewItems) {
		if (item.misconceptionTag && !seen.has(item.misconceptionTag)) {
			seen.add(item.misconceptionTag);
			result.push(item.misconceptionTag);
		}
	}
	return result;
}

function dominantConcepts(scoredConcepts: ViewerScoredConcept[]): string[] {
	return conceptsByScore(scoredConcepts)
		.filter((c) => c.coverageScore > 0.5)
		.map((c) => c.concept);
}

function weakConcepts(scoredConcepts: ViewerScoredConcept[]): ViewerScoredConcept[] {
	return scoredConcepts.filter((c) => !c.gap && !c.noiseCandidate && c.coverageScore < 0.4 && c.coverageScore > 0);
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildDocumentOverview(data: ViewerData, meta: WorkspaceMetadata): NarrativeSection {
	const docCount = data.documents.length;
	const conceptCount = data.scoredConcepts.length;
	const groupCount = data.problemGroups.length;
	const titleLine = meta.title ? `"${meta.title}"` : "this workspace";
	const subjectLine = meta.subject && meta.gradeLevel
		? ` (${meta.subject}, Grade ${meta.gradeLevel})`
		: meta.subject ? ` (${meta.subject})` : "";

	const topConcepts = topN(dominantConcepts(data.scoredConcepts), 3);

	let body = `${titleLine}${subjectLine} spans ${docCount} ${docCount === 1 ? "document" : "documents"} containing ${conceptCount} ${conceptCount === 1 ? "concept" : "concepts"} across ${groupCount} problem ${groupCount === 1 ? "group" : "groups"}.`;

	if (topConcepts.length) {
		body += ` The dominant instructional concepts are: ${topConcepts.join(", ")}.`;
	} else if (data.scoredConcepts.length) {
		body += ` The leading concept is ${data.scoredConcepts[0]?.concept ?? "unknown"}.`;
	}

	const surfaces = data.availableSurfaces;
	if (surfaces.includes("blueprint") && data.blueprint) {
		body += " A blueprint is available to guide assessment design.";
	}

	return { id: "overview", title: "Document Overview", body };
}

function buildConceptEmphasis(data: ViewerData): NarrativeSection {
	const sorted = conceptsByScore(data.scoredConcepts);
	const dominant = sorted.filter((c) => c.coverageScore > 0.6);
	const underrep = weakConcepts(sorted);

	let body: string;

	if (!sorted.length) {
		body = "No concept data is available for this workspace.";
	} else if (dominant.length === 0) {
		body = "No single concept dominates this workspace. Coverage is distributed broadly across all concepts.";
	} else {
		const dominantList = dominant.map((c) => `${c.concept} (${Math.round(c.coverageScore * 100)}%)`).join(", ");
		body = `Dominant concepts: ${dominantList}.`;
	}

	if (underrep.length) {
		const underList = underrep.map((c) => c.concept).join(", ");
		body += ` Underrepresented concepts that could benefit from more coverage: ${underList}.`;
	}

	return { id: "concept-emphasis", title: "Concept Emphasis", body };
}

function buildGapsAndOpportunities(data: ViewerData): NarrativeSection {
	const gaps = gapConcepts(data.scoredConcepts);
	const prereqMissing = data.conceptGraph
		? data.conceptGraph.edges
			.filter((e) => !data.scoredConcepts.some((c) => c.concept === e.from))
			.map((e) => e.from)
			.filter((v, i, arr) => arr.indexOf(v) === i)
		: [];

	let body: string;

	if (!gaps.length && !prereqMissing.length) {
		body = "No significant concept gaps were detected. The workspace provides broad coverage of its stated concepts.";
	} else {
		const parts: string[] = [];
		if (gaps.length) {
			parts.push(`Weak or missing concepts: ${gaps.map((c) => c.concept).join(", ")}.`);
		}
		if (prereqMissing.length) {
			parts.push(`Prerequisite concepts referenced in the concept graph but absent from documents: ${prereqMissing.slice(0, 4).join(", ")}.`);
		}
		body = parts.join(" ");
		body += " Consider supplementing these areas before assessment.";
	}

	return { id: "gaps-and-opportunities", title: "Gaps & Opportunities", body };
}

function buildMisconceptionRisks(data: ViewerData): NarrativeSection {
	const misconceptions = allMisconceptions(data);
	const graphNodes = data.conceptGraph?.nodes ?? [];

	let body: string;

	if (!misconceptions.length) {
		body = "No misconception signals were detected in the current materials. This may indicate the content is review-level or that misconception tagging has not yet been applied.";
	} else {
		const listed = misconceptions.slice(0, 5).join(", ");
		body = `Detected misconception risks: ${listed}.`;
		if (graphNodes.length) {
			const heavyNodes = [...graphNodes].sort((a, b) => b.weight - a.weight).slice(0, 2);
			body += ` High-weight concept nodes (${heavyNodes.map((n) => n.label).join(", ")}) are common sites for student confusion and should be explicitly addressed.`;
		}
	}

	return { id: "misconception-risks", title: "Misconception Risks", body };
}

function buildRecommendedNextSteps(data: ViewerData, meta: WorkspaceMetadata): NarrativeSection {
	const gaps = gapConcepts(data.scoredConcepts);
	const misconceptions = allMisconceptions(data);
	const hasBlueprint = Boolean(data.blueprint);
	const hasPreview = data.previewItems.length > 0;

	const steps: string[] = [];

	if (gaps.length) {
		steps.push(`Address concept gaps (${gaps.slice(0, 2).map((c) => c.concept).join(", ")}) with supplementary materials before formal assessment.`);
	}

	if (misconceptions.length) {
		steps.push(`Build targeted practice around the ${misconceptions.length} identified misconception${misconceptions.length > 1 ? "s" : ""} to pre-empt common errors.`);
	}

	if (!hasBlueprint) {
		steps.push("Generate a blueprint to align assessment difficulty and Bloom distribution with your instructional goals.");
	}

	if (hasPreview && data.previewItems.length < 5) {
		steps.push("Expand the preview item bank — fewer than 5 items limits meaningful differentiation.");
	}

	if (meta.subject) {
		steps.push(`Review concept emphasis against your ${meta.subject} curriculum standards to confirm alignment.`);
	}

	if (!steps.length) {
		steps.push("The workspace is well-structured. Proceed to blueprint design and assessment generation.");
	}

	return {
		id: "recommended-next-steps",
		title: "Recommended Next Steps",
		body: steps.join(" "),
	};
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildTeacherNarrative(
	data: ViewerData,
	meta: WorkspaceMetadata = {},
): TeacherNarrativeOutput {
	const sections: NarrativeSection[] = [
		buildDocumentOverview(data, meta),
		buildConceptEmphasis(data),
		buildGapsAndOpportunities(data),
		buildMisconceptionRisks(data),
		buildRecommendedNextSteps(data, meta),
	];

	// Guard: remove any empty-body sections
	const nonEmpty = sections.filter((s) => s.body.trim().length > 0);

	return { sections: nonEmpty };
}
