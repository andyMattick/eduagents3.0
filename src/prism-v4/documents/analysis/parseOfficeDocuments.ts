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

// parseDocxToCanonicalDocument removed: DOCX is now converted to PDF via
// lib/convertDocxToPdf before Azure ingestion. The local XML parser is no
// longer needed in the v4 pipeline. See analyzeRegisteredDocument.ts.

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
