import type { DocumentSemanticInsights, ProblemTagVector } from "../../schema/semantic";
import { NarrativeTheme } from "./themes";

type DocumentSemanticSummary = DocumentSemanticInsights;

function topKeys(record: Record<string, number> | undefined, limit: number) {
	return Object.entries(record ?? {})
		.sort((left, right) => right[1] - left[1])
		.slice(0, limit)
		.map(([key]) => key);
}

function humanizeKey(value: string) {
	return value
		.split(/[._-]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function joinPhrases(values: string[]) {
	if (values.length === 0) {
		return "core reasoning ideas";
	}

	if (values.length === 1) {
		return values[0];
	}

	if (values.length === 2) {
		return `${values[0]} and ${values[1]}`;
	}

	return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function describeRepresentations(problem: ProblemTagVector): string {
	if (problem.representationCount > 1) {
		return "multiple representations such as equations, tables, or graphs";
	}

	if (problem.representation === "graph") {
		return "a graph that must be interpreted carefully";
	}

	if (problem.representation === "table") {
		return "a table that organizes the important information";
	}

	if (problem.representation === "equation") {
		return "an equation that guides the reasoning";
	}

	return "the information given in the prompt";
}

function describeStepNature(problem: ProblemTagVector): string {
	if ((problem.reasoning?.structuralMultiStep ?? problem.cognitive.multiStep) >= 0.55) {
		return "interpret the information, make a decision about the strategy, and connect each step back to the prompt";
	}

	if (problem.representationCount > 1) {
		return "connect the different parts of the problem before drawing a conclusion";
	}

	return "apply a clear idea and explain why it fits the situation";
}

function describePitfalls(problem: ProblemTagVector): string {
	const misconceptions = topKeys(problem.misconceptionTriggers, 1).map(humanizeKey);
	if (misconceptions.length > 0) {
		return `they may misread ideas related to ${misconceptions[0].toLowerCase()}`;
	}

	if (problem.representationCount > 1) {
		return "connecting the different representations can be difficult";
	}

	if ((problem.reasoning?.structuralMultiStep ?? problem.cognitive.multiStep) >= 0.55) {
		return "they may lose track of the sequence of reasoning";
	}

	return "they may focus on the procedure without explaining the meaning";
}

function describeCognitiveLoad(problem: ProblemTagVector): string {
	const multiStep = problem.reasoning?.structuralMultiStep ?? problem.cognitive.multiStep;
	if (multiStep >= 0.55 && problem.representationCount > 1) {
		return "higher";
	}

	if (multiStep >= 0.35 || problem.linguisticLoad >= 0.45) {
		return "moderate";
	}

	return "lower";
}

function describeSkills(problem: ProblemTagVector): string {
	const concepts = topKeys(problem.concepts, 2).map(humanizeKey);
	if (concepts.length > 0) {
		return joinPhrases(concepts).toLowerCase();
	}

	if (problem.domain) {
		return humanizeKey(problem.domain).toLowerCase();
	}

	return "core reasoning and explanation";
}

function describeConnections(problem: ProblemTagVector, document: DocumentSemanticSummary): string {
	const problemConcepts = new Set(topKeys(problem.concepts, 3));
	const sharedConcepts = topKeys(document.documentConcepts, 3)
		.filter((concept) => problemConcepts.has(concept))
		.map(humanizeKey);

	if (sharedConcepts.length > 0) {
		return joinPhrases(sharedConcepts).toLowerCase();
	}

	if (document.semantics?.concepts && document.semantics.concepts.length > 0) {
		return "shared concepts and a related line of reasoning";
	}

	return "shared concepts and similar reasoning patterns";
}

function describeScaffold(problem: ProblemTagVector): string {
	if (problem.representationCount > 1) {
		return "help students connect the representations one idea at a time";
	}

	if ((problem.reasoning?.structuralMultiStep ?? problem.cognitive.multiStep) >= 0.55) {
		return "break the reasoning into smaller moves before asking for a full explanation";
	}

	return "clarify each reasoning move before students combine them into a full response";
}

function describeEnrichment(problem: ProblemTagVector): string {
	if (problem.representationCount > 1) {
		return "asking students to compare how the same idea appears across the different representations";
	}

	if (topKeys(problem.concepts, 1).length > 0) {
		return "inviting students to generalize the pattern or compare it with a related situation";
	}

	return "asking students to explain how the same reasoning would change in a new context";
}

function describeStandards(problem: ProblemTagVector): string {
	const standards = topKeys(problem.standards, 2).map(humanizeKey);
	if (standards.length > 0) {
		return joinPhrases(standards).toLowerCase();
	}

	return "reasoning, explanation, and interpreting relationships";
}

function describeInterpretationCues(problem: ProblemTagVector): string {
	if (problem.representationCount > 1) {
		return "the way the prompt asks students to connect ideas across several representations";
	}

	if ((problem.reasoning?.structuralMultiStep ?? problem.cognitive.multiStep) >= 0.55) {
		return "the sequence of reasoning moves suggested by the prompt";
	}

	return "the structure of the prompt and the kind of explanation it requires";
}

function narrativeWhatProblemAsks(problem: ProblemTagVector): string {
	const reps = describeRepresentations(problem);
	return `This problem asks students to make sense of a situation using ${reps}. It calls for interpretation as well as an answer, so students need to explain why their thinking fits the task. The work is not only about getting to a result, but about showing meaning behind the result.`;
}

function narrativeReasoningPath(problem: ProblemTagVector): string {
	const steps = describeStepNature(problem);
	return `Students need to move through a clear reasoning path to solve this problem. They must ${steps}. The task rewards connected thinking rather than a single quick move.`;
}

function narrativeStudentStruggles(problem: ProblemTagVector): string {
	const pitfalls = describePitfalls(problem);
	return `Students may struggle here because ${pitfalls}. Some learners may also lose sight of how each part of the task fits together. Short check-ins and carefully sequenced prompts can help them stay oriented.`;
}

function narrativeComplexity(problem: ProblemTagVector): string {
	const load = describeCognitiveLoad(problem);
	return `This problem has a ${load} level of complexity. Students have to coordinate ideas rather than rely on a single routine. The challenge comes from making sense of the situation while carrying the reasoning all the way through.`;
}

function narrativeSkillsTouched(problem: ProblemTagVector): string {
	const skills = describeSkills(problem);
	return `This problem draws on skills related to ${skills}. Students must use those ideas together to make sense of the task. It supports both understanding and explanation.`;
}

function narrativeConnections(problem: ProblemTagVector, document: DocumentSemanticSummary): string {
	const links = describeConnections(problem, document);
	return `This problem connects to others in the document through ${links}. Those shared ideas help the set feel coherent instead of isolated. Students who make sense of this task are better prepared for related work elsewhere in the document.`;
}

function narrativeScaffolding(problem: ProblemTagVector): string {
	const scaffold = describeScaffold(problem);
	return `Students benefit from scaffolds that ${scaffold}. Breaking the work into smaller pieces helps them keep the meaning of each step in view. A brief model or guided prompt can give learners enough structure to stay engaged.`;
}

function narrativeEnrichment(problem: ProblemTagVector): string {
	const enrich = describeEnrichment(problem);
	return `This problem can be extended by ${enrich}. That kind of extension deepens understanding and encourages students to generalize their thinking. It also opens space for richer discussion and comparison.`;
}

function narrativeStandards(problem: ProblemTagVector): string {
	const standards = describeStandards(problem);
	return `This problem aligns with standards involving ${standards}. It supports expectations around reasoning, explanation, and interpretation. The task fits naturally within the broader goals of the course.`;
}

function narrativeWhyThisInterpretation(problem: ProblemTagVector): string {
	const cues = describeInterpretationCues(problem);
	return `The system interpreted this problem by looking at ${cues}. It used those cues to identify the kind of reasoning the task seems to require. The interpretation reflects the way the prompt, ideas, and representations work together.`;
}

export function generateNarrative(
	theme: NarrativeTheme,
	problem: ProblemTagVector,
	document: DocumentSemanticSummary,
): string {
	switch (theme) {
		case NarrativeTheme.WhatProblemAsks:
			return narrativeWhatProblemAsks(problem);
		case NarrativeTheme.ReasoningPath:
			return narrativeReasoningPath(problem);
		case NarrativeTheme.StudentStruggles:
			return narrativeStudentStruggles(problem);
		case NarrativeTheme.Complexity:
			return narrativeComplexity(problem);
		case NarrativeTheme.SkillsTouched:
			return narrativeSkillsTouched(problem);
		case NarrativeTheme.Connections:
			return narrativeConnections(problem, document);
		case NarrativeTheme.Scaffolding:
			return narrativeScaffolding(problem);
		case NarrativeTheme.Enrichment:
			return narrativeEnrichment(problem);
		case NarrativeTheme.Standards:
			return narrativeStandards(problem);
		case NarrativeTheme.WhyThisInterpretation:
			return narrativeWhyThisInterpretation(problem);
		default:
			return "The system can describe this problem in several ways, but this theme is not yet implemented.";
	}
}