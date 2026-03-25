import JSZip from "jszip";

import type { CanonicalDocument, DocumentNode, Surface } from "../../schema/semantic";
import { normalizeWhitespace, splitSentences } from "../../semantic/utils/textUtils";
import { validateCanonicalDocument } from "./validateCanonicalDocument";

function stripXmlTags(value: string) {
	return normalizeWhitespace(
		value
			.replace(/<[^>]+>/g, " ")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'"),
	);
}

function createSurface(documentId: string, index: number, surfaceType: Surface["surfaceType"], label: string): Surface {
	return { id: `${documentId}-surface-${index + 1}`, surfaceType, index, label };
}

function addInlineSentenceNodes(args: {
	documentId: string;
	surfaceId: string;
	parentId: string;
	text: string;
	startOrderIndex: number;
	nodes: DocumentNode[];
}) {
	let nextOrderIndex = args.startOrderIndex;
	for (const sentence of splitSentences(args.text)) {
		args.nodes.push({
			id: `${args.documentId}-node-${nextOrderIndex}`,
			documentId: args.documentId,
			surfaceId: args.surfaceId,
			nodeType: "inline",
			parentId: args.parentId,
			orderIndex: nextOrderIndex,
			text: sentence,
			normalizedText: sentence,
		});
		nextOrderIndex += 1;
	}
	return nextOrderIndex;
}

