import type { AzureExtractResult } from "../../schema/semantic";
import type { CanonicalDocument, DocumentNode, Surface } from "../../schema/semantic";
import { normalizeWhitespace, splitSentences } from "../../semantic/utils/textUtils";
import { validateCanonicalDocument } from "./validateCanonicalDocument";

function createNodeId(documentId: string, index: number) {
	return `${documentId}-node-${index}`;
}

function createSurfaceId(documentId: string, index: number) {
	return `${documentId}-surface-${index + 1}`;
}

export function canonicalizeAzureExtract(documentId: string, extract: AzureExtractResult): CanonicalDocument {
	const surfaces: Surface[] = (extract.pages ?? []).map((page, index) => ({
		id: createSurfaceId(documentId, index),
		surfaceType: "page",
		index,
		label: `Page ${page.pageNumber}`,
	}));

	const fallbackSurfaceId = surfaces[0]?.id ?? createSurfaceId(documentId, 0);
	const allSurfaces = surfaces.length > 0 ? surfaces : [{ id: fallbackSurfaceId, surfaceType: "page" as const, index: 0, label: "Page 1" }];
	const nodes: DocumentNode[] = [];
	let orderIndex = 0;

	for (const paragraph of extract.paragraphs ?? []) {
		const normalized = normalizeWhitespace(paragraph.text);
		if (!normalized) {
			continue;
		}

		const surfaceId = allSurfaces[(paragraph.pageNumber ?? 1) - 1]?.id ?? fallbackSurfaceId;
		const heading = paragraph.role === "title";
		const parentId = createNodeId(documentId, orderIndex);
		nodes.push({
			id: parentId,
			documentId,
			surfaceId,
			nodeType: heading ? "heading" : "paragraph",
			orderIndex: orderIndex++,
			text: paragraph.text,
			normalizedText: normalized,
			metadata: heading ? { headingLevel: 1, styleHint: "azure-title" } : undefined,
		});

		for (const sentence of splitSentences(normalized)) {
			nodes.push({
				id: createNodeId(documentId, orderIndex),
				documentId,
				surfaceId,
				nodeType: "inline",
				parentId,
				orderIndex: orderIndex++,
				text: sentence,
				normalizedText: sentence,
			});
		}
	}

	for (const [tableIndex, table] of (extract.tables ?? []).entries()) {
		const pageNumber = table.pageNumber ?? 1;
		const surfaceId = allSurfaces[pageNumber - 1]?.id ?? fallbackSurfaceId;
		const tableId = createNodeId(documentId, orderIndex);
		const preview = table.cells
			.sort((left, right) => left.rowIndex - right.rowIndex || left.columnIndex - right.columnIndex)
			.map((cell) => normalizeWhitespace(cell.text))
			.filter(Boolean)
			.slice(0, 8)
			.join(" | ");

		nodes.push({
			id: tableId,
			documentId,
			surfaceId,
			nodeType: "table",
			orderIndex: orderIndex++,
			text: preview,
			normalizedText: preview,
			metadata: { styleHint: `table-${tableIndex}`, tableRowIndex: 0, tableColumnIndex: 0 },
		});

		for (const cell of table.cells) {
			const cellText = normalizeWhitespace(cell.text);
			nodes.push({
				id: createNodeId(documentId, orderIndex),
				documentId,
				surfaceId,
				nodeType: "tableCell",
				parentId: tableId,
				orderIndex: orderIndex++,
				text: cell.text,
				normalizedText: cellText,
				metadata: {
					tableRowIndex: cell.rowIndex,
					tableColumnIndex: cell.columnIndex,
				},
			});
		}
	}

	if (nodes.length === 0 && normalizeWhitespace(extract.content)) {
		nodes.push({
			id: createNodeId(documentId, 0),
			documentId,
			surfaceId: fallbackSurfaceId,
			nodeType: "paragraph",
			orderIndex: 0,
			text: extract.content,
			normalizedText: normalizeWhitespace(extract.content),
		});
	}

	return validateCanonicalDocument({
		id: documentId,
		sourceFileName: extract.fileName,
		sourceMimeType: "application/pdf",
		surfaces: allSurfaces,
		nodes,
		createdAt: new Date().toISOString(),
	});
}

export function canonicalDocumentToAzureExtract(document: CanonicalDocument): AzureExtractResult {
	const surfaceLabels = new Map(document.surfaces.map((surface) => [surface.id, surface]));
	const paragraphNodes = document.nodes.filter((node) => ["heading", "paragraph", "listItem", "caption"].includes(node.nodeType));
	const tableNodes = document.nodes.filter((node) => node.nodeType === "tableCell");
	const pages = document.surfaces.map((surface) => {
		const texts = paragraphNodes
			.filter((node) => node.surfaceId === surface.id)
			.sort((left, right) => left.orderIndex - right.orderIndex)
			.map((node) => node.normalizedText ?? normalizeWhitespace(node.text ?? ""))
			.filter(Boolean);
		return {
			pageNumber: surface.index + 1,
			text: texts.join("\n"),
		};
	});

	const paragraphs = paragraphNodes
		.sort((left, right) => left.orderIndex - right.orderIndex)
		.map((node) => ({
			text: node.normalizedText ?? normalizeWhitespace(node.text ?? ""),
			pageNumber: (surfaceLabels.get(node.surfaceId)?.index ?? 0) + 1,
			role: node.nodeType === "heading" ? "title" : undefined,
		}))
		.filter((paragraph) => paragraph.text.length > 0);

	const tablesBySurface = new Map<string, Array<typeof tableNodes[number]>>();
	for (const cell of tableNodes) {
		tablesBySurface.set(cell.parentId ?? cell.id, [...(tablesBySurface.get(cell.parentId ?? cell.id) ?? []), cell]);
	}

	const tables = [...tablesBySurface.entries()].map(([, cells]) => ({
		rowCount: Math.max(...cells.map((cell) => Number(cell.metadata?.tableRowIndex ?? 0)), 0) + 1,
		columnCount: Math.max(...cells.map((cell) => Number(cell.metadata?.tableColumnIndex ?? 0)), 0) + 1,
		pageNumber: (surfaceLabels.get(cells[0]!.surfaceId)?.index ?? 0) + 1,
		cells: cells
			.sort((left, right) => left.orderIndex - right.orderIndex)
			.map((cell) => ({
				rowIndex: Number(cell.metadata?.tableRowIndex ?? 0),
				columnIndex: Number(cell.metadata?.tableColumnIndex ?? 0),
				text: cell.normalizedText ?? normalizeWhitespace(cell.text ?? ""),
			})),
	}));

	return {
		fileName: document.sourceFileName,
		content: paragraphs.map((paragraph) => paragraph.text).join("\n\n"),
		pages,
		paragraphs,
		tables,
		readingOrder: paragraphs.map((paragraph) => paragraph.text),
	};
}
