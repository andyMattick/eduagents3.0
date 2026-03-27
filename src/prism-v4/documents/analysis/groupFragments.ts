import type { FragmentSemanticRecord, InstructionalUnit } from "../../schema/semantic";

interface FragmentCandidate {
	fragment: FragmentSemanticRecord;
	concepts: string[];
	skills: string[];
	learningTargets: string[];
	misconceptions: string[];
	sourceSections: string[];
	difficulty: number;
	linguisticLoad: number;
	primarySection: string;
	primaryDocumentId: string;
	anchorOrderKey: string;
	firstNodeOrder: number;
	dedupeFingerprint: string;
}

interface MutableInstructionalUnit {
	fragments: FragmentSemanticRecord[];
	concepts: Set<string>;
	skills: Set<string>;
	learningTargets: Set<string>;
	misconceptions: Set<string>;
	sourceSections: Set<string>;
	difficultyValues: number[];
	linguisticLoadValues: number[];
	confidenceValues: number[];
	dedupeFingerprints: Set<string>;
	primarySection: string;
	primaryDocumentId: string;
	firstNodeOrder: number;
	anchorOrderKey: string;
}

function normalizeToken(value: string) {
	return value.trim().toLowerCase();
}

function uniqueSorted(values: Array<string | null | undefined>) {
	return [...new Set(values.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function average(values: number[]) {
	if (values.length === 0) {
		return 0;
	}
	return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function intersectCount(left: Iterable<string>, right: Iterable<string>) {
	const rightSet = new Set(right);
	let count = 0;
	for (const value of left) {
		if (rightSet.has(value)) {
			count += 1;
		}
	}
	return count;
}

function parseNodeOrder(nodeId: string) {
	const matches = [...nodeId.matchAll(/(\d+)/g)];
	const lastMatch = matches.at(-1)?.[1];
	return lastMatch ? Number.parseInt(lastMatch, 10) : Number.MAX_SAFE_INTEGER;
}

function scoreDifficulty(fragment: FragmentSemanticRecord) {
	const scaffoldScore = fragment.scaffoldLevel === "low"
		? 0.75
		: fragment.scaffoldLevel === "high"
			? 0.25
			: 0.5;
	const roleScore = fragment.instructionalRole === "problem-stem" || fragment.instructionalRole === "problem-part"
		? 0.8
		: fragment.instructionalRole === "reflection"
			? 0.7
			: fragment.instructionalRole === "example"
				? 0.35
				: fragment.instructionalRole === "objective"
					? 0.3
					: 0.45;
	return Number((((scaffoldScore * 0.6) + (roleScore * 0.4))).toFixed(2));
}

function scoreLinguisticLoad(fragment: FragmentSemanticRecord, concepts: string[], misconceptions: string[]) {
	const contentScore = fragment.contentType === "question"
		? 0.7
		: fragment.contentType === "table" || fragment.contentType === "graph" || fragment.contentType === "diagram"
			? 0.55
			: fragment.contentType === "heading"
				? 0.15
				: 0.35;
	const roleScore = fragment.instructionalRole === "reflection"
		? 0.8
		: fragment.instructionalRole === "explanation"
			? 0.6
			: fragment.instructionalRole === "instruction"
				? 0.55
				: 0.4;
	const semanticScore = Math.min(1, (concepts.length * 0.08) + (misconceptions.length * 0.12));
	return Number(Math.min(1, ((contentScore * 0.45) + (roleScore * 0.35) + (semanticScore * 0.2))).toFixed(2));
}

function fragmentSkills(fragment: FragmentSemanticRecord) {
	return uniqueSorted([
		fragment.instructionalRole,
		fragment.contentType,
		fragment.exampleType,
		fragment.scaffoldLevel,
		...(fragment.semanticTags ?? []).filter((tag) => !["learning-target", "prerequisite", "misconception-trigger", "metadata"].includes(tag)),
	]);
}

function fragmentConcepts(fragment: FragmentSemanticRecord) {
	return uniqueSorted(fragment.prerequisiteConcepts ?? []);
}

function fragmentLearningTargets(fragment: FragmentSemanticRecord) {
	return uniqueSorted([fragment.learningTarget ?? undefined]);
}

function fragmentMisconceptions(fragment: FragmentSemanticRecord) {
	return uniqueSorted(fragment.misconceptionTriggers ?? []);
}

function fragmentSourceSections(fragment: FragmentSemanticRecord) {
	return uniqueSorted(fragment.anchors.map((anchor) => `${anchor.documentId}:${anchor.surfaceId}`));
}

function buildCandidate(fragment: FragmentSemanticRecord): FragmentCandidate {
	const concepts = fragmentConcepts(fragment);
	const skills = fragmentSkills(fragment);
	const learningTargets = fragmentLearningTargets(fragment);
	const misconceptions = fragmentMisconceptions(fragment);
	const sourceSections = fragmentSourceSections(fragment);
	const firstAnchor = [...fragment.anchors].sort((left, right) => {
		const leftOrder = parseNodeOrder(left.nodeId);
		const rightOrder = parseNodeOrder(right.nodeId);
		if (left.documentId !== right.documentId) {
			return left.documentId.localeCompare(right.documentId);
		}
		if (left.surfaceId !== right.surfaceId) {
			return left.surfaceId.localeCompare(right.surfaceId);
		}
		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}
		return left.nodeId.localeCompare(right.nodeId);
	})[0];
	const primaryDocumentId = firstAnchor?.documentId ?? fragment.documentId;
	const primarySection = firstAnchor ? `${firstAnchor.documentId}:${firstAnchor.surfaceId}` : `${fragment.documentId}:unknown`;
	const firstNodeOrder = firstAnchor ? parseNodeOrder(firstAnchor.nodeId) : Number.MAX_SAFE_INTEGER;
	const anchorOrderKey = `${primaryDocumentId}:${primarySection}:${String(firstNodeOrder).padStart(8, "0")}:${fragment.id}`;
	const dedupeFingerprint = [
		fragment.instructionalRole,
		fragment.contentType,
		fragment.exampleType ?? "",
		fragment.scaffoldLevel ?? "",
		learningTargets.map(normalizeToken).join("|"),
		concepts.map(normalizeToken).join("|"),
		misconceptions.map(normalizeToken).join("|"),
	].join("::");

	return {
		fragment,
		concepts,
		skills,
		learningTargets,
		misconceptions,
		sourceSections,
		difficulty: scoreDifficulty(fragment),
		linguisticLoad: scoreLinguisticLoad(fragment, concepts, misconceptions),
		primarySection,
		primaryDocumentId,
		anchorOrderKey,
		firstNodeOrder,
		dedupeFingerprint,
	};
}

function createUnit(candidate: FragmentCandidate): MutableInstructionalUnit {
	return {
		fragments: [candidate.fragment],
		concepts: new Set(candidate.concepts),
		skills: new Set(candidate.skills),
		learningTargets: new Set(candidate.learningTargets),
		misconceptions: new Set(candidate.misconceptions),
		sourceSections: new Set(candidate.sourceSections),
		difficultyValues: [candidate.difficulty],
		linguisticLoadValues: [candidate.linguisticLoad],
		confidenceValues: [candidate.fragment.confidence],
		dedupeFingerprints: new Set([candidate.dedupeFingerprint]),
		primarySection: candidate.primarySection,
		primaryDocumentId: candidate.primaryDocumentId,
		firstNodeOrder: candidate.firstNodeOrder,
		anchorOrderKey: candidate.anchorOrderKey,
	};
}

function isDedupableRole(role: FragmentSemanticRecord["instructionalRole"]) {
	return role === "instruction" || role === "example" || role === "explanation" || role === "objective" || role === "note";
}

function hasQuestionTableConflict(candidate: FragmentCandidate, unit: MutableInstructionalUnit) {
	const candidateIsQuestion = candidate.fragment.contentType === "question";
	const candidateIsTable = candidate.fragment.contentType === "table";
	if (!candidateIsQuestion && !candidateIsTable) {
		return false;
	}
	const unitHasQuestion = unit.fragments.some((fragment) => fragment.contentType === "question");
	const unitHasTable = unit.fragments.some((fragment) => fragment.contentType === "table");
	return (candidateIsQuestion && unitHasTable) || (candidateIsTable && unitHasQuestion);
}

function shouldMergeAdjacent(candidate: FragmentCandidate, unit: MutableInstructionalUnit) {
	if (hasQuestionTableConflict(candidate, unit)) {
		return false;
	}
	const lastFragment = unit.fragments.at(-1);
	if (!lastFragment) {
		return false;
	}
	const sameRole = lastFragment.instructionalRole === candidate.fragment.instructionalRole;
	const sameContentType = lastFragment.contentType === candidate.fragment.contentType;
	const sameLearningTarget = candidate.learningTargets.length > 0 && candidate.learningTargets.some((target) => unit.learningTargets.has(target));
	const sameConceptCluster = candidate.concepts.length > 0 && candidate.concepts.some((concept) => unit.concepts.has(concept));
	const difficultyBandGap = Math.abs(average(unit.difficultyValues) - candidate.difficulty);
	const sameSection = candidate.sourceSections.some((section) => unit.sourceSections.has(section));
	const sameDocument = candidate.primaryDocumentId === unit.primaryDocumentId;
	const isAdjacent = sameDocument && sameSection && Math.abs(candidate.firstNodeOrder - unit.firstNodeOrder) <= 3;

	return sameRole && sameContentType && (sameLearningTarget || sameConceptCluster) && difficultyBandGap <= 0.3 && isAdjacent;
}

function scoreCandidate(candidate: FragmentCandidate, unit: MutableInstructionalUnit) {
	const conceptOverlap = intersectCount(candidate.concepts, unit.concepts);
	const skillOverlap = intersectCount(candidate.skills, unit.skills);
	const targetOverlap = intersectCount(candidate.learningTargets, unit.learningTargets);
	const misconceptionOverlap = intersectCount(candidate.misconceptions, unit.misconceptions);
	const sectionOverlap = intersectCount(candidate.sourceSections, unit.sourceSections);
	const sameDocument = candidate.primaryDocumentId === unit.primaryDocumentId ? 1 : 0;
	const proximity = sameDocument && candidate.primarySection === unit.primarySection && Math.abs(candidate.firstNodeOrder - unit.firstNodeOrder) <= 3 ? 1 : 0;
	const roleContinuity = unit.fragments.some((fragment) => fragment.instructionalRole === candidate.fragment.instructionalRole) ? 1 : 0;
	const contentContinuity = unit.fragments.some((fragment) => fragment.contentType === candidate.fragment.contentType) ? 1 : 0;

	return (targetOverlap * 4)
		+ (conceptOverlap * 3)
		+ (skillOverlap * 2)
		+ (misconceptionOverlap * 2)
		+ sectionOverlap
		+ sameDocument
		+ proximity
		+ roleContinuity
		+ contentContinuity;
}

function hasSemanticOverlap(candidate: FragmentCandidate, unit: MutableInstructionalUnit) {
	return intersectCount(candidate.concepts, unit.concepts) > 0
		|| intersectCount(candidate.learningTargets, unit.learningTargets) > 0
		|| intersectCount(candidate.misconceptions, unit.misconceptions) > 0;
}

function addCandidate(unit: MutableInstructionalUnit, candidate: FragmentCandidate) {
	const lastCandidate = unit.fragments.length > 0 ? buildCandidate(unit.fragments[unit.fragments.length - 1]!) : null;
	const preserveAdjacentFragment = Boolean(
		lastCandidate
		&& lastCandidate.primaryDocumentId === candidate.primaryDocumentId
		&& lastCandidate.primarySection === candidate.primarySection
		&& Math.abs(lastCandidate.firstNodeOrder - candidate.firstNodeOrder) <= 1,
	);
	if (!(isDedupableRole(candidate.fragment.instructionalRole) && unit.dedupeFingerprints.has(candidate.dedupeFingerprint) && !preserveAdjacentFragment)) {
		unit.fragments.push(candidate.fragment);
	}
	for (const concept of candidate.concepts) {
		unit.concepts.add(concept);
	}
	for (const skill of candidate.skills) {
		unit.skills.add(skill);
	}
	for (const target of candidate.learningTargets) {
		unit.learningTargets.add(target);
	}
	for (const misconception of candidate.misconceptions) {
		unit.misconceptions.add(misconception);
	}
	for (const sourceSection of candidate.sourceSections) {
		unit.sourceSections.add(sourceSection);
	}
	unit.difficultyValues.push(candidate.difficulty);
	unit.linguisticLoadValues.push(candidate.linguisticLoad);
	unit.confidenceValues.push(candidate.fragment.confidence);
	unit.dedupeFingerprints.add(candidate.dedupeFingerprint);
	if (candidate.anchorOrderKey.localeCompare(unit.anchorOrderKey) < 0) {
		unit.primarySection = candidate.primarySection;
		unit.primaryDocumentId = candidate.primaryDocumentId;
		unit.firstNodeOrder = candidate.firstNodeOrder;
		unit.anchorOrderKey = candidate.anchorOrderKey;
	}
	unit.fragments.sort((left, right) => buildCandidate(left).anchorOrderKey.localeCompare(buildCandidate(right).anchorOrderKey));
}

function hashStable(value: string) {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = ((hash << 5) - hash) + value.charCodeAt(index);
		hash |= 0;
	}
	return Math.abs(hash).toString(36);
}

function toInstructionalUnit(unit: MutableInstructionalUnit): InstructionalUnit {
	const sortedFragments = [...unit.fragments].sort((left, right) => buildCandidate(left).anchorOrderKey.localeCompare(buildCandidate(right).anchorOrderKey));
	const concepts = [...unit.concepts].sort((left, right) => left.localeCompare(right));
	const learningTargets = [...unit.learningTargets].sort((left, right) => left.localeCompare(right));
	const skills = [...unit.skills].sort((left, right) => left.localeCompare(right));
	const misconceptions = [...unit.misconceptions].sort((left, right) => left.localeCompare(right));
	const sourceSections = [...unit.sourceSections].sort((left, right) => left.localeCompare(right));
	const idSource = sortedFragments.map((fragment) => fragment.id).join("|");
	const title = learningTargets[0]
		?? (concepts.length > 0 ? `Instructional Unit: ${concepts.slice(0, 2).join(", ")}` : undefined);

	return {
		unitId: `unit-${hashStable(idSource)}`,
		fragments: sortedFragments,
		concepts,
		skills,
		learningTargets,
		misconceptions,
		difficulty: average(unit.difficultyValues),
		linguisticLoad: average(unit.linguisticLoadValues),
		sourceSections,
		confidence: average(unit.confidenceValues),
		title,
	};
}

export function groupFragments(fragments: FragmentSemanticRecord[]): InstructionalUnit[] {
	const candidates = fragments
		.map((fragment) => buildCandidate(fragment))
		.sort((left, right) => left.anchorOrderKey.localeCompare(right.anchorOrderKey));
	const units: MutableInstructionalUnit[] = [];

	for (const candidate of candidates) {
		let bestUnit: MutableInstructionalUnit | null = null;
		let bestScore = 0;

		for (const unit of units) {
			if (hasQuestionTableConflict(candidate, unit)) {
				continue;
			}
			const score = scoreCandidate(candidate, unit);
			if (score > bestScore) {
				bestScore = score;
				bestUnit = unit;
			}
		}

		if (bestUnit && (shouldMergeAdjacent(candidate, bestUnit) || (bestScore >= 6 && hasSemanticOverlap(candidate, bestUnit)))) {
			addCandidate(bestUnit, candidate);
			continue;
		}

		units.push(createUnit(candidate));
	}

	return units
		.map((unit) => toInstructionalUnit(unit))
		.sort((left, right) => {
			const leftKey = left.fragments.map((fragment) => buildCandidate(fragment).anchorOrderKey)[0] ?? left.unitId;
			const rightKey = right.fragments.map((fragment) => buildCandidate(fragment).anchorOrderKey)[0] ?? right.unitId;
			return leftKey.localeCompare(rightKey) || left.unitId.localeCompare(right.unitId);
		});
}