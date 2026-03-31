import { cleanText } from "../../ingestion/normalize/textCleaner";
import { normalizeAzureLayout } from "../../ingestion/azure/azureNormalizer";
import { mapAzureToCanonical } from "../../ingestion/normalize/structureMapper";
import { runAzureExtraction } from "../../ingestion/azure/azureExtractor";
import type { AnalyzedDocument, AzureExtractResult, CanonicalDocument } from "../../schema/semantic";
import { computeContentHashV1, computeContentHashV2, withPreferredContentHash } from "../contentHash";
import { buildAnalyzedDocumentInsights } from "./buildInsights";
import { canonicalDocumentToAzureExtract, canonicalizeAzureExtract } from "./canonicalize";
import { classifyFragments } from "./classifyFragments";
import { extractAnchoredProblems } from "./extractAnchoredProblems";
import { parseDocxToCanonicalDocument, parsePptxToCanonicalDocument } from "./parseOfficeDocuments";
import { validateCanonicalDocument } from "./validateCanonicalDocument";

function cleanAzureExtract(extract: AzureExtractResult): AzureExtractResult {
	return {
		...extract,
		content: cleanText(extract.content),
		pages: extract.pages.map((page) => ({ ...page, text: cleanText(page.text) })),
		paragraphs: extract.paragraphs?.map((paragraph) => ({ ...paragraph, text: cleanText(paragraph.text) })),
		tables: extract.tables?.map((table) => ({
			...table,
			cells: table.cells.map((cell) => ({ ...cell, text: cleanText(cell.text) })),
		})),
		readingOrder: extract.readingOrder?.map((entry) => cleanText(entry)).filter(Boolean),
	};
}

export async function analyzeRegisteredDocument(args: {
	documentId: string;
	sourceFileName: string;
	sourceMimeType: string;
	rawBinary?: Buffer;
	azureExtract?: AzureExtractResult;
	canonicalDocument?: CanonicalDocument;
}): Promise<AnalyzedDocument> {
	let azureExtract = args.azureExtract;
	let canonicalDocument = args.canonicalDocument;

	if (!canonicalDocument && !azureExtract && args.rawBinary) {
		if (args.sourceMimeType.includes("pdf")) {
			const rawAzure = await runAzureExtraction(args.rawBinary);
			azureExtract = cleanAzureExtract(mapAzureToCanonical(normalizeAzureLayout(rawAzure), args.sourceFileName));
			canonicalDocument = canonicalizeAzureExtract(args.documentId, azureExtract);
		} else if (args.sourceMimeType.includes("wordprocessingml") || args.sourceMimeType === "application/msword") {
			canonicalDocument = await parseDocxToCanonicalDocument(args.documentId, args.sourceFileName, args.sourceMimeType, args.rawBinary);
			azureExtract = canonicalDocumentToAzureExtract(canonicalDocument);
		} else if (args.sourceMimeType.includes("presentationml")) {
			canonicalDocument = await parsePptxToCanonicalDocument(args.documentId, args.sourceFileName, args.sourceMimeType, args.rawBinary);
			azureExtract = canonicalDocumentToAzureExtract(canonicalDocument);
		}
	}

	canonicalDocument = validateCanonicalDocument(canonicalDocument ?? (azureExtract
		? canonicalizeAzureExtract(args.documentId, {
			...azureExtract,
			fileName: args.sourceFileName,
		})
		: {
			id: args.documentId,
			sourceFileName: args.sourceFileName,
			sourceMimeType: args.sourceMimeType,
			surfaces: [{ id: `${args.documentId}-surface-1`, surfaceType: "other", index: 0, label: args.sourceFileName }],
			nodes: [],
			createdAt: new Date().toISOString(),
		}));

	const fragments = classifyFragments(canonicalDocument);
	const extractInput = azureExtract ?? canonicalDocumentToAzureExtract(canonicalDocument);
	const { extractedProblems } = extractInput
		? extractAnchoredProblems({ document: canonicalDocument, fragments, azureExtract: { ...extractInput, fileName: args.sourceFileName } })
		: { extractedProblems: [] };
	const insights = buildAnalyzedDocumentInsights({
		fragments,
		problems: extractedProblems,
	});
	const updatedAt = new Date().toISOString();
	const analyzedDocumentBase: AnalyzedDocument = {
		document: canonicalDocument,
		fragments,
		problems: extractedProblems,
		insights,
		updatedAt,
	};
	const contentHashV1 = await computeContentHashV1(analyzedDocumentBase);
	const contentHashV2 = await computeContentHashV2(analyzedDocumentBase);

	return withPreferredContentHash({
		...analyzedDocumentBase,
		contentHashV1,
		contentHashV2,
	});
}
