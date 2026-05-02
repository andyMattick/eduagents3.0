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

const SYSTEM_PROMPT = `You are an educational simulation interpreter. You explain predicted student performance based on a deterministic simulation engine.

When predicted-vs-actual comparison data is provided, you may also explain where real outcomes differed from predictions. In those cases, describe deltas as model calibration signals, not student judgments.

You never use evaluative language such as "strengths," "weaknesses," "performed," or "did well." Use objective, teacher-friendly language grounded in the provided metrics.

Your job is to translate the simulation output into a clear, teacher-friendly narrative that helps teachers understand what the simulation suggests about how students are likely to experience the assessment.

Follow these rules:

1. Use predictive language for forecast sections.
	- Say "students are expected to," "the model predicts," "the simulation suggests," "students may experience," "this item is likely to create confusion."
	- Never say "students did," "students showed," "strengths," "weaknesses," or "performed".

2. If predicted-vs-actual data is available, add a comparison section.
	- Describe timingDelta, confusionDelta, and accuracyDelta as differences between actual and predicted aggregates.
	- Explain profileDeltas as calibration signals by student profile.
	- Do not over-interpret causality; state what changed and where to monitor next.
	- If predicted-vs-actual is unavailable, explicitly note that comparison is not yet available.

3. Reference the simulation metrics explicitly and accurately.
	- pCorrect: predicted probability of answering correctly.
	- Confusion: predicted likelihood of misunderstanding or hesitation.
	- Bloom gap: difference between item cognitive demand and predicted student mastery.
	- Time: predicted time-on-task.
	- Spikes: sudden increases in cognitive load, confusion, or time.
	- Cliffs: sharp drops in predicted performance or comprehension.
	- Bottlenecks: items or concepts that may slow progress or create difficulty for multiple profiles.

4. Explain predicted difficulty patterns.
	- Identify items with lower pCorrect.
	- Identify items with higher confusion.
	- Identify items with higher time demand.
	- Identify any spikes, cliffs, or bottlenecks if present.

5. Explain predicted pacing.
	- Describe whether students are expected to move quickly, slowly, or encounter pacing pressure.
	- Reference predicted time values.

6. Explain predicted cognitive demand.
	- Use Bloom gap to describe whether items may exceed students' expected mastery level.
	- Use predictive language: "students may find higher-order items more demanding."

7. Provide actionable, forward-looking teacher insights.
	- Suggest what a teacher might consider adjusting, clarifying, or scaffolding.
	- Keep suggestions grounded in the simulation metrics.
	- Never rewrite items, never introduce new content, and never critique the teacher.

8. Tone and style.
	- Clear, concise, teacher-friendly.
	- No jargon unless defined.
	- No moralizing or evaluative tone.
	- No past tense.

Your output should be a single, coherent narrative that helps a teacher understand predicted experience, and where available, how actual outcomes diverged from those predictions.`;

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
			content: `Using the simulation output provided below, generate a predictive narrative for a teacher.
Do not describe past performance. Do not imply that students have already taken the assessment.
Use only forward-looking, simulation-based language such as "the model predicts,"
"students are expected to," "the simulation suggests," or "students may experience."

Your narrative must interpret the following metrics exactly as they appear in the simulation:

- pCorrect - predicted probability of answering each item correctly
- confusion - predicted likelihood of misunderstanding or hesitation
- bloomGap - difference between item cognitive demand and predicted mastery
- time - predicted time-on-task
- spikes - sudden increases in cognitive load, confusion, or time
- cliffs - sudden drops in predicted performance or comprehension
- bottlenecks - items or concepts that may slow progress for multiple profiles

Your narrative should include:

1. Predicted performance overview
   Summarize the expected score range and general difficulty pattern.

2. Predicted hardest items
   Identify items with lower pCorrect, higher confusion, or higher time demand.

3. Predicted confusion patterns
   Explain where students may hesitate or misinterpret based on the confusion metric.

4. Predicted pacing
   Describe expected time-on-task and whether pacing pressure is likely.

5. Predicted cognitive demand
   Use Bloom gap to explain where items may exceed students' expected mastery.

6. Spikes, cliffs, and bottlenecks
   Mention these only if present in the simulation output.

7. Actionable, forward-looking insights
   Provide teacher-friendly suggestions grounded strictly in the simulation metrics.
   Do not rewrite items. Do not introduce new content. Do not critique the teacher.

8. Predicted-vs-actual calibration (only when available)
	- Explain timingDelta (actual.avgTime - predicted.avgTime)
	- Explain confusionDelta (actual.avgConfusion - predicted.avgConfusion)
	- Explain accuracyDelta (actual.avgPCorrect - predicted.avgPCorrect)
	- Summarize profileDeltas as profile-specific calibration notes.
	- If predictedVsActual.available is false or missing, state that comparison data is not yet available.

Write a single, coherent narrative that helps the teacher understand how students are
predicted to experience the assessment.

Here is the simulation output:\n\n${JSON.stringify(simulation, null, 2)}`,
		},
	];

	const response = await azureChatCompletion({
		messages,
		temperature: 0.2,
		maxTokens: 800,
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
