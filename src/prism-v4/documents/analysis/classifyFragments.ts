import type { CanonicalDocument, FragmentSemanticRecord } from "../../schema/semantic";

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
		return {
			id: `${document.id}-fragment-${node.id}`,
			documentId: document.id,
			anchors: [{ documentId: document.id, surfaceId: node.surfaceId, nodeId: node.id }],
			isInstructional: classification.isInstructional,
			instructionalRole: classification.instructionalRole,
			contentType,
			confidence: classification.confidence,
			classifierVersion: "wave2-v1",
			strategy: "rule-based",
			evidence: classification.evidence,
			semanticTags: classification.isInstructional ? [classification.instructionalRole] : ["metadata"],
		};
	});
}
