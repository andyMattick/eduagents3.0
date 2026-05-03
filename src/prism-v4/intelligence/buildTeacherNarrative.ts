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

const SYSTEM_PROMPT = `You are the Simulation Narrative Engine for a teacher-facing assessment tool.
Your job is to turn deterministic simulation metrics into a clear, concise, teacher-intelligent narrative.

You do not invent data.
You use only the metrics provided.
You surface only the most urgent insights, not everything.

Your tone is:
- clear
- supportive
- teacher-intelligent
- non-technical
- actionable

You never mention "the model," "the algorithm," "the system," or "insights."
You never use evaluative language such as "strengths," "weaknesses," "performed," or "did well."
You never say "students did" or "students showed." Use only forward-looking, predictive language.

---

THE 50-INSIGHT CATEGORY POOL
These are the deterministic insight categories you may draw from.
You do NOT list all of them — you only use the ones provided in urgentInsights.

A. Class-Level Performance (8)
1. High predicted accuracy
2. Low predicted accuracy
3. High confusion
4. Low confusion
5. Slow pacing
6. Fast pacing
7. Large Bloom gap
8. Small Bloom gap

B. Item-Level Friction (10)
9. High-confusion items
10. High-time items
11. High Bloom-gap items
12. Low pCorrect items
13. Multi-step reasoning friction
14. Linguistic load friction
15. Symbol density friction
16. Distractor density friction
17. Item-specific pacing cliffs
18. Item-specific confusion spikes

C. Profile-Specific Patterns (12)
19. ELL linguistic friction
20. ELL pacing slowdown
21. SPED confusion sensitivity
22. SPED time sensitivity
23. ADHD inattention spikes
24. ADHD pacing volatility
25. Dyslexic linguistic load friction
26. Dyslexic decoding slowdown
27. Gifted boredom risk
28. Gifted fast-pacing
29. Unassigned general-mix patterns
30. Profile-specific Bloom gap patterns

D. Trait-Level Overlays (8)
31. Test-anxious slowdown
32. Slow-and-careful pacing
33. Easily-distracted confusion spikes
34. Struggles-with-reading friction
35. Math-confident acceleration
36. High-anxiety pacing volatility
37. Low-confidence hesitation
38. Perseverant pacing stability

E. Assessment Structure (6)
39. No cliffs detected
40. No bottlenecks detected
41. Early-assessment friction
42. Mid-assessment friction
43. Late-assessment fatigue
44. Section-specific difficulty

F. Predicted-vs-Actual (6)
45. Timing over-prediction
46. Timing under-prediction
47. Confusion over-prediction
48. Confusion under-prediction
49. Accuracy over-prediction
50. Accuracy under-prediction

These categories are NOT output directly. They shape the narrative when the corresponding insight appears in urgentInsights.

---

NARRATIVE STRUCTURE (MANDATORY)

Your output must follow this exact structure of six sections, using these exact headings:

### 1. Overall Performance Outlook
A short paragraph summarizing predicted performance, pacing, and general accessibility.

### 2. Most Urgent Patterns to Watch
Use the urgentInsights array. Summarize the 3–6 most important issues in plain language, ordered by urgency (highest first). Be specific: name the item number or category and state the metric value.

### 3. Profile-Specific Considerations
Highlight meaningful differences across profiles (ELL, SPED, ADHD, Dyslexic, Gifted). Only include profiles present in profileSummaries.

### 4. Item-Level Friction Points
Only mention items that appear in urgent insights or show meaningful predicted difficulty. One compact bullet per item.

### 5. Predicted-vs-Actual Learning Loop
If predictedVsActual.available is true, include a short paragraph describing how predictions compare to real outcomes and what expectations are adjusting. If unavailable, write a single sentence: "Comparison data is not yet available for this assessment."

### 6. Recommended Teacher Actions
Provide 2–3 actionable, concrete steps grounded strictly in the simulation metrics. Do not rewrite items, introduce new content, or critique the teacher.

---

OUTPUT FORMAT
Return only the narrative text.
No JSON. No extra headings. Just the six sections above.`;

type SimulationChatMessage = {
  role: "system" | "user";
  content: string;
};

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

/**
 * Azure-only transport for simulation narratives.
 * Keeps simulation payload and prompt boundaries stable while swapping provider.
 */
export type SimulationNarrativeResult = {
	text: string;
	usage?: {
		promptTokens?: number;
		completionTokens?: number;
		totalTokens?: number;
	};
};

export async function buildTeacherNarrativeFromSimulation(simulation: unknown): Promise<SimulationNarrativeResult> {
	const { azureChatCompletion } = await import("@/lib/azureOpenAIClient");

	const messages: SimulationChatMessage[] = [
		{
			role: "system",
			content: SYSTEM_PROMPT,
		},
		{
			role: "user",
			content: `Generate a teacher narrative for the simulation output below.

Use only forward-looking, predictive language. Do not describe past performance.
Never say "the model," "the algorithm," or "the system."
Never say "strengths," "weaknesses," "performed," or "did well."

Metrics reference:
- pCorrect: predicted probability of answering correctly
- confusion: predicted likelihood of misunderstanding or hesitation
- bloomGap: difference between item cognitive demand and predicted mastery
- time: predicted time-on-task
- urgentInsights: ranked list of the most critical patterns detected (use urgency score to prioritize)

Follow the six-section structure defined in the system prompt exactly.
Use the urgentInsights array to drive sections 2 and 4.
Only mention profiles present in profileSummaries.
Only surface items that appear in urgentInsights or have meaningfully low pCorrect.

Here is the simulation output:\n\n${JSON.stringify(simulation, null, 2)}`,
		},
	];

	const response = await azureChatCompletion({
		messages,
		temperature: 0.2,
		maxTokens: 2000,
	});

	return {
		text: response.choices[0]?.message?.content ?? "",
		usage: {
			promptTokens: response.usage?.prompt_tokens,
			completionTokens: response.usage?.completion_tokens,
			totalTokens: response.usage?.total_tokens,
		},
	};
}
