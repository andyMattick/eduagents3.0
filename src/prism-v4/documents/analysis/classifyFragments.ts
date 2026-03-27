import type { CanonicalDocument, FragmentSemanticRecord } from "../../schema/semantic";

function unique<T>(values: T[]) {
	return [...new Set(values)];
}

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
	const concepts: string[] = [];
	if (/fraction/.test(lower)) {
		concepts.push("fractions");
	}
	if (/equivalent/.test(lower)) {
		concepts.push("equivalent fractions");
	}
	if (/number line/.test(lower)) {
		concepts.push("number line reasoning");
	}
	if (/equation|inverse operation/.test(lower)) {
		concepts.push("equation solving");
	}
	if (/denominator/.test(lower)) {
		concepts.push("common denominators");
	}
	if (/review|before|prior|remember/.test(lower)) {
		return unique(concepts.length > 0 ? concepts : [text.trim().slice(0, 48)]);
	}

	return unique(concepts);
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