export async function parseDocxToCanonicalDocument(documentId: string, fileName: string, mimeType: string, fileBuffer: Buffer): Promise<CanonicalDocument> {
	const zip = await JSZip.loadAsync(fileBuffer);
	const documentXml = await zip.file("word/document.xml")?.async("string");
	if (!documentXml) {
		throw new Error("DOCX parsing failed: word/document.xml not found");
	}

	const surface = createSurface(documentId, 0, "other", "Document 1");
	const nodes: DocumentNode[] = [];
	let orderIndex = 0;
	const blockMatches = documentXml.match(/<w:(?:p|tbl)\b[\s\S]*?<\/w:(?:p|tbl)>/g) ?? [];

	for (const block of blockMatches) {
		if (block.startsWith("<w:tbl")) {
			const tableId = `${documentId}-node-${orderIndex}`;
			const rows = [...block.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((row) => row[0]);
			nodes.push({
				id: tableId,
				documentId,
				surfaceId: surface.id,
				nodeType: "table",
				orderIndex: orderIndex++,
				text: "",
				normalizedText: "",
			});

			rows.forEach((row, rowIndex) => {
				const rowId = `${documentId}-node-${orderIndex}`;
				nodes.push({
					id: rowId,
					documentId,
					surfaceId: surface.id,
					nodeType: "tableRow",
					parentId: tableId,
					orderIndex: orderIndex++,
					metadata: { tableRowIndex: rowIndex },
				});

				const cells = [...row.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((cell) => cell[0]);
				cells.forEach((cell, columnIndex) => {
					const cellText = normalizeWhitespace([...cell.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((match) => stripXmlTags(match[1])).join(" "));
					nodes.push({
						id: `${documentId}-node-${orderIndex}`,
						documentId,
						surfaceId: surface.id,
						nodeType: "tableCell",
						parentId: rowId,
						orderIndex: orderIndex++,
						text: cellText,
						normalizedText: cellText,
						metadata: { tableRowIndex: rowIndex, tableColumnIndex: columnIndex },
					});
				});
			});

			continue;
		}

		const text = normalizeWhitespace([...block.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((match) => stripXmlTags(match[1])).join(" "));
		const hasDrawing = /<w:drawing\b/.test(block);
		const headingMatch = block.match(/<w:pStyle[^>]*w:val="Heading(\d+)"/i);
		const isListItem = /<w:numPr\b/.test(block);

		if (text) {
			const nodeId = `${documentId}-node-${orderIndex}`;
			nodes.push({
				id: nodeId,
				documentId,
				surfaceId: surface.id,
				nodeType: headingMatch ? "section" : isListItem ? "listItem" : "paragraph",
				orderIndex: orderIndex++,
				text,
				normalizedText: text,
				metadata: headingMatch ? { headingLevel: Number(headingMatch[1]), styleHint: "docx-heading" } : isListItem ? { listDepth: 0, styleHint: "docx-list" } : undefined,
			});
			orderIndex = addInlineSentenceNodes({ documentId, surfaceId: surface.id, parentId: nodeId, text, startOrderIndex: orderIndex, nodes });
		}

		if (hasDrawing) {
			nodes.push({
				id: `${documentId}-node-${orderIndex}`,
				documentId,
				surfaceId: surface.id,
				nodeType: "figure",
				orderIndex: orderIndex++,
				text: "Embedded image",
				normalizedText: "Embedded image",
				metadata: { styleHint: "docx-image" },
			});
		}
	}

	return validateCanonicalDocument({
		id: documentId,
		sourceFileName: fileName,
		sourceMimeType: mimeType,
		surfaces: [surface],
		nodes,
		createdAt: new Date().toISOString(),
	});
}

export async function parsePptxToCanonicalDocument(documentId: string, fileName: string, mimeType: string, fileBuffer: Buffer): Promise<CanonicalDocument> {
	const zip = await JSZip.loadAsync(fileBuffer);
	const slidePaths = Object.keys(zip.files)
		.filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
		.sort((left, right) => Number(left.match(/slide(\d+)/)?.[1] ?? 0) - Number(right.match(/slide(\d+)/)?.[1] ?? 0));
	if (slidePaths.length === 0) {
		throw new Error("PPTX parsing failed: no slide XML found");
	}

	const notePaths = Object.keys(zip.files)
		.filter((path) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path))
		.sort((left, right) => Number(left.match(/notesSlide(\d+)/)?.[1] ?? 0) - Number(right.match(/notesSlide(\d+)/)?.[1] ?? 0));

	const surfaces = slidePaths.map((_, index) => createSurface(documentId, index, "slide", `Slide ${index + 1}`));
	const nodes: DocumentNode[] = [];
	let orderIndex = 0;

	for (const [index, slidePath] of slidePaths.entries()) {
		const slideXml = await zip.file(slidePath)?.async("string");
		if (!slideXml) {
			continue;
		}
		const surface = surfaces[index]!;
		const textParagraphs = [...slideXml.matchAll(/<a:p\b([\s\S]*?)>([\s\S]*?)<\/a:p>/g)];
		const picCount = (slideXml.match(/<p:pic\b/g) ?? []).length;

		textParagraphs.forEach((paragraphMatch) => {
			const attrs = paragraphMatch[1] ?? "";
			const body = paragraphMatch[2] ?? "";
			const text = normalizeWhitespace([...body.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) => stripXmlTags(match[1])).join(" "));
			if (!text) {
				return;
			}
			const levelMatch = attrs.match(/lvl="(\d+)"/);
			const nodeType: DocumentNode["nodeType"] = levelMatch ? "listItem" : "section";
			const nodeId = `${documentId}-node-${orderIndex}`;
			nodes.push({
				id: nodeId,
				documentId,
				surfaceId: surface.id,
				nodeType,
				orderIndex: orderIndex++,
				text,
				normalizedText: text,
				metadata: levelMatch ? { listDepth: Number(levelMatch[1]), styleHint: "pptx-bullet" } : { styleHint: "pptx-textbox" },
			});
			orderIndex = addInlineSentenceNodes({ documentId, surfaceId: surface.id, parentId: nodeId, text, startOrderIndex: orderIndex, nodes });
		});

		for (let picIndex = 0; picIndex < picCount; picIndex += 1) {
			nodes.push({
				id: `${documentId}-node-${orderIndex}`,
				documentId,
				surfaceId: surface.id,
				nodeType: "figure",
				orderIndex: orderIndex++,
				text: `Slide image ${picIndex + 1}`,
				normalizedText: `Slide image ${picIndex + 1}`,
				metadata: { styleHint: "pptx-image" },
			});
		}

		const notesXml = notePaths[index] ? await zip.file(notePaths[index]!)?.async("string") : null;
		if (notesXml) {
			const notesText = normalizeWhitespace([...notesXml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) => stripXmlTags(match[1])).join(" "));
			if (notesText) {
				const nodeId = `${documentId}-node-${orderIndex}`;
				nodes.push({
					id: nodeId,
					documentId,
					surfaceId: surface.id,
					nodeType: "paragraph",
					orderIndex: orderIndex++,
					text: notesText,
					normalizedText: notesText,
					metadata: { noteSource: "speaker-notes", styleHint: "pptx-notes" },
				});
				orderIndex = addInlineSentenceNodes({ documentId, surfaceId: surface.id, parentId: nodeId, text: notesText, startOrderIndex: orderIndex, nodes });
			}
		}
	}

	return validateCanonicalDocument({
		id: documentId,
		sourceFileName: fileName,
		sourceMimeType: mimeType,
		surfaces,
		nodes,
		createdAt: new Date().toISOString(),
	});
}
