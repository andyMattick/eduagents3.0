import type { AnalyzedDocument, FragmentSemanticRecord } from "../schema/semantic";

function sortObjectKeys(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => sortObjectKeys(entry));
	}

	if (!value || typeof value !== "object") {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, entry]) => [key, sortObjectKeys(entry)]),
	);
}

function stableStringify(value: unknown): string {
	return JSON.stringify(sortObjectKeys(value));
}

async function sha256Hex(input: string): Promise<string> {
	const subtle = globalThis.crypto?.subtle;
	if (!subtle) {
		throw new Error("SHA-256 hashing requires Web Crypto support");
	}

	const encoded = new TextEncoder().encode(input);
	const digest = await subtle.digest("SHA-256", encoded);
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fragmentText(document: AnalyzedDocument["document"], fragment: FragmentSemanticRecord) {
	const anchored = fragment.anchors
		.map((anchor) => document.nodes.find((node) => node.id === anchor.nodeId)?.normalizedText ?? document.nodes.find((node) => node.id === anchor.nodeId)?.text ?? "")
		.filter((text): text is string => typeof text === "string" && text.trim().length > 0);

	return anchored.join(" ").trim();
}

function semanticContentBlocks(doc: AnalyzedDocument) {
	const blocks = doc.fragments
		.filter((fragment) => fragment.instructionalRole !== "metadata")
		.map((fragment) => fragmentText(doc.document, fragment))
		.filter(Boolean);

	if (blocks.length > 0) {
		return blocks;
	}

	return doc.document.nodes
		.map((node) => node.normalizedText ?? node.text ?? "")
		.filter((text) => text.trim().length > 0);
}

function problemGroups(doc: AnalyzedDocument) {
	const grouped = new Map<string, { groupId: string; sourceSpan?: { firstPage: number; lastPage: number }; segments: string[] }>();

	for (const problem of doc.problems) {
		const groupId = problem.problemGroupId ?? problem.id;
		const existing = grouped.get(groupId) ?? {
			groupId,
			sourceSpan: problem.sourceSpan,
			segments: [],
		};
		existing.sourceSpan = existing.sourceSpan ?? problem.sourceSpan;
		existing.segments.push(problem.text ?? "");
		grouped.set(groupId, existing);
	}

	return [...grouped.values()].sort((left, right) => left.groupId.localeCompare(right.groupId));
}

export async function computeContentHashV1(doc: AnalyzedDocument): Promise<string> {
	const payload = {
		nodes: doc.document.nodes.map((node) => node.normalizedText ?? node.text ?? ""),
		problems: doc.problems.map((problem) => problem.text ?? ""),
	};

	return `v1:${await sha256Hex(stableStringify(payload))}`;
}

export async function computeContentHashV2(doc: AnalyzedDocument): Promise<string> {
	const payload = {
		contentBlocks: semanticContentBlocks(doc),
		problemGroups: problemGroups(doc),
		concepts: (doc.insights.scoredConcepts ?? [])
			.filter((concept) => !concept.isNoise)
			.map((concept) => ({
				label: concept.concept,
				score: concept.score,
				freqProblems: concept.freqProblems,
				freqDocuments: concept.freqDocuments,
			})),
	};

	return `v2:${await sha256Hex(stableStringify(payload))}`;
}

export function getPreferredContentHash(doc: Pick<AnalyzedDocument, "contentHash" | "contentHashV1" | "contentHashV2">): string | null {
	return doc.contentHashV2 ?? doc.contentHashV1 ?? doc.contentHash ?? null;
}

export function withPreferredContentHash<T extends Pick<AnalyzedDocument, "contentHash" | "contentHashV1" | "contentHashV2">>(doc: T): T {
	return {
		...doc,
		contentHash: getPreferredContentHash(doc) ?? undefined,
	};
}