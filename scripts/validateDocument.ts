import fs from "node:fs";

type TreeLike = {
	item?: {
		itemNumber?: number;
		logicalLabel?: string;
		isMultiPartItem?: boolean;
		bloomsLevel?: number;
	};
	subItems?: Array<{
		itemId?: string;
		groupId?: string;
		partIndex?: number;
		logicalLabel?: string;
		letter?: string;
		bloomsLevel?: number;
	}>;
};

function normalizeInput(payload: unknown): TreeLike[] {
	if (Array.isArray(payload)) {
		return payload as TreeLike[];
	}
	if (payload && typeof payload === "object") {
		const candidate = payload as { trees?: unknown; items?: unknown };
		if (Array.isArray(candidate.trees)) return candidate.trees as TreeLike[];
		if (Array.isArray(candidate.items)) return candidate.items as TreeLike[];
	}
	throw new Error("Expected a JSON array of item trees or an object with trees/items array");
}

export function validateDocumentTrees(payload: unknown): string[] {
	const trees = normalizeInput(payload);
	const errors: string[] = [];
	const seenIds = new Set<string>();
	const labelsByGroup = new Map<string, number[]>();

	for (const tree of trees) {
		const parentLabel = tree.item?.logicalLabel ?? String(tree.item?.itemNumber ?? "unknown");
		const parentBloom = tree.item?.bloomsLevel;
		if (typeof parentBloom !== "number") {
			errors.push(`MISSING BLOOM LEVEL: ${parentLabel}`);
		}

		if (tree.item?.isMultiPartItem && (!Array.isArray(tree.subItems) || tree.subItems.length === 0)) {
			errors.push(`MULTI-PART ITEM WITH NO SUB-ITEMS: ${parentLabel}`);
		}

		for (const sub of tree.subItems ?? []) {
			const subId = sub.itemId ?? `${sub.groupId ?? parentLabel}:${sub.logicalLabel ?? sub.letter ?? "unknown"}`;
			if (seenIds.has(subId)) {
				errors.push(`DUPLICATE SUB-ID: ${subId}`);
			} else {
				seenIds.add(subId);
			}

			const logicalLabel = sub.logicalLabel ?? "";
			if (!/^\d+[a-z]$/i.test(logicalLabel)) {
				errors.push(`MIS-LABELED SUB-ITEM: ${subId} (${logicalLabel || "missing label"})`);
			}

			if (typeof sub.bloomsLevel !== "number") {
				errors.push(`MISSING BLOOM LEVEL: ${subId}`);
			}

			const groupId = sub.groupId ?? logicalLabel.match(/^(\d+)/)?.[1] ?? parentLabel;
			const partIndex = typeof sub.partIndex === "number"
				? sub.partIndex
				: (() => {
					const suffix = logicalLabel.match(/[a-z]$/i)?.[0]?.toLowerCase();
					return suffix ? suffix.charCodeAt(0) - 96 : 0;
				})();

			if (partIndex > 0) {
				labelsByGroup.set(groupId, [...(labelsByGroup.get(groupId) ?? []), partIndex]);
			}
		}
	}

	for (const [groupId, partIndices] of labelsByGroup) {
		const unique = [...new Set(partIndices)].sort((left, right) => left - right);
		for (let index = 1; index < unique.length; index += 1) {
			if (unique[index]! - unique[index - 1]! > 1) {
				const missing: string[] = [];
				for (let current = unique[index - 1]! + 1; current < unique[index]!; current += 1) {
					missing.push(String.fromCharCode(96 + current));
				}
				errors.push(`MISSING SUB-ITEMS: ${groupId}${missing.join(", " + groupId)}`);
			}
		}
	}

	return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const filePath = process.argv[2];
	if (!filePath) {
		console.error("Usage: node --experimental-strip-types scripts/validateDocument.ts <json-file>");
		process.exit(1);
	}

	const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
	const errors = validateDocumentTrees(payload);
	if (errors.length === 0) {
		console.log("OK");
		process.exit(0);
	}

	for (const error of errors) {
		console.log(error);
	}
	process.exit(1);
}