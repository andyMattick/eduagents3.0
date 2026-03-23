import { runAzureExtraction } from "./azure/azureExtractor";
import { normalizeAzureLayout } from "./azure/azureNormalizer";
import { mapAzureToCanonical } from "./normalize/structureMapper";
import { cleanText } from "./normalize/textCleaner";
import { segmentSections } from "./segment/sectionSegmenter";
import type { IngestionPipelineResult } from "./types";

function cleanCanonicalText(result: IngestionPipelineResult["canonical"]) {
  return {
    ...result,
    content: cleanText(result.content),
    pages: result.pages.map((page) => ({
      ...page,
      text: cleanText(page.text),
    })),
    paragraphs: result.paragraphs?.map((paragraph) => ({
      ...paragraph,
      text: cleanText(paragraph.text),
    })),
    tables: result.tables?.map((table) => ({
      ...table,
      cells: table.cells.map((cell) => ({
        ...cell,
        text: cleanText(cell.text),
      })),
    })),
    readingOrder: result.readingOrder?.map((entry) => cleanText(entry)).filter(Boolean),
  };
}

export async function runIngestionPipeline(
  fileBuffer: Buffer,
  fileName: string,
): Promise<IngestionPipelineResult> {
  const rawAzure = await runAzureExtraction(fileBuffer);
  const normalized = normalizeAzureLayout(rawAzure);
  const canonical = cleanCanonicalText(mapAzureToCanonical(normalized, fileName));
  const sections = segmentSections(canonical);

  return {
    canonical,
    sections,
    rawAzureRetained: false,
  };
}
