import type { CanonicalDocument } from "../../schema/semantic";

export function validateCanonicalDocument(document: CanonicalDocument) {
	const seenNodeIds = new Set<string>();
	const surfaceIds = new Set(document.surfaces.map((surface) => surface.id));
	const nodeIds = new Set(document.nodes.map((node) => node.id));

	for (let index = 1; index < document.surfaces.length; index += 1) {
		if (document.surfaces[index - 1]!.index > document.surfaces[index]!.index) {
			throw new Error("CanonicalDocument surfaces must be sorted by index");
		}
	}

	for (const node of document.nodes) {
		if (seenNodeIds.has(node.id)) {
			throw new Error(`Duplicate DocumentNode id: ${node.id}`);
		}
		seenNodeIds.add(node.id);

		if (!surfaceIds.has(node.surfaceId)) {
			throw new Error(`DocumentNode ${node.id} references unknown surface ${node.surfaceId}`);
		}

		if (node.parentId && !nodeIds.has(node.parentId)) {
			throw new Error(`DocumentNode ${node.id} references unknown parent ${node.parentId}`);
		}
	}

	return document;
}
