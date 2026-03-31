import type { ConceptMapModel } from "../session/InstructionalIntelligenceSession";
import type { DocumentCollectionAnalysis } from "../schema/semantic";
import type { ViewerProblemGroup, ViewerScoredConcept } from "../viewer/buildViewerData";

export type RecommendedAction = "reteach" | "reinforce" | "extend" | "differentiate";

export interface InstructionalMapEntry {
	groupId: string;
	documentId: string;
	groupTitle: string;
	concepts: string[];
	skills: string[];
	recommendedActions: RecommendedAction[];
}

export interface InstructionalMapOutput {
	entries: InstructionalMapEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function skillsForConcept(concept: string, conceptGraph: ConceptMapModel | null): string[] {
	if (!conceptGraph) return [];
	// Use outgoing edges from this concept as skills (what it connects to)
	const outgoing = conceptGraph.edges
		.filter((e) => e.from === concept)
		.map((e) => e.to);
	const incoming = conceptGraph.edges
		.filter((e) => e.to === concept)
		.map((e) => e.from);
	// Combine both sides — unique
	const seen = new Set<string>();
	const result: string[] = [];
	for (const skill of [...outgoing, ...incoming]) {
		if (!seen.has(skill)) {
			seen.add(skill);
			result.push(skill);
		}
	}
	return result.slice(0, 4);
}

function recommendActions(
	concepts: string[],
	scoredConcepts: ViewerScoredConcept[],
	group: ViewerProblemGroup,
): RecommendedAction[] {
	const conceptMap = new Map(scoredConcepts.map((c) => [c.concept, c]));
	const actions = new Set<RecommendedAction>();

	for (const concept of concepts) {
		const scored = conceptMap.get(concept);
		if (!scored) continue;

		if (scored.gap || scored.gapScore > 0.5) {
			actions.add("reteach");
		} else if (scored.coverageScore < 0.4) {
			actions.add("reinforce");
		} else if (scored.coverageScore > 0.7 && !scored.noiseCandidate) {
			actions.add("extend");
		}
	}

	if (group.misconceptions.length > 0) {
		actions.add("differentiate");
	}

	// Always ensure at least one action
	if (!actions.size) {
		actions.add("reinforce");
	}

	// Stable ordering
	const order: RecommendedAction[] = ["reteach", "reinforce", "extend", "differentiate"];
	return order.filter((a) => actions.has(a));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildInstructionalMap(
	problemGroups: ViewerProblemGroup[],
	scoredConcepts: ViewerScoredConcept[],
	conceptGraph: ConceptMapModel | null,
	_coverageSummary: DocumentCollectionAnalysis["coverageSummary"] | null,
): InstructionalMapOutput {
	const entries: InstructionalMapEntry[] = problemGroups.map((group) => {
		const concepts = group.concepts.length ? group.concepts : group.primaryConcepts;
		const skills = concepts.flatMap((c) => skillsForConcept(c, conceptGraph)).filter((v, i, arr) => arr.indexOf(v) === i);
		const recommendedActions = recommendActions(concepts, scoredConcepts, group);

		return {
			groupId: group.groupId,
			documentId: group.documentId,
			groupTitle: group.title,
			concepts,
			skills,
			recommendedActions,
		};
	});

	return { entries };
}
